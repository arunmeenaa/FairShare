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

/*
|--------------------------------------------------------------------------
| Get Monthly Expenses
|--------------------------------------------------------------------------
|
| This is the important part of the monthly system.
|
| Expenses remain permanently stored.
| We only select the expenses belonging to the requested
| calendar month.
|
*/

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

/*
|--------------------------------------------------------------------------
| Build Member Balances
|--------------------------------------------------------------------------
*/

const calculateMemberBalances = (household, expenses) => {
  const balances = new Map();

  /*
   * Only active household members participate
   * in monthly balance calculations.
   */
  household.members
    .filter((member) => member.isActive)
    .forEach((member) => {
      const userId = getId(member.user);

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

    if (balances.has(payerId)) {
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

      if (balances.has(userId)) {
        balances.get(userId).share += Number(participant.share);
      }
    }
  }

  /*
   * Final monthly balance:
   *
   * positive  = person should receive money
   * negative  = person needs to pay money
   */
  balances.forEach((member) => {
    member.paid = roundMoney(member.paid);

    member.share = roundMoney(member.share);

    member.balance = roundMoney(member.paid - member.share);
  });

  return Array.from(balances.values());
};

/*
|--------------------------------------------------------------------------
| Generate Transactions
|--------------------------------------------------------------------------
|
| Converts:
|
| Arun   +₹700
| Piyush -₹400
| Naveen -₹300
|
| into:
|
| Piyush → Arun  ₹400
| Naveen → Arun  ₹300
|
|--------------------------------------------------------------------------
*/

const generateTransactions = (memberBalances) => {
  const creditors = memberBalances
    .filter((member) => member.balance > 0.01)
    .map((member) => ({
      user: member.user,
      amount: roundMoney(member.balance),
    }));

  const debtors = memberBalances
    .filter((member) => member.balance < -0.01)
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

/*
|--------------------------------------------------------------------------
| CENTRAL MONTHLY CALCULATION
|--------------------------------------------------------------------------
|
| This is now the main calculation engine for FairShare.
|
| Dashboard
| Settlement
| Reports
| Monthly receipts
|
| should all use this function.
|
*/

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

/*
|--------------------------------------------------------------------------
| Existing calculateSettlement
|--------------------------------------------------------------------------
|
| Kept so your existing controllers continue working.
|
*/

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

/*
|--------------------------------------------------------------------------
| Weekly Settlement
|--------------------------------------------------------------------------
|
| Kept for your weekly email job.
|
*/

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
  });

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
  const Settlement = require("../model/settlement.model");

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
      const oldTransaction = existingSettlement.transactions.find(
        (oldTransaction) =>
          getId(oldTransaction.from) === getId(newTransaction.from) &&
          getId(oldTransaction.to) === getId(newTransaction.to) &&
          Math.abs(
            Number(oldTransaction.amount) - Number(newTransaction.amount),
          ) < 0.01,
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
