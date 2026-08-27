const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  family: 4,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },

  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});
const dns = require("dns");

dns.resolve4("smtp.gmail.com", (err, addresses) => {
  if (err) {
    console.error("DNS IPv4 failed:", err);
  } else {
    console.log("Gmail IPv4 addresses:", addresses);
  }
});
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP connection failed:", error);
  } else {
    console.log("SMTP server is ready");
  }
});

const sendEmail = async ({ to, subject, html }) => {
  if (!to) {
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);

    return info;
  } catch (error) {
    console.error("Email sending failed:", error.message);

    // Important:
    // Don't break the main API request if email fails.
  }
};

const sendNewExpenseEmail = async ({ recipient, expense, share }) => {
  return sendEmail({
    to: recipient.email,

    subject: `New expense: ${expense.description}`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #2563eb;">
          FairShare
        </h2>

        <h3>New expense added</h3>

        <p>
          Hi ${recipient.name},
        </p>

        <p>
          A new expense has been added to your household.
        </p>

        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              Description
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${expense.description}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              Amount
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ₹${Number(expense.amount).toFixed(2)}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              Paid by
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${expense.paidBy?.name || "Household member"}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              Your share
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ₹${Number(share).toFixed(2)}
            </td>
          </tr>
        </table>

        <p style="margin-top: 20px;">
          You can open FairShare to view the complete expense details.
        </p>
      </div>
    `,
  });
};

const sendExpenseUpdatedEmail = async ({ recipient, expense, share }) => {
  return sendEmail({
    to: recipient.email,

    subject: `Expense updated: ${expense.description}`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #2563eb;">
          FairShare
        </h2>

        <h3>Expense updated</h3>

        <p>
          Hi ${recipient.name},
        </p>

        <p>
          An expense in your household has been updated.
        </p>

        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              Description
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${expense.description}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              Updated amount
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ₹${Number(expense.amount).toFixed(2)}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              Paid by
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${expense.paidBy?.name || "Household member"}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              Your share
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ₹${Number(share).toFixed(2)}
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};

const sendAvailabilityEmail = async ({ recipient, memberName, status }) => {
  const isAway = status === "away";

  return sendEmail({
    to: recipient.email,

    subject: `${memberName} is now ${isAway ? "Away" : "Available"}`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #2563eb;">
          FairShare
        </h2>

        <h3>
          Availability updated
        </h3>

        <p>
          Hi ${recipient.name},
        </p>

        <p>
          <strong>${memberName}</strong>
          is now marked as
          <strong>${isAway ? "Away" : "Available"}</strong>.
        </p>

        <p>
          ${
            isAway
              ? "This member will be excluded from automatic expense participation while away."
              : "This member can now participate in automatic expense splitting."
          }
        </p>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendNewExpenseEmail,
  sendExpenseUpdatedEmail,
  sendAvailabilityEmail,
};
