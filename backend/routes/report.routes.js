const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");

const {
  getMonthlyReport,
} = require("../controller/report.controller");

router.get(
  "/monthly/:householdId",
  protect,
  getMonthlyReport
);

module.exports = router;