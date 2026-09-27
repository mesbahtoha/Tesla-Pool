const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const { requireAuth } = require("../middleware/auth");
const { coordsFor, AREAS } = require("../utils/geo");
const { quoteFare } = require("../utils/fare");
const { isCompatible } = require("../utils/matching");
const { TX_OPTS } = require("./rides");

const router = express.Router();
const areaNames = Object.keys(AREAS);

function ensureDriver(user) {
  if (!["DRIVER", "BOTH"].includes(user.role))
    throw Object.assign(new Error("Driver role required"), { status: 403 });
}

const vehicleSchema = z.object({
  name: z.string().min(1).max(40).default("Bullet"),
  capacity: z.number().int().min(1).max(6).default(3),
  currentZone: z.enum(areaNames).default("Banani"),
  isOnline: z.boolean().default(true),
});

// POST /api/driver/vehicle — create or update my Tesla.
router.post("/vehicle", requireAuth, async (req, res, next) => {
  try {
    ensureDriver(req.user);
    const data = vehicleSchema.parse(req.body);
    const c = coordsFor(data.currentZone);
    const existing = await prisma.vehicle.findFirst({ where: { driverId: req.user.id } });
    let vehicle;
    if (existing) {
      vehicle = await prisma.vehicle.update({
        where: { id: existing.id },
        data: { name: data.name, capacity: data.capacity, currentZone: data.currentZone, currentLat: c.lat, currentLng: c.lng, isOnline: data.isOnline },
      });
    } else {
      vehicle = await prisma.vehicle.create({
        data: { driverId: req.user.id, name: data.name, capacity: data.capacity, currentZone: data.currentZone, currentLat: c.lat, currentLng: c.lng, isOnline: data.isOnline },
      });
    }
    res.status(201).json({ vehicle });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: "Validation failed", details: e.errors });
    next(e);
  }
});

// PATCH /api/driver/status — go online/offline.
router.patch("/status", requireAuth, async (req, res, next) => {
  try {
    ensureDriver(req.user);
    const { isOnline } = z.object({ isOnline: z.boolean() }).parse(req.body);
    const existing = await prisma.vehicle.findFirst({ where: { driverId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "No vehicle yet. Create one first." });
    const vehicle = await prisma.vehicle.update({ where: { id: existing.id }, data: { isOnline } });
    res.json({ vehicle });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: "Validation failed", details: e.errors });
    next(e);
  }
});

// GET /api/driver/vehicle — my Tesla + open pools + waiting requests nearby.
router.get("/vehicle", requireAuth, async (req, res, next) => {
  try {
    ensureDriver(req.user);
    const vehicle = await prisma.vehicle.findFirst({ where: { driverId: req.user.id } });
    res.json({ vehicle });
  } catch (e) {
    next(e);
  }
});

// GET /api/driver/requests — waiting REQUESTED rides (optionally compatible with one of my open pools).
router.get("/requests", requireAuth, async (req, res, next) => {
  try {
    ensureDriver(req.user);
    const rides = await prisma.rideRequest.findMany({
      where: { status: "REQUESTED" },
      orderBy: { createdAt: "asc" },
      include: { passenger: { select: { id: true, name: true } } },
      take: 30,
    });
    res.json({ rides });
  } catch (e) {
    next(e);
  }
});

// GET /api/driver/pools — my pools with members.
router.get("/pools", requireAuth, async (req, res, next) => {
  try {
    ensureDriver(req.user);
    const pools = await prisma.pool.findMany({
      where: { driverId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: true,
        members: { include: { passenger: { select: { id: true, name: true } }, rideRequest: true } },
        requests: { include: { passenger: { select: { id: true, name: true } } } },
      },
      take: 30,
    });
    res.json({ pools });
  } catch (e) {
    next(e);
  }
});

const createPoolSchema = z.object({
  vehicleId: z.string().min(1),
  rideRequestIds: z.array(z.string()).min(1).max(6),
});

// POST /api/driver/pools — accept 1..N waiting requests as a new pool (capacity enforced).
router.post("/pools", requireAuth, async (req, res, next) => {
  try {
    ensureDriver(req.user);
    const data = createPoolSchema.parse(req.body);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle || vehicle.driverId !== req.user.id) return res.status(404).json({ error: "Vehicle not found" });
    if (!vehicle.isOnline) return res.status(422).json({ error: "Go online before accepting rides" });

    const rides = await prisma.rideRequest.findMany({ where: { id: { in: data.rideRequestIds } } });
    if (rides.length !== data.rideRequestIds.length) return res.status(404).json({ error: "One or more rides not found" });
    for (const r of rides) {
      if (r.status !== "REQUESTED") return res.status(409).json({ error: `Ride ${r.id} is ${r.status}, only REQUESTED can be accepted` });
      if (r.poolId) return res.status(409).json({ error: `Ride ${r.id} already pooled` });
    }
    const totalSeats = rides.reduce((s, r) => s + r.seatsRequested, 0);
    if (totalSeats > vehicle.capacity)
      return res.status(422).json({ error: `Needs ${totalSeats} seats but ${vehicle.name} has ${vehicle.capacity}` });

    // Compatibility: every extra request must be compatible with the first.
    const [anchor, ...rest] = rides;
    for (const r of rest) {
      const c = isCompatible(
        { pickupArea: r.pickupArea, pickupLat: r.pickupLat, pickupLng: r.pickupLng, dropoffArea: r.dropoffArea, dropoffLat: r.dropoffLat, dropoffLng: r.dropoffLng, seatsRequested: r.seatsRequested },
        anchor,
        null
      );
      if (!c.ok) return res.status(422).json({ error: `Rides incompatible: ${c.reason}` });
    }

    const pooled = rides.length > 1;
    const pool = await prisma.$transaction(async (tx) => {
      const created = await tx.pool.create({
        data: {
          vehicleId: vehicle.id,
          driverId: req.user.id,
          status: "MATCHED",
          pickupZone: anchor.pickupArea,
          totalSeats: vehicle.capacity,
          occupiedSeats: totalSeats,
        },
      });
      for (const r of rides) {
        const q = quoteFare(r.distanceKm, pooled);
        await tx.poolMember.create({
          data: { poolId: created.id, rideRequestId: r.id, passengerId: r.passengerId, seats: r.seatsRequested, farePaisa: q.totalPaisa },
        });
        await tx.rideRequest.update({
          where: { id: r.id },
          data: { poolId: created.id, status: "MATCHED", estimatedFarePaisa: q.totalPaisa, isPooled: pooled },
        });
        await tx.rideEvent.create({
          data: { rideRequestId: r.id, poolId: created.id, actorId: req.user.id, fromStatus: "REQUESTED", toStatus: "MATCHED", note: `Accepted by ${vehicle.name}` },
        });
      }
      await tx.rideEvent.create({
        data: { poolId: created.id, actorId: req.user.id, fromStatus: "REQUESTED", toStatus: "MATCHED", note: `Pool created with ${rides.length} ride(s), ${totalSeats}/${vehicle.capacity} seats` },
      });
      return created;
    }, TX_OPTS);

    const full = await prisma.pool.findUnique({
      where: { id: pool.id },
      include: { vehicle: true, members: { include: { rideRequest: true, passenger: { select: { id: true, name: true } } } } },
    });
    res.status(201).json({ pool: full });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: "Validation failed", details: e.errors });
    next(e);
  }
});

module.exports = router;
