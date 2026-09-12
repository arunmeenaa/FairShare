const bcrypt = require("bcrypt");
const User = require("../model/user.model");
const Household = require("../model/household.model");

require("dotenv").config();

const generateToken = require("../utils/generateToken");
const generateInviteCode = require("../utils/generateInviteCode");

const register = async (req, res) => {
  try {
    const { name, email, password, householdMode, householdName, inviteCode } =
      req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    if (householdMode && !["create", "join"].includes(householdMode)) {
      return res.status(400).json({
        message: "Invalid household mode",
      });
    }

    // If creating a household
    if (householdMode === "create") {
      if (!householdName || !householdName.trim()) {
        return res.status(400).json({
          message: "Household name is required",
        });
      }
    }

    if (householdMode === "join") {
      if (!inviteCode || !inviteCode.trim()) {
        return res.status(400).json({
          message: "Invite code is required",
        });
      }

      const household = await Household.findOne({
        inviteCode: inviteCode.trim().toUpperCase(),
      });

      if (!household) {
        return res.status(404).json({
          message: "Invalid invite code",
        });
      }
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT_ROUNDS),
    );

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    let household = null;

    if (householdMode === "create") {
      let newInviteCode;
      let existingHousehold;

      do {
        newInviteCode = generateInviteCode();

        existingHousehold = await Household.findOne({
          inviteCode: newInviteCode,
        });
      } while (existingHousehold);

      household = await Household.create({
        name: householdName.trim(),
        createdBy: user._id,
        inviteCode: newInviteCode,
        members: [
          {
            user: user._id,
            role: "admin",
          },
        ],
      });
    }

    if (householdMode === "join") {
      household = await Household.findOne({
        inviteCode: inviteCode.trim().toUpperCase(),
      });

      if (!household) {
        await User.findByIdAndDelete(user._id);

        return res.status(404).json({
          message: "Invalid invite code",
        });
      }

      household.members.push({
        user: user._id,
        role: "member",
      });

      await household.save();
    }

    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      household: household
        ? {
            _id: household._id,
            name: household.name,
            inviteCode: household.inviteCode,
            role: household.members.find(
              (member) => member.user.toString() === user._id.toString(),
            )?.role,
          }
        : null,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const household = await Household.findOne({
      members: {
        $elemMatch: {
          user: user._id,
          isActive: true,
        },
      },
    });
    let householdData = null;

    if (household) {
      const currentMember = household.members.find(
        (member) =>
          member.user.toString() === user._id.toString() && member.isActive,
      );

      householdData = {
        _id: household._id,
        name: household.name,
        inviteCode:
          currentMember?.role === "admin" ? household.inviteCode : undefined,
        role: currentMember?.role || "member",
      };
    }
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },

      household: householdData,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      Number(process.env.SALT_ROUNDS),
    );

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const getMe = async (req, res) => {
  try {
    const household = await Household.findOne({
      members: {
        $elemMatch: {
          user: req.user._id,
          isActive: true,
        },
      },
    })
      .populate("members.user", "name email phone status")
      .populate("createdBy", "name email");

    let householdData = null;

    if (household) {
      const currentMember = household.members.find(
        (member) =>
          member.user &&
          member.user._id.toString() === req.user._id.toString() &&
          member.isActive,
      );

      if (currentMember) {
        householdData = {
          _id: household._id,
          name: household.name,
          role: currentMember.role || "member",
          inviteCode:
            currentMember.role === "admin" ? household.inviteCode : undefined,
        };
      }
    }

    return res.status(200).json({
      user: req.user,
      household: householdData,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      message: "Unable to load your account information. Please try again.",
    });
  }
};

module.exports = {
  register,
  login,
  changePassword,
  logout,
  getMe,
};
