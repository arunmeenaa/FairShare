const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth.middleware");

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controller/notification.controller");

router.get(
  "/",
  protect,
  getNotifications,
);

router.get(
  "/unread-count",
  protect,
  getUnreadCount,
);

router.patch(
  "/:notificationId/read",
  protect,
  markAsRead,
);

router.patch(
  "/read-all",
  protect,
  markAllAsRead,
);

module.exports = router;