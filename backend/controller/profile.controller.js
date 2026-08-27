const User = require("../model/user.model");

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    if (phone !== undefined && phone !== null) {
      const cleanPhone = String(phone).trim();

      if (cleanPhone && !/^[0-9]{10}$/.test(cleanPhone)) {
        return res.status(400).json({
          message: "Phone number must be 10 digits",
        });
      }
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.name = name.trim();

    user.phone = phone !== undefined ? String(phone).trim() : user.phone;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      message: "Failed to update profile",
    });
  }
};

module.exports = {
  updateProfile,
};
