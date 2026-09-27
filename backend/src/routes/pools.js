const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const { requireAuth } = require("../middleware/auth");
const { assertTransition } = require("../utils/lifecycle");
const { joinPoolTx, TX_OPTS } = require("./rides");

const router = express.Router();

// GET /api/pools/:id — member passenger, driver, else 404 (privacy: passengers see own rows).
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: true,
        driver: { select: { id: true, name: true } },
        members: { include: { passenger: { select: { id: true, name: true } }, rideRequest: true } },
        requests: { include: { passenger: { select: { id: true, name: true } } } },
        events: { orderBy: { createdAt: "asc" }, take: 50 },
      },
    });
    if (!pool) return res.status(404).json({ error: "Pool not found" });
    const isDriver = pool.driverId === req.user.id;
    const isMember = pool.members.some((m) => m.passengerId === req.user.id);
    if (!isDriver && !isMember) return res.status(404).json({ error: "Pool not found" });
    if (!isDriver) {
      pool.members = pool.members.filter((m) => m.passengerId === req.user.id);
    }
    res.json({ pool });
  } catch (e) {
    next(e);
  }
});

// POST /api/pools/auto-match — try to place a waiting ride into best open pool.
router.post("/auto-match", requireAuth, async (req, res, next) => {
  try {
    const { rideRequestId } = z.object({ rideRequestId: z.string() }).parse(req.body);
    const ride = await prisma.rideRequest.findUnique({ where: { id: rideRequestId } });
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.passengerId !== req.user.id && req.user.role === "PASSENGER")
      return res.status(403).json({ error: "Not your ride" });
    if (ride.status !== "REQUESTED" || ride.poolId) return res.status(409).json({ error: `Ride is ${ride.status}, nothing to match` });
    const { tryAutoMatch } = require("./rides");
    const match = await tryAutoMatch(ride);
    if (!match) return res.status(200).json({ matched: false, message: "No compatible open pool right now" });
    const pool = await prisma.pool.findUnique({ where: { id: match.pool.id }, include: { members: true, vehicle: true } });
    res.json({ matched: true, reason: match.reason, pool });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: "Validation failed", details: e.errors });
    next(e);
  }
});

// POST /api/pools/:id/join — claim seat(s) in an open pool. CONCURRENCY-SAFE (row lock).
// Body: { rideRequestId } — passenger's own waiting ride.
router.post("/:id/join", requireAuth, async (req, res, next) => {
  try {
    const { rideRequestId } = z.object({ rideRequestId: z.string() }).parse(req.body);
    const ride = await prisma.rideRequest.findUnique({ where: { id: rideRequestId } });
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.passengerId !== req.user.id) return res.status(403).json({ error: "Not your ride" });
    if (ride.status !== "REQUESTED" || ride.poolId) return res.status(409).json({ error: `Ride is ${ride.status}, cannot join` });
    await joinPoolTx(req.params.id, ride);
    const pool = await prisma.pool.findUnique({ where: { id: req.params.id }, include: { members: true, vehicle: true } });
    res.json({ pool, message: "Joined pool — fare re-priced with pool discount" });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: "Validation failed", details: e.errors });
    next(e);
  }
});

const statusSchema = z.object({
  to: z.enum(["DRIVER_ARRIVED", "STARTED", "COMPLETED", "CANCELLED"]),
});

// PATCH /api/pools/:id/status — driver advances lifecycle; propagates to member rides.
router.patch("/:id/status", requireAuth, async (req, res, next) => {
  try {
    const { to } = statusSchema.parse(req.body);
    const pool = await prisma.pool.findUnique({
      where: { id: req.params.id },
      include: { members: { include: { rideRequest: true } } },
    });
    if (!pool) return res.status(404).json({ error: "Pool not found" });
    if (pool.driverId !== req.user.id) return res.status(403).json({ error: "Only the pool driver can update status" });
    assertTransition(pool.status, to);

    const updated = await prisma.$transaction(async (tx) => {
      const data = { status: to };
      if (to === "STARTED") data.startedAt = new Date();
      if (to === "COMPLETED") data.completedAt = new Date();
      const p = await tx.pool.update({ where: { id: pool.id }, data });
      await tx.rideEvent.create({
        data: { poolId: pool.id, actorId: req.user.id, fromStatus: pool.status, toStatus: to, note: `Driver moved pool ${pool.status} → ${to}` },
      });

      if (["DRIVER_ARRIVED", "STARTED"].includes(to)) {
        for (const m of pool.members) {
          await tx.rideRequest.update({ where: { id: m.rideRequestId }, data: { status: to } });
          await tx.rideEvent.create({
            data: { rideRequestId: m.rideRequestId, poolId: pool.id, actorId: req.user.id, fromStatus: m.rideRequest.status, toStatus: to },
          });
        }
      }
      if (to === "COMPLETED") {
        for (const m of pool.members) {
          // Final fare = member fare (already pool-discounted when shared).
          await tx.rideRequest.update({
            where: { id: m.rideRequestId },
            data: { status: "COMPLETED", finalFarePaisa: m.farePaisa },
          });
          await tx.poolMember.update({ where: { id: m.id }, data: { status: "COMPLETED" } });
          const rr = await tx.rideRequest.findUnique({ where: { id: m.rideRequestId } });
          if (rr.paymentMethod === "TESLAPAY") {
            const u = await tx.user.findUnique({ where: { id: m.passengerId } });
            if ((u.walletPaisa || 0) >= m.farePaisa) {
              await tx.user.update({ where: { id: m.passengerId }, data: { walletPaisa: { decrement: m.farePaisa } } });
              await tx.transaction.create({
                data: { userId: m.passengerId, type: "FARE_CHARGE", amountPaisa: -m.farePaisa, method: "TESLAPAY", reference: pool.id },
              });
            }
            // else: insufficient wallet → leave as CASH-like outstanding; MVP keeps it simple.
          }
          await tx.rideEvent.create({
            data: { rideRequestId: m.rideRequestId, poolId: pool.id, actorId: req.user.id, fromStatus: "STARTED", toStatus: "COMPLETED", note: `Fare ${m.farePaisa} paisa via ${rr.paymentMethod}` },
          });
        }
      }
      if (to === "CANCELLED") {
        for (const m of pool.members) {
          await tx.rideRequest.update({ where: { id: m.rideRequestId }, data: { status: "CANCELLED", poolId: null } });
          await tx.poolMember.update({ where: { id: m.id }, data: { status: "CANCELLED" } });
        }
      }
      return p;
    }, TX_OPTS);

    res.json({ pool: updated });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: "Validation failed", details: e.errors });
    next(e);
  }
});

module.exports = router;
