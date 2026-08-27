const Household = require("../model/household.model");
const generateInviteCode = require("../utils/generateInviteCode");

const createHousehold = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Household name is required",
      });
    }

    let inviteCode;
    let existingHousehold;

    do {
      inviteCode = generateInviteCode();

      existingHousehold = await Household.findOne({
        inviteCode,
      });
    } while (existingHousehold);

    const household = await Household.create({
      name: name.trim(),
      createdBy: req.user._id,
      inviteCode,
      members: [
        {
          user: req.user._id,
          role: "admin",
        },
      ],
    });

    res.status(201).json({
      message: "Household created successfully",
      household,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const joinHousehold = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({
        message: "Invite code is required",
      });
    }

    const household = await Household.findOne({
      inviteCode: inviteCode.trim().toUpperCase(),
    });

    if (!household) {
      return res.status(404).json({
        message: "Invalid invite code",
      });
    }

    const existingMember = household.members.find(
      (member) => member.user.toString() === req.user._id.toString(),
    );

    if (existingMember) {
      if (existingMember.isActive) {
        return res.status(400).json({
          message: "You are already a member of this household",
        });
      }

      existingMember.isActive = true;
      existingMember.role = "member";
      existingMember.joinedAt = new Date();

      await household.save();

      return res.status(200).json({
        message: "You rejoined the household successfully",
        household,
      });
    }

    household.members.push({
      user: req.user._id,
      role: "member",
      groceryParticipant: true,
      isActive: true,
    });

    await household.save();

    return res.status(200).json({
      message: "Joined household successfully",
      household,
    });
  } catch (error) {
    console.error("Join household error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const getMyHouseholds = async (req, res) => {
  try {
    const households = await Household.find({
      "members.user": req.user._id,
      "members.isActive": true,
    })
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    const result = households.map((household) => {
      const householdData =
        household.toObject();

      const currentMember =
        household.members.find(
          (member) =>
            member.user._id.toString() ===
              req.user._id.toString() &&
            member.isActive,
        );

      const isAdmin =
        currentMember?.role === "admin";

      if (!isAdmin) {
        delete householdData.inviteCode;
      }

      return householdData;
    });

    return res.status(200).json({
      households: result,
    });
  } catch (error) {
    console.error(
      "Get my households error:",
      error,
    );

    return res.status(500).json({
      message: error.message,
    });
  }
};

const getHousehold = async (req, res) => {
  try {
    const { id } = req.params;

    const household = await Household.findOne({
      _id: id,
      members: {
        $elemMatch: {
          user: req.user._id,
          isActive: true,
        },
      },
    })
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    if (!household) {
      return res.status(404).json({
        message:
          "Household not found or you are not a member",
      });
    }

    const currentMember = household.members.find(
      (member) =>
        member.user._id.toString() ===
          req.user._id.toString() &&
        member.isActive,
    );

    const isAdmin =
      currentMember?.role === "admin";

    const householdData =
      household.toObject();

    // Hide invite code from normal members
    if (!isAdmin) {
      delete householdData.inviteCode;
    }

    return res.status(200).json({
      household: householdData,
    });
  } catch (error) {
    console.error(
      "Get household error:",
      error,
    );

    return res.status(500).json({
      message: error.message,
    });
  }
};

const updateGroceryParticipation = async (req, res) => {
  try {
    const { householdId, userId } = req.params;
    const { groceryParticipant } = req.body;

    if (typeof groceryParticipant !== "boolean") {
      return res.status(400).json({
        message: "groceryParticipant must be true or false",
      });
    }

    const household = await Household.findById(householdId);

    if (!household) {
      return res.status(404).json({
        message: "Household not found",
      });
    }

    const admin = household.members.find(
      (member) =>
        member.user.toString() === req.user._id.toString() && member.isActive,
    );

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        message: "Only household admins can change member settings",
      });
    }

    const member = household.members.find(
      (member) => member.user.toString() === userId && member.isActive,
    );

    if (!member) {
      return res.status(404).json({
        message: "Member not found in this household",
      });
    }

    member.groceryParticipant = groceryParticipant;

    await household.save();

    res.status(200).json({
      message: "Grocery participation updated successfully",
      member: {
        user: member.user,
        groceryParticipant: member.groceryParticipant,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getHouseholdMembers = async (req, res) => {
  try {
    const { householdId } = req.params;

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

    // Find the currently logged-in user's membership
    const currentMember = household.members.find(
      (member) =>
        member.user._id.toString() === req.user._id.toString() &&
        member.isActive,
    );

    const isAdmin = currentMember?.role === "admin";

    // Only active members
    const activeMembers = household.members.filter((member) => member.isActive);

    // =========================
    // ADMIN RESPONSE
    // =========================

    if (isAdmin) {
      return res.status(200).json({
        members: activeMembers,
      });
    }

    // =========================
    // NORMAL MEMBER RESPONSE
    // =========================

    const membersForUser = activeMembers.map((member) => ({
      _id: member._id,
      user: member.user,
      role: member.role,
      joinedAt: member.joinedAt,
      isActive: member.isActive,
    }));

    return res.status(200).json({
      members: membersForUser,
    });
  } catch (error) {
    console.error("Get household members error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const leaveHousehold = async (req, res) => {
  try {
    const { householdId } = req.params;

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

    const member = household.members.find(
      (member) =>
        member.user.toString() === req.user._id.toString() && member.isActive,
    );

    if (member.role === "admin") {
      return res.status(400).json({
        message: "Admin cannot leave the household. Transfer admin role first.",
      });
    }

    member.isActive = false;

    await household.save();

    res.status(200).json({
      message: "You left the household successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const removeMember = async (req, res) => {
  try {
    const { householdId, userId } = req.params;

    const household = await Household.findById(householdId);

    if (!household) {
      return res.status(404).json({
        message: "Household not found",
      });
    }

    const admin = household.members.find(
      (member) =>
        member.user.toString() === req.user._id.toString() && member.isActive,
    );

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        message: "Only household admins can remove members",
      });
    }

    const member = household.members.find(
      (member) => member.user.toString() === userId && member.isActive,
    );

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    if (member.role === "admin") {
      return res.status(400).json({
        message: "Admin cannot be removed",
      });
    }

    member.isActive = false;

    await household.save();

    res.status(200).json({
      message: "Member removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
const regenerateInviteCode = async (req, res) => {
  try {
    const { householdId } = req.params;

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
        message: "Only household admins can regenerate the invite code",
      });
    }

    let inviteCode;
    let existingHousehold;

    do {
      inviteCode = generateInviteCode();

      existingHousehold = await Household.findOne({
        inviteCode,
        _id: { $ne: householdId },
      });
    } while (existingHousehold);

    household.inviteCode = inviteCode;

    await household.save();

    return res.status(200).json({
      message: "Invite code regenerated successfully",
      inviteCode: household.inviteCode,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
module.exports = {
  createHousehold,
  joinHousehold,
  getMyHouseholds,
  getHousehold,
  updateGroceryParticipation,
  getHouseholdMembers,
  leaveHousehold,
  removeMember,
  regenerateInviteCode,
};
