// Fare model (PRD §5): passengerFare = baseFare + distanceCharge − poolDiscount
//
//   farePaisa = BASE_PAISA + round(distanceKm * PER_KM_PAISA) − poolDiscount
//   poolDiscount = 25% of (base + distance) when the ride is pooled, else 0.
//
// Money is stored as INTEGER paisa (poysha), never float — avoids binary
// floating-point rounding errors (e.g. 0.1+0.2). 100 paisa = 1 BDT.
// Display formatting (paisa → "৳x.xx") happens only at the edges.
//
// Hand-testable example (Haversine):
//   Banani (23.7937,90.4066) → Mohakhali (23.7808,90.4167) ≈ 1.76 km
//     solo:   6000 + round(1.76*3000)=5280 → 11280 paisa = ৳112.80
//     pooled: 11280 − 25% (2820) → 8460 paisa = ৳84.60
//   Banani → Gulshan 1 (23.7493,90.411) ≈ 4.96 km
//     solo:   6000 + 14880 → 20880 paisa = ৳208.80
//     pooled: 20880 − 5220 → 15660 paisa = ৳156.60

const BASE_PAISA = 6000; // ৳60 flag-fall
const PER_KM_PAISA = 3000; // ৳30 / km
const POOL_DISCOUNT_RATE = 0.25;
const MIN_FARE_PAISA = 6000;

function quoteFare(distanceKm, isPooled) {
  const dist = Math.max(0, Number(distanceKm) || 0);
  const gross = BASE_PAISA + Math.round(dist * PER_KM_PAISA);
  const discount = isPooled ? Math.round(gross * POOL_DISCOUNT_RATE) : 0;
  const total = Math.max(MIN_FARE_PAISA, gross - discount);
  return { grossPaisa: gross, discountPaisa: discount, totalPaisa: total };
}

function formatBDT(paisa) {
  return `৳${(paisa / 100).toFixed(2)}`;
}

const FARE_RULES = { BASE_PAISA, PER_KM_PAISA, POOL_DISCOUNT_RATE, MIN_FARE_PAISA };

module.exports = { quoteFare, formatBDT, FARE_RULES };
