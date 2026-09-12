const Expense = require("../model/expense.model");
const Household = require("../model/household.model");
const Settlement = require("../model/settlement.model");

const roundMoney = (value) => {
  return Math.round(Number(value || 0) * 100) / 100;
};

const getId = (value) => {
  if (!value) return "";

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const getMonthRange = (month, year) => {
  const monthNumber = Number(month);
  const yearNumber = Number(year);

  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    throw new Error("Invalid month");
  }

  if (!Number.isInteger(yearNumber) || yearNumber < 2000) {
    throw new Error("Invalid year");
  }

  const startDate = new Date(Date.UTC(yearNumber, monthNumber - 1, 1));

  const endDate = new Date(Date.UTC(yearNumber, monthNumber, 1));

  return {
    startDate,
    endDate,
  };
};

const getMonthlyExpenses = async ({ householdId, month, year }) => {
  const { startDate, endDate } = getMonthRange(month, year);

  return Expense.find({
    household: householdId,
    isDeleted: false,
    date: {
      $gte: startDate,
      $lt: endDate,
    },
  })
    .populate("paidBy", "name email")
    .populate("participants.user", "name email")
    .populate("excludedMembers.user", "name email")
    .sort({
      date: -1,
    });
};

const calculateMemberBalances = (household, expenses) => {
  const balances = new Map();

  household.members
    .filter((member) => member.isActive === true && member.user)
    .forEach((member) => {
      const userId = getId(member.user);

      if (!userId) {
        return;
      }

      balances.set(userId, {
        user: member.user,
        paid: 0,
        share: 0,
        balance: 0,
      });
    });

  /*
   * Calculate what each member actually paid.
   */
  for (const expense of expenses) {
    const payerId = getId(expense.paidBy);

    /*
     * Ignore expenses whose payer no longer exists
     * or is not an active household member.
     */
    if (payerId && balances.has(payerId)) {
      balances.get(payerId).paid += Number(expense.amount);
    }

    /*
     * Calculate each participant's share.
     *
     * Excluded members are intentionally
     * not included here.
     */
    for (const participant of expense.participants || []) {
      const userId = getId(participant.user);

      /*
       * Ignore stale participant references.
       */
      if (userId && balances.has(userId)) {
        balances.get(userId).share += Number(participant.share);
      }
    }
  }

  /*
   * Final monthly balance:
   *
   * positive = person should receive money
   * negative = person needs to pay money
   */
  balances.forEach((member) => {
    member.paid = roundMoney(member.paid);

    member.share = roundMoney(member.share);

    member.balance = roundMoney(member.paid - member.share);
  });

  return Array.from(balances.values());
};

const generateTransactions = (memberBalances) => {
  const creditors = memberBalances
    .filter(
      (member) => member.user && getId(member.user) && member.balance > 0.01,
    )
    .map((member) => ({
      user: member.user,
      amount: roundMoney(member.balance),
    }));

  const debtors = memberBalances
    .filter(
      (member) => member.user && getId(member.user) && member.balance < -0.01,
    )
    .map((member) => ({
      user: member.user,
      amount: roundMoney(Math.abs(member.balance)),
    }));

  const transactions = [];

  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];

    const debtor = debtors[debtorIndex];

    /*
     * Safety check in case a stale user somehow
     * reaches this point.
     */
    if (!creditor?.user || !debtor?.user) {
      break;
    }

    const amount = roundMoney(Math.min(creditor.amount, debtor.amount));

    if (amount <= 0) {
      break;
    }

    transactions.push({
      from: debtor.user,
      to: creditor.user,
      amount,
      status: "pending",
    });

    creditor.amount = roundMoney(creditor.amount - amount);

    debtor.amount = roundMoney(debtor.amount - amount);

    if (creditor.amount <= 0.01) {
      creditorIndex++;
    }

    if (debtor.amount <= 0.01) {
      debtorIndex++;
    }
  }

  return transactions;
};

