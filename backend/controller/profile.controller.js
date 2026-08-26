const User = require("../model/user.model");

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          message: "Name cannot be empty",
        });
      }

      user.name = name.trim();
    }

    if (phone !== undefined) {
      const normalizedPhone = String(phone)
        .replace(/\D/g, "");

      if (
        normalizedPhone &&
        !/^(?:91)?[6-9]\d{9}$/.test(
          normalizedPhone,
        )
      ) {
        return res.status(400).json({
          message: "Invalid Indian phone number",
        });
      }

      if (normalizedPhone.length === 10) {
        user.phone = `91${normalizedPhone}`;
      } else {
        user.phone = normalizedPhone;
      }
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  updateProfile,
};