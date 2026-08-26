const Availability = require("../model/availability.model");
const Household = require("../model/household.model");
const { createNotification } = require("../services/notification.service");
const { notifyHousehold } = require("../services/notification.service");

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

    const availability = await Availability.findOne({
      household: householdId,
      user: req.user._id,
    });

    res.status(200).json({
      availability: availability || {
        status: "available",
      },
    });
  } catch (error) {
    res.status(500).json({
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
    const member = household.members.find(
      (member) =>
        member.user._id.toString() === req.user._id.toString() &&
        member.isActive,
    );

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

    res.status(200).json({
      message: `Availability changed to ${status}`,
      availability,
    });
  } catch (error) {
    res.status(500).json({
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

    res.status(200).json({
      message: "Availability removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getAvailability,
  updateAvailability,
  deleteAvailability,
};
