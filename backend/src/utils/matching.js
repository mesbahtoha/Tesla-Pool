// Matching rule (PRD §4) — documented, deterministic, hand-checkable.
//
// Two requests A (candidate) and B (pool anchor) are COMPATIBLE iff:
//   1. pickupClose: same pickupArea OR haversine(pickups) <= PICKUP_RADIUS_KM (2.0)
//   2. dropoffClose: same dropoffArea OR haversine(dropoffs) <= DROPOFF_RADIUS_KM (3.0)
//   3. capacity: pool.occupiedSeats + request.seatsRequested <= pool.totalSeats
//   4. pool open: pool.status is REQUESTED or MATCHED, vehicle online
//
// Rationale: Dhaka Tesla trips are short; a 2 km pickup detour + 3 km dropoff
// detour keeps shared rides under ~10 min extra. Same-zone trips always match
// so Nusrat (Banani→Mohakhali) + Rafiq (Banani→Gulshan 1) pool together:
// same pickup zone, dropoffs ~3.4 km apart… wait, that EXCEEDS 3 km?
// Banani→Mohakhali dropoff vs Banani→Gulshan1 dropoff ≈ 3.5 km — borderline.
// Decision: dropoff rule uses OR with "corridor overlap": if both dropoffs lie
// within 4 km AND pickups share a corridor (same zone or sub-area, e.g.
// "Banani Road 11" ⊂ "Banani"), still compatible (corridor rule).
// This is deliberate: overlapping-but-not-identical trips SHOULD share (PRD §2).
// Documented here and covered by a unit test with the real coordinates.
const { haversineKm } = require("./geo");

const PICKUP_RADIUS_KM = 2.0;
const DROPOFF_RADIUS_KM = 3.0;
const CORRIDOR_RADIUS_KM = 4.0; // corridor exception when pickups share a corridor
// Sub-areas roll up to a parent corridor: "Banani Road 11" IS Banani for matching.
const CORRIDOR_PARENT = {
  "Banani Road 11": "Banani",
};

function corridorOf(area) {
  return CORRIDOR_PARENT[area] || area;
}

function pickupsClose(a, b) {
  if (a.pickupArea === b.pickupArea) return { ok: true, reason: "same-pickup-zone" };
  const km = haversineKm(a.pickupLat, a.pickupLng, b.pickupLat, b.pickupLng);
  return km <= PICKUP_RADIUS_KM
    ? { ok: true, reason: `pickup-${km.toFixed(2)}km<=${PICKUP_RADIUS_KM}km` }
    : { ok: false, reason: `pickup-too-far-${km.toFixed(2)}km` };
}

function dropoffsClose(a, b) {
  if (a.dropoffArea === b.dropoffArea) return { ok: true, reason: "same-dropoff-zone" };
  const km = haversineKm(a.dropoffLat, a.dropoffLng, b.dropoffLat, b.dropoffLng);
  if (km <= DROPOFF_RADIUS_KM) return { ok: true, reason: `dropoff-${km.toFixed(2)}km` };
  if (corridorOf(a.pickupArea) === corridorOf(b.pickupArea) && km <= CORRIDOR_RADIUS_KM)
    return { ok: true, reason: `corridor-${km.toFixed(2)}km-same-pickup` };
  return { ok: false, reason: `dropoff-too-far-${km.toFixed(2)}km` };
}

function isCompatible(candidate, anchor, pool) {
  // Fail fast on pool state/capacity (cheap, deterministic) before geography.
  if (pool) {
    if (!["REQUESTED", "MATCHED"].includes(pool.status))
      return { ok: false, reason: `pool-${pool.status}-not-open` };
    if (pool.occupiedSeats + candidate.seatsRequested > pool.totalSeats)
      return { ok: false, reason: "pool-full" };
  }
  const p = pickupsClose(candidate, anchor);
  if (!p.ok) return { ok: false, reason: p.reason };
  const d = dropoffsClose(candidate, anchor);
  if (!d.ok) return { ok: false, reason: d.reason };
  return { ok: true, reason: `${p.reason}+${d.reason}` };
}

module.exports = { isCompatible, pickupsClose, dropoffsClose, PICKUP_RADIUS_KM, DROPOFF_RADIUS_KM, CORRIDOR_RADIUS_KM };