const calculateMonthSummary = async ({ householdId, month, year }) => {
  const household = await Household.findOne({
    _id: householdId,
  }).populate("members.user", "name email");

  if (!household) {
    throw new Error("Household not found");
  }

  const { startDate, endDate } = getMonthRange(month, year);

  const expenses = await getMonthlyExpenses({
    householdId,
    month,
    year,
  });

  /*
   * Total household spending
   */
  const totalExpenses = roundMoney(
    expenses.reduce((total, expense) => total + Number(expense.amount), 0),
  );

  /*
   * Category breakdown
   */
  const categoryTotals = {};

  expenses.forEach((expense) => {
    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = 0;
    }

    categoryTotals[expense.category] += Number(expense.amount);
  });

  Object.keys(categoryTotals).forEach((category) => {
    categoryTotals[category] = roundMoney(categoryTotals[category]);
  });

  /*
   * Member calculations
   */
  const memberBalances = calculateMemberBalances(household, expenses);

  /*
   * Who pays whom
   */
  const transactions = generateTransactions(memberBalances);

  return {
    household,

    month: Number(month),
    year: Number(year),

    startDate,
    endDate,

    totalExpenses,

    categoryTotals,

    expenseCount: expenses.length,

    expenses,

    memberBalances,

    transactions,
  };
};

const calculateSettlement = async ({ householdId, month, year }) => {
  const summary = await calculateMonthSummary({
    householdId,
    month,
    year,
  });

  return {
    totalExpenses: summary.totalExpenses,

    memberBalances: summary.memberBalances,
  };
};

const calculateWeeklySettlement = async ({
  householdId,
  startDate,
  endDate,
}) => {
  const household = await Household.findById(householdId).populate(
    "members.user",
    "name email",
  );

  if (!household) {
    throw new Error("Household not found");
  }

  const expenses = await Expense.find({
    household: householdId,
    isDeleted: false,
    date: {
      $gte: startDate,
      $lt: endDate,
    },
  })
    .populate("paidBy", "name email")
    .populate("participants.user", "name email");

  const memberBalances = calculateMemberBalances(household, expenses);

  const totalExpenses = roundMoney(
    expenses.reduce((total, expense) => total + Number(expense.amount), 0),
  );

  const transactions = generateTransactions(memberBalances);

  return {
    startDate,
    endDate,

    totalExpenses,

    memberBalances,

    transactions,
  };
};

const refreshOpenMonthlySettlement = async ({ householdId, month, year }) => {
  const existingSettlement = await Settlement.findOne({
    household: householdId,
    month,
    year,
  });

  /*
   * Never modify a closed settlement.
   */
  if (existingSettlement && existingSettlement.status === "closed") {
    return existingSettlement;
  }

  const summary = await calculateMonthSummary({
    householdId,
    month,
    year,
  });

  let transactions = summary.transactions;

  /*
   * Preserve paid status only when the
   * same transaction still exists with
   * essentially the same amount.
   */
  if (existingSettlement) {
    transactions = summary.transactions.map((newTransaction) => {
      if (!newTransaction?.from || !newTransaction?.to) {
        return newTransaction;
      }

      const newFromId = getId(newTransaction.from);

      const newToId = getId(newTransaction.to);

      if (!newFromId || !newToId) {
        return newTransaction;
      }

      const oldTransaction = existingSettlement.transactions.find(
        (oldTransaction) => {
          if (!oldTransaction?.from || !oldTransaction?.to) {
            return false;
          }

          const oldFromId = getId(oldTransaction.from);

          const oldToId = getId(oldTransaction.to);

          if (!oldFromId || !oldToId) {
            return false;
          }

          return (
            oldFromId === newFromId &&
            oldToId === newToId &&
            Math.abs(
              Number(oldTransaction.amount) - Number(newTransaction.amount),
            ) < 0.01
          );
        },
      );

      if (oldTransaction && oldTransaction.status === "paid") {
        return {
          ...newTransaction,
          status: "paid",
          paidAt: oldTransaction.paidAt,
        };
      }

      return newTransaction;
    });
  }

  return Settlement.findOneAndUpdate(
    {
      household: householdId,
      month,
      year,
    },
    {
      household: householdId,
      month,
      year,
      status: "open",
      totalExpenses: summary.totalExpenses,
      memberBalances: summary.memberBalances,
      transactions,
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
};

module.exports = {
  getMonthlyExpenses,
  calculateMemberBalances,
  calculateMonthSummary,
  calculateSettlement,
  generateTransactions,
  calculateWeeklySettlement,
  refreshOpenMonthlySettlement,
};
