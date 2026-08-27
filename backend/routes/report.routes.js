const express = require("express");
const router = express.Router();

const {
  getMonthlyReport,
  generateReceipt,
  generateMonthlyReceipt,
  generateHouseholdReceipt,
} = require("../controller/report.controller");

const protect = require("../middleware/auth.middleware");

// Monthly dashboard report
router.get(
  "/monthly/:householdId",
  protect,
  getMonthlyReport,
);

// Personal monthly PDF
router.get(
  "/:householdId/monthly-receipt",
  protect,
  generateMonthlyReceipt,
);

// Household monthly PDF
router.get(
  "/:householdId/household-receipt",
  protect,
  generateHouseholdReceipt,
);

// Individual expense PDF
router.get(
  "/:householdId/:expenseId/receipt",
  protect,
  generateReceipt,
);

module.exports = router;