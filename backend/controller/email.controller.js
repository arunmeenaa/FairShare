const User = require("../model/user.model");
const { sendEmail } = require("../services/email.service");

const testEmail = async (req, res) => {
  try {
    const user = await User.findById(
      req.user._id,
    ).select("name email");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await sendEmail({
      to: user.email,

      subject:
        "FairShare Email Test",

      text:
        `Hello ${user.name},\n\n` +
        `This is a test email from FairShare.\n\n` +
        `Your email notification system is working.`,

      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>FairShare</h2>

          <p>
            Hello ${user.name},
          </p>

          <p>
            This is a test email from FairShare.
          </p>

          <p>
            Your email notification system is working.
          </p>
        </div>
      `,
    });

    res.status(200).json({
      message: "Test email sent successfully",
    });
  } catch (error) {
    console.error(
      "Test email error:",
      error,
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  testEmail,
};