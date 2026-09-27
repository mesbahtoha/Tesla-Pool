const express = require("express");
const prisma = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/history — unified ride history for current user.
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const [rides, pools, events] = await Promise.all([
      prisma.rideRequest.findMany({
        where: { passengerId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { pool: { include: { vehicle: true, driver: { select: { id: true, name: true } } } } },
      }),
      prisma.pool.findMany({
        where: { driverId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { vehicle: true, members: { include: { passenger: { select: { id: true, name: true } } } } },
      }),
      prisma.rideEvent.findMany({
        where: { actorId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);
    res.json({ rides, pools, events });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
