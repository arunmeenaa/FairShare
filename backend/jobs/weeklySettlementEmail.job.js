const cron = require("node-cron");

const {
  sendWeeklySettlementEmails,
} = require("../services/weekly-settlement-email.service");

const startWeeklySettlementEmailJob = () => {
  // Every Monday at 9:00 AM
  cron.schedule(
    "0 9 * * 1",
    async () => {
      console.log(
        "Running weekly settlement email job...",
      );

      try {
        const result =
          await sendWeeklySettlementEmails();

        console.log(
          "Weekly settlement email result:",
          result,
        );
      } catch (error) {
        console.error(
          "Weekly settlement email job failed:",
          error,
        );
      }
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  console.log(
    "Weekly settlement email scheduler started",
  );
};

module.exports = {
  startWeeklySettlementEmailJob,
};