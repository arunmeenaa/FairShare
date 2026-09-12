const Availability = require("../model/availability.model");
const Household = require("../model/household.model");
const { notifyHousehold } = require("../services/notification.service");
const { sendAvailabilityEmail } = require("../services/email.service");

const safeObjectIdString = (value) => {
  if (!value) return null;

  try {
    if (typeof value === "object") {
      if (value._id) {
        return value._id.toString();
      }

      if (value.id) {
        return value.id.toString();
      }
    }

    return value.toString();
  } catch {
    return null;
  }
};

const getAvailability = async (req, res) => {
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

    const availability = await Availability.findOneAndUpdate(
      {
        user: req.user._id,
        household: householdId,
      },
      {
        $setOnInsert: {
          status: "available",
          reason: "",
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      availability: availability || {
        status: "available",
      },
    });
  } catch (error) {
    console.error("Get availability error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const { householdId } = req.params;
    const { status } = req.body;

    if (!["available", "away"].includes(status)) {
      return res.status(400).json({
        message: "Status must be either available or away",
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

    const availability = await Availability.findOneAndUpdate(
      {
        household: householdId,
        user: req.user._id,
      },
      {
        household: householdId,
        user: req.user._id,
        status,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    const currentUserId = safeObjectIdString(req.user._id);

    const member = household.members.find((member) => {
      if (!member?.isActive || !member?.user) {
        return false;
      }

      return safeObjectIdString(member.user) === currentUserId;
    });

    const userName = member?.user?.name || "A household member";

    await notifyHousehold({
      householdId,
      type: "availability_changed",
      title:
        status === "away"
          ? `${userName} is now away`
          : `${userName} is now available`,
      message:
        status === "away"
          ? `${userName} has marked themselves as away. Grocery expenses will not include them while they are away.`
          : `${userName} is available again and will be included in new grocery expenses.`,
      data: {
        userId: req.user._id,
        status,
      },
      excludeUserId: req.user._id,
    });

    const populatedHousehold = await Household.findById(householdId).populate(
      "members.user",
      "name email",
    );

    if (populatedHousehold) {
      for (const householdMember of populatedHousehold.members || []) {
        // Ignore inactive members and stale/deleted users
        if (!householdMember?.isActive || !householdMember?.user?._id) {
          continue;
        }

        const memberUserId = safeObjectIdString(householdMember.user);

        if (!memberUserId) {
          continue;
        }

        // Don't email the person who changed their own status
        if (memberUserId === currentUserId) {
          continue;
        }

        sendAvailabilityEmail({
          recipient: householdMember.user,
          memberName: userName,
          status,
        }).catch((error) => {
          console.error("Availability email failed:", error.message);
        });
      }
    }

    return res.status(200).json({
      message: `Availability changed to ${status}`,
      availability,
    });
  } catch (error) {
    console.error("Update availability error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const deleteAvailability = async (req, res) => {
  try {
    const { householdId, availabilityId } = req.params;

    const availability = await Availability.findOne({
      _id: availabilityId,
      household: householdId,
      user: req.user._id,
    });

    if (!availability) {
      return res.status(404).json({
        message: "Availability not found",
      });
    }

    await availability.deleteOne();

    return res.status(200).json({
      message: "Availability removed successfully",
    });
  } catch (error) {
    console.error("Delete availability error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const isUserAway = async ({ householdId, userId }) => {
  if (!householdId || !userId) {
    return false;
  }

  const availability = await Availability.findOne({
    household: householdId,
    user: userId,
  });

  return availability?.status === "away";
};

module.exports = {
  getAvailability,
  updateAvailability,
  deleteAvailability,
  isUserAway,
};
