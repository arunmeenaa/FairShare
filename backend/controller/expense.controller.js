const Expense = require("../model/expense.model");
const Household = require("../model/household.model");
const User = require("../model/user.model");
const createAuditLog = require("../utils/createAuditLog");
const { getEligibleParticipants } = require("../services/expense.service");
const { createNotification } = require("../services/notification.service");
const { sendNewExpenseEmail } = require("../services/email.service");
const { isUserAway } = require("../controller/availability.controller");
const Availability = require("../model/availability.model");

const createExpense = async (req, res) => {
  try {
    const { householdId } = req.params;

    const {
      description,
      amount,
      category,
      date,
      participants: manualParticipants,
      participantMode = "automatic",
      participantReason,
    } = req.body;

    if (!description || !amount || !category || !date) {
      return res.status(400).json({
        message: "Description, amount, category and date are required",
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero",
      });
    }

    if (!["automatic", "manual"].includes(participantMode)) {
      return res.status(400).json({
        message: "Invalid participant mode",
      });
    }

    if (participantMode === "manual") {
      if (!Array.isArray(manualParticipants) || manualParticipants.length < 2) {
        return res.status(400).json({
          message: "At least two participants are required for an expense",
        });
      }

      if (participantMode === "manual") {
        const creatorId = req.user._id.toString();
        const participantIds = participants.map((p) =>
          (p.user || p).toString(),
        );

        if (!participantIds.includes(creatorId)) {
          return res.status(400).json({
            message:
              "You must be included as a participant in manual expense splits.",
          });
        }
      }
      if (!participantReason || !participantReason.trim()) {
        return res.status(400).json({
          message: "A reason is required for manual splitting",
        });
      }
    }

    const expenseDate = new Date(date);

    if (isNaN(expenseDate.getTime())) {
      return res.status(400).json({
        message: "Invalid expense date",
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
    const creatorIsAway = await isUserAway({
      userId: req.user._id,
      householdId,
      date: expenseDate,
    });

    if (creatorIsAway) {
      return res.status(403).json({
        message: "You cannot add an expense while you are marked as away",
      });
    }
    const paidBy = req.user._id;

    let eligibleMembers;
    let excludedMembers = [];

    if (participantMode === "manual") {
      const activeMemberIds = new Set(
        household.members
          .filter((member) => member.isActive)
          .map((member) => member.user.toString()),
      );

      const uniqueParticipants = [...new Set(manualParticipants.map(String))];

      const invalidParticipant = uniqueParticipants.find(
        (userId) => !activeMemberIds.has(userId),
      );

      if (invalidParticipant) {
        return res.status(400).json({
          message: "One or more participants are not active household members",
        });
      }

      eligibleMembers = household.members.filter(
        (member) =>
          member.isActive &&
          uniqueParticipants.includes(member.user.toString()),
      );

      excludedMembers = household.members
        .filter(
          (member) =>
            member.isActive &&
            !uniqueParticipants.includes(member.user.toString()),
        )
        .map((member) => ({
          user: member.user,
          reason: "Not selected for this expense",
        }));
    } else {
      const result = await getEligibleParticipants({
        householdId,
        category,
        expenseDate,
      });

      eligibleMembers = result.participants;

      excludedMembers = result.excludedMembers;
    }

    if (eligibleMembers.length < 2) {
      return res.status(400).json({
        message:
          "At least two available household members are required to create an expense",
      });
    }

    const numericAmount = Number(amount);

    const share =
      Math.round((numericAmount / eligibleMembers.length) * 100) / 100;

    let participants = eligibleMembers.map((member) => ({
      user: member.user._id || member.user,
      share,
    }));

    // Fix rounding difference
    const totalShares = participants.reduce(
      (sum, participant) => sum + participant.share,
      0,
    );

    const difference = Math.round((numericAmount - totalShares) * 100) / 100;

    if (difference !== 0) {
      participants[0].share += difference;

      participants[0].share = Math.round(participants[0].share * 100) / 100;
    }

    const expense = await Expense.create({
      household: householdId,
      description: description.trim(),
      amount: numericAmount,
      category,
      paidBy: req.user._id,
      date: expenseDate,
      participants,
      excludedMembers,
      participantMode,
      participantReason:
        participantMode === "manual" ? participantReason.trim() : null,
      createdBy: req.user._id,
    });

    await createAuditLog({
      household: householdId,
      entityType: "expense",
      entityId: expense._id,
      action: "created",
      performedBy: req.user._id,
      after: expense.toObject(),
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate("paidBy", "name email")
      .populate("createdBy", "name email")
      .populate("participants.user", "name email")
      .populate("excludedMembers.user", "name email");

    const emailJobs = [];
    const notificationJobs = [];

    for (const participant of populatedExpense.participants) {
      const participantUserId = participant.user._id.toString();

      if (participantUserId === req.user._id.toString()) {
        continue;
      }

      notificationJobs.push(
        createNotification({
          householdId,

          recipientId: participant.user._id,

          type: "expense_created",

          title: "New expense added",

          message: `${populatedExpense.description} — ₹${populatedExpense.amount.toFixed(
            2,
          )}. Your share is ₹${participant.share.toFixed(2)}, paid by ${
            populatedExpense.paidBy?.name || "a household member"
          }.`,

          data: {
            expenseId: populatedExpense._id,

            amount: populatedExpense.amount,

            share: participant.share,

            paidBy: populatedExpense.paidBy._id,

            category: populatedExpense.category,
          },
        }),
      );

      if (participant.user?.email) {
        emailJobs.push(
          sendNewExpenseEmail({
            recipient: participant.user,
            expense: populatedExpense,
            share: participant.share,
          }),
        );
      }
    }

    const [notificationResults, emailResults] = await Promise.all([
      Promise.allSettled(notificationJobs),
      Promise.allSettled(emailJobs),
    ]);

    notificationResults.forEach((result) => {
      if (result.status === "rejected") {
        console.error(
          "Expense notification failed:",
          result.reason?.message || result.reason,
        );
      }
    });

    emailResults.forEach((result) => {
      if (result.status === "rejected") {
        console.error(
          "New expense email failed:",
          result.reason?.message || result.reason,
        );
      }
    });

    return res.status(201).json({
      message: "Expense added successfully",

      expense: populatedExpense,

      excludedMembers,
    });
  } catch (error) {
    console.error("Create expense error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const getExpenses = async (req, res) => {
  try {
    const { householdId } = req.params;

    const {
      page = 1,
      limit = 20,
      category,
      paidBy,
      startDate,
      endDate,
    } = req.query;

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

    const query = {
      household: householdId,
      isDeleted: false,
    };

    if (category) {
      query.category = category;
    }

    if (paidBy) {
      query.paidBy = paidBy;
    }

    if (startDate || endDate) {
      query.date = {};

      if (startDate) {
        const start = new Date(startDate);

        if (isNaN(start.getTime())) {
          return res.status(400).json({
            message: "Invalid start date",
          });
        }

        query.date.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);

        if (isNaN(end.getTime())) {
          return res.status(400).json({
            message: "Invalid end date",
          });
        }

        end.setHours(23, 59, 59, 999);

        query.date.$lte = end;
      }
    }

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate("paidBy", "name email")
        .populate("createdBy", "name email")
        .populate("participants.user", "name email")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      Expense.countDocuments(query),
    ]);

    res.status(200).json({
      expenses,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getExpense = async (req, res) => {
  try {
    const { householdId, expenseId } = req.params;

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

    const expense = await Expense.findOne({
      _id: expenseId,
      household: householdId,
      isDeleted: false,
    })
      .populate("paidBy", "name email")
      .populate("createdBy", "name email")
      .populate("participants.user", "name email")
      .populate("excludedMembers.user", "name email");

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    res.status(200).json({
      expense,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { householdId, expenseId } = req.params;

    const {
      description,
      amount,
      category,
      paidBy,
      date,
      participantMode,
      participants: manualParticipants,
      participantReason,
    } = req.body;

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

    const expense = await Expense.findOne({
      _id: expenseId,
      household: householdId,
      isDeleted: false,
    });

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    const before = expense.toObject();

    // Only the person who created the expense
    // or the person who paid can edit it.
    const isCreator = expense.createdBy.toString() === req.user._id.toString();

    const isPayer = expense.paidBy.toString() === req.user._id.toString();

    if (!isCreator && !isPayer) {
      return res.status(403).json({
        message: "You are not allowed to edit this expense",
      });
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({
          message: "Description cannot be empty",
        });
      }

      expense.description = description.trim();
    }

    if (amount !== undefined) {
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          message: "Amount must be greater than zero",
        });
      }

      expense.amount = numericAmount;
    }

    if (category !== undefined) {
      const allowedCategories = [
        "grocery",
        "electricity",
        "internet",
        "rent",
        "water",
        "cleaning",
        "maintenance",
        "dining",
        "household",
        "other",
      ];

      if (!allowedCategories.includes(category)) {
        return res.status(400).json({
          message: "Invalid expense category",
        });
      }

      expense.category = category;
    }

    if (paidBy !== undefined) {
      const payer = household.members.find(
        (member) => member.user.toString() === paidBy && member.isActive,
      );

      if (!payer) {
        return res.status(400).json({
          message: "Payer is not an active household member",
        });
      }

      expense.paidBy = paidBy;
    }

    if (date !== undefined) {
      const expenseDate = new Date(date);

      if (isNaN(expenseDate.getTime())) {
        return res.status(400).json({
          message: "Invalid expense date",
        });
      }

      expense.date = expenseDate;
    }

    /*
     * Recalculate participants if any field affecting
     * participation was changed.
     */
    const participationChanged =
      category !== undefined ||
      date !== undefined ||
      participantMode !== undefined ||
      manualParticipants !== undefined;

    if (participationChanged) {
      const mode = participantMode || expense.participantMode;

      if (!["automatic", "manual"].includes(mode)) {
        return res.status(400).json({
          message: "Invalid participant mode",
        });
      }

      let eligibleMembers;

      if (mode === "manual") {
        if (
          !Array.isArray(manualParticipants) ||
          manualParticipants.length === 0
        ) {
          return res.status(400).json({
            message: "Participants are required for manual splitting",
          });
        }

        if (!participantReason && !expense.participantReason) {
          return res.status(400).json({
            message: "A reason is required for manual splitting",
          });
        }

        const activeMemberIds = new Set(
          household.members
            .filter((member) => member.isActive)
            .map((member) => member.user.toString()),
        );

        const uniqueParticipants = [...new Set(manualParticipants.map(String))];

        const invalidParticipant = uniqueParticipants.find(
          (id) => !activeMemberIds.has(id),
        );

        if (invalidParticipant) {
          return res.status(400).json({
            message: "Invalid participant",
          });
        }

        eligibleMembers = household.members.filter(
          (member) =>
            member.isActive &&
            uniqueParticipants.includes(member.user.toString()),
        );

        expense.participantReason =
          participantReason?.trim() || expense.participantReason;
      } else {
        eligibleMembers = await getEligibleParticipants({
          householdId,
          category: expense.category,
          expenseDate: expense.date,
        });

        expense.participantReason = null;
      }

      if (eligibleMembers.length === 0) {
        return res.status(400).json({
          message: "No eligible participants found",
        });
      }

      const share =
        Math.round((expense.amount / eligibleMembers.length) * 100) / 100;

      expense.participants = eligibleMembers.map((member) => ({
        user: member.user._id || member.user,
        share,
      }));

      const totalShares = expense.participants.reduce(
        (sum, participant) => sum + participant.share,
        0,
      );

      const difference = Math.round((expense.amount - totalShares) * 100) / 100;

      if (difference !== 0) {
        expense.participants[0].share += difference;

        expense.participants[0].share =
          Math.round(expense.participants[0].share * 100) / 100;
      }

      expense.participantMode = mode;
    }

    await expense.save();

    await createAuditLog({
      household: householdId,
      entityType: "expense",
      entityId: expense._id,
      action: "updated",
      performedBy: req.user._id,
      before,
      after: expense.toObject(),
    });

    const updatedExpense = await Expense.findById(expense._id)
      .populate("paidBy", "name email")
      .populate("createdBy", "name email")
      .populate("participants.user", "name email");
    for (const participant of updatedExpense.participants) {
      const participantUserId = participant.user._id.toString();

      if (participantUserId === req.user._id.toString()) {
        continue;
      }

      await sendExpenseUpdatedEmail({
        recipient: participant.user,
        expense: updatedExpense,
        share: participant.share,
      });
    }
    res.status(200).json({
      message: "Expense updated successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { householdId, expenseId } = req.params;

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

    const expense = await Expense.findOne({
      _id: expenseId,
      household: householdId,
      isDeleted: false,
    });

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    const isCreator = expense.createdBy.toString() === req.user._id.toString();

    const isPayer = expense.paidBy.toString() === req.user._id.toString();

    if (!isCreator && !isPayer) {
      return res.status(403).json({
        message: "You are not allowed to delete this expense",
      });
    }

    const before = expense.toObject();

    expense.isDeleted = true;
    expense.deletedBy = req.user._id;
    expense.deletedAt = new Date();

    await expense.save();

    await createAuditLog({
      household: householdId,
      entityType: "expense",
      entityId: expense._id,
      action: "deleted",
      performedBy: req.user._id,
      before,
      after: expense.toObject(),
    });

    res.status(200).json({
      message: "Expense deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const verifyExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const expense = await Expense.findOne({
      _id: expenseId,
      isDeleted: false,
    })
      .select(
        "household description amount category paidBy date participants participantMode version createdAt",
      )
      .populate("paidBy", "name")
      .populate("participants.user", "name")
      .populate("household", "name");

    if (!expense) {
      return res.status(404).json({
        valid: false,
        message: "Receipt is invalid or no longer exists",
      });
    }

    res.status(200).json({
      valid: true,
      receipt: {
        expenseId: expense._id,
        household: expense.household.name,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        paidBy: expense.paidBy.name,
        date: expense.date,
        participants: expense.participants,
        participantMode: expense.participantMode,
        version: expense.version,
        createdAt: expense.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      valid: false,
      message: error.message,
    });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  verifyExpense,
};
