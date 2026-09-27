import { describe, it, expect } from "vitest";
import { quoteFare, FARE_RULES } from "../src/utils/fare.js";
import { haversineKm, coordsFor } from "../src/utils/geo.js";
import { isCompatible } from "../src/utils/matching.js";
import { canTransition, assertTransition, passengerMayCancel } from "../src/utils/lifecycle.js";

describe("fare model — passengerFare = base + distance − poolDiscount", () => {
  it("charges solo fare with no discount", () => {
    const q = quoteFare(1.76, false);
    expect(q.discountPaisa).toBe(0);
    expect(q.totalPaisa).toBe(FARE_RULES.BASE_PAISA + Math.round(1.76 * FARE_RULES.PER_KM_PAISA));
  });

  it("applies 25% pool discount when shared", () => {
    const solo = quoteFare(1.76, false);
    const pooled = quoteFare(1.76, true);
    expect(pooled.discountPaisa).toBe(Math.round(solo.grossPaisa * 0.25));
    expect(pooled.totalPaisa).toBe(solo.grossPaisa - pooled.discountPaisa);
  });

  it("computes Nusrat's trip (Banani Road 11 → Mohakhali) by hand-checkable math", () => {
    const p = coordsFor("Banani Road 11");
    const d = coordsFor("Mohakhali");
    const km = haversineKm(p.lat, p.lng, d.lat, d.lng);
    expect(km).toBeGreaterThan(1);
    expect(km).toBeLessThan(3);
    const pooled = quoteFare(km, true);
    // gross − 25% and never below minimum
    expect(pooled.totalPaisa).toBeGreaterThanOrEqual(FARE_RULES.MIN_FARE_PAISA);
    expect(Number.isInteger(pooled.totalPaisa)).toBe(true); // integer paisa, never float
  });

  it("computes Rafiq's trip (Banani → Gulshan 1) and pooled < solo", () => {
    const p = coordsFor("Banani");
    const d = coordsFor("Gulshan 1");
    const km = haversineKm(p.lat, p.lng, d.lat, d.lng);
    const solo = quoteFare(km, false);
    const pooled = quoteFare(km, true);
    expect(pooled.totalPaisa).toBeLessThan(solo.totalPaisa);
  });
});

describe("matching rule — Nusrat + Rafiq share, strangers don't", () => {
  const nusrat = {
    pickupArea: "Banani Road 11", pickupLat: 23.7945, pickupLng: 90.4042,
    dropoffArea: "Mohakhali", dropoffLat: 23.7808, dropoffLng: 90.4167,
    seatsRequested: 1,
  };
  const rafiq = {
    pickupArea: "Banani", pickupLat: 23.7937, pickupLng: 90.4066,
    dropoffArea: "Gulshan 1", dropoffLat: 23.7493, dropoffLng: 90.411,
    seatsRequested: 1,
  };

  it("pools Nusrat + Rafiq (overlapping-but-not-identical, PRD §2)", () => {
    const pool = { status: "MATCHED", occupiedSeats: 1, totalSeats: 3 };
    expect(isCompatible(rafiq, nusrat, pool).ok).toBe(true);
  });

  it("rejects a far-away trip (Mirpur → Uttara)", () => {
    const far = {
      pickupArea: "Mirpur", pickupLat: 23.8223, pickupLng: 90.3654,
      dropoffArea: "Uttara", dropoffLat: 23.8759, dropoffLng: 90.3795,
      seatsRequested: 1,
    };
    const pool = { status: "MATCHED", occupiedSeats: 1, totalSeats: 3 };
    expect(isCompatible(far, nusrat, pool).ok).toBe(false);
  });

  it("never exceeds Bullet's capacity (3 seats)", () => {
    const pool = { status: "MATCHED", occupiedSeats: 3, totalSeats: 3 };
    expect(isCompatible({ ...rafiq, seatsRequested: 1 }, nusrat, pool)).toMatchObject({ ok: false, reason: "pool-full" });
  });

  it("rejects closed pools", () => {
    const pool = { status: "STARTED", occupiedSeats: 1, totalSeats: 3 };
    expect(isCompatible(rafiq, nusrat, pool).ok).toBe(false);
  });
});

describe("lifecycle state machine", () => {
  it("walks the happy path REQUESTED → … → COMPLETED", () => {
    expect(canTransition("REQUESTED", "MATCHED")).toBe(true);
    expect(canTransition("MATCHED", "DRIVER_ARRIVED")).toBe(true);
    expect(canTransition("MATCHED", "STARTED")).toBe(true); // arrival optional
    expect(canTransition("STARTED", "COMPLETED")).toBe(true);
  });

  it("rejects invalid jumps (REQUESTED → COMPLETED, COMPLETED → anything)", () => {
    expect(canTransition("REQUESTED", "COMPLETED")).toBe(false);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
    expect(() => assertTransition("REQUESTED", "COMPLETED")).toThrow();
  });

  it("lets passengers cancel only while waiting or matched", () => {
    expect(passengerMayCancel("REQUESTED")).toBe(true);
    expect(passengerMayCancel("MATCHED")).toBe(true);
    expect(passengerMayCancel("DRIVER_ARRIVED")).toBe(false);
    expect(passengerMayCancel("STARTED")).toBe(false);
    expect(passengerMayCancel("COMPLETED")).toBe(false);
  });
});
