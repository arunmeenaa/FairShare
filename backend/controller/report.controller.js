const Expense = require("../model/expense.model");
const Household = require("../model/household.model");
const Settlement = require("../model/settlement.model");
const PDFDocument = require("pdfkit");

const { calculateMonthSummary } = require("../services/settlement.service");

const { generateExpenseReceipt } = require("../services/receipt.service");

const generateReceipt = async (req, res) => {
  try {
    const { householdId, expenseId } = req.params;

    const household = await Household.findOne({
      _id: householdId,
      members: {
        $elemMatch: {
          user: req.user._id,
          isActive: true,
        },
      },
    });

    if (!household) {
      return res.status(404).json({
        message: "Household not found or you are not a member",
      });
    }

    const expense = await Expense.findOne({
      _id: expenseId,
      household: householdId,
      isDeleted: false,
    })
      .populate("paidBy", "name email")
      .populate("createdBy", "name email")
      .populate("participants.user", "name email")
      .populate("excludedMembers.user", "name email");

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    await generateExpenseReceipt(expense, household, res);
  } catch (error) {
    console.error("Generate receipt error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: error.message,
      });
    }
  }
};

const getMonthlyReport = async (req, res) => {
  try {
    const { householdId } = req.params;
    const { month, year } = req.query;

    const monthNumber = Number(month);
    const yearNumber = Number(year);

    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({
        message: "Invalid month",
      });
    }

    if (!Number.isInteger(yearNumber) || yearNumber < 2000) {
      return res.status(400).json({
        message: "Invalid year",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Authorization
    |--------------------------------------------------------------------------
    */

    const household = await Household.findOne({
      _id: householdId,
      members: {
        $elemMatch: {
          user: req.user._id,
          isActive: true,
        },
      },
    });

    if (!household) {
      return res.status(404).json({
        message: "Household not found or you are not a member",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CENTRAL MONTHLY CALCULATION
    |--------------------------------------------------------------------------
    */

    const summary = await calculateMonthSummary({
      householdId,
      month: monthNumber,
      year: yearNumber,
    });

    /*
    |--------------------------------------------------------------------------
    | Current User
    |--------------------------------------------------------------------------
    */

    const currentUser =
      summary.memberBalances.find(
        (member) => getId(member.user) === req.user._id.toString(),
      ) || null;

    /*
    |--------------------------------------------------------------------------
    | Existing Settlement Snapshot
    |--------------------------------------------------------------------------
    |
    | This is kept separate from the live monthly calculation.
    |
    */

    const settlement = await Settlement.findOne({
      household: householdId,
      month: monthNumber,
      year: yearNumber,
    });

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      month: monthNumber,
      year: yearNumber,

      totalSpending: summary.totalExpenses,

      categoryTotals: summary.categoryTotals,

      currentUser,

      members: summary.memberBalances,

      recentExpenses: summary.expenses.slice(0, 5).map((expense) => ({
        _id: expense._id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        paidBy: expense.paidBy,
        participants: expense.participants || [],
        excludedMembers: expense.excludedMembers || [],
        participantMode: expense.participantMode,
        participantReason: expense.participantReason,
      })),

      /*
       * Live calculation of who pays whom.
       *
       * This comes from the central calculation service.
       */
      transactions: summary.transactions,

      expenseCount: summary.expenseCount,

      settlement: settlement
        ? {
            id: settlement._id,
            status: settlement.status,
            closedAt: settlement.closedAt,
            transactions: settlement.transactions,
          }
        : null,
    });
  } catch (error) {
    console.error("Monthly report error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const generateMonthlyReceipt = async (req, res) => {
  try {
    const { householdId } = req.params;
    const { month, year } = req.query;

    const monthNumber = Number(month);
    const yearNumber = Number(year);

    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({
        message: "Invalid month",
      });
    }

    if (!Number.isInteger(yearNumber) || yearNumber < 2000) {
      return res.status(400).json({
        message: "Invalid year",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Authorization
    |--------------------------------------------------------------------------
    */

    const household = await Household.findOne({
      _id: householdId,
      members: {
        $elemMatch: {
          user: req.user._id,
          isActive: true,
        },
      },
    }).populate("members.user", "name email");

    if (!household) {
      return res.status(404).json({
        message: "Household not found or you are not a member",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CENTRAL MONTHLY CALCULATION
    |--------------------------------------------------------------------------
    */

    const summary = await calculateMonthSummary({
      householdId,
      month: monthNumber,
      year: yearNumber,
    });

    const expenses = summary.expenses;

    /*
    |--------------------------------------------------------------------------
    | Current User
    |--------------------------------------------------------------------------
    */

    const userId = req.user._id.toString();

    /*
    |--------------------------------------------------------------------------
    | Expenses involving current user
    |--------------------------------------------------------------------------
    */

    const myExpenses = expenses.filter((expense) => {
      const paidByMe = getId(expense.paidBy) === userId;

      const participant = (expense.participants || []).some(
        (item) => getId(item.user) === userId,
      );

      const excluded = (expense.excludedMembers || []).some(
        (item) => getId(item.user) === userId,
      );

      return paidByMe || participant || excluded;
    });

    /*
    |--------------------------------------------------------------------------
    | Personal totals
    |--------------------------------------------------------------------------
    */

    let totalPaid = 0;
    let totalShare = 0;

    expenses.forEach((expense) => {
      if (getId(expense.paidBy) === userId) {
        totalPaid += Number(expense.amount);
      }

      const participant = (expense.participants || []).find(
        (item) => getId(item.user) === userId,
      );

      if (participant) {
        totalShare += Number(participant.share);
      }
    });

    totalPaid = roundMoney(totalPaid);

    totalShare = roundMoney(totalShare);

    const balance = roundMoney(totalPaid - totalShare);

    /*
    |--------------------------------------------------------------------------
    | Personal transactions
    |--------------------------------------------------------------------------
    */

    const personalTransactions = summary.transactions.filter(
      (transaction) =>
        getId(transaction.from) === userId || getId(transaction.to) === userId,
    );

    /*
    |--------------------------------------------------------------------------
    | PDF Headers
    |--------------------------------------------------------------------------
    */

    sendPdfHeaders(
      res,
      `fairshare-my-receipt-${yearNumber}-${String(monthNumber).padStart(
        2,
        "0",
      )}.pdf`,
    );

    const doc = createPdf(res);

    /*
    |--------------------------------------------------------------------------
    | Header
    |--------------------------------------------------------------------------
    */

    drawDocumentHeader(doc, {
      title: "Personal Expense Summary",

      subtitle: `${household.name} • ${getMonthName(
        monthNumber,
      )} ${yearNumber}`,

      rightText: req.user.name || "Member Receipt",
    });

    /*
    |--------------------------------------------------------------------------
    | Summary Cards
    |--------------------------------------------------------------------------
    */

    drawSummaryCards(doc, [
      {
        label: "YOU PAID",
        value: money(totalPaid),
      },
      {
        label: "YOUR SHARE",
        value: money(totalShare),
      },
      {
        label: balance > 0 ? "TO RECEIVE" : balance < 0 ? "TO PAY" : "SETTLED",

        value: money(Math.abs(balance)),

        highlight: balance !== 0,

        positive: balance > 0,
      },
    ]);

    /*
    |--------------------------------------------------------------------------
    | Your Expense Activity
    |--------------------------------------------------------------------------
    */

    sectionTitle(doc, "YOUR EXPENSE ACTIVITY");

    if (!myExpenses.length) {
      emptyMessage(doc, "No expenses involving you recorded this month.");
    } else {
      myExpenses.forEach((expense) => {
        drawExpenseCard(doc, expense, userId, true);
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Settlement Breakdown
    |--------------------------------------------------------------------------
    */

    sectionTitle(doc, "SETTLEMENT BREAKDOWN");

    if (!personalTransactions.length) {
      emptyMessage(doc, "No pending settlement transactions for your account.");
    } else {
      personalTransactions.forEach((transaction) => {
        drawTransactionCard(
          doc,
          transaction,
          summary.memberBalances,
          household,
        );
      });
    }

    drawStatementFooter(doc);
    addPageNumbers(doc);

    doc.end();
  } catch (error) {
    console.error("Generate monthly receipt error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: error.message,
      });
    }
  }
};

const generateHouseholdReceipt = async (req, res) => {
  try {
    const { householdId } = req.params;
    const { month, year } = req.query;

    const monthNumber = Number(month);
    const yearNumber = Number(year);

    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({
        message: "Invalid month",
      });
    }

    if (!Number.isInteger(yearNumber) || yearNumber < 2000) {
      return res.status(400).json({
        message: "Invalid year",
      });
    }

    const household = await Household.findOne({
      _id: householdId,
      members: {
        $elemMatch: {
          user: req.user._id,
          isActive: true,
        },
      },
    }).populate("members.user", "name email");

    if (!household) {
      return res.status(404).json({
        message: "Household not found or you are not a member",
      });
    }

    const summary = await calculateMonthSummary({
      householdId,
      month: monthNumber,
      year: yearNumber,
    });

    const expenses = summary.expenses;

    const transactions = summary.transactions;

    const settlement = await Settlement.findOne({
      household: householdId,
      month: monthNumber,
      year: yearNumber,
    });

    sendPdfHeaders(
      res,
      `fairshare-household-${yearNumber}-${String(monthNumber).padStart(
        2,
        "0",
      )}.pdf`,
    );

    const doc = createPdf(res);

    drawDocumentHeader(doc, {
      title: "Household Monthly Statement",

      subtitle: `${household.name} • ${getMonthName(
        monthNumber,
      )} ${yearNumber}`,

      rightText: "Household Audit",
    });

    /*
    |--------------------------------------------------------------------------
    | Summary Cards
    |--------------------------------------------------------------------------
    */

    drawSummaryCards(doc, [
      {
        label: "TOTAL SPENDING",
        value: money(summary.totalExpenses),
      },

      {
        label: "TOTAL TRANSACTIONS",
        value: String(expenses.length),
      },

      {
        label: "ACTIVE MEMBERS",
        value: String(
          String(
            household.members.filter(
              (member) => member.isActive === true && member.user,
            ).length,
          ),
        ),
      },
    ]);

    sectionTitle(doc, "MEMBER BALANCES & SHARES");

    drawMemberTable(doc, summary.memberBalances, household);

    /*
    |--------------------------------------------------------------------------
    | Expense History
    |--------------------------------------------------------------------------
    */

    sectionTitle(doc, "EXPENSE HISTORY");

    if (!expenses.length) {
      emptyMessage(doc, "No expenses recorded this month.");
    } else {
      expenses.forEach((expense) => {
        drawExpenseCard(doc, expense, null, false);
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Settlement Status
    |--------------------------------------------------------------------------
    */

    sectionTitle(doc, "SETTLEMENT STATUS");

    if (!transactions.length) {
      emptyMessage(
        doc,
        settlement?.status === "closed"
          ? "Settlement is fully closed. All accounts balanced."
          : "All balances are settled. No transfers required.",
      );
    } else {
      transactions.forEach((transaction) => {
        drawTransactionCard(
          doc,
          transaction,
          summary.memberBalances,
          household,
        );
      });
    }

    drawStatementFooter(doc);
    addPageNumbers(doc);

    doc.end();
  } catch (error) {
    console.error("Generate household receipt error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: error.message,
      });
    }
  }
};

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

  // Subtle Red/Orange Theme for Excluded/Away
  awayBg: "#FFF7ED",
  awayBorder: "#FFEDD5",
  awayTitle: "#C2410C",
  awayText: "#7C2D12",
  awayBadgeBg: "#FFEDD5",
  awayBadgeText: "#9A3412",

  danger: "#DC2626",
  dangerText: "#991B1B",
  success: "#16A34A",
  successBg: "#F0FDF4",
  successText: "#166534",
};

const createPdf = (res) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE_CONFIG.margin,
    bufferPages: true,
    autoFirstPage: true,
  });

  doc.pipe(res);
  return doc;
};

const sendPdfHeaders = (res, fileName) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
};

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
      .text(rightText.toUpperCase(), startX, startY + 6, {
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

  doc.y += 10;
};

const drawSummaryCards = (doc, cards) => {
  ensureSpace(doc, 60);

  const startX = PAGE_CONFIG.margin;
  const startY = doc.y;
  const gap = 12;
  const count = cards.length;
  const cardWidth = (PAGE_CONFIG.contentWidth - gap * (count - 1)) / count;
  const cardHeight = 52;

  cards.forEach((card, index) => {
    const cardX = startX + index * (cardWidth + gap);

    doc
      .roundedRect(cardX, startY, cardWidth, cardHeight, 6)
      .fillAndStroke(PALETTE.surfaceAlt, PALETTE.border);

    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(PALETTE.muted)
      .text(card.label, cardX + 10, startY + 10, {
        width: cardWidth - 20,
      });

    let valColor = PALETTE.dark;
    if (card.highlight) {
      valColor = card.positive ? PALETTE.success : PALETTE.danger;
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(13.5)
      .fillColor(valColor)
      .text(card.value, cardX + 10, startY + 26, {
        width: cardWidth - 20,
      });
  });

  doc.y = startY + cardHeight + 14;
};

const drawMemberTable = (doc, memberBalances, household) => {
  const startX = PAGE_CONFIG.margin;
  const width = PAGE_CONFIG.contentWidth;
  const rowHeight = 24;

  ensureSpace(doc, 40 + memberBalances.length * rowHeight);

  const headerY = doc.y;
  doc.roundedRect(startX, headerY, width, 22, 4).fill(PALETTE.surfaceAlt);

  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(PALETTE.muted)
    .text("MEMBER", startX + 10, headerY + 7)
    .text("PAID", startX + 220, headerY + 7, { width: 80, align: "right" })
    .text("SHARE", startX + 310, headerY + 7, { width: 80, align: "right" })
    .text("NET BALANCE", startX + 400, headerY + 7, {
      width: 105,
      align: "right",
    });

  doc.y = headerY + 22;

  memberBalances.forEach((member) => {
    ensureSpace(doc, rowHeight);

    const currentY = doc.y;
    const name = resolveMemberName(member.user, memberBalances, household);
    const balance = Number(member.balance || 0);

    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(PALETTE.slate)
      .text(name, startX + 10, currentY + 6, {
        width: 200,
        ellipsis: true,
      })
      .text(money(member.paid), startX + 220, currentY + 6, {
        width: 80,
        align: "right",
      })
      .text(money(member.share), startX + 310, currentY + 6, {
        width: 80,
        align: "right",
      });

    const balColor =
      balance > 0
        ? PALETTE.successText
        : balance < 0
          ? PALETTE.dangerText
          : PALETTE.muted;

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(balColor)
      .text(balanceText(balance), startX + 400, currentY + 6, {
        width: 105,
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

const drawExpenseCard = (doc, expense, currentUserId, personal) => {
  const startX = PAGE_CONFIG.margin;
  const width = PAGE_CONFIG.contentWidth;
  const cardPadding = 12;
  const innerWidth = width - cardPadding * 2;
  const innerX = startX + cardPadding;

  const participants = expense.participants || [];
  const excludedMembers = expense.excludedMembers || [];

  // Precise dynamic height computation
  let cardContentHeight = 12; // Top padding
  cardContentHeight += 12; // Category & Date
  cardContentHeight += 16; // Description & Amount
  cardContentHeight += 12; // Paid by
  cardContentHeight += 16; // PARTICIPANTS header
  cardContentHeight += participants.length * 14; // Participant rows

  let excludedBoxHeight = 0;
  if (excludedMembers.length > 0) {
    excludedBoxHeight += 8; // Internal top pad
    excludedBoxHeight += 10; // NOT INCLUDED Header
    excludedMembers.forEach((m) => {
      excludedBoxHeight += 13; // Member row
      if (m.reason) excludedBoxHeight += 12; // Reason row
    });
    excludedBoxHeight += 6; // Internal bottom pad
    cardContentHeight += excludedBoxHeight + 8;
  }

  let personalBadgeHeight = 0;
  const isPayer = getId(expense.paidBy) === currentUserId;
  const myParticipant = participants.find(
    (p) => getId(p.user) === currentUserId,
  );
  const myExcluded = excludedMembers.find(
    (e) => getId(e.user) === currentUserId,
  );

  if (personal && currentUserId) {
    if (myExcluded) {
      personalBadgeHeight = myExcluded.reason ? 24 : 14;
    } else if (isPayer || myParticipant) {
      personalBadgeHeight = 14;
    }
    if (personalBadgeHeight > 0) {
      cardContentHeight += personalBadgeHeight + 8;
    }
  }

  cardContentHeight += 12; // Bottom padding
  const totalCardHeight = cardContentHeight;

  ensureSpace(doc, totalCardHeight + 8);

  const cardY = doc.y;

  // 1. Draw Card Outer Box
  doc
    .roundedRect(startX, cardY, width, totalCardHeight, 6)
    .fillAndStroke(PALETTE.surface, PALETTE.border);

  let currentY = cardY + cardPadding;

  // 2. Category (Left) & Date (Right)
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(PALETTE.primary)
    .text(formatCategory(expense.category).toUpperCase(), innerX, currentY);

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(PALETTE.muted)
    .text(formatShortDate(expense.date), innerX, currentY, {
      width: innerWidth,
      align: "right",
    });

  currentY += 13;

  // 3. Description (Left) & Amount (Right)
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(PALETTE.dark)
    .text(expense.description || "Expense", innerX, currentY, {
      width: innerWidth - 120,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(PALETTE.dark)
    .text(money(expense.amount), innerX + innerWidth - 110, currentY, {
      width: 110,
      align: "right",
    });

  currentY += 15;

  // 4. Paid By Subtitle
  const payerName = expense.paidBy?.name || "Unknown Member";
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(PALETTE.muted)
    .text(`Paid by ${payerName}`, innerX, currentY);

  currentY += 14;

  // 5. Participants Section
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(PALETTE.lightMuted)
    .text("PARTICIPANTS", innerX, currentY);

  currentY += 11;

  participants.forEach((participant) => {
    const pName = participant.user?.name || "Unknown Member";
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(PALETTE.slate)
      .text(pName, innerX + 4, currentY, {
        width: innerWidth - 110,
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(PALETTE.slate)
      .text(money(participant.share), innerX + innerWidth - 110, currentY, {
        width: 110,
        align: "right",
      });

    currentY += 14;
  });

  // 6. Subtle Orange/Red Away & Not Included Box
  if (excludedMembers.length > 0) {
    currentY += 4;
    const boxY = currentY;
    const boxPad = 8;
    const boxInnerX = innerX + boxPad;
    const boxInnerWidth = innerWidth - boxPad * 2;

    doc
      .roundedRect(innerX, boxY, innerWidth, excludedBoxHeight, 4)
      .fillAndStroke(PALETTE.awayBg, PALETTE.awayBorder);

    let innerBoxY = boxY + 7;

    doc
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .fillColor(PALETTE.awayTitle)
      .text("NOT INCLUDED", boxInnerX, innerBoxY);

    innerBoxY += 10;

    excludedMembers.forEach((member) => {
      const name = member.user?.name || "Unknown Member";
      const status = member.status === "away" ? "AWAY" : "NOT INCLUDED";

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(PALETTE.awayText)
        .text(name, boxInnerX, innerBoxY, {
          width: boxInnerWidth - 90,
        });

      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(PALETTE.awayBadgeText)
        .text(status, boxInnerX + boxInnerWidth - 80, innerBoxY, {
          width: 80,
          align: "right",
        });

      innerBoxY += 12;

      if (member.reason) {
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(PALETTE.awayTitle)
          .text(`Reason: ${member.reason}`, boxInnerX, innerBoxY, {
            width: boxInnerWidth,
          });
        innerBoxY += 12;
      }
    });

    currentY = boxY + excludedBoxHeight + 6;
  }

  // 7. Personal Role & Allocation Banner
  if (personal && currentUserId) {
    if (myExcluded) {
      currentY += 2;
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(PALETTE.awayTitle)
        .text(
          myExcluded.status === "away"
            ? "YOU WERE AWAY · NOT INCLUDED IN THIS EXPENSE"
            : "YOU WERE NOT INCLUDED IN THIS EXPENSE",
          innerX,
          currentY,
        );

      if (myExcluded.reason) {
        currentY += 10;
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(PALETTE.awayText)
          .text(`Reason: ${myExcluded.reason}`, innerX, currentY);
      }
    } else {
      let tagText = "";
      if (isPayer && myParticipant) {
        tagText = `YOU PAID THIS EXPENSE  •  YOUR SHARE: ${money(myParticipant.share)}`;
      } else if (isPayer) {
        tagText = "YOU PAID THIS ENTIRE EXPENSE";
      } else if (myParticipant) {
        tagText = `YOUR ALLOCATED SHARE: ${money(myParticipant.share)}`;
      }

      if (tagText) {
        currentY += 2;
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor(PALETTE.primary)
          .text(tagText, innerX, currentY);
      }
    }
  }

  // Set cursor past the finished card
  doc.y = cardY + totalCardHeight + 8;
};

const drawTransactionCard = (doc, transaction, memberBalances, household) => {
  ensureSpace(doc, 42);

  const startX = PAGE_CONFIG.margin;
  const width = PAGE_CONFIG.contentWidth;
  const y = doc.y;
  const height = 36;

  const fromName = resolveMemberName(
    transaction.from,
    memberBalances,
    household,
  );
  const toName = resolveMemberName(transaction.to, memberBalances, household);

  doc
    .roundedRect(startX, y, width, height, 5)
    .fillAndStroke(PALETTE.surfaceAlt, PALETTE.border);

  // Settlement Path Text
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(PALETTE.dark)
    .text(fromName, startX + 10, y + 12, { continued: true })
    .font("Helvetica")
    .fillColor(PALETTE.muted)
    .text("  pays  ", { continued: true })
    .font("Helvetica-Bold")
    .fillColor(PALETTE.dark)
    .text(toName);

  // Settlement Value
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(PALETTE.primary)
    .text(money(transaction.amount), startX + width - 140, y + 11, {
      width: 130,
      align: "right",
    });

  doc.y = y + height + 6;
};

const drawStatementFooter = (doc) => {
  ensureSpace(doc, 35);

  const startX = PAGE_CONFIG.margin;
  const width = PAGE_CONFIG.contentWidth;

  doc
    .moveTo(startX, doc.y)
    .lineTo(startX + width, doc.y)
    .strokeColor(PALETTE.border)
    .lineWidth(0.5)
    .stroke();

  doc.y += 6;

  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor(PALETTE.lightMuted)
    .text(
      "FairShare Automated Statement • System generated & audit ready",
      startX,
      doc.y,
      {
        align: "center",
        width: width,
      },
    );
};

const addPageNumbers = (doc) => {
  const range = doc.bufferedPageRange();
  const footerY = PAGE_CONFIG.height - 24;

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(PALETTE.lightMuted)
      .text(
        `FairShare • Page ${i + 1} of ${range.count}`,
        PAGE_CONFIG.margin,
        footerY,
        {
          width: PAGE_CONFIG.contentWidth,
          align: "center",
        },
      );
  }
};

const sectionTitle = (doc, title) => {
  ensureSpace(doc, 28);

  doc.y += 6;

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(PALETTE.muted)
    .text(title, PAGE_CONFIG.margin, doc.y);

  doc.y += 4;
};

const emptyMessage = (doc, message) => {
  doc
    .font("Helvetica-Oblique")
    .fontSize(8.5)
    .fillColor(PALETTE.muted)
    .text(message, PAGE_CONFIG.margin, doc.y);

  doc.y += 8;
};

const ensureSpace = (doc, requiredSpace) => {
  const bottomLimit = PAGE_CONFIG.height - PAGE_CONFIG.margin - 24;
  if (doc.y + requiredSpace > bottomLimit) {
    doc.addPage();
  }
};

const resolveMemberName = (target, memberBalances = [], household = null) => {
  if (!target) return "Unknown Member";

  if (typeof target === "object" && target.name) {
    return target.name;
  }

  const targetId = getId(target);

  if (household && Array.isArray(household.members)) {
    const matched = household.members.find(
      (m) => getId(m.user) === targetId || getId(m) === targetId,
    );
    if (matched?.user?.name) return matched.user.name;
    if (matched?.name) return matched.name;
  }

  if (Array.isArray(memberBalances)) {
    const matched = memberBalances.find(
      (m) => getId(m.user) === targetId || getId(m) === targetId,
    );
    if (matched?.user?.name) return matched.user.name;
    if (matched?.name) return matched.name;
  }

  return "Unknown Member";
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    if (value._id) return value._id.toString();
    if (value.user) return getId(value.user);
    if (value.id) return value.id.toString();
  }
  return value.toString();
};

const roundMoney = (value) => {
  return Math.round(Number(value || 0) * 100) / 100;
};

const money = (value) => {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const balanceText = (balance) => {
  const value = Number(balance || 0);
  if (value > 0) return `+${money(value)}`;
  if (value < 0) return `-${money(Math.abs(value))}`;
  return "Settled";
};

const getMonthName = (month) => {
  return new Date(2000, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
  });
};

const formatShortDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCategory = (category) => {
  if (!category) return "Other";
  return category.charAt(0).toUpperCase() + category.slice(1);
};

module.exports = {
  getMonthlyReport,
  generateReceipt,
  generateMonthlyReceipt,
  generateHouseholdReceipt,
};
