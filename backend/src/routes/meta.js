const express = require("express");
const { listAreas } = require("../utils/geo");
const { FARE_RULES } = require("../utils/fare");

const router = express.Router();

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

module.exports = router;
