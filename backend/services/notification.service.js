const Notification = require("../model/notification.model");
const Household = require("../model/household.model");
const { getIO } = require("../config/socket");

const createNotification = async ({
  householdId,
  recipientId,
  type,
  title,
  message,
  data = {},
}) => {
  const notification =
    await Notification.create({
      household: householdId,
      recipient: recipientId,
      type,
      title,
      message,
      data,
    });

  const populatedNotification =
    await Notification.findById(
      notification._id,
    ).populate(
      "recipient",
      "name email",
    );

  // Send real-time notification
  try {
    const io = getIO();

    io.to(
      `user:${recipientId.toString()}`
    ).emit(
      "notification",
      populatedNotification,
    );
  } catch (error) {
    console.error(
      "Socket notification failed:",
      error.message,
    );
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
  const household =
    await Household.findById(
      householdId,
    );

  if (!household) {
    throw new Error(
      "Household not found",
    );
  }

  const members =
    household.members.filter(
      (member) =>
        member.isActive &&
        (!excludeUserId ||
          member.user.toString() !==
            excludeUserId.toString()),
    );

  const notifications = [];

  for (const member of members) {
    const notification =
      await createNotification({
        householdId,
        recipientId: member.user,
        type,
        title,
        message,
        data,
      });

    notifications.push(
      notification,
    );
  }

  return notifications;
};

module.exports = {
  createNotification,
  notifyHousehold,
};