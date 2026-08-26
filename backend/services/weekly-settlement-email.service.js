const Household = require("../model/household.model");
const WeeklyEmailLog = require("../model/weeklyEmailLog.model");

const { calculateWeeklySettlement } = require("./settlement.service");

const { sendEmail } = require("./email.service");

const getWeekRange = (date = new Date()) => {
  const current = new Date(date);

  // Monday = start of week
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
  return value?._id?.toString() || value?.toString();
};

const buildUserEmail = ({ user, transactions }) => {
  const userId = user._id.toString();

  const outgoing = transactions.filter(
    (transaction) => getUserId(transaction.from) === userId,
  );

  const incoming = transactions.filter(
    (transaction) => getUserId(transaction.to) === userId,
  );

  let text = `Hi ${user.name},\n\n`;

  text += "Here is your FairShare weekly settlement.\n\n";

  if (outgoing.length > 0) {
    text += "You need to pay:\n";

    for (const transaction of outgoing) {
      text += `• ${transaction.to.name} — ₹${Number(transaction.amount).toFixed(
        2,
      )}\n`;
    }

    text += "\n";
  }

  if (incoming.length > 0) {
    text += "You should receive:\n";

    for (const transaction of incoming) {
      text += `• ${transaction.from.name} — ₹${Number(
        transaction.amount,
      ).toFixed(2)}\n`;
    }

    text += "\n";
  }

  if (outgoing.length === 0 && incoming.length === 0) {
    text += "You are completely settled this week.\n\n";
  }

  text += "Open FairShare to view the complete details.\n\n";

  text += "FairShare";

  return {
    subject: "FairShare — Weekly Settlement",
    text,
  };
};

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
    const calculation = await calculateWeeklySettlement({
      householdId: household._id,
      startDate: weekStart,
      endDate: weekEnd,
    });

    const transactions = calculation.transactions;

    const userMap = new Map();

    household.members
      .filter((member) => member.isActive && member.user?.isActive)
      .forEach((member) => {
        userMap.set(member.user._id.toString(), member.user);
      });

    const populatedTransactions = transactions.map((transaction) => ({
      ...transaction,

      from: userMap.get(getUserId(transaction.from)) || transaction.from,

      to: userMap.get(getUserId(transaction.to)) || transaction.to,
    }));

    // Find existing log for this week
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
    }

    for (const member of household.members) {
      if (!member.isActive || !member.user?.isActive || !member.user?.email) {
        continue;
      }

      const userId = member.user._id.toString();

      // Check whether this user already received
      // this week's email successfully.
      const existingRecipient = emailLog.recipients.find(
        (recipient) => recipient.user?.toString() === userId,
      );

      if (existingRecipient?.status === "sent") {
        console.log(`Skipping ${member.user.email}: already sent`);

        continue;
      }

      try {
        const email = buildUserEmail({
          user: member.user,
          transactions: populatedTransactions,
        });

        await sendEmail({
          to: member.user.email,
          subject: email.subject,
          text: email.text,
        });

        if (existingRecipient) {
          existingRecipient.status = "sent";
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
          existingRecipient.error = error.message;
          existingRecipient.sentAt = null;
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

    processedHouseholds++;
  }

  return {
    weekStart,
    weekEnd,
    processedHouseholds,
    sentEmails,
    failedEmails,
  };
};

module.exports = {
  getWeekRange,
  sendWeeklySettlementEmails,
};
