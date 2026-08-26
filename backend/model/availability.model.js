const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["available", "away"],
      default: "available",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

availabilitySchema.index(
  {
    household: 1,
    user: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model(
  "Availability",
  availabilitySchema,
);