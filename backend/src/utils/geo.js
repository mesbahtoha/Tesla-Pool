// Predefined Dhaka service areas. No map API — plain zones + lat/lng points (PRD §4).
// Coordinates are approximate centroids, good enough for fare + matching demo.
const AREAS = {
  Banani: { lat: 23.7937, lng: 90.4066 },
  "Banani Road 11": { lat: 23.7945, lng: 90.4042 },
  Mohakhali: { lat: 23.7808, lng: 90.4167 },
  "Gulshan 1": { lat: 23.7493, lng: 90.411 },
  "Gulshan 2": { lat: 23.755, lng: 90.4178 },
  Dhanmondi: { lat: 23.7461, lng: 90.3762 },
  Mirpur: { lat: 23.8223, lng: 90.3654 },
  Uttara: { lat: 23.8759, lng: 90.3795 },
  Farmgate: { lat: 23.757, lng: 90.389 },
  Bashundhara: { lat: 23.819, lng: 90.452 },
  Baridhara: { lat: 23.7739, lng: 90.4167 },
  Badda: { lat: 23.7806, lng: 90.4266 },
};

function listAreas() {
  return Object.entries(AREAS).map(([name, c]) => ({ name, ...c }));
}

function coordsFor(area) {
  const hit = AREAS[area];
  if (!hit) throw Object.assign(new Error(`Unknown area: ${area}`), { status: 400 });
  return hit;
}

function toRad(d) {
  return (d * Math.PI) / 180;
}

// Great-circle distance in km.
function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

module.exports = { AREAS, listAreas, coordsFor, haversineKm };
