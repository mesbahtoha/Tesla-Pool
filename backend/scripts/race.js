// Concurrency race proof: Bullet has 1 seat left, two passengers claim it at the
// same instant. Exactly one must win (200), the other gets 409, pool ends 2/2.
// Run:  node scripts/race.js   (server must be running: npm run dev)
const BASE = process.env.SMOKE_BASE_URL || "http://localhost:4000";
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const suffix = Date.now();
const emails = {
  driver: `race_driver_${suffix}@teslapool.com`,
  a: `race_a_${suffix}@teslapool.com`,
  b: `race_b_${suffix}@teslapool.com`,
  c: `race_c_${suffix}@teslapool.com`,
};

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`RACE-FAIL: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log(`[race] against ${BASE}`);
  const ids = {};

  // Driver + 2-seat Tesla online in Uttara (far from the seeded Banani pool).
  const d = await api("/api/auth/signup", { method: "POST", body: { name: "RaceDriver", email: emails.driver, password: "password123", role: "DRIVER" } });
  assert(d.status === 201, "driver signup");
  const v = await api("/api/driver/vehicle", { method: "POST", token: d.json.token, body: { name: "RaceTesla", capacity: 2, currentZone: "Uttara", isOnline: true } });
  assert(v.status === 201, "2-seat Tesla online");

  // Three identical Uttara → Mirpur requests: incompatible with the seeded pool,
  // mutually compatible — and none auto-matches (no open pool fits yet).
  const toks = {};
  for (const who of ["a", "b", "c"]) {
    const s = await api("/api/auth/signup", { method: "POST", body: { name: `Race${who}`, email: emails[who], password: "password123", role: "PASSENGER" } });
    assert(s.status === 201, `passenger ${who} signup`);
    toks[who] = s.json.token;
    ids[who] = s.json.user.id;
    const r = await api("/api/rides/request", { method: "POST", token: toks[who], body: { pickupArea: "Uttara", dropoffArea: "Mirpur", seats: 1, paymentMethod: "CASH" } });
    assert(r.status === 201 && r.json.ride.status === "REQUESTED" && !r.json.autoMatched, `ride ${who} stays REQUESTED`);
    ids[`${who}Ride`] = r.json.ride.id;
  }

  // Driver seats A → pool is 1/2 with exactly 1 seat left.
  const mk = await api("/api/driver/pools", { method: "POST", token: d.json.token, body: { vehicleId: v.json.vehicle.id, rideRequestIds: [ids.aRide] } });
  assert(mk.status === 201 && mk.json.pool.occupiedSeats === 1, "pool created 1/2 — one seat left");
  const poolId = mk.json.pool.id;

  // Both B and C see 1 seat free, then slam the join endpoint simultaneously.
  const [rb, rc] = await Promise.all([
    api(`/api/pools/${poolId}/join`, { method: "POST", token: toks.b, body: { rideRequestId: ids.bRide } }),
    api(`/api/pools/${poolId}/join`, { method: "POST", token: toks.c, body: { rideRequestId: ids.cRide } }),
  ]);
  const codes = [rb.status, rc.status].sort();
  assert(JSON.stringify(codes) === JSON.stringify([200, 409]), `exactly one winner (got ${rb.status} + ${rc.status})`);

  const pool = await api(`/api/pools/${poolId}`, { token: d.json.token });
  assert(pool.json.pool.occupiedSeats === 2 && pool.json.pool.members.length === 2, `pool ends exactly 2/2 (capacity never exceeded)`);

  console.log("[race] SEAT CLAIM RACE PROVEN + cleaning up");
  await cleanup(poolId, d.json.user.id);
}

async function cleanup(poolId, driverId) {
  await prisma.poolMember.deleteMany({ where: { poolId } });
  await prisma.rideEvent.deleteMany({ where: { poolId } });
  const users = await prisma.user.findMany({ where: { email: { in: Object.values(emails) } }, select: { id: true } });
  const uids = users.map((u) => u.id);
  await prisma.rideRequest.deleteMany({ where: { passengerId: { in: uids } } });
  await prisma.transaction.deleteMany({ where: { userId: { in: uids } } });
  await prisma.pool.deleteMany({ where: { id: poolId } });
  await prisma.vehicle.deleteMany({ where: { driverId } });
  await prisma.user.deleteMany({ where: { id: { in: uids } } });
  console.log("[race] cleaned");
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
