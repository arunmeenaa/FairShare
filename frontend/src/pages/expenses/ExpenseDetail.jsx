import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";

const ExpenseDetail = () => {
  const { expenseId } = useParams();
  const { currentHousehold } = useHousehold();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentHousehold || !expenseId) {
      setLoading(false);
      return;
    }

    const fetchExpense = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/expenses/${currentHousehold._id}/${expenseId}`,
        );

        setExpense(response.data.expense);
      } catch (error) {
        console.error(
          "Failed to load expense:",
          error,
        );

        setError(
          error.response?.data?.message ||
            "Failed to load expense",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [currentHousehold, expenseId]);

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  };

  const getCategoryName = (category) => {
    return String(category || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      );
  };

  const getInitial = (name) => {
    return (
      name?.trim()?.charAt(0)?.toUpperCase() ||
      "?"
    );
  };

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl animate-pulse">
          <div className="h-4 w-24 rounded bg-slate-200" />

          <div className="mt-4 h-10 w-64 rounded-lg bg-slate-200" />

          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="h-48 bg-slate-100" />

            <div className="space-y-6 p-6">
              <div className="h-20 rounded-2xl bg-slate-100" />
              <div className="h-16 rounded-2xl bg-slate-100" />
              <div className="h-16 rounded-2xl bg-slate-100" />
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
                  strokeWidth={1.8}
                  d="M12 9v3m0 4h.01M5.07 19h13.86a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16a2 2 0 001.73 3z"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              Unable to load expense
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-600">
              {error}
            </p>
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
                  strokeWidth={1.8}
                  d="M9 14l2 2 4-4m5 3V7a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h13a2 2 0 002-2z"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              Expense not found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              This expense may have been deleted or
              is no longer available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const paidByName =
    expense.paidBy?.name || "Unknown";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">

        {/* ================= HEADER ================= */}

        <div className="mb-6">
          <p className="text-sm font-medium text-indigo-600">
            {currentHousehold?.name || "Household"}
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Expense details
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View the complete breakdown of this
            household expense.
          </p>
        </div>

        {/* ================= MAIN CARD ================= */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          {/* Expense hero */}

          <div className="bg-indigo-600 px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                  <svg
                    className="h-7 w-7 text-white"
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

                <div>
                  <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100 ring-1 ring-white/10">
                    {getCategoryName(
                      expense.category,
                    )}
                  </span>

                  <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                    {expense.description}
                  </h2>
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-sm text-indigo-200">
                  Total amount
                </p>

                <p className="mt-1 text-3xl font-bold text-white">
                  {formatCurrency(
                    expense.amount,
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* ================= META ================= */}

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
                    strokeWidth={1.8}
                    d="M20 21a8 8 0 00-16 0m12-11a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Paid by
                </p>

                <p className="mt-1 font-semibold text-slate-900">
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
                    strokeWidth={1.8}
                    d="M8 2v4m8-4v4M4 9h16M5 4h14a1 1 0 011 1v15a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"
                  />
                </svg>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Expense date
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {formatDate(expense.date)}
                </p>
              </div>
            </div>
          </div>

          {/* ================= SPLIT ================= */}

          <div className="p-6 sm:p-8">

            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Expense split
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Each member's share of this expense.
                </p>
              </div>

              <span className="text-sm font-medium text-slate-400">
                {expense.participants?.length || 0}{" "}
                participants
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">

              {/* Table header */}

              <div className="hidden grid-cols-[1fr_auto] border-b border-slate-100 bg-slate-50 px-5 py-3 sm:grid">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Member
                </span>

                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Share
                </span>
              </div>

              {/* Participants */}

              <div className="divide-y divide-slate-100">
                {expense.participants?.map(
                  (participant) => {
                    const name =
                      participant.user?.name ||
                      "Unknown";

                    const isPayer =
                      participant.user?._id ===
                      expense.paidBy?._id;

                    return (
                      <div
                        key={participant._id}
                        className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                            {getInitial(name)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {name}
                            </p>

                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              {isPayer && (
                                <span className="text-xs font-medium text-blue-600">
                                  Paid this expense
                                </span>
                              )}

                              {!isPayer && (
                                <span className="text-xs text-slate-400">
                                  Participant
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-slate-900">
                            {formatCurrency(
                              participant.share,
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Total */}

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-5 py-4">
              <span className="text-sm font-medium text-slate-500">
                Total expense
              </span>

              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(expense.amount)}
              </span>
            </div>
          </div>
        </div>

        {/* ================= FOOTER NOTE ================= */}

        <div className="mt-4 flex items-start gap-3 px-2">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              strokeWidth={1.8}
            />

            <path
              strokeLinecap="round"
              strokeWidth={1.8}
              d="M12 11v5M12 8h.01"
            />
          </svg>

          <p className="text-xs leading-5 text-slate-400">
            This expense is shared according to the
            participant breakdown above.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetail;