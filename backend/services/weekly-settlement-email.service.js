const Household = require("../model/household.model");
const WeeklyEmailLog = require("../model/weeklyEmailLog.model");

const { calculateWeeklySettlement } = require("./settlement.service");

const { sendEmail } = require("./email.service");

const { buildSettlementEmail } = require("./settlement-email.service");

const getWeekRange = (date = new Date()) => {
  const current = new Date(date);

  const day = current.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(current);

  weekStart.setDate(current.getDate() + diff);

  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);

  weekEnd.setDate(weekStart.getDate() + 7);

  return {
    weekStart,
    weekEnd,
  };
};

const getUserId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return (
      value._id ||
      value.id ||
      value.user?._id ||
      value.user ||
      ""
    ).toString();
  }

  return value.toString();
};

const findRecipientLogEntry = (emailLog, userId) =>
  emailLog.recipients.find(
    (recipient) => recipient.user?.toString() === userId,
  );

const sendWeeklySettlementEmails = async () => {
  const { weekStart, weekEnd } = getWeekRange();

  console.log(
    `Weekly settlement email job: ${weekStart.toISOString()} → ${weekEnd.toISOString()}`,
  );

  const households = await Household.find({
    "members.isActive": true,
  }).populate("members.user", "name email isActive");

  let processedHouseholds = 0;
  let sentEmails = 0;
  let failedEmails = 0;

  for (const household of households) {
    try {
      const calculation = await calculateWeeklySettlement({
        householdId: household._id,
        startDate: weekStart,
        endDate: weekEnd,
      });

      const userMap = new Map();

      household.members
        .filter(
          (member) =>
            member.isActive && member.user?.isActive && member.user?.email,
        )
        .forEach((member) => {
          userMap.set(member.user._id.toString(), member.user);
        });

      const populatedTransactions = calculation.transactions.map(
        (transaction) => ({
          ...transaction,

          from: userMap.get(getUserId(transaction.from)) || transaction.from,

          to: userMap.get(getUserId(transaction.to)) || transaction.to,
        }),
      );

      let emailLog = await WeeklyEmailLog.findOne({
        household: household._id,
        weekStart,
      });

      if (!emailLog) {
        emailLog = await WeeklyEmailLog.create({
          household: household._id,
          weekStart,
          weekEnd,
          recipients: [],
        });
      } else if (!emailLog.weekEnd) {
        emailLog.weekEnd = weekEnd;
      }

      for (const member of household.members) {
        if (!member.isActive || !member.user?.isActive || !member.user?.email) {
          continue;
        }

        const userId = member.user._id.toString();

        const existingRecipient = findRecipientLogEntry(emailLog, userId);

        if (existingRecipient?.status === "sent") {
          console.log(`Skipping ${member.user.email}: already sent`);

          continue;
        }

        try {
          const email = buildSettlementEmail({
            user: member.user,
            transactions: populatedTransactions,
          });

          await sendEmail({
            to: member.user.email,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });

          if (existingRecipient) {
            existingRecipient.status = "sent";

            existingRecipient.email = member.user.email;

            existingRecipient.error = null;

            existingRecipient.sentAt = new Date();
          } else {
            emailLog.recipients.push({
              user: member.user._id,
              email: member.user.email,
              status: "sent",
              sentAt: new Date(),
              error: null,
            });
          }

          await emailLog.save();

          sentEmails++;

          console.log(`Weekly settlement email sent to ${member.user.email}`);
        } catch (error) {
          if (existingRecipient) {
            existingRecipient.status = "failed";

            existingRecipient.email = member.user.email;

            existingRecipient.sentAt = null;

            existingRecipient.error = error.message;
          } else {
            emailLog.recipients.push({
              user: member.user._id,
              email: member.user.email,
              status: "failed",
              sentAt: null,
              error: error.message,
            });
          }

          await emailLog.save();

          failedEmails++;

          console.error(
            `Failed to send weekly settlement to ${member.user.email}:`,
            error.message,
          );
        }
      }
    } catch (error) {
      console.error(
        `Failed to process weekly settlement for household ${household._id}:`,
        error.message,
      );
    } finally {
      processedHouseholds++;
    }
  }

  const result = {
    weekStart,
    weekEnd,
    processedHouseholds,
    sentEmails,
    failedEmails,
  };

  console.log("Weekly settlement email job completed:", result);

  return result;
};

module.exports = {
  getWeekRange,
  sendWeeklySettlementEmails,
};
