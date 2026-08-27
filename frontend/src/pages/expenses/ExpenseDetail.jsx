import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";

// ==========================================
// UTILITIES & HELPERS
// ==========================================

const formatCurrency = (value) => {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getCategoryName = (category) => {
  return String(category || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

const CATEGORY_ICONS = {
  grocery: "🛒",
  electricity: "⚡",
  internet: "🌐",
  rent: "🏠",
  dining: "🍽️",
  maintenance: "🔧",
  water: "💧",
  cleaning: "🧹",
  household: "🛋️",
  other: "💳",
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const ExpenseDetail = () => {
  const { expenseId } = useParams();
  const { currentHousehold } = useHousehold();
  const navigate = useNavigate();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const householdId = currentHousehold?._id;

  const fetchExpense = useCallback(async () => {
    if (!householdId || !expenseId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/expenses/${householdId}/${expenseId}`);
      setExpense(response.data.expense);
    } catch (err) {
      console.error("Failed to load expense:", err);
      setError(err.response?.data?.message || "Failed to load expense");
    } finally {
      setLoading(false);
    }
  }, [householdId, expenseId]);

  useEffect(() => {
    fetchExpense();
  }, [fetchExpense]);

  const downloadReceipt = async () => {
    if (!householdId || !expenseId) {
      toast.error("Expense information is missing");
      return;
    }

    try {
      setDownloading(true);

      const response = await api.get(
        `/reports/${householdId}/${expenseId}/receipt`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `FairShare-Receipt-${expenseId}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success("Receipt downloaded successfully");
    } catch (err) {
      console.error("Failed to download receipt:", err);
      toast.error("Failed to download receipt");
    } finally {
      setDownloading(false);
    }
  };

  const allMembers = useMemo(() => {
    if (!expense) return [];

    const participants = (expense.participants || []).map((participant) => ({
      user: participant.user,
      share: participant.share,
      type: "participant",
      availabilityStatus: participant.availabilityStatus,
    }));

    const excluded = (expense.excludedMembers || []).map((member) => ({
      user: member.user,
      share: 0,
      type: "excluded",
      availabilityStatus: member.status,
      reason: member.reason,
    }));

    return [...participants, ...excluded];
  }, [expense]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl animate-pulse space-y-6">
          <div className="h-6 w-32 rounded-lg bg-slate-200" />
          <div className="h-10 w-64 rounded-lg bg-slate-200" />

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="h-44 bg-slate-200" />
            <div className="space-y-4 p-6 sm:p-8">
              <div className="h-16 rounded-2xl bg-slate-100" />
              <div className="h-16 rounded-2xl bg-slate-100" />
              <div className="h-32 rounded-2xl bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================= ERROR ================= */
  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center">
          <div className="w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
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
            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              Unable to load expense
            </h2>
            <p className="mt-2 text-sm leading-6 text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/expenses")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Back to Expenses
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= NOT FOUND ================= */
  if (!expense) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <svg
                className="h-7 w-7 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 14l2 2 4-4m5 3V7a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h13a2 2 0 002-2z"
                />
              </svg>
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              Expense not found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              This expense may have been deleted or is no longer available.
            </p>
            <Link
              to="/expenses"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Back to Expenses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const paidByName = expense.paidBy?.name || "Unknown Member";
  const payerId = getId(expense.paidBy);
  const categoryIcon = CATEGORY_ICONS[expense.category?.toLowerCase()] || "💳";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* ================= TOP NAVIGATION BAR ================= */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              to="/expenses"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to expenses
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Expense details
            </h1>
          </div>

          <button
            type="button"
            disabled={downloading}
            onClick={downloadReceipt}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? (
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
                Downloading...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
                  />
                </svg>
                Download Receipt
              </>
            )}
          </button>
        </div>

        {/* ================= MAIN CARD CONTAINER ================= */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* Header Banner */}
          <div className="bg-indigo-600 px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl ring-1 ring-white/20">
                  {categoryIcon}
                </div>

                <div>
                  <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100 ring-1 ring-white/10">
                    {getCategoryName(expense.category)}
                  </span>
                  <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                    {expense.description}
                  </h2>
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-sm font-medium text-indigo-200">
                  Total amount
                </p>
                <p className="mt-1 text-3xl font-bold text-white">
                  {formatCurrency(expense.amount)}
                </p>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid border-b border-slate-100 sm:grid-cols-2">
            <div className="flex items-center gap-4 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
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
                    d="M20 21a8 8 0 00-16 0m12-11a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Paid by
                </p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {paidByName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 border-t border-slate-100 p-6 sm:border-l sm:border-t-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                <svg
                  className="h-5 w-5 text-violet-600"
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
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Expense date
                </p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {formatDate(expense.date)}
                </p>
              </div>
            </div>
          </div>

          {/* Participant Breakdown Section */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Expense split
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Breakdown of shares and away members for this transaction.
                </p>
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {expense.participants?.length || 0} participants
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[1fr_auto] border-b border-slate-100 bg-slate-50 px-5 py-3 sm:grid">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Member
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Share
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {allMembers.map((member) => {
                  const name = member.user?.name || "Unknown Member";
                  const memberUserId = getId(member.user);
                  const isPayer =
                    member.type === "participant" && memberUserId === payerId;

                  return (
                    <div
                      key={`${member.type}-${memberUserId}`}
                      className={`flex items-center justify-between gap-4 px-5 py-4 transition ${
                        member.type === "excluded"
                          ? "bg-amber-50/40 hover:bg-amber-50/70"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                            member.type === "excluded"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {getInitial(name)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {name}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {isPayer && (
                              <span className="text-xs font-semibold text-blue-600">
                                Paid this expense
                              </span>
                            )}

                            {member.type === "participant" && !isPayer && (
                              <span className="text-xs text-slate-400">
                                Participant
                              </span>
                            )}

                            {member.type === "excluded" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                                {member.availabilityStatus === "away"
                                  ? "Away · Not included"
                                  : "Not included"}
                              </span>
                            )}
                          </div>

                          {member.type === "excluded" && member.reason && (
                            <p className="mt-1 text-xs text-amber-900/80">
                              Reason: {member.reason}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            member.type === "excluded"
                              ? "text-slate-400"
                              : "text-slate-900"
                          }`}
                        >
                          {formatCurrency(member.share)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Balance Card */}
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-5 py-4">
              <span className="text-sm font-medium text-slate-500">
                Total transaction
              </span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(expense.amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer info note */}
        <div className="mt-4 flex items-start gap-2.5 px-2">
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
          <p className="text-xs leading-5 text-slate-400">
            This expense is calculated and settled using FairShare's automated
            split engine.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetail;
