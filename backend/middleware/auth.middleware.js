const jwt = require("jsonwebtoken");
const User = require("../model/user.model");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    const token =
      req.cookies?.token ||
      (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);

    if (!token) {
      return res.status(401).json({
        message: "Not authenticated. Please login.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account is inactive.",
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token. Please login again.",
      });
    }

    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      message: "Authentication failed.",
    });
  }
};

module.exports = protect;
