const Notification = require("../model/notification.model");
const Household = require("../model/household.model");
const { getIO } = require("../config/socket");

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

const createNotification = async ({
  householdId,
  recipientId,
  type,
  title,
  message,
  data = {},
}) => {
  const recipientIdString = safeObjectIdString(recipientId);

  if (!recipientIdString) {
    throw new Error("Invalid notification recipient");
  }

  const notification = await Notification.create({
    household: householdId,
    recipient: recipientId,
    type,
    title,
    message,
    data,
  });

  const populatedNotification = await Notification.findById(
    notification._id,
  ).populate("recipient", "name email");

  try {
    const io = getIO();

    io.to(`user:${recipientIdString}`).emit(
      "notification",
      populatedNotification,
    );
  } catch (error) {
    console.error("Socket notification failed:", error.message);
  }

  return populatedNotification;
};

const notifyHousehold = async ({
  householdId,
  type,
  title,
  message,
  data = {},
  excludeUserId = null,
}) => {
  const household = await Household.findById(householdId);

  if (!household) {
    throw new Error("Household not found");
  }

  const excludedId = safeObjectIdString(excludeUserId);

  const members = household.members.filter((member) => {
    if (!member?.isActive) {
      return false;
    }

    const memberUserId = safeObjectIdString(member.user);

    if (!memberUserId) {
      console.warn(
        `Skipping notification for household ${householdId}: member ${member?._id || "unknown"} has a missing user reference.`,
      );

      return false;
    }

    if (excludedId && memberUserId === excludedId) {
      return false;
    }

    return true;
  });

  const notifications = [];

  for (const member of members) {
    const memberUserId = safeObjectIdString(member.user);

    // Extra defensive check
    if (!memberUserId) {
      continue;
    }

    try {
      const notification = await createNotification({
        householdId,
        recipientId: memberUserId,
        type,
        title,
        message,
        data,
      });

      notifications.push(notification);
    } catch (error) {
      console.error(
        `Failed to create notification for user ${memberUserId}:`,
        error.message,
      );
    }
  }

  return notifications;
};

module.exports = {
  createNotification,
  notifyHousehold,
};
