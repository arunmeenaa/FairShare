const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth.middleware");
const {
  testEmail,
} = require("../controller/email.controller");

router.post(
  "/test",
  protect,
  testEmail,
);

module.exports = router;