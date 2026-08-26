const Expense = require("../model/expense.model");
const Household = require("../model/household.model");

const calculateSettlement = async ({
  householdId,
  month,
  year,
}) => {
  const household = await Household.findOne({
    _id: householdId,
  }).populate("members.user", "name email");

  if (!household) {
    throw new Error("Household not found");
  }

  const startDate = new Date(
    Date.UTC(year, month - 1, 1)
  );

  const endDate = new Date(
    Date.UTC(year, month, 1)
  );

  const expenses = await Expense.find({
    household: householdId,
    isDeleted: false,
    date: {
      $gte: startDate,
      $lt: endDate,
    },
  });

  const balances = new Map();

  household.members
    .filter((member) => member.isActive)
    .forEach((member) => {
      balances.set(member.user._id.toString(), {
        user: member.user._id,
        paid: 0,
        share: 0,
        balance: 0,
      });
    });

  let totalExpenses = 0;

  for (const expense of expenses) {
    totalExpenses += expense.amount;

    const payerId = expense.paidBy.toString();

    if (balances.has(payerId)) {
      balances.get(payerId).paid += expense.amount;
    }

    for (const participant of expense.participants) {
      const userId = participant.user.toString();

      if (balances.has(userId)) {
        balances.get(userId).share += participant.share;
      }
    }
  }

  for (const member of balances.values()) {
    member.paid =
      Math.round(member.paid * 100) / 100;

    member.share =
      Math.round(member.share * 100) / 100;

    member.balance =
      Math.round(
        (member.paid - member.share) * 100
      ) / 100;
  }

  return {
    totalExpenses:
      Math.round(totalExpenses * 100) / 100,

    memberBalances: Array.from(
      balances.values()
    ),
  };
};

const generateTransactions = (memberBalances) => {
  const creditors = memberBalances
    .filter((member) => member.balance > 0.01)
    .map((member) => ({
      user: member.user,
      amount: member.balance,
    }));

  const debtors = memberBalances
    .filter((member) => member.balance < -0.01)
    .map((member) => ({
      user: member.user,
      amount: Math.abs(member.balance),
    }));

  const transactions = [];

  let creditorIndex = 0;
  let debtorIndex = 0;

  while (
    creditorIndex < creditors.length &&
    debtorIndex < debtors.length
  ) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    const amount = Math.min(
      creditor.amount,
      debtor.amount
    );

    transactions.push({
      from: debtor.user,
      to: creditor.user,
      amount:
        Math.round(amount * 100) / 100,
      status: "pending",
    });

    creditor.amount =
      Math.round(
        (creditor.amount - amount) * 100
      ) / 100;

    debtor.amount =
      Math.round(
        (debtor.amount - amount) * 100
      ) / 100;

    if (creditor.amount <= 0.01) {
      creditorIndex++;
    }

    if (debtor.amount <= 0.01) {
      debtorIndex++;
    }
  }

  return transactions;
};
const calculateWeeklySettlement = async ({
  householdId,
  startDate,
  endDate,
}) => {
  const household = await Household.findById(
    householdId,
  ).populate("members.user", "name email");

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

  const balances = new Map();

  household.members
    .filter((member) => member.isActive)
    .forEach((member) => {
      balances.set(
        member.user._id.toString(),
        {
          user: member.user._id,
          paid: 0,
          share: 0,
          balance: 0,
        },
      );
    });

  let totalExpenses = 0;

  for (const expense of expenses) {
    totalExpenses += Number(expense.amount);

    const payerId =
      expense.paidBy.toString();

    if (balances.has(payerId)) {
      balances.get(payerId).paid +=
        Number(expense.amount);
    }

    for (const participant of expense.participants) {
      const userId =
        participant.user.toString();

      if (balances.has(userId)) {
        balances.get(userId).share +=
          Number(participant.share);
      }
    }
  }

  for (const member of balances.values()) {
    member.paid =
      Math.round(member.paid * 100) / 100;

    member.share =
      Math.round(member.share * 100) / 100;

    member.balance =
      Math.round(
        (member.paid - member.share) * 100,
      ) / 100;
  }

  const memberBalances =
    Array.from(balances.values());

  const transactions =
    generateTransactions(memberBalances);

  return {
    startDate,
    endDate,

    totalExpenses:
      Math.round(totalExpenses * 100) / 100,

    memberBalances,

    transactions,
  };
};

module.exports = {
  calculateSettlement,
  generateTransactions,
  calculateWeeklySettlement,
};