const express = require("express");
const rateLimit = require("express-rate-limit");
const prisma = require("../db");
const { listAreas } = require("../utils/geo");
const { FARE_RULES } = require("../utils/fare");

const router = express.Router();

// Gentle limiter for the polled public endpoints (homepage polls /stats ~4x/min).
const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true });

// Public: Dhaka service areas + fare rules (hand-testable).
router.get("/areas", (req, res) => {
  res.json({ areas: listAreas() });
});

router.get("/fare-rules", (req, res) => {
  res.json({
    model: "passengerFare = baseFare + distanceCharge − poolDiscount",
    money: "integer paisa (100 paisa = 1 BDT)",
    rules: FARE_RULES,
  });
});

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "dhaka-tesla-pool-api", time: new Date().toISOString() });
});

// Public live snapshot for the homepage (no auth, no fares, no PII).
// Only the four demo-cast accounts are ever exposed here — never real users.
const CAST = [
  { email: "jashim@teslapool.com", fallback: "Jashim" },
  { email: "nusrat@teslapool.com", fallback: "Nusrat" },
  { email: "rafiq@teslapool.com", fallback: "Rafiq" },
  { email: "shirin@teslapool.com", fallback: "Shirin" },
];

router.get("/stats", publicLimiter, async (req, res, next) => {
  try {
    const [onlineVehicles, waitingRides, activePools, completedTrips, featured] = await Promise.all([
      prisma.vehicle.count({ where: { isOnline: true } }),
      prisma.rideRequest.count({ where: { status: "REQUESTED" } }),
      prisma.pool.count({ where: { status: { in: ["REQUESTED", "MATCHED", "DRIVER_ARRIVED", "STARTED"] } } }),
      prisma.rideRequest.count({ where: { status: "COMPLETED" } }),
      prisma.pool.findFirst({
        where: { status: { in: ["REQUESTED", "MATCHED", "DRIVER_ARRIVED", "STARTED"] } },
        orderBy: [{ occupiedSeats: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          status: true,
          pickupZone: true,
          occupiedSeats: true,
          totalSeats: true,
          vehicle: { select: { name: true, isOnline: true } },
          driver: { select: { name: true } },
        },
      }),
    ]);

    const cast = [];
    for (const c of CAST) {
      const user = await prisma.user.findUnique({
        where: { email: c.email },
        select: { id: true, name: true, role: true },
      });
      if (!user) {
        cast.push({ name: c.fallback, role: null, route: null, status: null, live: false });
        continue;
      }
      if (user.role === "DRIVER" || user.role === "BOTH") {
        const vehicle = await prisma.vehicle.findFirst({
          where: { driverId: user.id },
          select: { name: true, capacity: true, isOnline: true, currentZone: true },
        });
        cast.push({
          name: user.name,
          role: "driver",
          route: vehicle ? `${vehicle.name} · ${vehicle.capacity} seats · ${vehicle.currentZone}` : null,
          status: vehicle ? (vehicle.isOnline ? "ONLINE" : "OFFLINE") : null,
          live: true,
        });
      } else {
        const ride = await prisma.rideRequest.findFirst({
          where: { passengerId: user.id },
          orderBy: { createdAt: "desc" },
          select: { pickupArea: true, dropoffArea: true, status: true, isPooled: true },
        });
        cast.push({
          name: user.name,
          role: "passenger",
          route: ride ? `${ride.pickupArea} → ${ride.dropoffArea}` : null,
          status: ride ? ride.status + (ride.isPooled ? " · POOLED" : "") : null,
          live: true,
        });
      }
    }

    res.json({
      onlineVehicles,
      waitingRides,
      activePools,
      completedTrips,
      featured: featured
        ? {
            vehicleName: featured.vehicle.name,
            driverName: featured.driver.name,
            pickupZone: featured.pickupZone,
            occupiedSeats: featured.occupiedSeats,
            totalSeats: featured.totalSeats,
            poolStatus: featured.status,
            isOnline: featured.vehicle.isOnline,
          }
        : null,
      cast,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
