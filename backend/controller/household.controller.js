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

    if (!inviteCode) {
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

    const alreadyMember = household.members.some(
      (member) =>
        member.user.toString() === req.user._id.toString() && member.isActive,
    );

    if (alreadyMember) {
      return res.status(400).json({
        message: "You are already a member of this household",
      });
    }

    household.members.push({
      user: req.user._id,
      role: "member",
    });

    await household.save();

    res.status(200).json({
      message: "Joined household successfully",
      household,
    });
  } catch (error) {
    res.status(500).json({
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

    res.status(200).json({
      households,
    });
  } catch (error) {
    res.status(500).json({
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
        message: "Household not found or you are not a member",
      });
    }

    res.status(200).json({
      household,
    });
  } catch (error) {
    res.status(500).json({
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

    const members = household.members.filter((member) => member.isActive);

    res.status(200).json({
      members,
    });
  } catch (error) {
    res.status(500).json({
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

module.exports = {
  createHousehold,
  joinHousehold,
  getMyHouseholds,
  getHousehold,
  updateGroceryParticipation,
  getHouseholdMembers,
  leaveHousehold,
  removeMember,
};
