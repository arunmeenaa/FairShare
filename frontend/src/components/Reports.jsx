import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";
import { useAuth } from "../../context/AuthContext";

// ==========================================
// UTILITIES & HELPERS
// ==========================================

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getMonthName = (monthNumber) => {
  return new Date(2000, monthNumber - 1, 1).toLocaleString("en-IN", {
    month: "long",
  });
};

const getCategoryName = (category) => {
  return String(category || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getId = (target) => {
  if (!target) return "";
  if (typeof target === "object") {
    return (target._id || target.id || target.user?._id || target.user || "").toString();
  }
  return target.toString();
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ==========================================
// REUSABLE SUB-COMPONENTS
// ==========================================

const StatCard = ({ label, value, subtitle, icon, iconBg, iconColor, textColor }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
      <span className={iconColor}>{icon}</span>
    </div>
    <p className="mt-4 text-sm text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${textColor || "text-slate-900"}`}>
      {value}
    </p>
    {subtitle && <p className="mt-1 text-xs font-semibold text-slate-400">{subtitle}</p>}
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

const Reports = () => {
  const { currentHousehold } = useHousehold();
  const { user } = useAuth();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const householdId = currentHousehold?._id;
  const currentUserId = getId(user);

  const fetchReport = useCallback(async () => {
    if (!householdId) return;

    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/reports/monthly/${householdId}`, {
        params: { month, year },
      });

      setReport(response.data);
    } catch (err) {
      console.error("Failed to fetch report:", err);
      setError(err.response?.data?.message || "Failed to load monthly report");
    } finally {
      setLoading(false);
    }
  }, [householdId, month, year]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const currentUser = report?.currentUser;
  const balance = Number(currentUser?.balance || 0);

  const categoryEntries = useMemo(() => {
    if (!report?.categoryTotals) return [];
    return Object.entries(report.categoryTotals).sort((a, b) => b[1] - a[1]);
  }, [report?.categoryTotals]);

  const totalSpending = Number(report?.totalSpending || 0);

  /* ================= NO HOUSEHOLD ================= */
  if (!currentHousehold) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">No household selected</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Select or join a household to generate comprehensive spending and audit reports.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/households"
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Go to Households
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================= LOADING SKELETON ================= */
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="h-9 w-48 rounded-lg bg-slate-200" />
            </div>
            <div className="h-10 w-44 rounded-2xl bg-slate-200" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-32 rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-80 rounded-3xl bg-white shadow-sm" />
            <div className="h-80 rounded-3xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  /* ================= ERROR ================= */
  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10">
        <div className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center">
          <div className="w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3m0 4h.01M5.07 19h13.86a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16a2 2 0 001.73 3z" />
              </svg>
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-900">Unable to load report</h2>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={fetchReport}
              className="mt-6 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-indigo-600">{currentHousehold.name}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Financial Reports</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track household expenditure breakdown and member settlement positions.
            </p>
          </div>

          {/* Month / Year Selectors */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-xl border-0 bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:bg-slate-50"
            >
              {MONTHS.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>

            <div className="h-5 w-px bg-slate-200" />

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-xl border-0 bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:bg-slate-50"
            >
              {[-2, -1, 0, 1].map((offset) => {
                const y = now.getFullYear() + offset;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* ================= STAT CARDS ================= */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total spending"
            value={formatCurrency(report?.totalSpending)}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 2h12M6 22h12M8 2v4a4 4 0 002 3.46L12 10l2-1.54A4 4 0 0016 6V2M8 22v-4a4 4 0 012-3.46L12 13l2 1.54A4 4 0 0016 18v4" />
              </svg>
            }
          />

          <StatCard
            label="You paid"
            value={formatCurrency(currentUser?.paid)}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19V5m0 0L6 11m6-6l6 6" />
              </svg>
            }
          />

          <StatCard
            label="Your share"
            value={formatCurrency(currentUser?.share)}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" strokeWidth={1.8} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5" />
              </svg>
            }
          />

          <StatCard
            label="Your balance"
            value={formatCurrency(Math.abs(balance))}
            subtitle={balance > 0.01 ? "You should receive" : balance < -0.01 ? "You need to pay" : "Fully settled"}
            iconBg={balance > 0.01 ? "bg-emerald-50" : balance < -0.01 ? "bg-red-50" : "bg-slate-100"}
            iconColor={balance > 0.01 ? "text-emerald-600" : balance < -0.01 ? "text-red-600" : "text-slate-500"}
            textColor={balance > 0.01 ? "text-emerald-600" : balance < -0.01 ? "text-red-600" : "text-slate-900"}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v18m0-18l-4 4m4-4l4 4m-4 14l-4-4m4 4l4-4" />
              </svg>
            }
          />
        </div>

        {/* ================= CATEGORY & PERSONAL SUMMARY ================= */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Spending by Category */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Spending by category</h2>
              <p className="text-sm text-slate-500">Where your household funds were allocated this month</p>
            </div>

            {categoryEntries.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center">
                <span className="text-3xl">🛒</span>
                <p className="mt-2 text-sm font-medium text-slate-600">No expenses recorded</p>
                <p className="text-xs text-slate-400">Add household expenses to generate insights.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categoryEntries.map(([category, value]) => {
                  const percentage = totalSpending > 0 ? Math.round((value / totalSpending) * 100) : 0;

                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700">{getCategoryName(category)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-400">{percentage}%</span>
                          <span className="font-bold text-slate-900">{formatCurrency(value)}</span>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Personal Financial Position */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Personal breakdown</h2>
              <p className="text-sm text-slate-500">Your direct contributions vs. allocated liabilities</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="text-sm font-medium text-slate-600">Total amount you paid</span>
                <span className="font-bold text-slate-900">{formatCurrency(currentUser?.paid)}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="text-sm font-medium text-slate-600">Your allocated share</span>
                <span className="font-bold text-slate-900">{formatCurrency(currentUser?.share)}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="text-sm font-medium text-slate-600">Net variance</span>
                <span
                  className={`font-bold ${
                    balance > 0.01
                      ? "text-emerald-600"
                      : balance < -0.01
                      ? "text-red-600"
                      : "text-slate-900"
                  }`}
                >
                  {balance > 0.01 ? "+" : balance < -0.01 ? "-" : ""}
                  {formatCurrency(Math.abs(balance))}
                </span>
              </div>

              <div
                className={`rounded-2xl p-4 transition-colors ${
                  balance > 0.01
                    ? "border border-emerald-200/60 bg-emerald-50/70"
                    : balance < -0.01
                    ? "border border-red-200/60 bg-red-50/70"
                    : "border border-slate-100 bg-slate-50"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Settlement position
                </p>
                <p
                  className={`mt-1 font-bold text-base ${
                    balance > 0.01
                      ? "text-emerald-800"
                      : balance < -0.01
                      ? "text-red-800"
                      : "text-slate-800"
                  }`}
                >
                  {balance > 0.01
                    ? `You are owed ${formatCurrency(balance)}`
                    : balance < -0.01
                    ? `You owe ${formatCurrency(Math.abs(balance))}`
                    : "Your payments and shares are fully balanced."}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ================= MEMBER AUDIT ROSTER ================= */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-900">Member contribution roster</h2>
            <p className="mt-0.5 text-sm text-slate-500">Monthly audit of payments, shares, and current balances</p>
          </div>

          <div className="divide-y divide-slate-100">
            {report?.members?.map((member) => {
              const memberId = getId(member.user);
              const isCurrentUser = memberId === currentUserId;
              const memName = member.user?.name || "Unknown Member";
              const memBalance = Number(member.balance || 0);

              return (
                <div
                  key={memberId}
                  className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                      {memName.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{memName}</p>
                        {isCurrentUser && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{member.user?.email || "Member"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 text-sm sm:text-right">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Paid</p>
                      <p className="mt-0.5 font-bold text-slate-800">{formatCurrency(member.paid)}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Share</p>
                      <p className="mt-0.5 font-bold text-slate-800">{formatCurrency(member.share)}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Balance</p>
                      <p
                        className={`mt-0.5 font-bold ${
                          memBalance > 0.01
                            ? "text-emerald-600"
                            : memBalance < -0.01
                            ? "text-red-600"
                            : "text-slate-500"
                        }`}
                      >
                        {memBalance > 0.01 ? "+" : memBalance < -0.01 ? "-" : ""}
                        {formatCurrency(Math.abs(memBalance))}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= SETTLEMENT ACTIONS ================= */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Settlement transactions</h2>
              <p className="mt-0.5 text-sm text-slate-500">Calculated transfers required to balance all accounts</p>
            </div>

            {report?.settlement && (
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                  report.settlement.status === "closed"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {report.settlement.status === "closed" ? "Closed" : "Open"}
              </span>
            )}
          </div>

          {!report?.settlement ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                🧾
              </div>
              <p className="mt-4 font-bold text-slate-800">Settlement not yet calculated</p>
              <p className="mt-1 text-xs text-slate-400">
                Navigate to the Settlement tab to view or trigger the settlement cycle.
              </p>
            </div>
          ) : report.settlement.transactions?.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-bold text-emerald-600">Everyone is fully settled for this period 🎉</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {report.settlement.transactions.map((transaction) => (
                <div
                  key={transaction._id || transaction.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800">
                      {transaction.from?.name || "Member"}
                    </span>
                    <span className="text-xs font-bold text-slate-400">pays</span>
                    <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800">
                      {transaction.to?.name || "Member"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(transaction.amount)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        transaction.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {transaction.status === "paid" ? "Paid" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Reports;