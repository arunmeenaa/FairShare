import { useEffect, useState } from "react";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { currentHousehold, loading: householdLoading } = useHousehold();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const householdId = currentHousehold?._id;

  useEffect(() => {
    const fetchReport = async () => {
      if (!householdId) return;

      try {
        setLoading(true);

        const currentDate = new Date();

        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();

        const response = await api.get(
          `/reports/monthly/${householdId}`,
          {
            params: {
              month,
              year,
            },
          },
        );

        setReport(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    if (householdLoading) {
      return;
    }

    if (householdId) {
      fetchReport();
    } else {
      setLoading(false);
    }
  }, [householdId, householdLoading]);

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getMonthName = (month) => {
    if (!month) return "";

    return new Date(2000, month - 1, 1).toLocaleString(
      "en-IN",
      {
        month: "long",
      },
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const balance = Number(
    report?.currentUser?.balance || 0,
  );

  const balancePositive = balance > 0;
  const balanceNegative = balance < 0;

  /*
   * Check whether the current user was away
   * for this particular expense.
   */
  const wasCurrentUserAway = (expense) => {
    return expense?.excludedMembers?.some(
      (member) =>
        member.user?._id?.toString() ===
        user?._id?.toString(),
    );
  };

  /*
   * Get names of members who were away.
   */
  const getAwayMembers = (expense) => {
    return (
      expense?.excludedMembers
        ?.filter((member) => member.reason === "away")
        ?.map((member) => member.user?.name)
        ?.filter(Boolean) || []
    );
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-48 rounded-lg bg-slate-200" />
              <div className="mt-2 h-4 w-64 rounded bg-slate-200" />
            </div>

            <div className="h-10 w-32 rounded-xl bg-slate-200" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-36 rounded-2xl bg-white shadow-sm"
              />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-72 rounded-2xl bg-white lg:col-span-2" />
            <div className="h-72 rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (!householdId) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
              <svg
                className="h-8 w-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M3 10.5L12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6"
                />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-bold text-slate-900">
              Welcome to FairShare
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              You haven't selected a household yet. Select or
              join a household to start tracking your shared
              expenses.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ================= HEADER ================= */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Overview
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Here's how your household is doing this month.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <svg
              className="h-4 w-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeWidth={1.8}
                d="M8 2v4m8-4v4M4 9h16M5 4h14a1 1 0 011 1v15a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"
              />
            </svg>

            <span className="text-sm font-medium text-slate-700">
              {getMonthName(report?.month)} {report?.year}
            </span>
          </div>
        </div>

        {/* ================= STAT CARDS ================= */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Total */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
              <svg
                className="h-5 w-5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeWidth={1.8}
                  d="M6 2h12M6 22h12M8 2v4a4 4 0 002 3.46L12 10l2-1.54A4 4 0 0016 6V2M8 22v-4a4 4 0 012-3.46L12 13l2 1.54A4 4 0 0016 18v4"
                />
              </svg>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Total spending
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(report?.totalSpending)}
            </p>
          </div>

          {/* Paid */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 19V5m0 0L6 11m6-6l6 6"
                />
              </svg>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              You paid
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(report?.currentUser?.paid)}
            </p>
          </div>

          {/* Share */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
              <svg
                className="h-5 w-5 text-violet-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  strokeWidth={1.8}
                />

                <path
                  strokeLinecap="round"
                  strokeWidth={1.8}
                  d="M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5"
                />
              </svg>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Your share
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(report?.currentUser?.share)}
            </p>
          </div>

          {/* Balance */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                balancePositive
                  ? "bg-emerald-50"
                  : balanceNegative
                    ? "bg-red-50"
                    : "bg-slate-100"
              }`}
            >
              <svg
                className={`h-5 w-5 ${
                  balancePositive
                    ? "text-emerald-600"
                    : balanceNegative
                      ? "text-red-600"
                      : "text-slate-500"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeWidth={1.8}
                  d="M12 3v18m0-18l-4 4m4-4l4 4m-4 14l-4-4m4 4l4-4"
                />
              </svg>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Your balance
            </p>

            <p
              className={`mt-1 text-2xl font-bold ${
                balancePositive
                  ? "text-emerald-600"
                  : balanceNegative
                    ? "text-red-600"
                    : "text-slate-900"
              }`}
            >
              {formatCurrency(Math.abs(balance))}
            </p>

            <p
              className={`mt-1 text-xs font-medium ${
                balancePositive
                  ? "text-emerald-600"
                  : balanceNegative
                    ? "text-red-600"
                    : "text-slate-400"
              }`}
            >
              {balancePositive
                ? "You should receive"
                : balanceNegative
                  ? "You need to pay"
                  : "You're settled"}
            </p>
          </div>
        </div>

        {/* ================= MAIN SUMMARY ================= */}

        <div className="grid gap-6 lg:grid-cols-3">

          {/* Spending overview */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Spending overview
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your household activity for{" "}
                  {getMonthName(report?.month)}.
                </p>
              </div>

              <div className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600">
                {formatCurrency(report?.totalSpending)}
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Household spending
                </span>

                <span className="text-xs font-semibold text-slate-500">
                  100%
                </span>
              </div>

              <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-full rounded-full bg-indigo-500" />
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Your contribution
                </p>

                <p className="mt-2 text-xl font-bold text-slate-900">
                  {formatCurrency(report?.currentUser?.paid)}
                </p>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${
                        report?.totalSpending
                          ? Math.min(
                              100,
                              ((report.currentUser?.paid || 0) /
                                report.totalSpending) *
                                100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Your share
                </p>

                <p className="mt-2 text-xl font-bold text-slate-900">
                  {formatCurrency(report?.currentUser?.share)}
                </p>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{
                      width: `${
                        report?.totalSpending
                          ? Math.min(
                              100,
                              ((report.currentUser?.share || 0) /
                                report.totalSpending) *
                                100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Balance */}

          <div className="relative overflow-hidden rounded-2xl bg-indigo-600 p-6 shadow-sm">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-500/60" />

            <div className="relative">
              <p className="text-sm font-medium text-indigo-200">
                Your settlement position
              </p>

              <h2 className="mt-3 text-3xl font-bold text-white">
                {balancePositive
                  ? "+"
                  : balanceNegative
                    ? "-"
                    : ""}
                {formatCurrency(Math.abs(balance))}
              </h2>

              <p className="mt-2 text-sm leading-6 text-indigo-100">
                {balancePositive
                  ? "You have contributed more than your share and should receive this amount."
                  : balanceNegative
                    ? "Your share is higher than what you have paid."
                    : "Your payments and share are completely balanced."}
              </p>

              <div className="mt-8 rounded-xl bg-white/10 p-4 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-indigo-200">
                    Paid
                  </span>

                  <span className="font-semibold text-white">
                    {formatCurrency(report?.currentUser?.paid)}
                  </span>
                </div>

                <div className="my-3 h-px bg-white/10" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-indigo-200">
                    Share
                  </span>

                  <span className="font-semibold text-white">
                    {formatCurrency(report?.currentUser?.share)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RECENT EXPENSES ================= */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Recent expenses
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest household expenses this month.
              </p>
            </div>

            <Link
              to="/expenses"
              className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
            >
              View all
            </Link>
          </div>

          {report?.recentExpenses?.length > 0 ? (
            <div className="divide-y divide-slate-100">

              {report.recentExpenses.map((expense) => {
                const awayMembers = getAwayMembers(expense);
                const currentUserAway =
                  wasCurrentUserAway(expense);

                return (
                  <Link
                    key={expense._id}
                    to={`/expenses/${expense._id}`}
                    className="block px-6 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-4">

                      <div className="flex min-w-0 items-center gap-4">

                        {/* Category icon */}

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg">
                          {expense.category === "grocery"
                            ? "🛒"
                            : expense.category === "electricity"
                              ? "⚡"
                              : expense.category === "internet"
                                ? "🌐"
                                : expense.category === "rent"
                                  ? "🏠"
                                  : expense.category === "dining"
                                    ? "🍽️"
                                    : "💳"}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {expense.description}
                          </p>

                          <p className="mt-0.5 text-sm text-slate-500">
                            Paid by{" "}
                            <span className="font-medium text-slate-700">
                              {expense.paidBy?.name ||
                                "Unknown"}
                            </span>
                            {" • "}
                            {formatDate(expense.date)}
                          </p>

                          {/* Away indicator */}

                          {currentUserAway ? (
                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              <span>●</span>
                              You were away
                            </div>
                          ) : awayMembers.length > 0 ? (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-slate-400">
                                Away:
                              </span>

                              {awayMembers.map((name) => (
                                <span
                                  key={name}
                                  className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-bold text-slate-900">
                          {formatCurrency(expense.amount)}
                        </p>

                        {expense.participantMode ===
                          "manual" && (
                          <span className="mt-1 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600">
                            Manual split
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <span className="text-xl">💸</span>
              </div>

              <p className="mt-3 font-medium text-slate-700">
                No expenses yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Add your first household expense to get started.
              </p>
            </div>
          )}
        </div>

        {/* ================= CATEGORY SUMMARY ================= */}

        {report?.categoryTotals &&
          Object.keys(report.categoryTotals).length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Spending by category
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  See where your household is spending the most.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(report.categoryTotals)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const percentage = report.totalSpending
                      ? Math.round(
                          (amount / report.totalSpending) * 100,
                        )
                      : 0;

                    const label = category
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char) =>
                        char.toUpperCase(),
                      );

                    return (
                      <div
                        key={category}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">
                            {label}
                          </span>

                          <span className="text-xs font-semibold text-slate-400">
                            {percentage}%
                          </span>
                        </div>

                        <p className="mt-2 text-lg font-bold text-slate-900">
                          {formatCurrency(amount)}
                        </p>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        {/* ================= FOOTER INSIGHT ================= */}

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
              <svg
                className="h-5 w-5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeWidth={1.8}
                  d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 5v4l2.5 2.5"
                />
              </svg>
            </div>

            <div>
              <p className="text-sm font-semibold text-indigo-900">
                FairShare overview
              </p>

              <p className="mt-1 text-sm leading-6 text-indigo-700">
                Your dashboard shows your household's spending,
                contribution, and recent activity for the current
                month.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;