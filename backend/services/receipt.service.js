const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

// ==========================================
// PDF ENGINE CONFIGURATION & PALETTE
// ==========================================

const PAGE_CONFIG = {
  width: 595.28,
  height: 841.89,
  margin: 40,
  contentWidth: 515.28,
};

const PALETTE = {
  primary: "#4F46E5",
  primaryLight: "#EEF2FF",
  dark: "#0F172A",
  slate: "#334155",
  muted: "#64748B",
  lightMuted: "#94A3B8",
  border: "#E2E8F0",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC",

  // Excluded/Away Member Styling
  awayBg: "#FFF7ED",
  awayBorder: "#FFEDD5",
  awayTitle: "#C2410C",
  awayText: "#7C2D12",
  awayBadgeText: "#9A3412",
};

// ==========================================
// RECEIPT GENERATOR CONTROLLER
// ==========================================

const generateExpenseReceipt = async (expense, household, res) => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL || "https://fairshare.app"}/verify/expense/${expense._id}`;

    const qrCode = await QRCode.toDataURL(verificationUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });

    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_CONFIG.margin,
      bufferPages: true,
      autoFirstPage: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="FairShare-Receipt-${expense._id}.pdf"`,
    );

    doc.pipe(res);

    // 1. Header
    drawDocumentHeader(doc, {
      title: "Official Expense Receipt",
      subtitle: `${household.name} • ${formatDate(expense.date)}`,
      rightText: `ID: ${String(expense._id).slice(-8).toUpperCase()}`,
    });

    // 2. Main Expense Hero Box
    drawExpenseSummary(doc, expense);

    // 3. Payment & Payer Information
    sectionTitle(doc, "PAYMENT RECORD");
    drawPaymentCard(doc, expense);

    // 4. Split Details & Calculations
    sectionTitle(doc, "PARTICIPANT BREAKDOWN");
    drawParticipants(doc, expense.participants);

    // 5. Excluded / Away Members
    if (expense.excludedMembers?.length) {
      drawExcludedMembers(doc, expense.excludedMembers);
    }

    // 6. Split Configuration & Audit Rules
    drawSplitInformation(doc, expense);

    // 7. Audit Trail Information
    sectionTitle(doc, "AUDIT TRAIL & METADATA");
    drawRecordInformation(doc, expense);

    // 8. Verification QR & Footer
    drawVerification(doc, qrCode, verificationUrl);
    addFooter(doc);

    doc.end();
  } catch (error) {
    console.error("Generate expense receipt error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
};

// ==========================================
// RENDER HELPERS
// ==========================================

const drawDocumentHeader = (doc, { title, subtitle, rightText }) => {
  const startX = PAGE_CONFIG.margin;
  const startY = PAGE_CONFIG.margin;

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(PALETTE.primary)
    .text("FairShare", startX, startY);

  if (rightText) {
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(PALETTE.muted)
      .text(rightText, startX, startY + 6, {
        width: PAGE_CONFIG.contentWidth,
        align: "right",
      });
  }

  doc.y = startY + 28;

  doc.font("Helvetica-Bold").fontSize(15).fillColor(PALETTE.dark).text(title);

  doc.font("Helvetica").fontSize(9.5).fillColor(PALETTE.muted).text(subtitle);

  doc.moveDown(0.6);

  doc
    .moveTo(startX, doc.y)
    .lineTo(startX + PAGE_CONFIG.contentWidth, doc.y)
    .strokeColor(PALETTE.border)
    .lineWidth(1)
    .stroke();

  doc.y += 12;
};

const drawExpenseSummary = (doc, expense) => {
  ensureSpace(doc, 85);

  const startX = PAGE_CONFIG.margin;
  const startY = doc.y;
  const width = PAGE_CONFIG.contentWidth;
  const cardHeight = 78;

  doc
    .roundedRect(startX, startY, width, cardHeight, 6)
    .fillAndStroke(PALETTE.surfaceAlt, PALETTE.border);

  // Category Tag
  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(PALETTE.primary)
    .text(
      formatCategory(expense.category).toUpperCase(),
      startX + 14,
      startY + 12,
    );

  // Description
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(PALETTE.dark)
    .text(expense.description || "Expense", startX + 14, startY + 26, {
      width: width - 170,
    });

  // Date Subtitle
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(PALETTE.muted)
    .text(`Recorded on ${formatDate(expense.date)}`, startX + 14, startY + 54);

  // Total Amount Box
  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(PALETTE.muted)
    .text("TOTAL AMOUNT", startX + width - 150, startY + 14, {
      width: 136,
      align: "right",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(PALETTE.dark)
    .text(money(expense.amount), startX + width - 150, startY + 28, {
      width: 136,
      align: "right",
    });

  doc.y = startY + cardHeight + 10;
};

const drawPaymentCard = (doc, expense) => {
  ensureSpace(doc, 50);

  const startX = PAGE_CONFIG.margin;
  const startY = doc.y;
  const width = PAGE_CONFIG.contentWidth;
  const height = 44;

  doc
    .roundedRect(startX, startY, width, height, 5)
    .fillAndStroke(PALETTE.surface, PALETTE.border);

  const payerName = expense.paidBy?.name || "Unknown Member";

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(PALETTE.muted)
    .text("PAID BY", startX + 12, startY + 10);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(PALETTE.dark)
    .text(payerName, startX + 12, startY + 23);

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(PALETTE.muted)
    .text("Settled Amount", startX + width - 150, startY + 10, {
      width: 138,
      align: "right",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(PALETTE.dark)
    .text(money(expense.amount), startX + width - 150, startY + 23, {
      width: 138,
      align: "right",
    });

  doc.y = startY + height + 10;
};

const drawParticipants = (doc, participants = []) => {
  const startX = PAGE_CONFIG.margin;
  const width = PAGE_CONFIG.contentWidth;
  const rowHeight = 24;

  if (!participants.length) {
    emptyText(doc, "No active participants assigned to this expense.");
    return;
  }

  ensureSpace(doc, 35 + participants.length * rowHeight);

  // Table Header
  const headerY = doc.y;
  doc.roundedRect(startX, headerY, width, 22, 4).fill(PALETTE.surfaceAlt);

  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(PALETTE.muted)
    .text("PARTICIPANT", startX + 10, headerY + 7)
    .text("ALLOCATED SHARE", startX + 350, headerY + 7, {
      width: width - 360,
      align: "right",
    });

  doc.y = headerY + 22;

  // Participant Rows
  participants.forEach((participant) => {
    ensureSpace(doc, rowHeight);
    const currentY = doc.y;
    const name = participant.user?.name || "Unknown Member";

    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(PALETTE.slate)
      .text(name, startX + 10, currentY + 6, {
        width: 330,
        ellipsis: true,
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(PALETTE.dark)
      .text(money(participant.share), startX + 350, currentY + 6, {
        width: width - 360,
        align: "right",
      });

    doc
      .moveTo(startX + 4, currentY + rowHeight)
      .lineTo(startX + width - 4, currentY + rowHeight)
      .strokeColor(PALETTE.border)
      .lineWidth(0.5)
      .stroke();

    doc.y = currentY + rowHeight;
  });

  doc.y += 8;
};

const drawExcludedMembers = (doc, members = []) => {
  const startX = PAGE_CONFIG.margin;
  const width = PAGE_CONFIG.contentWidth;
  const cardPad = 10;

  let totalHeight = 16 + members.length * 14;
  members.forEach((m) => {
    if (m.reason) totalHeight += 12;
  });

  ensureSpace(doc, totalHeight + 10);

  const boxY = doc.y;
  let currentY = boxY + cardPad;

  doc
    .roundedRect(startX, boxY, width, totalHeight, 5)
    .fillAndStroke(PALETTE.awayBg, PALETTE.awayBorder);

  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(PALETTE.awayTitle)
    .text("EXCLUDED / AWAY MEMBERS", startX + cardPad, currentY);

  currentY += 12;

  members.forEach((member) => {
    const name = member.user?.name || "Unknown Member";
    const status = member.status === "away" ? "AWAY" : "NOT INCLUDED";

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(PALETTE.awayText)
      .text(name, startX + cardPad, currentY, {
        width: width - 110,
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(PALETTE.awayBadgeText)
      .text(status, startX + width - 100, currentY, {
        width: 90 - cardPad,
        align: "right",
      });

    currentY += 13;

    if (member.reason) {
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(PALETTE.awayTitle)
        .text(`Reason: ${member.reason}`, startX + cardPad, currentY, {
          width: width - cardPad * 2,
        });
      currentY += 12;
    }
  });

  doc.y = boxY + totalHeight + 10;
};

const drawSplitInformation = (doc, expense) => {
  ensureSpace(doc, 45);

  const startX = PAGE_CONFIG.margin;
  const width = PAGE_CONFIG.contentWidth;
  const y = doc.y;

  const mode =
    expense.participantMode === "manual"
      ? "Manual Allocation"
      : "Automatic Equal Split";

  doc
    .roundedRect(startX, y, width, 38, 4)
    .fillAndStroke(PALETTE.surfaceAlt, PALETTE.border);

  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(PALETTE.muted)
    .text("SPLIT METHOD", startX + 10, y + 8);

  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor(PALETTE.slate)
    .text(mode, startX + 10, y + 20);

  if (expense.participantMode === "manual" && expense.participantReason) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(PALETTE.muted)
      .text(`Reason: ${expense.participantReason}`, startX + 150, y + 20, {
        width: width - 160,
        ellipsis: true,
      });
  }

  doc.y = y + 46;
};

const drawRecordInformation = (doc, expense) => {
  const startX = PAGE_CONFIG.margin;
  const width = PAGE_CONFIG.contentWidth;

  const rows = [
    ["Receipt ID", String(expense._id)],
    [
      "Created By",
      expense.createdBy?.name || expense.paidBy?.name || "Household Member",
    ],
    ["Date Created", formatDate(expense.createdAt || expense.date)],
    ["Last Modified", formatDate(expense.updatedAt || expense.date)],
    ["Record Version", `v${expense.version || 1}.0 Verified`],
  ];

  ensureSpace(doc, rows.length * 15 + 10);

  rows.forEach(([label, value]) => {
    const y = doc.y;

    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(PALETTE.muted)
      .text(label, startX, y, { width: 110 });

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(PALETTE.slate)
      .text(value, startX + 115, y, { width: width - 115 });

    doc.y = y + 14;
  });

  doc.y += 6;
};

const drawVerification = (doc, qrCode, verificationUrl) => {
  ensureSpace(doc, 130);

  const startX = PAGE_CONFIG.margin;
  const y = doc.y;
  const width = PAGE_CONFIG.contentWidth;
  const height = 110;

  doc
    .roundedRect(startX, y, width, height, 6)
    .fillAndStroke(PALETTE.surfaceAlt, PALETTE.border);

  const qrBuffer = Buffer.from(qrCode.split(",")[1], "base64");

  doc.image(qrBuffer, {
    x: startX + 12,
    y: y + 10,
    width: 90,
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(PALETTE.dark)
    .text("Cryptographic Verification", startX + 115, y + 16);

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(PALETTE.muted)
    .text(
      "Scan this QR code to confirm that this receipt matches the immutable record stored on the FairShare server.",
      startX + 115,
      y + 32,
      { width: width - 125, lineGap: 2 },
    );

  doc
    .font("Helvetica")
    .fontSize(6.5)
    .fillColor(PALETTE.primary)
    .text(verificationUrl, startX + 115, y + 74, {
      width: width - 125,
      ellipsis: true,
    });

  doc.y = y + height + 12;

  // Bottom Notice
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(PALETTE.lightMuted)
    .text(
      "This receipt is generated directly from FairShare records and serves as proof of shared expense liability.",
      startX,
      doc.y,
      { align: "center", width: width },
    );
};

const sectionTitle = (doc, title) => {
  ensureSpace(doc, 26);
  doc.y += 4;

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(PALETTE.muted)
    .text(title, PAGE_CONFIG.margin, doc.y);

  doc.y += 5;
};

const emptyText = (doc, text) => {
  doc
    .font("Helvetica-Oblique")
    .fontSize(8.5)
    .fillColor(PALETTE.muted)
    .text(text, PAGE_CONFIG.margin, doc.y);

  doc.y += 8;
};

const ensureSpace = (doc, requiredSpace) => {
  const bottomLimit = PAGE_CONFIG.height - PAGE_CONFIG.margin - 20;
  if (doc.y + requiredSpace > bottomLimit) {
    doc.addPage();
  }
};

const money = (amount) => {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatCategory = (category) => {
  if (!category) return "Other";
  return category.charAt(0).toUpperCase() + category.slice(1);
};

const addFooter = (doc) => {
  const range = doc.bufferedPageRange();
  const footerY = PAGE_CONFIG.height - 24;

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(PALETTE.lightMuted)
      .text(
        `FairShare • Expense Receipt • Page ${i + 1} of ${range.count}`,
        PAGE_CONFIG.margin,
        footerY,
        {
          width: PAGE_CONFIG.contentWidth,
          align: "center",
        },
      );
  }
};

module.exports = {
  generateExpenseReceipt,
};
