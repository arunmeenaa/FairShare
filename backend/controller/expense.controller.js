const Expense = require("../model/expense.model");
const Household = require("../model/household.model");
const User = require("../model/user.model");
const createAuditLog = require("../utils/createAuditLog");
const { getEligibleParticipants } = require("../services/expense.service");
const { createNotification } = require("../services/notification.service");
const {
  sendNewExpenseEmail,
  sendExpenseUpdatedEmail,
} = require("../services/email.service");
const { isUserAway } = require("../controller/availability.controller");
const Availability = require("../model/availability.model");
const {
  refreshOpenMonthlySettlement,
} = require("../services/settlement.service");
const Settlement = require("../model/settlement.model");

const safeObjectIdString = (value) => {
  if (!value) return null;

  try {
    if (typeof value === "object") {
      if (value._id) return value._id.toString();
      if (value.id) return value.id.toString();
    }

    return value.toString();
  } catch {
    return null;
  }
};

const getActiveMembers = (household) => {
  if (!household || !Array.isArray(household.members)) {
    return [];
  }

  return household.members.filter(
    (member) => member?.isActive === true && member?.user,
  );
};

const ensureMonthIsOpen = async ({ householdId, date }) => {
  const expenseDate = new Date(date);

  if (Number.isNaN(expenseDate.getTime())) {
    throw new Error("Invalid expense date");
  }

  const month = expenseDate.getUTCMonth() + 1;
  const year = expenseDate.getUTCFullYear();

  const settlement = await Settlement.findOne({
    household: householdId,
    month,
    year,
  });

  if (settlement && settlement.status === "closed") {
    const monthName = expenseDate.toLocaleString("en-IN", {
      month: "long",
      timeZone: "UTC",
    });

    const error = new Error(
      `The ${monthName} ${year} settlement is closed. Expenses cannot be added or changed for this month.`,
    );

    error.statusCode = 409;

    throw error;
  }

  return {
    month,
    year,
  };
};

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

    if (!description || amount === undefined || !category || !date) {
      return res.status(400).json({
        message: "Description, amount, category and date are required",
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero",
      });
    }

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

    if (!["automatic", "manual"].includes(participantMode)) {
      return res.status(400).json({
        message: "Invalid participant mode",
      });
    }

    const expenseDate = new Date(date);

    if (Number.isNaN(expenseDate.getTime())) {
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
    }).populate("members.user", "name email");

    if (!household) {
      return res.status(404).json({
        message: "Household not found or you are not a member",
      });
    }

    const activeMembers = getActiveMembers(household);

    try {
      await ensureMonthIsOpen({
        householdId,
        date: expenseDate,
      });
    } catch (error) {
      return res.status(error.statusCode || 400).json({
        message: error.message,
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

    let eligibleMembers = [];
    let excludedMembers = [];

    if (participantMode === "manual") {
      if (!Array.isArray(manualParticipants) || manualParticipants.length < 2) {
        return res.status(400).json({
          message: "At least two participants are required for an expense",
        });
      }

      if (!participantReason || !participantReason.trim()) {
        return res.status(400).json({
          message: "A reason is required for manual splitting",
        });
      }

      const uniqueParticipants = [...new Set(manualParticipants.map(String))];

      const creatorId = safeObjectIdString(req.user._id);

      if (!creatorId) {
        return res.status(400).json({
          message: "Invalid current user",
        });
      }

      if (!uniqueParticipants.includes(creatorId)) {
        return res.status(400).json({
          message:
            "You must be included as a participant in manual expense splits.",
        });
      }

      // Only active members whose User document still exists
      const activeMemberIds = new Set(
        activeMembers
          .map((member) => safeObjectIdString(member.user))
          .filter(Boolean),
      );

      const invalidParticipant = uniqueParticipants.find(
        (userId) => !activeMemberIds.has(userId),
      );

      if (invalidParticipant) {
        return res.status(400).json({
          message: "One or more participants are not active household members",
        });
      }

      // Selected participants
      eligibleMembers = activeMembers.filter((member) => {
        const memberId = safeObjectIdString(member.user);
        return memberId && uniqueParticipants.includes(memberId);
      });

      // Unselected active members
      excludedMembers = activeMembers
        .filter((member) => {
          const memberId = safeObjectIdString(member.user);
          return memberId && !uniqueParticipants.includes(memberId);
        })
        .map((member) => ({
          user: member.user._id || member.user,
          reason: "Not selected for this expense",
          status: "excluded",
        }));
    } else {
      const result = await getEligibleParticipants({
        householdId,
        category,
        expenseDate,
      });

      eligibleMembers = Array.isArray(result?.participants)
        ? result.participants.filter((member) => member?.user)
        : [];

      excludedMembers = Array.isArray(result?.excludedMembers)
        ? result.excludedMembers.filter((member) => member?.user)
        : [];
    }

    if (eligibleMembers.length < 2) {
      return res.status(400).json({
        message:
          "At least two available household members are required to create an expense",
      });
    }

    const share =
      Math.round((numericAmount / eligibleMembers.length) * 100) / 100;

    let participants = eligibleMembers
      .filter((member) => member?.user)
      .map((member) => ({
        user: member.user._id || member.user,
        share,
      }));

    if (participants.length < 2) {
      return res.status(400).json({
        message:
          "At least two valid household members are required to create an expense",
      });
    }

    const totalShares = participants.reduce(
      (sum, participant) => sum + Number(participant.share || 0),
      0,
    );

    const difference = Math.round((numericAmount - totalShares) * 100) / 100;

    if (difference !== 0 && participants.length > 0) {
      participants[0].share =
        Math.round((participants[0].share + difference) * 100) / 100;
    }

    const expense = await Expense.create({
      household: householdId,
      description: description.trim(),
      amount: numericAmount,
      category,
      paidBy,
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

    await refreshOpenMonthlySettlement({
      householdId,
      month: expenseDate.getUTCMonth() + 1,
      year: expenseDate.getUTCFullYear(),
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate("paidBy", "name email")
      .populate("createdBy", "name email")
      .populate("participants.user", "name email")
      .populate("excludedMembers.user", "name email");

    if (!populatedExpense) {
      return res.status(500).json({
        message: "Expense could not be loaded after creation",
      });
    }

    const emailJobs = [];
    const notificationJobs = [];

    for (const participant of populatedExpense.participants || []) {
      // Prevent stale/deleted User references from crashing creation
      if (!participant?.user?._id) {
        console.warn(
          "Skipping expense notification for participant with missing user:",
          participant,
        );
        continue;
      }

      const participantUserId = safeObjectIdString(participant.user);

      if (!participantUserId) {
        continue;
      }

      // Don't notify the creator
      if (participantUserId === safeObjectIdString(req.user._id)) {
        continue;
      }

      notificationJobs.push(
        createNotification({
          householdId,
          recipientId: participant.user._id,
          type: "expense_created",
          title: "New expense added",
          message: `${populatedExpense.description} — ₹${Number(
            populatedExpense.amount || 0,
          ).toFixed(2)}. Your share is ₹${Number(
            participant.share || 0,
          ).toFixed(2)}, paid by ${
            populatedExpense.paidBy?.name || "a household member"
          }.`,
          data: {
            expenseId: populatedExpense._id,
            amount: populatedExpense.amount,
            share: participant.share,
            paidBy: populatedExpense.paidBy?._id,
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
      excludedMembers: populatedExpense.excludedMembers || [],
    });
  } catch (error) {
    console.error("Create expense error:", error);

    return res.status(error.statusCode || 500).json({
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
        const start = new Date(`${startDate}T00:00:00.000Z`);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            message: "Invalid start date",
          });
        }

        query.date.$gte = start;
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999Z`);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            message: "Invalid end date",
          });
        }

        query.date.$lte = end;
      }
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate("paidBy", "name email")
        .populate("createdBy", "name email")
        .populate("participants.user", "name email")
        .populate("excludedMembers.user", "name email")
        .sort({
          date: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Expense.countDocuments(query),
    ]);

    return res.status(200).json({
      expenses,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get expenses error:", error);

    return res.status(500).json({
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

    return res.status(200).json({
      expense,
    });
  } catch (error) {
    console.error("Get expense error:", error);

    return res.status(500).json({
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
    }).populate("members.user", "name email");

    if (!household) {
      return res.status(404).json({
        message: "Household not found or you are not a member",
      });
    }

    const activeMembers = getActiveMembers(household);

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

    const oldDate = new Date(before.date);

    try {
      await ensureMonthIsOpen({
        householdId,
        date: oldDate,
      });
    } catch (error) {
      return res.status(error.statusCode || 400).json({
        message: error.message,
      });
    }

    const creatorId = safeObjectIdString(expense.createdBy);
    const currentUserId = safeObjectIdString(req.user._id);

    if (!creatorId) {
      return res.status(400).json({
        message: "Expense creator no longer exists",
      });
    }

    const isCreator = creatorId === currentUserId;

    if (!isCreator) {
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

    if (date !== undefined) {
      const expenseDate = new Date(date);

      if (Number.isNaN(expenseDate.getTime())) {
        return res.status(400).json({
          message: "Invalid expense date",
        });
      }

      expense.date = expenseDate;
    }

    try {
      await ensureMonthIsOpen({
        householdId,
        date: expense.date,
      });
    } catch (error) {
      return res.status(error.statusCode || 400).json({
        message: error.message,
      });
    }

    expense.paidBy = expense.createdBy;

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

      let eligibleMembers = [];
      let excludedMembers = [];

      if (mode === "manual") {
        if (
          !Array.isArray(manualParticipants) ||
          manualParticipants.length < 2
        ) {
          return res.status(400).json({
            message: "At least two participants are required for an expense",
          });
        }

        const effectiveReason =
          participantReason?.trim() || expense.participantReason;

        if (!effectiveReason) {
          return res.status(400).json({
            message: "A reason is required for manual splitting",
          });
        }

        const uniqueParticipants = [...new Set(manualParticipants.map(String))];

        const safeCreatorId = safeObjectIdString(expense.createdBy);

        if (!safeCreatorId) {
          return res.status(400).json({
            message: "Expense creator no longer exists",
          });
        }

        if (!uniqueParticipants.includes(safeCreatorId)) {
          return res.status(400).json({
            message:
              "You must be included as a participant in manual expense splits.",
          });
        }

        const validActiveMembers = activeMembers.filter((member) =>
          safeObjectIdString(member.user),
        );

        const activeMemberIds = new Set(
          validActiveMembers
            .map((member) => safeObjectIdString(member.user))
            .filter(Boolean),
        );

        const invalidParticipant = uniqueParticipants.find(
          (id) => !activeMemberIds.has(id),
        );

        if (invalidParticipant) {
          return res.status(400).json({
            message:
              "One or more participants are not active household members",
          });
        }

        // Selected participants
        eligibleMembers = validActiveMembers.filter((member) => {
          const memberId = safeObjectIdString(member.user);

          return memberId && uniqueParticipants.includes(memberId);
        });

        // Unselected active members
        excludedMembers = validActiveMembers
          .filter((member) => {
            const memberId = safeObjectIdString(member.user);

            return memberId && !uniqueParticipants.includes(memberId);
          })
          .map((member) => ({
            user: member.user._id || member.user,
            reason: "Not selected for this expense",
            status: "excluded",
          }));

        expense.participantReason = effectiveReason;
      } else {
        const result = await getEligibleParticipants({
          householdId,
          category: expense.category,
          expenseDate: expense.date,
        });

        eligibleMembers = Array.isArray(result?.participants)
          ? result.participants.filter((member) => member?.user)
          : [];

        excludedMembers = Array.isArray(result?.excludedMembers)
          ? result.excludedMembers.filter((member) => member?.user)
          : [];

        expense.participantReason = null;
      }

      if (eligibleMembers.length < 2) {
        return res.status(400).json({
          message:
            "At least two available household members are required for an expense",
        });
      }

      const share =
        Math.round((Number(expense.amount) / eligibleMembers.length) * 100) /
        100;

      expense.participants = eligibleMembers
        .filter((member) => member?.user)
        .map((member) => ({
          user: member.user._id || member.user,
          share,
        }));

      if (expense.participants.length < 2) {
        return res.status(400).json({
          message:
            "At least two valid household members are required for this expense",
        });
      }

      const totalShares = expense.participants.reduce(
        (sum, participant) => sum + Number(participant.share || 0),
        0,
      );

      const difference =
        Math.round((Number(expense.amount) - totalShares) * 100) / 100;

      if (difference !== 0 && expense.participants.length > 0) {
        expense.participants[0].share =
          Math.round((expense.participants[0].share + difference) * 100) / 100;
      }

      expense.excludedMembers = excludedMembers;
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

    await refreshOpenMonthlySettlement({
      householdId,
      month: oldDate.getUTCMonth() + 1,
      year: oldDate.getUTCFullYear(),
    });

    const newDate = new Date(expense.date);

    await refreshOpenMonthlySettlement({
      householdId,
      month: newDate.getUTCMonth() + 1,
      year: newDate.getUTCFullYear(),
    });

    const updatedExpense = await Expense.findById(expense._id)
      .populate("paidBy", "name email")
      .populate("createdBy", "name email")
      .populate("participants.user", "name email")
      .populate("excludedMembers.user", "name email");

    if (!updatedExpense) {
      return res.status(500).json({
        message: "Updated expense could not be loaded",
      });
    }

    const emailJobs = [];

    for (const participant of updatedExpense.participants || []) {
      // Protect against deleted/stale User references
      if (!participant?.user?._id) {
        console.warn(
          "Skipping updated expense email for participant with missing user:",
          participant,
        );
        continue;
      }

      const participantUserId = safeObjectIdString(participant.user);

      if (!participantUserId) {
        continue;
      }

      if (participantUserId === currentUserId) {
        continue;
      }

      emailJobs.push(
        sendExpenseUpdatedEmail({
          recipient: participant.user,
          expense: updatedExpense,
          share: participant.share,
        }),
      );
    }

    const emailResults = await Promise.allSettled(emailJobs);

    emailResults.forEach((result) => {
      if (result.status === "rejected") {
        console.error(
          "Updated expense email failed:",
          result.reason?.message || result.reason,
        );
      }
    });

    return res.status(200).json({
      message: "Expense updated successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error("Update expense error:", error);

    return res.status(error.statusCode || 500).json({
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

    const creatorId = safeObjectIdString(expense.createdBy);
    const currentUserId = safeObjectIdString(req.user._id);

    if (!creatorId) {
      return res.status(400).json({
        message: "Expense creator no longer exists",
      });
    }

    const isCreator = creatorId === currentUserId;

    if (!isCreator) {
      return res.status(403).json({
        message: "You are not allowed to delete this expense",
      });
    }

    const before = expense.toObject();

    const expenseDate = new Date(expense.date);

    if (Number.isNaN(expenseDate.getTime())) {
      return res.status(400).json({
        message: "Expense contains an invalid date",
      });
    }

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

    await refreshOpenMonthlySettlement({
      householdId,
      month: expenseDate.getUTCMonth() + 1,
      year: expenseDate.getUTCFullYear(),
    });

    return res.status(200).json({
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Delete expense error:", error);

    return res.status(error.statusCode || 500).json({
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

    return res.status(200).json({
      valid: true,
      receipt: {
        expenseId: expense._id,
        household: expense.household?.name || "Unknown Household",
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        paidBy: expense.paidBy?.name || "Unknown Member",
        date: expense.date,
        participants: expense.participants || [],
        participantMode: expense.participantMode,
        version: expense.version,
        createdAt: expense.createdAt,
      },
    });
  } catch (error) {
    console.error("Verify expense error:", error);

    return res.status(500).json({
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
