const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");
const {
  updateProfile,
} = require("../controller/profile.controller");

router.patch("/", protect, updateProfile);

module.exports = router;