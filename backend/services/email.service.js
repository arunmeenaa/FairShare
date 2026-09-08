const axios = require("axios");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const requireBrevoConfig = () => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  if (!process.env.BREVO_FROM_EMAIL) {
    throw new Error("BREVO_FROM_EMAIL is not configured");
  }
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  if (!subject) {
    throw new Error("Email subject is required");
  }

  if (!text && !html) {
    throw new Error("Email content is required");
  }

  requireBrevoConfig();

  const payload = {
    sender: {
      name: process.env.BREVO_FROM_NAME || "FairShare",
      email: process.env.BREVO_FROM_EMAIL,
    },
    to: [
      {
        email: to,
      },
    ],
    subject,
  };

  if (text) {
    payload.textContent = text;
  }

  if (html) {
    payload.htmlContent = html;
  }

  try {
    const response = await axios.post(BREVO_API_URL, payload, {
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    const brevoError = error.response?.data;

    const message =
      brevoError?.message ||
      brevoError?.code ||
      error.message ||
      "Unknown Brevo error";

    console.error("Brevo email sending failed:", {
      to,
      subject,
      status: error.response?.status,
      response: brevoError,
      message,
    });

    const sendError = new Error(`Brevo email sending failed: ${message}`);

    sendError.status = error.response?.status;
    sendError.response = brevoError;
    sendError.cause = error;

    throw sendError;
  }
};

/*
 * Expense/availability emails should not break the main
 * application operation when Brevo is temporarily unavailable.
 */
const sendBestEffortEmail = async (emailOptions, label) => {
  try {
    return await sendEmail(emailOptions);
  } catch (error) {
    console.error(`${label} failed:`, error.message);
    return null;
  }
};

const buildExpenseHtml = ({
  title,
  intro,
  recipient,
  expense,
  share,
  showUpdatedAmount = false,
}) => {
  const safeRecipientName = escapeHtml(recipient?.name || "there");

  const safeDescription = escapeHtml(expense?.description || "Expense");

  const safePayer = escapeHtml(expense?.paidBy?.name || "Household member");

  const safeShare = Number(share || 0).toFixed(2);

  const safeAmount = Number(expense?.amount || 0).toFixed(2);

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.6;">
      <div style="padding:24px 0 16px;">
        <h2 style="margin:0;color:#4f46e5;">FairShare</h2>
      </div>

      <div style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:20px;background:#eef2ff;border-bottom:1px solid #e0e7ff;">
          <h3 style="margin:0;color:#1e1b4b;">
            ${escapeHtml(title)}
          </h3>
        </div>

        <div style="padding:20px;">
          <p style="margin-top:0;">
            Hi ${safeRecipientName},
          </p>

          <p>${escapeHtml(intro)}</p>

          <table style="border-collapse:collapse;width:100%;font-size:14px;">
            <tr>
              <td style="padding:10px;border:1px solid #e2e8f0;font-weight:600;">
                Description
              </td>
              <td style="padding:10px;border:1px solid #e2e8f0;">
                ${safeDescription}
              </td>
            </tr>

            <tr>
              <td style="padding:10px;border:1px solid #e2e8f0;font-weight:600;">
                ${showUpdatedAmount ? "Updated amount" : "Amount"}
              </td>

              <td style="padding:10px;border:1px solid #e2e8f0;">
                ₹${safeAmount}
              </td>
            </tr>

            <tr>
              <td style="padding:10px;border:1px solid #e2e8f0;font-weight:600;">
                Paid by
              </td>

              <td style="padding:10px;border:1px solid #e2e8f0;">
                ${safePayer}
              </td>
            </tr>

            <tr>
              <td style="padding:10px;border:1px solid #e2e8f0;font-weight:600;">
                Your share
              </td>

              <td style="padding:10px;border:1px solid #e2e8f0;">
                ₹${safeShare}
              </td>
            </tr>
          </table>

          <p style="margin-bottom:0;margin-top:20px;color:#475569;">
            Open FairShare to view the complete expense details.
          </p>
        </div>
      </div>

      <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;">
        This is an automated message from FairShare.
      </p>
    </div>
  `;
};

const sendNewExpenseEmail = async ({ recipient, expense, share }) => {
  const description = expense?.description || "Expense";

  const amount = Number(expense?.amount || 0).toFixed(2);

  const payer = expense?.paidBy?.name || "Household member";

  const userShare = Number(share || 0).toFixed(2);

  return sendBestEffortEmail(
    {
      to: recipient?.email,

      subject: `New expense: ${description}`,

      text: [
        `Hi ${recipient?.name || "there"},`,
        "",
        "A new expense has been added to your household.",
        "",
        `Description: ${description}`,
        `Amount: ₹${amount}`,
        `Paid by: ${payer}`,
        `Your share: ₹${userShare}`,
        "",
        "Open FairShare to view the complete expense details.",
      ].join("\n"),

      html: buildExpenseHtml({
        title: "New expense added",
        intro: "A new expense has been added to your household.",
        recipient,
        expense,
        share,
      }),
    },
    "New expense email",
  );
};

const sendExpenseUpdatedEmail = async ({ recipient, expense, share }) => {
  const description = expense?.description || "Expense";

  const amount = Number(expense?.amount || 0).toFixed(2);

  const payer = expense?.paidBy?.name || "Household member";

  const userShare = Number(share || 0).toFixed(2);

  return sendBestEffortEmail(
    {
      to: recipient?.email,

      subject: `Expense updated: ${description}`,

      text: [
        `Hi ${recipient?.name || "there"},`,
        "",
        "An expense in your household has been updated.",
        "",
        `Description: ${description}`,
        `Updated amount: ₹${amount}`,
        `Paid by: ${payer}`,
        `Your share: ₹${userShare}`,
        "",
        "Open FairShare to view the complete expense details.",
      ].join("\n"),

      html: buildExpenseHtml({
        title: "Expense updated",
        intro: "An expense in your household has been updated.",
        recipient,
        expense,
        share,
        showUpdatedAmount: true,
      }),
    },
    "Expense updated email",
  );
};

const sendAvailabilityEmail = async ({ recipient, memberName, status }) => {
  const isAway = status === "away";

  const normalizedMemberName = memberName || "A household member";

  const statusLabel = isAway ? "Away" : "Available";

  const text = [
    `Hi ${recipient?.name || "there"},`,
    "",
    `${normalizedMemberName} is now marked as ${statusLabel}.`,
    "",
    isAway
      ? "This member will be excluded from automatic expense participation while away."
      : "This member can now participate in automatic expense splitting.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.6;">
      <div style="padding:24px 0 16px;">
        <h2 style="margin:0;color:#4f46e5;">FairShare</h2>
      </div>

      <div style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:20px;background:#eef2ff;border-bottom:1px solid #e0e7ff;">
          <h3 style="margin:0;color:#1e1b4b;">
            Availability updated
          </h3>
        </div>

        <div style="padding:20px;">
          <p style="margin-top:0;">
            Hi ${escapeHtml(recipient?.name || "there")},
          </p>

          <p>
            <strong>
              ${escapeHtml(normalizedMemberName)}
            </strong>
            is now marked as
            <strong>
              ${escapeHtml(statusLabel)}
            </strong>.
          </p>

          <p>
            ${escapeHtml(
              isAway
                ? "This member will be excluded from automatic expense participation while away."
                : "This member can now participate in automatic expense splitting.",
            )}
          </p>
        </div>
      </div>

      <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;">
        This is an automated message from FairShare.
      </p>
    </div>
  `;

  return sendBestEffortEmail(
    {
      to: recipient?.email,
      subject: `${normalizedMemberName} is now ${statusLabel}`,
      text,
      html,
    },
    "Availability email",
  );
};

module.exports = {
  sendEmail,
  sendNewExpenseEmail,
  sendExpenseUpdatedEmail,
  sendAvailabilityEmail,
  escapeHtml,
};
