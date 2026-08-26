import { useEffect, useState } from "react";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";
import { useAuth } from "../../context/AuthContext";

const Settlement = () => {
  const { currentHousehold } = useHousehold();
  const { user } = useAuth();

  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [month, setMonth] = useState(
    new Date().getMonth() + 1,
  );

  const [year, setYear] = useState(
    new Date().getFullYear(),
  );

  const fetchSettlement = async () => {
    if (!currentHousehold) return;

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/settlements/${currentHousehold._id}`,
        {
          params: {
            month,
            year,
          },
        },
      );

      setSettlement(
        response.data.settlement,
      );
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load settlement",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlement();
  }, [currentHousehold, month, year]);

  const markAsPaid = async (
    settlementId,
    transactionId,
  ) => {
    try {
      await api.patch(
        `/settlements/${currentHousehold._id}/${settlementId}/${transactionId}/paid`,
      );

      await fetchSettlement();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to mark settlement as paid",
      );
    }
  };

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )}`;
  };

  const getInitial = (name) => {
    return (
      name?.trim()?.charAt(0)?.toUpperCase() ||
      "?"
    );
  };

  const getMonthName = (monthNumber) => {
    return new Date(
      2000,
      monthNumber - 1,
      1,
    ).toLocaleString("en-IN", {
      month: "long",
    });
  };

  if (!currentHousehold) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10">
        <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
              <svg
                className="h-8 w-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeWidth={1.8}
                  d="M3 10.5L12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6"
                />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-bold text-slate-900">
              Select a household
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Select a household to view its monthly
              settlements.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="mt-3 h-9 w-56 rounded-lg bg-slate-200" />

          <div className="mt-6 h-16 rounded-2xl bg-white" />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl bg-white"
              />
            ))}
          </div>

          <div className="mt-6 h-40 rounded-2xl bg-white" />
          <div className="mt-4 h-40 rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10">
        <div className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center">
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

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Unable to load settlement
            </h2>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentUserBalance =
    settlement?.memberBalances?.find(
      (member) =>
        member.user?._id === user?._id ||
        member.user === user?._id,
    );

  const paid = Number(
    currentUserBalance?.paid || 0,
  );

  const share = Number(
    currentUserBalance?.share || 0,
  );

  const balance = Number(
    currentUserBalance?.balance || 0,
  );

  const transactions =
    settlement?.transactions || [];

  const pendingTransactions =
    transactions.filter(
      (transaction) =>
        transaction.status !== "paid",
    );

  const paidTransactions =
    transactions.filter(
      (transaction) =>
        transaction.status === "paid",
    );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* ================= HEADER ================= */}

        <div className="mb-6">
          <p className="text-sm font-medium text-indigo-600">
            {currentHousehold.name}
          </p>

          <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Settlement
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                See who owes whom and settle household
                balances.
              </p>
            </div>

            {/* Month / Year */}

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <select
                value={month}
                onChange={(e) =>
                  setMonth(
                    Number(e.target.value),
                  )
                }
                className="rounded-xl border-0 bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {Array.from(
                  { length: 12 },
                  (_, index) => (
                    <option
                      key={index + 1}
                      value={index + 1}
                    >
                      {new Date(
                        2000,
                        index,
                        1,
                      ).toLocaleString("en-IN", {
                        month: "short",
                      })}
                    </option>
                  ),
                )}
              </select>

              <div className="h-6 w-px bg-slate-200" />

              <select
                value={year}
                onChange={(e) =>
                  setYear(
                    Number(e.target.value),
                  )
                }
                className="rounded-xl border-0 bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {[year - 2, year - 1, year, year + 1].map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
        </div>

        {/* ================= PERIOD BANNER ================= */}

        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
            <svg
              className="h-5 w-5 text-indigo-600"
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
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
              Settlement period
            </p>

            <h2 className="mt-0.5 text-lg font-bold text-indigo-950">
              {settlement?.monthName ||
                `${getMonthName(month)} ${year}`}
            </h2>
          </div>
        </div>

        {/* ================= SUMMARY ================= */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Total */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
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

            <p className="mt-4 text-sm text-slate-500">
              Total expenses
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(
                settlement?.totalExpenses,
              )}
            </p>
          </div>

          {/* Paid */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeWidth={1.8}
                  d="M12 19V5m0 0L6 11m6-6l6 6"
                />
              </svg>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              You paid
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(paid)}
            </p>
          </div>

          {/* Share */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
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

            <p className="mt-4 text-sm text-slate-500">
              Your share
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(share)}
            </p>
          </div>

          {/* Balance */}

          <div
            className={`rounded-2xl border p-5 shadow-sm ${
              balance > 0
                ? "border-emerald-200 bg-emerald-50"
                : balance < 0
                  ? "border-red-200 bg-red-50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                balance > 0
                  ? "bg-emerald-100"
                  : balance < 0
                    ? "bg-red-100"
                    : "bg-slate-100"
              }`}
            >
              <svg
                className={`h-5 w-5 ${
                  balance > 0
                    ? "text-emerald-600"
                    : balance < 0
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

            <p className="mt-4 text-sm text-slate-500">
              Your balance
            </p>

            <p
              className={`mt-1 text-2xl font-bold ${
                balance > 0
                  ? "text-emerald-700"
                  : balance < 0
                    ? "text-red-700"
                    : "text-slate-900"
              }`}
            >
              {formatCurrency(
                Math.abs(balance),
              )}
            </p>

            <p
              className={`mt-1 text-xs font-semibold ${
                balance > 0
                  ? "text-emerald-600"
                  : balance < 0
                    ? "text-red-600"
                    : "text-slate-400"
              }`}
            >
              {balance > 0
                ? "You should receive"
                : balance < 0
                  ? "You need to pay"
                  : "Fully settled"}
            </p>
          </div>
        </div>

        {/* ================= BALANCE EXPLANATION ================= */}

        <div className="mt-6 rounded-3xl bg-indigo-600 p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-200">
                Your settlement position
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white">
                {balance > 0
                  ? `You should receive ${formatCurrency(
                      balance,
                    )}`
                  : balance < 0
                    ? `You need to pay ${formatCurrency(
                        Math.abs(balance),
                      )}`
                    : "You're completely settled"}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
                {balance > 0
                  ? "You paid more than your fair share for this period."
                  : balance < 0
                    ? "Your fair share is higher than the amount you paid."
                    : "Your payments match your calculated share for this period."}
              </p>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold text-white ring-1 ring-white/10">
              {balance > 0
                ? "↑"
                : balance < 0
                  ? "↓"
                  : "✓"}
            </div>
          </div>
        </div>

        {/* ================= TRANSACTIONS ================= */}

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Who pays whom?
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Settle the outstanding household
                  balances below.
                </p>
              </div>

              <div className="flex gap-2">
                {pendingTransactions.length >
                  0 && (
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    {pendingTransactions.length}{" "}
                    pending
                  </span>
                )}

                {paidTransactions.length > 0 && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    {paidTransactions.length} paid
                  </span>
                )}
              </div>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
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

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Everyone is settled
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                There are no outstanding payments for
                this period.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map(
                (transaction) => {
                  const isPaid =
                    transaction.status ===
                    "paid";

                  const fromName =
                    transaction.from?.name ||
                    "Unknown";

                  const toName =
                    transaction.to?.name ||
                    "Unknown";

                  const isCurrentUserSender =
                    transaction.from?._id ===
                    user?._id;

                  const isCurrentUserReceiver =
                    transaction.to?._id ===
                    user?._id;

                  const canMarkAsPaid =
                    !isPaid &&
                    (isCurrentUserSender ||
                      isCurrentUserReceiver);

                  return (
                    <div
                      key={transaction._id}
                      className="p-5 sm:p-6"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        {/* People */}

                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex items-center">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 ring-2 ring-white">
                              {getInitial(
                                fromName,
                              )}
                            </div>

                            <div className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 ring-2 ring-white">
                              {getInitial(
                                toName,
                              )}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm text-slate-500">
                              Payment
                            </p>

                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900">
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
                                  strokeWidth={2}
                                  d="M5 12h14m-4-4l4 4-4 4"
                                />
                              </svg>

                              <span className="font-semibold text-slate-900">
                                {toName}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-400">
                              {isCurrentUserSender
                                ? "You are paying"
                                : isCurrentUserReceiver
                                  ? "You are receiving"
                                  : "Household transaction"}
                            </p>
                          </div>
                        </div>

                        {/* Amount + status */}

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="sm:text-right">
                            <p className="text-xl font-bold text-slate-900">
                              {formatCurrency(
                                transaction.amount,
                              )}
                            </p>

                            <span
                              className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {isPaid
                                ? "Paid"
                                : "Pending"}
                            </span>
                          </div>

                          {/* Action */}

                          {canMarkAsPaid && (
                            <button
                              type="button"
                              onClick={() =>
                                markAsPaid(
                                  settlement._id,
                                  transaction._id,
                                )
                              }
                              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>

                              Mark as paid
                            </button>
                          )}

                          {isPaid && (
                            <div className="flex h-10 items-center justify-center rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-700">
                              ✓ Completed
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>

        {/* ================= FOOTNOTE ================= */}

        <div className="mt-5 flex items-start gap-3 px-2 pb-4">
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
            A payment can be marked as paid by either
            person involved in the transaction.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settlement;