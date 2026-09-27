const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const { requireAuth } = require("../middleware/auth");
const { coordsFor, haversineKm, AREAS } = require("../utils/geo");
const { quoteFare } = require("../utils/fare");
const { passengerMayCancel } = require("../utils/lifecycle");
const { isCompatible } = require("../utils/matching");

const router = express.Router();
const areaNames = Object.keys(AREAS);

const requestSchema = z.object({
  pickupArea: z.enum(areaNames),
  dropoffArea: z.enum(areaNames),
  seats: z.number().int().min(1).max(3).default(1),
  paymentMethod: z.enum(["CASH", "TESLAPAY"]).default("CASH"),
}).refine((d) => d.pickupArea !== d.dropoffArea, { message: "Pickup and dropoff must differ" });

// POST /api/rides/request — passenger creates a ride request; system tries instant auto-match.
router.post("/request", requireAuth, async (req, res, next) => {
  try {
    const data = requestSchema.parse(req.body);
    const p = coordsFor(data.pickupArea);
    const d = coordsFor(data.dropoffArea);
    const distanceKm = haversineKm(p.lat, p.lng, d.lat, d.lng);
    const solo = quoteFare(distanceKm, false);

    const ride = await prisma.rideRequest.create({
      data: {
        passengerId: req.user.id,
        pickupArea: data.pickupArea,
        pickupLat: p.lat,
        pickupLng: p.lng,
        dropoffArea: data.dropoffArea,
        dropoffLat: d.lat,
        dropoffLng: d.lng,
        distanceKm,
        seatsRequested: data.seats,
        status: "REQUESTED",
        estimatedFarePaisa: solo.totalPaisa,
        paymentMethod: data.paymentMethod,
      },
    });
    await prisma.rideEvent.create({
      data: { rideRequestId: ride.id, actorId: req.user.id, fromStatus: "—", toStatus: "REQUESTED", note: `Requested ${data.pickupArea} → ${data.dropoffArea}, ${data.seats} seat(s)` },
    });

    // Best-effort auto-match into an open pool (same logic as /pools/auto-match).
    // Matching must never fail ride creation — a hiccup here leaves the ride
    // REQUESTED for the driver to pick up manually.
    let match = null;
    try {
      match = await tryAutoMatch(ride);
    } catch (e) {
      console.error("[automatch] non-fatal:", e.message);
    }
    const fresh = await prisma.rideRequest.findUnique({
      where: { id: ride.id },
      include: { pool: { include: { vehicle: true, members: true } } },
    });
    res.status(201).json({ ride: fresh, autoMatched: Boolean(match), matchReason: match ? match.reason : null });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: "Validation failed", details: e.errors });
    if (e.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

// GET /api/rides/my — passenger's rides (active first).
router.get("/my", requireAuth, async (req, res, next) => {
  try {
    const rides = await prisma.rideRequest.findMany({
      where: { passengerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { pool: { include: { vehicle: true, driver: { select: { id: true, name: true } }, members: true } } },
      take: 50,
    });
    res.json({ rides });
  } catch (e) {
    next(e);
  }
});

// GET /api/rides/:id — owner passenger, assigned driver, or admin. Others get 404 (no leak).
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const ride = await prisma.rideRequest.findUnique({
      where: { id: req.params.id },
      include: { pool: { include: { vehicle: true, driver: { select: { id: true, name: true } }, members: { include: { passenger: { select: { id: true, name: true } } } } } } },
    });
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    const isOwner = ride.passengerId === req.user.id;
    const isDriver = ride.pool && ride.pool.driverId === req.user.id;
    if (!isOwner && !isDriver) return res.status(404).json({ error: "Ride not found" });
    // Passengers see only their own fare/member row; driver sees all.
    let view = ride;
    if (isOwner && !isDriver && ride.pool) {
      view = { ...ride.toJSON ? ride.toJSON() : ride };
      view.pool = { ...ride.pool, members: ride.pool.members.filter((m) => m.passengerId === req.user.id) };
    }
    res.json({ ride: view });
  } catch (e) {
    next(e);
  }
});

