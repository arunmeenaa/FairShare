const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

const generateExpenseReceipt = async (expense, household, res) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/expense/${expense._id}`;

  const qrCode = await QRCode.toDataURL(verificationUrl, {
    width: 140,
    margin: 1,
  });

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  res.setHeader("Content-Type", "application/pdf");

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="fairshare-receipt-${expense._id}.pdf"`,
  );

  doc.pipe(res);

  doc.fontSize(28).font("Helvetica-Bold").text("FairShare", {
    align: "center",
  });

  doc.fontSize(12).font("Helvetica").text("Transparent Household Expenses", {
    align: "center",
  });

  doc.moveDown(1.5);

  drawLine(doc);

  doc.fontSize(15).font("Helvetica-Bold").text(household.name);

  doc.moveDown(0.5);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`Receipt ID: ${expense._id}`)
    .text(`Version: ${expense.version}`)
    .text(`Expense Date: ${formatDate(expense.date)}`)
    .text(`Generated: ${formatDate(new Date())}`);

  doc.moveDown();

  drawLine(doc);

  doc.fontSize(16).font("Helvetica-Bold").text("Expense Details");

  doc.moveDown(0.5);

  doc
    .fontSize(11)
    .font("Helvetica")
    .text(`Description: ${expense.description}`)
    .text(`Category: ${formatCategory(expense.category)}`)
    .text(`Paid By: ${expense.paidBy.name}`)
    .text(`Total Amount: ₹${expense.amount.toFixed(2)}`);

  doc.moveDown();

  doc.fontSize(16).font("Helvetica-Bold").text("Payment Information");

  doc.moveDown(0.5);

  doc
    .fontSize(11)
    .font("Helvetica")
    .text(`${expense.paidBy.name} paid ₹${expense.amount.toFixed(2)}`);

  doc.moveDown();

  doc.fontSize(16).font("Helvetica-Bold").text("Split Details");

  doc.moveDown(0.5);

  expense.participants.forEach((participant) => {
    doc
      .fontSize(11)
      .font("Helvetica")
      .text(
        `${participant.user.name} ........ ₹${participant.share.toFixed(2)}`,
      );
  });

  doc.moveDown();

  doc
    .fontSize(11)
    .text(
      `Split Mode: ${
        expense.participantMode === "manual" ? "Manual" : "Automatic"
      }`,
    );

  if (expense.participantMode === "manual" && expense.participantReason) {
    doc.fontSize(10).text(`Reason: ${expense.participantReason}`);
  }

  if (expense.category === "grocery") {
    doc.moveDown();

    doc.fontSize(16).font("Helvetica-Bold").text("Grocery Participation");

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        "This grocery expense was split using the household's grocery participation and availability rules.",
      );
  }

  doc.moveDown();

  doc.fontSize(16).font("Helvetica-Bold").text("Record Information");

  doc.moveDown(0.5);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`Created By: ${expense.createdBy.name}`)
    .text(`Created At: ${formatDate(expense.createdAt)}`)
    .text(`Last Updated: ${formatDate(expense.updatedAt)}`)
    .text(`Record Version: ${expense.version}`);

  doc.moveDown(1);

  doc.fontSize(16).font("Helvetica-Bold").text("Verify Receipt");

  doc.moveDown(0.5);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      "Scan the QR code to verify this receipt against the FairShare record.",
    );

  const qrBuffer = Buffer.from(qrCode.split(",")[1], "base64");

  doc.image(qrBuffer, {
    width: 120,
  });

  doc.fontSize(8).text(verificationUrl);

  doc.moveDown(1);

  drawLine(doc);

  doc
    .fontSize(9)
    .text(
      "This receipt is generated directly from the FairShare expense record.",
    );

  doc.text("It cannot be manually edited through the application.");

  doc.end();
};

const drawLine = (doc) => {
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();

  doc.moveDown(0.5);
};

const formatDate = (date) => {
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatCategory = (category) => {
  return category.charAt(0).toUpperCase() + category.slice(1);
};

module.exports = {
  generateExpenseReceipt,
};
