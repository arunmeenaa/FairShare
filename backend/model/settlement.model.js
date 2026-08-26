const mongoose = require("mongoose");

const settlementSchema = new mongoose.Schema(
  {
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    year: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },

    totalExpenses: {
      type: Number,
      required: true,
      default: 0,
    },

    memberBalances: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        paid: {
          type: Number,
          default: 0,
        },

        share: {
          type: Number,
          default: 0,
        },

        balance: {
          type: Number,
          default: 0,
        },
      },
    ],

    transactions: [
      {
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        to: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        amount: {
          type: Number,
          required: true,
          min: 0.01,
        },

        status: {
          type: String,
          enum: ["pending", "paid"],
          default: "pending",
        },

        paidAt: {
          type: Date,
          default: null,
        },
      },
    ],

    closedAt: {
      type: Date,
      default: null,
    },

    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

settlementSchema.index(
  { household: 1, month: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "Settlement",
  settlementSchema
);