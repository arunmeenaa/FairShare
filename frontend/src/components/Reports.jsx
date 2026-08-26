import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";
import { useAuth } from "../../context/AuthContext";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const Reports = () => {
  const { currentHousehold } = useHousehold();
  const { user } = useAuth();

  const now = new Date();

  const [month, setMonth] = useState(
    now.getMonth() + 1,
  );

  const [year, setYear] = useState(
    now.getFullYear(),
  );

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    if (!currentHousehold) return;

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/reports/${currentHousehold._id}`,
        {
          params: {
            month,
            year,
          },
        },
      );

      setReport(response.data);
    } catch (error) {
      console.error("Failed to fetch report:", error);

      setError(
        error.response?.data?.message ||
          "Failed to load report",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [currentHousehold, month, year]);

  const currentUser = report?.currentUser;

  const categoryEntries = useMemo(() => {
    if (!report?.categoryTotals) return [];

    return Object.entries(
      report.categoryTotals,
    ).sort((a, b) => b[1] - a[1]);
  }, [report]);

  const maxCategoryValue =
    categoryEntries.length > 0
      ? Math.max(
          ...categoryEntries.map(
            ([, value]) => value,
          ),
        )
      : 0;

  const getMemberName = (member) => {
    if (member.user?.name) {
      return member.user.name;
    }

    return "Unknown";
  };

  const getBalanceColor = (balance) => {
    if (balance > 0.01) {
      return "text-emerald-600";
    }

    if (balance < -0.01) {
      return "text-red-600";
    }

    return "text-slate-500";
  };

  const getBalanceLabel = (balance) => {
    if (balance > 0.01) {
      return "You should receive";
    }

    if (balance < -0.01) {
      return "You need to pay";
    }

    return "Settled";
  };

  const getCategoryName = (category) => {
    return category
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      );
  };

  if (!currentHousehold) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            No household selected
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Select a household to view reports.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="font-medium text-red-700">
            {error}
          </p>

          <button
            onClick={fetchReport}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              {currentHousehold.name}
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Reports
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track your household spending and
              settlement.
            </p>
          </div>

          <div className="flex gap-2">
            <select
              value={month}
              onChange={(e) =>
                setMonth(Number(e.target.value))
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                      month: "long",
                    })}
                  </option>
                ),
              )}
            </select>

            <select
              value={year}
              onChange={(e) =>
                setYear(Number(e.target.value))
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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

        {/* STAT CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* TOTAL */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-indigo-50 p-3">
                <span className="text-xl">₹</span>
              </div>

              <span className="text-xs font-medium text-slate-400">
                MONTHLY
              </span>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Total spending
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(
                report?.totalSpending,
              )}
            </p>
          </div>

          {/* PAID */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-blue-50 p-3 w-fit">
              <span className="text-xl">↗</span>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              You paid
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(currentUser?.paid)}
            </p>
          </div>

          {/* SHARE */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-violet-50 p-3 w-fit">
              <span className="text-xl">◉</span>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Your share
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(currentUser?.share)}
            </p>
          </div>

          {/* BALANCE */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-emerald-50 p-3 w-fit">
              <span className="text-xl">✓</span>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Your balance
            </p>

            <p
              className={`mt-1 text-2xl font-bold ${getBalanceColor(
                currentUser?.balance,
              )}`}
            >
              {formatCurrency(
                Math.abs(
                  currentUser?.balance || 0,
                ),
              )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {getBalanceLabel(
                currentUser?.balance || 0,
              )}
            </p>
          </div>
        </div>

        {/* CATEGORY + PERSONAL SUMMARY */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* CATEGORY */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Spending by category
              </h2>

              <p className="text-sm text-slate-500">
                Where your household money went
              </p>
            </div>

            {categoryEntries.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                No expenses this month.
              </div>
            ) : (
              <div className="space-y-5">
                {categoryEntries.map(
                  ([category, value]) => {
                    const percentage =
                      maxCategoryValue > 0
                        ? (value /
                            maxCategoryValue) *
                          100
                        : 0;

                    return (
                      <div key={category}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">
                            {getCategoryName(
                              category,
                            )}
                          </span>

                          <span className="text-sm font-semibold text-slate-900">
                            {formatCurrency(value)}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          {/* PERSONAL SUMMARY */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Your financial summary
              </h2>

              <p className="text-sm text-slate-500">
                Your contribution this month
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <span className="text-sm text-slate-500">
                  Total paid
                </span>

                <span className="font-semibold text-slate-900">
                  {formatCurrency(
                    currentUser?.paid,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <span className="text-sm text-slate-500">
                  Your share
                </span>

                <span className="font-semibold text-slate-900">
                  {formatCurrency(
                    currentUser?.share,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <span className="text-sm text-slate-500">
                  Difference
                </span>

                <span
                  className={`font-semibold ${getBalanceColor(
                    currentUser?.balance,
                  )}`}
                >
                  {currentUser?.balance >= 0
                    ? "+"
                    : "-"}
                  {formatCurrency(
                    Math.abs(
                      currentUser?.balance || 0,
                    ),
                  )}
                </span>
              </div>

              <div
                className={`rounded-xl p-4 ${
                  (currentUser?.balance || 0) > 0
                    ? "bg-emerald-50"
                    : (currentUser?.balance || 0) <
                        0
                      ? "bg-red-50"
                      : "bg-slate-50"
                }`}
              >
                <p className="text-sm font-medium text-slate-600">
                  Settlement status
                </p>

                <p
                  className={`mt-1 font-semibold ${getBalanceColor(
                    currentUser?.balance,
                  )}`}
                >
                  {getBalanceLabel(
                    currentUser?.balance || 0,
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MEMBERS */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Household members
            </h2>

            <p className="text-sm text-slate-500">
              Monthly contribution breakdown
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {report?.members?.map((member) => {
              const isCurrentUser =
                member.user?._id === user?._id;

              return (
                <div
                  key={member.user?._id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                      {getMemberName(
                        member,
                      ).charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <p className="font-medium text-slate-900">
                        {getMemberName(member)}

                        {isCurrentUser && (
                          <span className="ml-2 rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600">
                            You
                          </span>
                        )}
                      </p>

                      <p className="text-xs text-slate-400">
                        {member.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">
                        Paid
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {formatCurrency(
                          member.paid,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Share
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {formatCurrency(
                          member.share,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Balance
                      </p>

                      <p
                        className={`mt-1 font-semibold ${getBalanceColor(
                          member.balance,
                        )}`}
                      >
                        {member.balance >= 0
                          ? "+"
                          : "-"}
                        {formatCurrency(
                          Math.abs(
                            member.balance,
                          ),
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SETTLEMENT */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Settlement
              </h2>

              <p className="text-sm text-slate-500">
                Who pays whom
              </p>
            </div>

            {report?.settlement && (
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  report.settlement.status ===
                  "closed"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {report.settlement.status ===
                "closed"
                  ? "Closed"
                  : "Open"}
              </span>
            )}
          </div>

          {!report?.settlement ? (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                ₹
              </div>

              <p className="mt-4 font-medium text-slate-700">
                Settlement not calculated
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Calculate the settlement to see
                payment transactions.
              </p>
            </div>
          ) : report.settlement
              .transactions?.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-emerald-600">
                Everyone is settled 🎉
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {report.settlement.transactions.map(
                (transaction) => (
                  <div
                    key={transaction._id}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                        {transaction.from?.name}
                      </div>

                      <span className="text-slate-400">
                        →
                      </span>

                      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-600">
                        {transaction.to?.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-900">
                        {formatCurrency(
                          transaction.amount,
                        )}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          transaction.status ===
                          "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {transaction.status ===
                        "paid"
                          ? "Paid"
                          : "Pending"}
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;