const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth.middleware");

const {
  getAvailability,
  updateAvailability,
} = require("../controller/availability.controller");

router.get("/:householdId", protect, getAvailability);

router.patch("/:householdId", protect, updateAvailability);

module.exports = router;
