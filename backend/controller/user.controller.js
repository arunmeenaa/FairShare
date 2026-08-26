const Availability = require("../model/availability.model");
const Household = require("../model/household.model");

const setAway = async (req, res) => {
  try {
    const { householdId } = req.params;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Start date and end date are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Invalid date",
      });
    }

    if (start > end) {
      return res.status(400).json({
        message: "Start date cannot be after end date",
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

    // Check overlapping availability
    const overlapping = await Availability.findOne({
      user: req.user._id,
      household: householdId,
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (overlapping) {
      return res.status(400).json({
        message: "This period overlaps with an existing vacation period",
      });
    }

    const availability = await Availability.create({
      user: req.user._id,
      household: householdId,
      startDate: start,
      endDate: end,
      status: "away",
    });

    res.status(201).json({
      message: "Vacation period added successfully",
      availability,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getMyAvailability = async (req, res) => {
  try {
    const { householdId } = req.params;

    const availability = await Availability.find({
      user: req.user._id,
      household: householdId,
    }).sort({ startDate: 1 });

    res.status(200).json({
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
    const { availabilityId } = req.params;

    const availability = await Availability.findOne({
      _id: availabilityId,
      user: req.user._id,
    });

    if (!availability) {
      return res.status(404).json({
        message: "Availability record not found",
      });
    }

    await availability.deleteOne();

    res.status(200).json({
      message: "Vacation period removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = { setAway, getMyAvailability, deleteAvailability };
