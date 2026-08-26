const mongoose = require("mongoose");

const weeklyEmailLogSchema = new mongoose.Schema(
  {
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
    },

    weekStart: {
      type: Date,
      required: true,
    },

    weekEnd: {
      type: Date,
      required: true,
    },

    recipients: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        email: {
          type: String,
          required: true,
        },

        status: {
          type: String,
          enum: ["sent", "failed"],
          required: true,
        },

        error: {
          type: String,
          default: null,
        },

        sentAt: {
          type: Date,
          default: null,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// One weekly email cycle per household
weeklyEmailLogSchema.index(
  {
    household: 1,
    weekStart: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model(
  "WeeklyEmailLog",
  weeklyEmailLogSchema,
);