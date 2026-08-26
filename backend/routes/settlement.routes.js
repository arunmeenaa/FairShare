const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth.middleware");

const {
  calculateMonthlySettlement,
  closeSettlement,
  markTransactionPaid,
} = require("../controller/settlement.controller");

router.get("/:householdId", protect, calculateMonthlySettlement);

router.patch("/:householdId/:settlementId/close", protect, closeSettlement);

router.patch(
  "/:householdId/:settlementId/:transactionId/paid",
  protect,
  markTransactionPaid,
);

module.exports = router;
