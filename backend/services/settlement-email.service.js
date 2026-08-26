const buildSettlementEmail = ({
  user,
  transactions,
}) => {
  const userId = user._id.toString();

  const outgoing = transactions.filter(
    (transaction) =>
      transaction.from.toString() === userId,
  );

  const incoming = transactions.filter(
    (transaction) =>
      transaction.to.toString() === userId,
  );

  let text = `Hi ${user.name},\n\n`;

  text +=
    "Here is your FairShare weekly settlement.\n\n";

  if (outgoing.length > 0) {
    text += "You need to pay:\n";

    for (const transaction of outgoing) {
      text += `• ${transaction.to.name} — ₹${Number(
        transaction.amount,
      ).toFixed(2)}\n`;
    }

    text += "\n";
  }

  if (incoming.length > 0) {
    text += "You should receive:\n";

    for (const transaction of incoming) {
      text += `• ${transaction.from.name} — ₹${Number(
        transaction.amount,
      ).toFixed(2)}\n`;
    }

    text += "\n";
  }

  if (
    outgoing.length === 0 &&
    incoming.length === 0
  ) {
    text +=
      "You are completely settled this week.\n\n";
  }

  text +=
    "Open FairShare to view the complete details.\n\n";

  text += "FairShare";

  return {
    subject:
      "FairShare — Weekly Settlement",

    text,
  };
};

module.exports = {
  buildSettlementEmail,
};