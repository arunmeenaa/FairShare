const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");

const {
  createHousehold,
  joinHousehold,
  getMyHouseholds,
  getHousehold,
  updateGroceryParticipation,
  getHouseholdMembers,
  leaveHousehold,
  removeMember,
  regenerateInviteCode,
} = require("../controller/household.controller");

router.post("/", protect, createHousehold);
router.post("/join", protect, joinHousehold);
router.get("/my-households", protect, getMyHouseholds);
router.get("/:id", protect, getHousehold);
router.patch(
  "/:householdId/members/:userId/grocery",
  protect,
  updateGroceryParticipation,
);
router.get("/:householdId/members", protect, getHouseholdMembers);
router.post("/:householdId/leave", protect, leaveHousehold);
router.delete("/:householdId/members/:userId", protect, removeMember);
router.patch("/:householdId/invite-code", protect, regenerateInviteCode);

module.exports = router;
