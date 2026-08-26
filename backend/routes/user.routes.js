const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");

const {
  setAway,
  getMyAvailability,
  deleteAvailability,
} = require("../controller/user.controller");

router.post("/availability/:householdId", protect, setAway);

router.get("/availability/:householdId", protect, getMyAvailability);

router.delete("/availability/:availabilityId", protect, deleteAvailability);

module.exports = router;
