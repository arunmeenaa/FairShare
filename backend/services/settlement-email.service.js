const { escapeHtml } = require("./email.service");

const buildSettlementEmail = ({ user, transactions = [] }) => {
  const userId = user._id.toString();

  const outgoing = transactions.filter(
    (transaction) => transaction.from?.toString() === userId,
  );

  const incoming = transactions.filter(
    (transaction) => transaction.to?.toString() === userId,
  );

  const displayName = user.name || "there";

  let text = `Hi ${displayName},\n\n`;

  text += "Here is your FairShare weekly settlement.\n\n";

  if (outgoing.length > 0) {
    text += "You need to pay:\n";

    for (const transaction of outgoing) {
      const recipientName = transaction.to?.name || "Household member";

      text += `• ${recipientName} — ₹${Number(transaction.amount || 0).toFixed(
        2,
      )}\n`;
    }

    text += "\n";
  }

  if (incoming.length > 0) {
    text += "You should receive:\n";

    for (const transaction of incoming) {
      const senderName = transaction.from?.name || "Household member";

      text += `• ${senderName} — ₹${Number(transaction.amount || 0).toFixed(
        2,
      )}\n`;
    }

    text += "\n";
  }

  if (outgoing.length === 0 && incoming.length === 0) {
    text += "You are completely settled this week.\n\n";
  }

  text += "Open FairShare to view the complete details.\n\n";

  text += "FairShare";

  const outgoingRows = outgoing
    .map(
      (transaction) => `
        <tr>
          <td style="padding:10px;border:1px solid #e2e8f0;">
            ${escapeHtml(transaction.to?.name || "Household member")}
          </td>

          <td style="padding:10px;border:1px solid #e2e8f0;color:#dc2626;font-weight:700;">
            ₹${Number(transaction.amount || 0).toFixed(2)}
          </td>
        </tr>
      `,
    )
    .join("");

  const incomingRows = incoming
    .map(
      (transaction) => `
        <tr>
          <td style="padding:10px;border:1px solid #e2e8f0;">
            ${escapeHtml(transaction.from?.name || "Household member")}
          </td>

          <td style="padding:10px;border:1px solid #e2e8f0;color:#059669;font-weight:700;">
            ₹${Number(transaction.amount || 0).toFixed(2)}
          </td>
        </tr>
      `,
    )
    .join("");

  let settlementHtml = "";

  if (outgoing.length > 0) {
    settlementHtml += `
      <h4 style="margin:22px 0 10px;color:#991b1b;">
        You need to pay
      </h4>

      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <thead>
          <tr>
            <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;background:#f8fafc;">
              Member
            </th>

            <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;background:#f8fafc;">
              Amount
            </th>
          </tr>
        </thead>

        <tbody>
          ${outgoingRows}
        </tbody>
      </table>
    `;
  }

  if (incoming.length > 0) {
    settlementHtml += `
      <h4 style="margin:22px 0 10px;color:#047857;">
        You should receive
      </h4>

      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <thead>
          <tr>
            <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;background:#f8fafc;">
              Member
            </th>

            <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;background:#f8fafc;">
              Amount
            </th>
          </tr>
        </thead>

        <tbody>
          ${incomingRows}
        </tbody>
      </table>
    `;
  }

  if (outgoing.length === 0 && incoming.length === 0) {
    settlementHtml = `
      <div style="padding:14px 16px;border-radius:12px;background:#ecfdf5;color:#065f46;">
        You are completely settled this week.
      </div>
    `;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.6;">
      <div style="padding:24px 0 16px;">
        <h2 style="margin:0;color:#4f46e5;">
          FairShare
        </h2>

        <p style="margin:4px 0 0;color:#64748b;font-size:13px;">
          Weekly Settlement
        </p>
      </div>

      <div style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:20px;background:#eef2ff;border-bottom:1px solid #e0e7ff;">
          <h3 style="margin:0;color:#1e1b4b;">
            Your weekly settlement
          </h3>
        </div>

        <div style="padding:20px;">
          <p style="margin-top:0;">
            Hi ${escapeHtml(displayName)},
          </p>

          <p>
            Here is your FairShare weekly settlement.
          </p>

          ${settlementHtml}

          <p style="margin-bottom:0;margin-top:22px;color:#475569;">
            Open FairShare to view the complete details.
          </p>
        </div>
      </div>

      <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;">
        This is an automated weekly message from FairShare.
      </p>
    </div>
  `;

  return {
    subject: "FairShare — Weekly Settlement",
    text,
    html,
  };
};

module.exports = {
  buildSettlementEmail,
};
