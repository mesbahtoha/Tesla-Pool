// Seed: the Banani Rush-Hour story cast (PRD §1).
// Jashim (driver) + Bullet (3-seat Tesla), Nusrat, Rafiq, Shirin (passengers).
// Run: npm run db:seed  (requires DATABASE_URL)
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { coordsFor, haversineKm } = require("../src/utils/geo");
const { quoteFare } = require("../src/utils/fare");

const prisma = new PrismaClient();

async function upsertUser(name, email, password, role, walletBDT = 0) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role, walletPaisa: Math.round(walletBDT * 100) },
    create: { name, email, passwordHash, role, walletPaisa: Math.round(walletBDT * 100) },
  });
}

async function main() {
  console.log("[seed] planting the Banani rush-hour cast…");

  const jashim = await upsertUser("Jashim", "jashim@teslapool.com", "driver123", "DRIVER");
  const nusrat = await upsertUser("Nusrat", "nusrat@teslapool.com", "passenger123", "PASSENGER", 500);
  const rafiq = await upsertUser("Rafiq", "rafiq@teslapool.com", "passenger123", "PASSENGER", 500);
  const shirin = await upsertUser("Shirin", "shirin@teslapool.com", "passenger123", "PASSENGER", 500);

  // Clean previous demo rides for idempotent seeds (pools before vehicle: RESTRICT).
  await prisma.rideEvent.deleteMany({ where: { actorId: { in: [nusrat.id, rafiq.id, shirin.id, jashim.id] } } });
  await prisma.poolMember.deleteMany({ where: { passengerId: { in: [nusrat.id, rafiq.id, shirin.id] } } });
  await prisma.rideRequest.deleteMany({ where: { passengerId: { in: [nusrat.id, rafiq.id, shirin.id] } } });
  await prisma.pool.deleteMany({ where: { driverId: jashim.id } });
  await prisma.vehicle.deleteMany({ where: { driverId: jashim.id } });

  // Bullet — Jashim's 3-seat Tesla, online in Banani.
  const banani = coordsFor("Banani");
  const bullet = await prisma.vehicle.create({
    data: {
      driverId: jashim.id,
      name: "Bullet",
      capacity: 3,
      isOnline: true,
      currentZone: "Banani",
      currentLat: banani.lat,
      currentLng: banani.lng,
    },
  });

  async function makeRide(user, pickupArea, dropoffArea, seats = 1, paymentMethod = "TESLAPAY") {
    const p = coordsFor(pickupArea);
    const d = coordsFor(dropoffArea);
    const distanceKm = haversineKm(p.lat, p.lng, d.lat, d.lng);
    const q = quoteFare(distanceKm, false);
    return prisma.rideRequest.create({
      data: {
        passengerId: user.id,
        pickupArea,
        pickupLat: p.lat,
        pickupLng: p.lng,
        dropoffArea,
        dropoffLat: d.lat,
        dropoffLng: d.lng,
        distanceKm,
        seatsRequested: seats,
        status: "REQUESTED",
        estimatedFarePaisa: q.totalPaisa,
        paymentMethod,
      },
    });
  }

  // The story: Nusrat books Banani → Mohakhali at 8:41, Rafiq books almost the
  // same route to Gulshan 1 two minutes later, Shirin tries for the last seat.
  const nusratRide = await makeRide(nusrat, "Banani Road 11", "Mohakhali");
  const rafiqRide = await makeRide(rafiq, "Banani", "Gulshan 1");
  const shirinRide = await makeRide(shirin, "Banani", "Farmgate");

  // Pre-pool Nusrat + Rafiq into Bullet (the demo's happy path), 2/3 seats taken.
  const pooled = [nusratRide, rafiqRide];
  const occupied = pooled.reduce((s, r) => s + r.seatsRequested, 0);
  const pool = await prisma.pool.create({
    data: {
      vehicleId: bullet.id,
      driverId: jashim.id,
      status: "MATCHED",
      pickupZone: "Banani",
      totalSeats: bullet.capacity,
      occupiedSeats: occupied,
    },
  });
  for (const r of pooled) {
    const rr = await prisma.rideRequest.findUnique({ where: { id: r.id } });
    const q = quoteFare(rr.distanceKm, true);
    await prisma.poolMember.create({
      data: { poolId: pool.id, rideRequestId: rr.id, passengerId: rr.passengerId, seats: rr.seatsRequested, farePaisa: q.totalPaisa },
    });
    await prisma.rideRequest.update({
      where: { id: rr.id },
      data: { poolId: pool.id, status: "MATCHED", estimatedFarePaisa: q.totalPaisa, isPooled: true },
    });
    await prisma.rideEvent.create({
      data: { rideRequestId: rr.id, poolId: pool.id, actorId: jashim.id, fromStatus: "REQUESTED", toStatus: "MATCHED", note: "Seeded pool: sharing Bullet" },
    });
  }

  console.log("[seed] done:");
  console.log(`  driver    jashim@teslapool.com / driver123   (Bullet, ${bullet.capacity} seats, online)`);
  console.log(`  passenger nusrat@teslapool.com / passenger123 (Banani Road 11 → Mohakhali, MATCHED, pooled)`);
  console.log(`  passenger rafiq@teslapool.com / passenger123  (Banani → Gulshan 1, MATCHED, pooled)`);
  console.log(`  passenger shirin@teslapool.com / passenger123 (Banani → Farmgate, REQUESTED, 1 seat left!)`);
  console.log(`  pool ${pool.id} — ${occupied}/${bullet.capacity} seats taken`);
}

main()
  .catch((e) => {
    console.error("[seed] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
