const Settlement = require("../model/settlement.model");
const Household = require("../model/household.model");
const createAuditLog = require("../utils/createAuditLog");
const {
  calculateSettlement,
  generateTransactions,
} = require("../services/settlement.service");
const { createNotification } = require("../services/notification.service");

const calculateMonthlySettlement = async (req, res) => {
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

    const existingSettlement = await Settlement.findOne({
      household: householdId,
      month: monthNumber,
      year: yearNumber,
    });

    if (existingSettlement && existingSettlement.status === "closed") {
      return res.status(200).json({
        settlement: existingSettlement,
      });
    }

    const isNewSettlement = !existingSettlement;

    const calculation = await calculateSettlement({
      householdId,
      month: monthNumber,
      year: yearNumber,
    });

    const newTransactions = generateTransactions(calculation.memberBalances);

    let transactions = newTransactions;

    if (existingSettlement) {
      transactions = newTransactions.map((newTransaction) => {
        const oldTransaction = existingSettlement.transactions.find(
          (oldTransaction) =>
            oldTransaction.from.toString() === newTransaction.from.toString() &&
            oldTransaction.to.toString() === newTransaction.to.toString() &&
            Math.abs(oldTransaction.amount - newTransaction.amount) < 0.01,
        );

        if (oldTransaction && oldTransaction.status === "paid") {
          return {
            ...newTransaction,
            status: "paid",
            paidAt: oldTransaction.paidAt,
          };
        }

        return newTransaction;
      });
    }

    const settlement = await Settlement.findOneAndUpdate(
      {
        household: householdId,
        month: monthNumber,
        year: yearNumber,
      },
      {
        household: householdId,
        month: monthNumber,
        year: yearNumber,
        status: "open",
        totalExpenses: calculation.totalExpenses,
        memberBalances: calculation.memberBalances,
        transactions,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    )
      .populate("memberBalances.user", "name email")
      .populate("transactions.from", "name email")
      .populate("transactions.to", "name email");

    if (isNewSettlement) {
      for (const member of settlement.memberBalances) {
        const userId = member.user._id.toString();

        const outgoing = settlement.transactions.filter(
          (transaction) =>
            transaction.from._id.toString() === userId &&
            transaction.status !== "paid",
        );

        const incoming = settlement.transactions.filter(
          (transaction) =>
            transaction.to._id.toString() === userId &&
            transaction.status !== "paid",
        );

        const parts = [];

        for (const transaction of outgoing) {
          parts.push(
            `Pay ₹${Number(transaction.amount).toFixed(2)} to ${
              transaction.to.name
            }`,
          );
        }

        for (const transaction of incoming) {
          parts.push(
            `Receive ₹${Number(transaction.amount).toFixed(2)} from ${
              transaction.from.name
            }`,
          );
        }

        const message =
          parts.length > 0
            ? parts.join(". ") + "."
            : "You are completely settled for this month.";

        await createNotification({
          householdId,
          recipientId: member.user._id,
          type: "settlement_ready",
          title: "Monthly settlement calculated",
          message,
          data: {
            settlementId: settlement._id,
            month: monthNumber,
            year: yearNumber,
          },
        });
      }
    }

    return res.status(200).json({
      message: "Monthly settlement calculated successfully",
      settlement,
    });
  } catch (error) {
    console.error("Calculate monthly settlement error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const closeSettlement = async (req, res) => {
  try {
    const { householdId, settlementId } = req.params;

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

    const admin = household.members.find(
      (member) =>
        member.user.toString() === req.user._id.toString() && member.isActive,
    );

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        message: "Only the household admin can close a settlement",
      });
    }

    const settlement = await Settlement.findOne({
      _id: settlementId,
      household: householdId,
    });

    if (!settlement) {
      return res.status(404).json({
        message: "Settlement not found",
      });
    }

    if (settlement.status === "closed") {
      return res.status(400).json({
        message: "Settlement is already closed",
      });
    }

    settlement.status = "closed";
    settlement.closedAt = new Date();
    settlement.closedBy = req.user._id;

    await settlement.save();

    await createAuditLog({
      household: householdId,
      entityType: "settlement",
      entityId: settlement._id,
      action: "updated",
      performedBy: req.user._id,
      after: settlement.toObject(),
    });

    res.status(200).json({
      message: "Monthly settlement closed successfully",
      settlement,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const markTransactionPaid = async (req, res) => {
  try {
    const { householdId, settlementId, transactionId } = req.params;

    const settlement = await Settlement.findOne({
      _id: settlementId,
      household: householdId,
    })
      .populate("transactions.from", "name email")
      .populate("transactions.to", "name email");

    if (!settlement) {
      return res.status(404).json({
        message: "Settlement not found",
      });
    }

    const transaction = settlement.transactions.id(transactionId);

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    // Current logged-in user
    const userId = req.user._id.toString();

    // Get sender and receiver IDs safely
    const senderId =
      transaction.from?._id?.toString() || transaction.from?.toString();

    const receiverId =
      transaction.to?._id?.toString() || transaction.to?.toString();

    // Only the person who owes the money
    // can mark the transaction as paid.
    if (senderId !== userId) {
      return res.status(403).json({
        message:
          "Only the person who needs to pay can mark this transaction as paid",
      });
    }

    // Already paid
    if (transaction.status === "paid") {
      return res.status(400).json({
        message: "Transaction is already marked as paid",
      });
    }

    // Mark transaction as paid
    transaction.status = "paid";
    transaction.paidAt = new Date();

    await settlement.save();

    // Notify the receiver
    await createNotification({
      householdId,
      recipientId: receiverId,
      type: "payment_marked",
      title: "Payment marked as paid",
      message: `₹${Number(transaction.amount).toFixed(2)} payment from ${
        transaction.from?.name || "a household member"
      } has been marked as paid.`,
      data: {
        settlementId: settlement._id,
        transactionId: transaction._id,
        amount: transaction.amount,
        paidBy: senderId,
      },
    });

    // Audit log
    await createAuditLog({
      household: householdId,
      entityType: "settlement",
      entityId: settlement._id,
      action: "updated",
      performedBy: req.user._id,
      after: settlement.toObject(),
    });

    res.status(200).json({
      message: "Payment marked as paid",
      transaction,
    });
  } catch (error) {
    console.error("Mark transaction paid error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  calculateMonthlySettlement,
  closeSettlement,
  markTransactionPaid,
};
