import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
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

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getMonthName = (month) => {
  if (!month) return "";

  return new Date(2000, Number(month) - 1, 1).toLocaleString("en-IN", {
    month: "long",
  });
};

const formatCategory = (category) => {
  return String(category || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

const resolveMemberName = (target, memberRoster = []) => {
  if (!target) return "Unknown";

  if (typeof target === "object" && target.name) {
    return target.name;
  }

  if (typeof target === "object" && target.user?.name) {
    return target.user.name;
  }

  const targetId = getId(target);

  if (Array.isArray(memberRoster)) {
    const matched = memberRoster.find((m) => {
      const mUserId = getId(m.user);
      const mId = getId(m);

      return mUserId === targetId || mId === targetId;
    });

    if (matched?.user?.name) return matched.user.name;
    if (matched?.name) return matched.name;
  }

  if (typeof target === "string" && target.length === 24) {
    return "Member";
  }

  return typeof target === "string" ? target : "Member";
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

const RecentExpenses = () => {
  const { currentHousehold } = useHousehold();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterPaidBy, setFilterPaidBy] = useState("");

  const now = new Date();

  const [receiptMonth, setReceiptMonth] = useState(now.getMonth() + 1);

  const [receiptYear, setReceiptYear] = useState(now.getFullYear());

  const currentUserId = getId(user);

  const fetchData = useCallback(async () => {
    if (!currentHousehold?._id) {
      setExpenses([]);
      setMembers([]);
      setFetching(false);
      return;
    }

    try {
      setFetching(true);
      setError("");

      const params = {};

      /*
       * Month + year filter
       */
      if (filterMonth && filterYear) {
        const month = Number(filterMonth);
        const year = Number(filterYear);

        const startDate = new Date(year, month - 1, 1);

        const endDate = new Date(year, month, 0);

        params.startDate = `${year}-${String(month).padStart(2, "0")}-01`;

        params.endDate = `${year}-${String(month).padStart(2, "0")}-${String(
          endDate.getDate(),
        ).padStart(2, "0")}`;
      }

      /*
       * Paid by filter
       */
      if (filterPaidBy) {
        params.paidBy = filterPaidBy;
      }

      const [expenseResponse, memberResponse] = await Promise.all([
        api.get(`/expenses/${currentHousehold._id}`, {
          params,
        }),

        api.get(`/households/${currentHousehold._id}/members`),
      ]);

      setExpenses(expenseResponse.data.expenses || []);

      setMembers(memberResponse.data.members || []);
    } catch (err) {
      console.error("Failed to load expenses:", err);

      setError(err.response?.data?.message || "Failed to load expenses");
    } finally {
      setFetching(false);
    }
  }, [currentHousehold?._id, filterMonth, filterYear, filterPaidBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const triggerBlobDownload = (blobData, filename) => {
    const blob = new Blob([blobData], {
      type: "application/pdf",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };

  const downloadReceipt = async (expenseId) => {
    try {
      if (!currentHousehold?._id || !expenseId) {
        toast.error("Expense information is missing");
        return;
      }

      const response = await api.get(
        `/reports/${currentHousehold._id}/${expenseId}/receipt`,
        {
          responseType: "blob",
        },
      );

      triggerBlobDownload(
        response.data,
        `FairShare-Expense-Receipt-${expenseId}.pdf`,
      );

      toast.success("Expense receipt downloaded");
    } catch (err) {
      console.error("Failed to download expense receipt:", err);

      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const errorData = JSON.parse(text);

          toast.error(
            errorData.message || "Failed to download expense receipt",
          );
        } catch {
          toast.error("Failed to download expense receipt");
        }
      } else {
        toast.error(
          err.response?.data?.message || "Failed to download expense receipt",
        );
      }
    }
  };

  const downloadMonthlyReceipt = async (type) => {
    try {
      if (!currentHousehold?._id) {
        toast.error("Please select a household first");
        return;
      }

      const endpoint =
        type === "personal"
          ? `/reports/${currentHousehold._id}/monthly-receipt`
          : `/reports/${currentHousehold._id}/household-receipt`;

      const response = await api.get(endpoint, {
        params: {
          month: receiptMonth,
          year: receiptYear,
        },
        responseType: "blob",
      });

      const formattedMonth = String(receiptMonth).padStart(2, "0");

      const filename =
        type === "personal"
          ? `FairShare-My-Receipt-${receiptYear}-${formattedMonth}.pdf`
          : `FairShare-Household-Receipt-${receiptYear}-${formattedMonth}.pdf`;

      triggerBlobDownload(response.data, filename);

      toast.success(
        type === "personal"
          ? "Your monthly receipt downloaded"
          : "Household statement downloaded",
      );
    } catch (err) {
      console.error("Failed to download monthly statement:", err);

      toast.error("Failed to download statement");
    }
  };

  if (!currentHousehold) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10 transition-colors duration-300 dark:bg-slate-950">
        <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
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
              Select a household
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Select a household before adding or viewing shared expenses.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 pb-28 transition-colors duration-300 sm:px-6 lg:px-8 lg:pb-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        {/* ================= HEADER ================= */}

        <div className="mb-6">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            {currentHousehold.name}
          </p>

          <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Expenses
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage and track your household transactions.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <Link
                to="/expenses/create"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 dark:bg-indigo-500 dark:hover:bg-indigo-400 sm:w-auto"
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

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Monthly receipts
                </span>

                <div className="flex flex-1 items-center gap-2 sm:flex-none">
                  <select
                    value={receiptMonth}
                    onChange={(e) => setReceiptMonth(Number(e.target.value))}
                    aria-label="Receipt month"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-indigo-400 sm:flex-none"
                  >
                    {MONTHS.map((name, index) => (
                      <option
                        key={index + 1}
                        value={index + 1}
                        className="dark:bg-slate-900"
                      >
                        {name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={receiptYear}
                    onChange={(e) => setReceiptYear(Number(e.target.value))}
                    aria-label="Receipt year"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-indigo-400 sm:flex-none"
                  >
                    {[-2, -1, 0, 1].map((offset) => {
                      const y = now.getFullYear() + offset;

                      return (
                        <option key={y} value={y} className="dark:bg-slate-900">
                          {y}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() => downloadMonthlyReceipt("personal")}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
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
                        strokeWidth={1.8}
                        d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
                      />
                    </svg>
                    <span className="hidden md:inline">My Receipt</span>
                    <span className="md:hidden">My PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadMonthlyReceipt("household")}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
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
                        strokeWidth={1.8}
                        d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
                      />
                    </svg>
                    <span className="hidden md:inline">Household PDF</span>
                    <span className="md:hidden">Household</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= FILTERS ================= */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <svg
                    className="h-4.5 w-4.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 5h18M6 12h12m-8 7h4"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Filter expenses
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Narrow the list by month or who paid.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="min-w-0 sm:w-56">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Month
                </span>
                <select
                  value={
                    filterMonth && filterYear
                      ? `${filterYear}-${String(filterMonth).padStart(2, "0")}`
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;

                    if (!value) {
                      setFilterMonth("");
                      setFilterYear("");
                      return;
                    }

                    const [selectedYear, selectedMonth] = value.split("-");
                    setFilterYear(selectedYear);
                    setFilterMonth(selectedMonth);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-indigo-400"
                >
                  <option value="">All months</option>
                  {Array.from({ length: 24 }, (_, index) => {
                    const date = new Date(
                      now.getFullYear(),
                      now.getMonth() - index,
                      1,
                    );
                    const selectedYear = date.getFullYear();
                    const selectedMonth = date.getMonth() + 1;
                    const value = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

                    return (
                      <option key={value} value={value}>
                        {getMonthName(selectedMonth)} {selectedYear}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="min-w-0 sm:w-56">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Paid by
                </span>
                <select
                  value={filterPaidBy}
                  onChange={(e) => setFilterPaidBy(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-indigo-400"
                >
                  <option value="">Everyone</option>
                  {members
                    .filter((member) => member.isActive)
                    .map((member) => (
                      <option
                        key={getId(member.user)}
                        value={getId(member.user)}
                      >
                        {resolveMemberName(member.user, members)}
                      </option>
                    ))}
                </select>
              </label>

              {(filterMonth || filterYear || filterPaidBy) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterMonth("");
                    setFilterYear("");
                    setFilterPaidBy("");
                  }}
                  className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-4 focus:ring-red-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-300"
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
                      strokeWidth={1.8}
                      d="M6 6l12 12M18 6L6 18"
                    />
                  </svg>
                  Clear
                </button>
              )}
            </div>
          </div>

          {(filterMonth || filterPaidBy) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Active filters:
              </span>

              {filterMonth && filterYear && (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                  {getMonthName(Number(filterMonth))} {filterYear}
                </span>
              )}

              {filterPaidBy && (
                <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                  Paid by{" "}
                  {resolveMemberName(
                    members.find(
                      (member) => getId(member.user) === filterPaidBy,
                    )?.user,
                    members,
                  )}
                </span>
              )}
            </div>
          )}
        </section>

        {/* ================= ERROR BANNER ================= */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/10">
              <svg
                className="h-4 w-4 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v3m0 4h.01M5.07 19h13.86a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16a2 2 0 001.73 3z"
                />
              </svg>
            </div>

            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                Something went wrong
              </p>

              <p className="mt-0.5 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ================= RECENT EXPENSES LIST ================= */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
          <div className="border-b border-slate-100 p-6 dark:border-slate-800">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Recent expenses
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {filterMonth && filterYear
                    ? `Showing expenses for ${getMonthName(Number(filterMonth))} ${filterYear}`
                    : "Your household's recorded activity."}
                  {filterPaidBy
                    ? ` • Paid by ${resolveMemberName(
                        members.find(
                          (member) => getId(member.user) === filterPaidBy,
                        )?.user,
                        members,
                      )}`
                    : ""}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {expenses.length}{" "}
                {expenses.length === 1 ? "expense" : "expenses"}
              </span>
            </div>
          </div>

          {fetching ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="animate-pulse p-5">
                  <div className="flex gap-4">
                    <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800" />

                    <div className="flex-1">
                      <div className="h-4 w-40 rounded bg-slate-100 dark:bg-slate-800" />
                      <div className="mt-2 h-3 w-28 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>

                    <div className="h-5 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <svg
                  className="h-7 w-7 text-slate-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM9 7h6M9 11h6M9 15h4"
                  />
                </svg>
              </div>

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                {filterMonth || filterYear || filterPaidBy
                  ? "No matching expenses"
                  : "No expenses yet"}
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                {filterMonth || filterYear || filterPaidBy
                  ? "No expenses match the selected filters. Try changing or clearing your filters."
                  : "Add your first household expense using the creation page."}
              </p>

              {!filterMonth && !filterYear && !filterPaidBy && (
                <div className="mt-6">
                  <Link
                    to="/expenses/create"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    Create Expense
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.map((expense) => {
                const excluded = expense.excludedMembers || [];

                const isUserExcluded = excluded.some(
                  (m) => getId(m.user) === currentUserId,
                );

                const currentMember = members.find(
                  (member) => getId(member.user) === currentUserId,
                );

                const isGroceryExpense =
                  expense.category?.toLowerCase() === "grocery";

                const isNotGroceryParticipant =
                  isGroceryExpense &&
                  currentMember?.groceryParticipant === false;

                const awayMembers = excluded
                  .filter((m) => m.status === "away" || m.reason)
                  .map((m) => resolveMemberName(m.user || m, members));

                const icon =
                  CATEGORY_ICONS[expense.category?.toLowerCase()] || "💳";

                const payerName = resolveMemberName(expense.paidBy, members);

                return (
                  <div
                    key={expense._id}
                    className="flex w-full items-center gap-2 p-4 transition-colors hover:bg-slate-50 sm:gap-3 sm:p-5 dark:hover:bg-slate-800/50"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/expenses/${expense._id}`)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg dark:bg-indigo-500/10 sm:h-11 sm:w-11">
                        {icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="min-w-0 truncate font-semibold text-slate-900 dark:text-slate-100">
                            {expense.description}
                          </h3>

                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {formatCategory(expense.category)}
                          </span>
                        </div>

                        <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                          Paid by{" "}
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {payerName}
                          </span>
                          {" • "}
                          {formatDate(expense.date)}
                          {" • "}
                          <span>
                            {expense.participantMode === "manual"
                              ? "Manual split"
                              : "Automatic split"}
                          </span>
                        </p>

                        {/* Away / Not Included Member Indicators */}
                        {isNotGroceryParticipant ? (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border text-red-400 border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold  dark:border-slate-700 dark:bg-slate-800 ">
                            <span>⊘</span>
                           You are Not a part of this expense
                          </div>
                        ) : isUserExcluded ? (
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

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-slate-900 sm:text-base dark:text-slate-100">
                          {formatCurrency(expense.amount)}
                        </p>

                        {expense.participantMode === "manual" && (
                          <span className="mt-1 hidden rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:bg-violet-500/10 dark:text-violet-300 sm:inline-block">
                            Manual
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Download Specific Receipt Button */}
                    <button
                      type="button"
                      onClick={() => downloadReceipt(expense._id)}
                      className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-indigo-400/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                      title="Download receipt"
                      aria-label={`Download receipt for ${expense.description}`}
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
                          strokeWidth={1.8}
                          d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default RecentExpenses;
