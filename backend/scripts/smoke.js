// Full-lifecycle smoke test against a RUNNING api (default http://localhost:4000).
// Creates temp users, runs request → accept → arrived → started → completed,
// checks wallet charge + invalid-transition rejection, then cleans up.
// Run:  node scripts/smoke.js  (server must be running: npm run dev)
const BASE = process.env.SMOKE_BASE_URL || "http://localhost:4000";
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const suffix = Date.now();
const driverEmail = `smoke_driver_${suffix}@t.test`;
const paxEmail = `smoke_pax_${suffix}@t.test`;

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`SMOKE-FAIL: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log(`[smoke] against ${BASE}`);

  const d = await api("/api/auth/signup", { method: "POST", body: { name: "SmokeDriver", email: driverEmail, password: "password123", role: "DRIVER" } });
  assert(d.status === 201, "driver signup (201)");
  const p = await api("/api/auth/signup", { method: "POST", body: { name: "SmokePax", email: paxEmail, password: "password123", role: "PASSENGER" } });
  assert(p.status === 201, "passenger signup (201)");
  const dTok = d.json.token, pTok = p.json.token;

  const v = await api("/api/driver/vehicle", { method: "POST", token: dTok, body: { name: "SmokeTesla", capacity: 2, currentZone: "Banani", isOnline: true } });
  assert(v.status === 201 && v.json.vehicle.capacity === 2, "driver creates 2-seat Tesla, online");

  const top = await api("/api/wallet/topup", { method: "POST", token: pTok, body: { amountBDT: 500 } });
  assert(top.status === 200 && top.json.balancePaisa === 50000, "TeslaPay topup ৳500");

  // Mirpur → Uttara is far from every seeded trip, so no auto-match steals it.
  const r = await api("/api/rides/request", { method: "POST", token: pTok, body: { pickupArea: "Mirpur", dropoffArea: "Uttara", seats: 1, paymentMethod: "TESLAPAY" } });
  assert(r.status === 201 && r.json.ride.status === "REQUESTED" && !r.json.autoMatched, `ride requested, stays REQUESTED (fare=${r.json.ride.estimatedFarePaisa} paisa)`);

  const mk = await api("/api/driver/pools", { method: "POST", token: dTok, body: { vehicleId: v.json.vehicle.id, rideRequestIds: [r.json.ride.id] } });
  assert(mk.status === 201 && mk.json.pool.occupiedSeats === 1, "driver accepts → pool created 1/2 seats");
  const poolId = mk.json.pool.id;

  for (const to of ["DRIVER_ARRIVED", "STARTED", "COMPLETED"]) {
    const s = await api(`/api/pools/${poolId}/status`, { method: "PATCH", token: dTok, body: { to } });
    assert(s.status === 200 && s.json.pool.status === to, `pool → ${to}`);
  }

  const done = await api(`/api/rides/${r.json.ride.id}`, { token: pTok });
  assert(done.json.ride.status === "COMPLETED" && Number.isInteger(done.json.ride.finalFarePaisa), `ride COMPLETED, finalFare=${done.json.ride.finalFarePaisa} paisa`);

  const wallet = await api("/api/wallet", { token: pTok });
  assert(wallet.json.balancePaisa === 50000 - done.json.ride.finalFarePaisa, `wallet charged exactly (balance=${wallet.json.balancePaisa})`);

  const bad = await api(`/api/pools/${poolId}/status`, { method: "PATCH", token: dTok, body: { to: "STARTED" } });
  assert(bad.status === 422, "invalid transition COMPLETED → STARTED rejected (422)");

  const noAuth = await api("/api/rides/my");
  assert(noAuth.status === 401, "unauthenticated request rejected (401)");

  // Cleanup temp rows (members → requests → pool → vehicle → users).
  await prisma.poolMember.deleteMany({ where: { poolId } });
  await prisma.rideEvent.deleteMany({ where: { poolId } });
  await prisma.rideRequest.deleteMany({ where: { passengerId: p.json.user.id } });
  await prisma.pool.deleteMany({ where: { id: poolId } });
  await prisma.vehicle.deleteMany({ where: { driverId: d.json.user.id } });
  await prisma.transaction.deleteMany({ where: { userId: p.json.user.id } });
  await prisma.user.deleteMany({ where: { email: { in: [driverEmail, paxEmail] } } });
  console.log("[smoke] ALL CHECKS PASSED + cleaned up");
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
