const Expense = require("../model/expense.model");
const Household = require("../model/household.model");
const Settlement = require("../model/settlement.model");

const getMonthlyReport = async (req, res) => {
  try {
    const { householdId } = req.params;
    const { month, year } = req.query;

    const monthNumber = Number(month);
    const yearNumber = Number(year);

    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({
        message: "Invalid month",
      });
    }

    if (!Number.isInteger(yearNumber) || yearNumber < 2000) {
      return res.status(400).json({
        message: "Invalid year",
      });
    }

    const household = await Household.findOne({
      _id: householdId,
      members: {
        $elemMatch: {
          user: req.user._id,
          isActive: true,
        },
      },
    });

    if (!household) {
      return res.status(404).json({
        message: "Household not found or you are not a member",
      });
    }

    const startDate = new Date(Date.UTC(yearNumber, monthNumber - 1, 1));

    const endDate = new Date(Date.UTC(yearNumber, monthNumber, 1));

    const expenses = await Expense.find({
      household: householdId,
      isDeleted: false,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    })
      .populate("paidBy", "name email")
      .populate("participants.user", "name email")
      .populate("excludedMembers.user", "name email")
      .sort({ date: -1 });

    const totalSpending = expenses.reduce(
      (total, expense) => total + expense.amount,
      0,
    );

    const categoryTotals = {};

    expenses.forEach((expense) => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0;
      }

      categoryTotals[expense.category] += expense.amount;
    });

    Object.keys(categoryTotals).forEach((category) => {
      categoryTotals[category] =
        Math.round(categoryTotals[category] * 100) / 100;
    });

    const memberStats = new Map();

    household.members
      .filter((member) => member.isActive)
      .forEach((member) => {
        const userId = member.user._id.toString();

        memberStats.set(userId, {
          user: member.user,
          paid: 0,
          share: 0,
          balance: 0,
        });
      });

    expenses.forEach((expense) => {
      const payerId = expense.paidBy._id.toString();

      if (memberStats.has(payerId)) {
        memberStats.get(payerId).paid += expense.amount;
      }

      expense.participants.forEach((participant) => {
        const userId = participant.user._id.toString();

        if (memberStats.has(userId)) {
          memberStats.get(userId).share += participant.share;
        }
      });
    });

    memberStats.forEach((member) => {
      member.paid = Math.round(member.paid * 100) / 100;

      member.share = Math.round(member.share * 100) / 100;

      member.balance = Math.round((member.paid - member.share) * 100) / 100;
    });

    const currentUser = memberStats.get(req.user._id.toString());

    const settlement = await Settlement.findOne({
      household: householdId,
      month: monthNumber,
      year: yearNumber,
    });

    res.status(200).json({
      month: monthNumber,
      year: yearNumber,

      totalSpending: Math.round(totalSpending * 100) / 100,

      categoryTotals,

      currentUser: currentUser || null,

      members: Array.from(memberStats.values()),

      recentExpenses: expenses.slice(0, 5).map((expense) => ({
        _id: expense._id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,

        paidBy: expense.paidBy,

        participants: expense.participants,

        excludedMembers: expense.excludedMembers || [],

        participantMode: expense.participantMode,

        participantReason: expense.participantReason,
      })),

      settlement: settlement
        ? {
            id: settlement._id,
            status: settlement.status,
            closedAt: settlement.closedAt,
            transactions: settlement.transactions,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getMonthlyReport,
};
