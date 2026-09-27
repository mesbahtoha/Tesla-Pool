// Central ride/pool state machine (PRD §3).
// REQUESTED → MATCHED → DRIVER_ARRIVED → STARTED → COMPLETED (+ CANCELLED)
//
// Cancellation windows:
//  - Passenger may cancel while REQUESTED or MATCHED (before DRIVER_ARRIVED).
//  - Driver may cancel while REQUESTED/MATCHED/DRIVER_ARRIVED (before STARTED).
//  - After STARTED only COMPLETED is allowed (trip is underway).
const FLOW = ["REQUESTED", "MATCHED", "DRIVER_ARRIVED", "STARTED", "COMPLETED"];

const ALLOWED = {
  REQUESTED: ["MATCHED", "CANCELLED"],
  MATCHED: ["DRIVER_ARRIVED", "STARTED", "CANCELLED"],
  DRIVER_ARRIVED: ["STARTED", "CANCELLED"],
  STARTED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

function canTransition(from, to) {
  return Boolean(ALLOWED[from] && ALLOWED[from].includes(to));
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw Object.assign(
      new Error(`Invalid transition ${from} → ${to}. Allowed: ${(ALLOWED[from] || []).join(", ") || "none"}`),
      { status: 422 }
    );
  }
}

// DRIVER_ARRIVED is optional convenience (driver at pickup); allow MATCHED→STARTED skip.
function passengerMayCancel(status) {
  return ["REQUESTED", "MATCHED"].includes(status);
}

module.exports = { FLOW, ALLOWED, canTransition, assertTransition, passengerMayCancel };
