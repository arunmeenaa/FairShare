const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  if (!userId) {
    throw new Error("User ID is required to generate token");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
};

module.exports = generateToken;
