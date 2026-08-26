const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async ({
  to,
  subject,
  text,
  html,
}) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  if (!process.env.EMAIL_USER) {
    throw new Error(
      "EMAIL_USER is not configured",
    );
  }

  if (!process.env.EMAIL_PASSWORD) {
    throw new Error(
      "EMAIL_PASSWORD is not configured",
    );
  }

  try {
    const result = await transporter.sendMail({
      from:
        process.env.EMAIL_FROM ||
        process.env.EMAIL_USER,

      to,

      subject,

      text,

      html,
    });

    console.log(
      `Email sent to ${to}: ${result.messageId}`,
    );

    return result;
  } catch (error) {
    console.error(
      "Email sending failed:",
      error.message,
    );

    throw new Error(
      "Failed to send email",
    );
  }
};

module.exports = {
  sendEmail,
};