// POST /api/rides/:id/cancel — passenger cancel while REQUESTED/MATCHED.
router.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const ride = await prisma.rideRequest.findUnique({ where: { id: req.params.id }, include: { pool: true } });
    if (!ride || ride.passengerId !== req.user.id) return res.status(404).json({ error: "Ride not found" });
    if (!passengerMayCancel(ride.status))
      return res.status(422).json({ error: `Cannot cancel ride in status ${ride.status}. Passenger cancel allowed while REQUESTED or MATCHED.` });

    const result = await prisma.$transaction(async (tx) => {
      if (ride.poolId) {
        // Release seat back to the pool under row lock.
        await tx.$executeRawUnsafe(`SELECT id FROM "Pool" WHERE id = $1 FOR UPDATE`, ride.poolId);
        const member = await tx.poolMember.findUnique({ where: { rideRequestId: ride.id } });
        if (member) {
          await tx.poolMember.delete({ where: { id: member.id } });
          const pool = await tx.pool.update({
            where: { id: ride.poolId },
            data: { occupiedSeats: { decrement: member.seats } },
          });
          if (pool.occupiedSeats <= 0) {
            // Last seat out — dissolve the pool.
            await tx.pool.update({ where: { id: pool.id }, data: { status: "CANCELLED", occupiedSeats: 0 } });
          } else {
            // If only one member remains, drop it back to the solo fare.
            await repriceIfSolo(tx, pool.id);
          }
        }
      }
      const updated = await tx.rideRequest.update({
        where: { id: ride.id },
        data: { status: "CANCELLED", poolId: null },
      });
      await tx.rideEvent.create({
        data: { rideRequestId: ride.id, poolId: ride.poolId, actorId: req.user.id, fromStatus: ride.status, toStatus: "CANCELLED", note: "Cancelled by passenger" },
      });
      return updated;
    }, TX_OPTS);
    res.json({ ride: result });
  } catch (e) {
    next(e);
  }
});

// ---- shared helpers (also used by pools route) ----
// Neon is remote — interactive transactions get a generous budget.
const TX_OPTS = { timeout: 20000, maxWait: 10000 };

// Re-price every member (used at pool creation). Rare path — correctness first.
async function repricePoolMembers(tx, poolId) {
  const pool = await tx.pool.findUnique({ where: { id: poolId }, include: { members: { include: { rideRequest: true } } } });
  if (!pool) return;
  const pooled = pool.members.length > 1;
  for (const m of pool.members) {
    const q = quoteFare(m.rideRequest.distanceKm, pooled);
    await tx.poolMember.update({ where: { id: m.id }, data: { farePaisa: q.totalPaisa } });
    await tx.rideRequest.update({ where: { id: m.rideRequestId }, data: { estimatedFarePaisa: q.totalPaisa, isPooled: pooled } });
  }
}

// After a cancel, only a 1→solo flip changes anyone's fare — skip work otherwise.
async function repriceIfSolo(tx, poolId) {
  const members = await tx.poolMember.findMany({
    where: { poolId },
    include: { rideRequest: { select: { id: true, distanceKm: true } } },
  });
  if (members.length !== 1) return;
  const q = quoteFare(members[0].rideRequest.distanceKm, false);
  await tx.poolMember.update({ where: { id: members[0].id }, data: { farePaisa: q.totalPaisa } });
  await tx.rideRequest.update({ where: { id: members[0].rideRequestId }, data: { estimatedFarePaisa: q.totalPaisa, isPooled: false } });
}

