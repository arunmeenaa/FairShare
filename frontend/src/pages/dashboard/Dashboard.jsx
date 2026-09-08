import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";
import { useAuth } from "../../context/AuthContext";

const formatCurrency = (value) => {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getMonthName = (month) => {
  if (!month) return "";
  return new Date(2000, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
  });
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getId = (target) => {
  if (!target) return "";
  if (typeof target === "object") {
    return (
      target._id ||
      target.id ||
      target.user?._id ||
      target.user ||
      ""
    ).toString();
  }
  return target.toString();
};

const CATEGORY_ICONS = {
  grocery: "🛒",
  electricity: "⚡",
  internet: "🌐",
  rent: "🏠",
  dining: "🍽️",
  maintenance: "🔧",
  utilities: "💡",
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  textColor,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 dark:hover:border-slate-700 dark:hover:bg-slate-[950]">
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}
    >
      <span className={iconColor}>{icon}</span>
    </div>

    <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{title}</p>

    <p
      className={`mt-1 text-2xl font-bold ${
        textColor || "text-slate-900 dark:text-white"
      }`}
    >
      {value}
    </p>

    {subtitle && (
      <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">
        {subtitle}
      </p>
    )}
  </div>
);

const ContributionBar = ({ label, amount, total, colorClass }) => {
  const percentage = total
    ? Math.min(
        100,
        Math.max(0, Math.round(((amount || 0) / total) * 100)),
      )
    : 0;

  return (
    <div className="rounded-2xl bg-slate-50 p-5 dark:border dark:border-slate-800 dark:bg-slate-800/60">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>

      <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
        {formatCurrency(amount)}
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          Contribution
        </span>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { currentHousehold, loading: householdLoading } = useHousehold();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const householdId = currentHousehold?._id;
  const currentUserId = getId(user);

  useEffect(() => {
    let isMounted = true;

    const fetchReport = async () => {
      if (!householdId) return;

      try {
        setLoading(true);

        const currentDate = new Date();

        const response = await api.get(
          `/reports/monthly/${householdId}`,
          {
            params: {
              month: currentDate.getMonth() + 1,
              year: currentDate.getFullYear(),
            },
          },
        );

        if (isMounted) {
          setReport(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);

        if (isMounted) {
          setReport(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (householdLoading) return;

    if (householdId) {
      fetchReport();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [householdId, householdLoading]);

  // Balance calculations
  const balance = Number(report?.currentUser?.balance || 0);
  const balancePositive = balance > 0;
  const balanceNegative = balance < 0;

  // Sorted Category summary
  const sortedCategories = useMemo(() => {
    if (!report?.categoryTotals) return [];

    return Object.entries(report.categoryTotals).sort(
      ([, a], [, b]) => b - a,
    );
  }, [report?.categoryTotals]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-4 transition-colors sm:p-6 lg:p-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="mt-2 h-4 w-64 rounded bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-36 rounded-2xl bg-white shadow-sm dark:bg-slate-900 dark:shadow-black/20"
              />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-72 rounded-2xl bg-white dark:bg-slate-900 lg:col-span-2" />
            <div className="h-72 rounded-2xl bg-white dark:bg-slate-900" />
          </div>
        </div>
      </div>
    );
  }

  // No household placeholder
  if (!householdId) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10 transition-colors sm:px-6 lg:px-8 dark:bg-slate-950">
        <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
              <svg
                className="h-8 w-8 text-indigo-600 dark:text-indigo-400"
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

            <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
              Welcome to FairShare
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
              You haven't selected a household yet. Select or join a household
              to start tracking your shared expenses.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 transition-colors sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Overview
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Here's how your household is doing this month.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              <Link
                to="/expenses/new"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-500/20 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-400/20"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Expense
              </Link>
            </span>
          </div>
        </div>

        {/* ================= STAT CARDS ================= */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total spending"
            value={formatCurrency(report?.totalSpending)}
            iconBg="bg-indigo-50 dark:bg-indigo-500/10"
            iconColor="text-indigo-600 dark:text-indigo-400"
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M6 2h12M6 22h12M8 2v4a4 4 0 002 3.46L12 10l2-1.54A4 4 0 0016 6V2M8 22v-4a4 4 0 012-3.46L12 13l2 1.54A4 4 0 0016 18v4"
                />
              </svg>
            }
          />

          <StatCard
            title="You paid"
            value={formatCurrency(report?.currentUser?.paid)}
            iconBg="bg-blue-50 dark:bg-blue-500/10"
            iconColor="text-blue-600 dark:text-blue-400"
            icon={
              <svg
                className="h-5 w-5"
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
            }
          />

          <StatCard
            title="Your share"
            value={formatCurrency(report?.currentUser?.share)}
            iconBg="bg-violet-50 dark:bg-violet-500/10"
            iconColor="text-violet-600 dark:text-violet-400"
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="8" strokeWidth={1.8} />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5"
                />
              </svg>
            }
          />

          <StatCard
            title="Your balance"
            value={formatCurrency(Math.abs(balance))}
            subtitle={
              balancePositive
                ? "You should receive"
                : balanceNegative
                  ? "You need to pay"
                  : "You're settled"
            }
            iconBg={
              balancePositive
                ? "bg-emerald-50 dark:bg-emerald-500/10"
                : balanceNegative
                  ? "bg-red-50 dark:bg-red-500/10"
                  : "bg-slate-100 dark:bg-slate-800"
            }
            iconColor={
              balancePositive
                ? "text-emerald-600 dark:text-emerald-400"
                : balanceNegative
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-500 dark:text-slate-400"
            }
            textColor={
              balancePositive
                ? "text-emerald-600 dark:text-emerald-400"
                : balanceNegative
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-900 dark:text-white"
            }
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 3v18m0-18l-4 4m4-4l4 4m-4 14l-4-4m4 4l4-4"
                />
              </svg>
            }
          />
        </div>

        {/* ================= MAIN SUMMARY ================= */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Spending overview
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Your household activity for {getMonthName(report?.month)}.
                </p>
              </div>

              <div className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                {formatCurrency(report?.totalSpending)}
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Household spending
                </span>

                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  100%
                </span>
              </div>

              <div className="h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <ContributionBar
                label="Your contribution"
                amount={report?.currentUser?.paid}
                total={report?.totalSpending}
                colorClass="bg-blue-500 dark:bg-blue-400"
              />

              <ContributionBar
                label="Your share"
                amount={report?.currentUser?.share}
                total={report?.totalSpending}
                colorClass="bg-violet-500 dark:bg-violet-400"
              />
            </div>
          </div>

          {/* Settlement Position Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-6 shadow-sm shadow-indigo-200/50 dark:shadow-black/30">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-violet-400/10" />

            <div className="relative">
              <p className="text-sm font-medium text-indigo-100">
                Your settlement position
              </p>

              <h2 className="mt-3 text-3xl font-bold text-white">
                {balancePositive ? "+" : balanceNegative ? "-" : ""}
                {formatCurrency(Math.abs(balance))}
              </h2>

              <p className="mt-2 text-sm leading-6 text-indigo-100">
                {balancePositive
                  ? "You have contributed more than your share and should receive this amount."
                  : balanceNegative
                    ? "Your share is higher than what you have paid."
                    : "Your payments and share are completely balanced."}
              </p>

              <div className="mt-8 rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-indigo-100">Paid</span>

                  <span className="font-semibold text-white">
                    {formatCurrency(report?.currentUser?.paid)}
                  </span>
                </div>

                <div className="my-3 h-px bg-white/10" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-indigo-100">Share</span>

                  <span className="font-semibold text-white">
                    {formatCurrency(report?.currentUser?.share)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RECENT EXPENSES ================= */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Recent expenses
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Latest household expenses this month.
              </p>
            </div>

            <Link
              to="/expenses"
              className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View all
            </Link>
          </div>

          {report?.recentExpenses?.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.recentExpenses.map((expense) => {
                const excluded = expense.excludedMembers || [];

                const isUserExcluded = excluded.some(
                  (m) => getId(m.user) === currentUserId,
                );

                const awayMembers = excluded
                  .filter((m) => m.status === "away" || m.reason)
                  .map((m) => m.user?.name || "Member");

                const icon =
                  CATEGORY_ICONS[expense.category?.toLowerCase()] || "💳";

                return (
                  <Link
                    key={expense._id}
                    to={`/expenses/${expense._id}`}
                    className="block px-6 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg dark:bg-indigo-500/10">
                          {icon}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                            {expense.description}
                          </p>

                          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            Paid by{" "}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {expense.paidBy?.name || "Unknown"}
                            </span>
                            {" • "}
                            {formatDate(expense.date)}
                          </p>

                          {/* Away / Not Included badges */}
                          {isUserExcluded ? (
                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                              <span>●</span>
                              You were away
                            </div>
                          ) : awayMembers.length > 0 ? (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                Away:
                              </span>

                              {awayMembers.map((name, idx) => (
                                <span
                                  key={`${name}-${idx}`}
                                  className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(expense.amount)}
                        </p>

                        {expense.participantMode === "manual" && (
                          <span className="mt-1 inline-block rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
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
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <span className="text-xl">💸</span>
              </div>

              <p className="mt-3 font-medium text-slate-700 dark:text-slate-200">
                No expenses yet
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Add your first household expense to get started.
              </p>
            </div>
          )}
        </div>

        {/* ================= CATEGORY SUMMARY ================= */}
        {sortedCategories.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Spending by category
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                See where your household is spending the most.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedCategories.map(([category, amount]) => {
                const percentage = report.totalSpending
                  ? Math.round((amount / report.totalSpending) * 100)
                  : 0;

                const label = category
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (char) => char.toUpperCase());

                return (
                  <div
                    key={category}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors dark:border-slate-800 dark:bg-slate-800/60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {label}
                      </span>

                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                        {percentage}%
                      </span>
                    </div>

                    <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(amount)}
                    </p>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= FOOTER INSIGHT ================= */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 transition-colors dark:border-indigo-500/20 dark:bg-indigo-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
              <svg
                className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 5v4l2.5 2.5"
                />
              </svg>
            </div>

            <div>
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                FairShare overview
              </p>

              <p className="mt-1 text-sm leading-6 text-indigo-700 dark:text-indigo-300">
                Your dashboard shows your household's spending, contribution,
                and recent activity for the current month.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;