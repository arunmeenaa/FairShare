const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");

const {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  verifyExpense,
} = require("../controller/expense.controller");

router.post("/:householdId", protect, createExpense);
router.get("/:householdId", protect, getExpenses);
router.get("/:householdId/:expenseId", protect, getExpense);
router.patch("/:householdId/:expenseId", protect, updateExpense);
router.delete("/:householdId/:expenseId", protect, deleteExpense);
router.get("/verify/:expenseId", verifyExpense);

module.exports = router;
