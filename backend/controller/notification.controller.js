const Notification = require("../model/notification.model");

const getNotifications = async (req, res) => {
  try {
    const { householdId } = req.query;

    const filter = {
      recipient: req.user._id,
    };

    if (householdId) {
      filter.household = householdId;
    }

    const notifications = await Notification.find(filter)
      .populate("recipient", "name email")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      notifications,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const { householdId } = req.query;

    const filter = {
      recipient: req.user._id,
      isRead: false,
    };

    if (householdId) {
      filter.household = householdId;
    }

    const count =
      await Notification.countDocuments(filter);

    res.status(200).json({
      count,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification =
      await Notification.findOne({
        _id: notificationId,
        recipient: req.user._id,
      });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();

      await notification.save();
    }

    res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const { householdId } = req.body;

    const filter = {
      recipient: req.user._id,
      isRead: false,
    };

    if (householdId) {
      filter.household = householdId;
    }

    const result =
      await Notification.updateMany(
        filter,
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },
      );

    res.status(200).json({
      message:
        "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};