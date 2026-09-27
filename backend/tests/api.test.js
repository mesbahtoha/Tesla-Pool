import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

// Auth-gated integration tests run only when TEST_DATABASE_URL (or DATABASE_URL)
// points at a throwaway DB — never the shared dev DB. Otherwise they skip.
const DB = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
const LIVE = Boolean(process.env.RUN_LIVE_TESTS) && DB;

let app;
if (LIVE) {
  process.env.DATABASE_URL = DB;
  app = (await import("../src/app.js")).default;
}

describe("api integration (live, opt-in via RUN_LIVE_TESTS=1)", () => {
  it("skips safely without a live DB", () => {
    if (!LIVE) expect(true).toBe(true);
  });

  it("rejects unauthenticated ride requests", async () => {
    if (!LIVE) return;
    const res = await request(app).post("/api/rides/request").send({ pickupArea: "Banani", dropoffArea: "Mohakhali" });
    expect(res.status).toBe(401);
  });

  it("enforces ownership: user B cannot read user A's ride", async () => {
    if (!LIVE) return;
    // Signup two fresh users with unique emails.
    const suffix = Date.now();
    const a = await request(app).post("/api/auth/signup").send({ name: "AAA", email: `a${suffix}@teslapool.com`, password: "password123", role: "PASSENGER" });
    const b = await request(app).post("/api/auth/signup").send({ name: "BBB", email: `b${suffix}@teslapool.com`, password: "password123", role: "PASSENGER" });
    expect(a.status).toBe(201);
    const ride = await request(app).post("/api/rides/request")
      .set("Authorization", `Bearer ${a.body.token}`)
      .send({ pickupArea: "Banani", dropoffArea: "Mohakhali", seats: 1 });
    expect(ride.status).toBe(201);
    const peek = await request(app).get(`/api/rides/${ride.body.ride.id}`).set("Authorization", `Bearer ${b.body.token}`);
    expect([403, 404]).toContain(peek.status);
  });
});