// Find best open pool for a ride and join it transactionally. Returns {pool, reason} or null.
async function tryAutoMatch(ride) {
  const openPools = await prisma.pool.findMany({
    where: { status: { in: ["REQUESTED", "MATCHED"] } },
    select: {
      id: true,
      status: true,
      occupiedSeats: true,
      totalSeats: true,
      vehicle: { select: { id: true, isOnline: true } },
      members: {
        select: {
          rideRequest: {
            select: { id: true, pickupArea: true, pickupLat: true, pickupLng: true, dropoffArea: true, dropoffLat: true, dropoffLng: true, seatsRequested: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  let best = null;
  for (const pool of openPools) {
    if (!pool.vehicle.isOnline) continue;
    if (pool.occupiedSeats + ride.seatsRequested > pool.totalSeats) continue;
    const anchor = pool.members[0]?.rideRequest || pool.requests[0];
    if (!anchor) continue;
    const c = isCompatible(
      { pickupArea: ride.pickupArea, pickupLat: ride.pickupLat, pickupLng: ride.pickupLng, dropoffArea: ride.dropoffArea, dropoffLat: ride.dropoffLat, dropoffLng: ride.dropoffLng, seatsRequested: ride.seatsRequested },
      anchor,
      pool
    );
    if (c.ok) {
      best = { pool, reason: c.reason };
      break; // earliest compatible pool wins (FIFO fairness)
    }
  }
  if (!best) return null;
  await joinPoolTx(best.pool.id, ride);
  return best;
}

async function joinPoolTx(poolId, ride) {
  return prisma.$transaction(async (tx) => {
    // Row-level lock: concurrent claimants serialize here. Second one sees updated seats.
    await tx.$executeRawUnsafe(`SELECT id FROM "Pool" WHERE id = $1 FOR UPDATE`, poolId);
    const pool = await tx.pool.findUnique({ where: { id: poolId }, include: { members: { include: { rideRequest: { select: { id: true, distanceKm: true } } } } } });
    if (!pool) throw Object.assign(new Error("Pool not found"), { status: 404 });
    if (!["REQUESTED", "MATCHED"].includes(pool.status))
      throw Object.assign(new Error(`Pool is ${pool.status}, not open`), { status: 409 });
    if (pool.occupiedSeats + ride.seatsRequested > pool.totalSeats)
      throw Object.assign(new Error("Pool is full (concurrent join won the last seat)"), { status: 409 });
    const dup = await tx.poolMember.findUnique({ where: { rideRequestId: ride.id } });
    if (dup) throw Object.assign(new Error("Ride already in a pool"), { status: 409 });

    const wasPooled = pool.members.length > 1;
    const willBePooled = pool.members.length + 1 > 1;
    const q = quoteFare(ride.distanceKm, willBePooled);
    await tx.poolMember.create({
      data: { poolId, rideRequestId: ride.id, passengerId: ride.passengerId, seats: ride.seatsRequested, farePaisa: q.totalPaisa },
    });
    await tx.rideRequest.update({
      where: { id: ride.id },
      data: { poolId, status: "MATCHED", estimatedFarePaisa: q.totalPaisa, isPooled: willBePooled },
    });
    await tx.pool.update({
      where: { id: poolId },
      data: { occupiedSeats: pool.occupiedSeats + ride.seatsRequested, status: "MATCHED" },
    });
    await tx.rideEvent.create({
      data: { rideRequestId: ride.id, poolId, actorId: ride.passengerId, fromStatus: "REQUESTED", toStatus: "MATCHED", note: "Auto-matched into shared Tesla" },
    });
    // Only a solo→pooled flip changes existing members' fares — skip otherwise.
    if (willBePooled && !wasPooled) {
      for (const m of pool.members) {
        const pq = quoteFare(m.rideRequest.distanceKm, true);
        await tx.poolMember.update({ where: { id: m.id }, data: { farePaisa: pq.totalPaisa } });
        await tx.rideRequest.update({ where: { id: m.rideRequestId }, data: { estimatedFarePaisa: pq.totalPaisa, isPooled: true } });
      }
    }
    return true;
  }, TX_OPTS);
}

module.exports = router;
module.exports.tryAutoMatch = tryAutoMatch;
module.exports.joinPoolTx = joinPoolTx;
module.exports.repricePoolMembers = repricePoolMembers;
module.exports.repriceIfSolo = repriceIfSolo;
module.exports.TX_OPTS = TX_OPTS;
