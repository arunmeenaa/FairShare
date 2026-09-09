import { useEffect, useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";
import { useAuth } from "../../context/AuthContext";

const formatCurrency = (value) => {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getMonthName = (monthNumber) => {
  return new Date(2000, monthNumber - 1, 1).toLocaleString("en-IN", {
    month: "long",
  });
};

const getInitial = (name) => {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
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

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const StatCard = ({
  label,
  value,
  subtitle,
  iconBg,
  iconColor,
  textColor,
  icon,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
    >
      <span className={iconColor}>{icon}</span>
    </div>
    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{label}</p>
    <p
      className={`mt-1 text-2xl font-bold ${textColor || "text-slate-900"} dark:text-white`}
    >
      {value}
    </p>
    {subtitle && (
      <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
        {subtitle}
      </p>
    )}
  </div>
);

const Settlement = () => {
  const { currentHousehold } = useHousehold();
  const { user } = useAuth();

  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [closingSettlement, setClosingSettlement] = useState(false);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const householdId = currentHousehold?._id;
  const currentUserId = getId(user);

  const isAdmin = useMemo(() => {
    if (!currentHousehold?.members || !currentUserId) {
      return false;
    }

    const member = currentHousehold.members.find(
      (item) => getId(item.user) === currentUserId,
    );

    return member?.role === "admin";
  }, [currentHousehold?.members, currentUserId]);

  const fetchSettlement = useCallback(async () => {
    if (!householdId) return;

    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/settlements/${householdId}`, {
        params: { month, year },
      });

      setSettlement(response.data.settlement);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load settlement");
    } finally {
      setLoading(false);
    }
  }, [householdId, month, year]);

  useEffect(() => {
    fetchSettlement();
  }, [fetchSettlement]);

  const markAsPaid = async (settlementId, transactionId) => {
    if (settlement?.status === "closed") {
      toast.error("This settlement is closed");
      return;
    }

    try {
      setActionLoading(transactionId);
      await api.patch(
        `/settlements/${householdId}/${settlementId}/${transactionId}/paid`,
      );

      await fetchSettlement();
      toast.success("Transaction marked as paid");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to mark settlement as paid",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const closeCurrentSettlement = async () => {
    if (!settlement?._id) {
      toast.error("Settlement is not available");
      return;
    }

    const confirmed = window.confirm(
      `Close the settlement for ${getMonthName(month)} ${year}?\n\nOnce closed, this month's settlement will be frozen and future expense changes will not modify this settlement snapshot.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setClosingSettlement(true);

      await api.patch(`/settlements/${householdId}/${settlement._id}/close`);

      toast.success("Settlement closed successfully");

      await fetchSettlement();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to close settlement");
    } finally {
      setClosingSettlement(false);
    }
  };

  // Balance Computations
  const currentUserBalance = useMemo(() => {
    if (!settlement?.memberBalances) return null;
    return settlement.memberBalances.find(
      (m) => getId(m.user) === currentUserId,
    );
  }, [settlement?.memberBalances, currentUserId]);

  const paid = Number(currentUserBalance?.paid || 0);
  const share = Number(currentUserBalance?.share || 0);
  const balance = Number(currentUserBalance?.balance || 0);

  const transactions = useMemo(
    () => settlement?.transactions || [],
    [settlement],
  );
  const pendingTransactions = useMemo(
    () => transactions.filter((t) => t.status !== "paid"),
    [transactions],
  );
  const paidTransactions = useMemo(
    () => transactions.filter((t) => t.status === "paid"),
    [transactions],
  );

  /* ================= NO HOUSEHOLD ================= */
  if (!currentHousehold) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50">
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
            <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
              Select a household
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Select a household to view its monthly settlements and balances.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ================= LOADING SKELETON ================= */
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 pb-28 sm:px-6 lg:px-8 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-9 w-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-10 w-44 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl bg-white shadow-sm dark:bg-slate-900"
              />
            ))}
          </div>
          <div className="h-64 rounded-3xl bg-white shadow-sm dark:bg-slate-900" />
        </div>
      </div>
    );
  }

  /* ================= ERROR ================= */
  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center">
          <div className="w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/60 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40">
              <svg
                className="h-7 w-7 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 9v3m0 4h.01M5.07 19h13.86a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16a2 2 0 001.73 3z"
                />
              </svg>
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
              Unable to load settlement
            </h2>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
            <button
              type="button"
              onClick={fetchSettlement}
              className="mt-6 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 pb-28 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {currentHousehold.name}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Settlement
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              See who owes whom and settle household balances.
            </p>
          </div>

          {/* Month / Year Selector + Close Action */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:w-auto dark:border-slate-800 dark:bg-slate-900">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:bg-slate-50 dark:text-slate-200 dark:focus:bg-slate-800 sm:w-36 sm:flex-none"
              >
                {MONTHS.map((name, index) => (
                  <option key={index + 1} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-24 rounded-xl border-0 bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:bg-slate-50 dark:text-slate-200 dark:focus:bg-slate-800"
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

            {isAdmin && settlement?.status !== "closed" && (
              <button
                type="button"
                onClick={closeCurrentSettlement}
                disabled={closingSettlement}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                {closingSettlement ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
                      />
                    </svg>
                    Closing...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 12l4 4L19 6"
                      />
                    </svg>
                    Close Settlement
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ================= PERIOD BANNER ================= */}
        <div className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 sm:flex-row sm:items-center dark:border-indigo-900/60 dark:bg-indigo-950/40">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/60">
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
                  d="M8 2v4m8-4v4M4 9h16M5 4h14a1 1 0 011 1v15a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                Settlement period
              </p>

              <h2 className="mt-0.5 truncate text-lg font-bold text-indigo-950 dark:text-indigo-100">
                {settlement?.monthName || `${getMonthName(month)} ${year}`}
              </h2>
            </div>
          </div>

          <div className="sm:ml-auto">
            {settlement?.status === "closed" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <span>✓</span>
                Settlement closed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Settlement open
              </span>
            )}
          </div>
        </div>

        {/* ================= STATS SUMMARY ================= */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total expenses"
            value={formatCurrency(settlement?.totalExpenses)}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
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
            label="You paid"
            value={formatCurrency(paid)}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
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
            label="Your share"
            value={formatCurrency(share)}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
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
            label="Your balance"
            value={formatCurrency(Math.abs(balance))}
            subtitle={
              balance > 0
                ? "You should receive"
                : balance < 0
                  ? "You need to pay"
                  : "Fully settled"
            }
            iconBg={
              balance > 0
                ? "bg-emerald-50"
                : balance < 0
                  ? "bg-red-50"
                  : "bg-slate-100"
            }
            iconColor={
              balance > 0
                ? "text-emerald-600"
                : balance < 0
                  ? "text-red-600"
                  : "text-slate-500"
            }
            textColor={
              balance > 0
                ? "text-emerald-600"
                : balance < 0
                  ? "text-red-600"
                  : "text-slate-900"
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

        {/* ================= BALANCE POSITION CARD ================= */}
        <div className="relative overflow-hidden rounded-3xl bg-indigo-600 p-6 shadow-sm sm:p-7 dark:bg-indigo-700">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-500/60" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-200">
                Your settlement position
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {balance > 0
                  ? `You should receive ${formatCurrency(balance)}`
                  : balance < 0
                    ? `You need to pay ${formatCurrency(Math.abs(balance))}`
                    : "You're completely settled"}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100 dark:text-indigo-50">
                {balance > 0
                  ? "You paid more than your fair share for this period."
                  : balance < 0
                    ? "Your fair share is higher than the amount you paid."
                    : "Your payments match your calculated share for this period."}
              </p>
            </div>

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold text-white ring-1 ring-white/20">
              {balance > 0 ? "↑" : balance < 0 ? "↓" : "✓"}
            </div>
          </div>
        </div>

        {settlement?.status === "closed" && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              ✓
            </div>

            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                This settlement is closed
              </p>

              <p className="mt-1 text-sm leading-5 text-emerald-700 dark:text-emerald-300">
                The settlement for {getMonthName(month)} {year} is frozen.
                Future expense changes will not modify this settlement snapshot.
              </p>
            </div>
          </div>
        )}

        {settlement?.status === "closed" && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              ✓
            </div>

            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                This settlement is closed
              </p>
              <p className="mt-1 text-sm leading-5 text-emerald-700 dark:text-emerald-300">
                The settlement for {getMonthName(month)} {year} is frozen.
                Future expense changes will not modify this settlement snapshot.
              </p>
            </div>
          </div>
        )}

        {/* ================= TRANSACTIONS LIST ================= */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-6 dark:border-slate-800">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Who pays whom?
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Settle the outstanding household balances below.
                </p>
              </div>

              <div className="flex gap-2">
                {pendingTransactions.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    {pendingTransactions.length} pending
                  </span>
                )}
                {paidTransactions.length > 0 && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {paidTransactions.length} paid
                  </span>
                )}
              </div>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40">
                <svg
                  className="h-8 w-8 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
                Everyone is settled
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                There are no outstanding payments for this period.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((transaction) => {
                const isPaid = transaction.status === "paid";
                const fromId = getId(transaction.from);
                const toId = getId(transaction.to);
                const fromName = transaction.from?.name || "Unknown";
                const toName = transaction.to?.name || "Unknown";

                const isCurrentUserSender = fromId === currentUserId;
                const isCurrentUserReceiver = toId === currentUserId;
                const canMarkAsPaid =
                  !isPaid &&
                  isCurrentUserSender &&
                  settlement?.status !== "closed";
                const isProcessing = actionLoading === transaction._id;

                return (
                  <div
                    key={transaction._id}
                    className="p-5 transition sm:p-6 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      {/* Avatars and Relationship */}
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="flex items-center">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 ring-2 ring-white dark:bg-indigo-900/60 dark:text-indigo-300 dark:ring-slate-900">
                            {getInitial(fromName)}
                          </div>
                          <div className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 ring-2 ring-white dark:bg-violet-900/60 dark:text-violet-300 dark:ring-slate-900">
                            {getInitial(toName)}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Payment Transfer
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {fromName}
                            </span>
                            <svg
                              className="h-4 w-4 text-slate-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 12h14m-4-4l4 4-4 4"
                              />
                            </svg>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {toName}
                            </span>
                          </div>

                          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                            {isCurrentUserSender
                              ? "You are paying"
                              : isCurrentUserReceiver
                                ? "You are receiving"
                                : "Household transaction"}
                          </p>
                        </div>
                      </div>

                      {/* Amount & Actions */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
                        <div className="sm:text-right">
                          <p className="text-xl font-bold text-slate-900 dark:text-white">
                            {formatCurrency(transaction.amount)}
                          </p>
                          <span
                            className={`mt-0.5 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {isPaid ? "Paid" : "Pending"}
                          </span>
                        </div>

                        {canMarkAsPaid && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              markAsPaid(settlement._id, transaction._id)
                            }
                            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isProcessing ? (
                              <>
                                <svg
                                  className="h-4 w-4 animate-spin"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="9"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
                                  />
                                </svg>
                                Updating...
                              </>
                            ) : (
                              <>
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
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                Mark as paid
                              </>
                            )}
                          </button>
                        )}

                        {isPaid && (
                          <div className="flex h-10 items-center justify-center rounded-xl bg-emerald-50 px-4 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            ✓ Completed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footnote */}
        <div className="flex items-start gap-2.5 px-2 pb-4">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
            <path
              strokeLinecap="round"
              strokeWidth={1.8}
              d="M12 11v5M12 8h.01"
            />
          </svg>
          <p className="text-xs leading-5 text-slate-400 dark:text-slate-500">
            Only the person who needs to pay can mark the transaction as paid.
            Closed settlements cannot be changed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settlement;
