import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";
import { useAuth } from "../../context/AuthContext";

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
    month: "short",
    year: "numeric",
  });
};

const formatCategory = (category) => {
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

/**
 * Resolves a display name by checking direct object properties,
 * falling back to matching the ID against the loaded household members list.
 */
const resolveMemberName = (target, memberRoster = []) => {
  if (!target) return "Unknown";

  // If object with direct name
  if (typeof target === "object" && target.name) {
    return target.name;
  }
  if (typeof target === "object" && target.user?.name) {
    return target.user.name;
  }

  const targetId = getId(target);

  // Search in household members roster
  if (Array.isArray(memberRoster)) {
    const matched = memberRoster.find((m) => {
      const mUserId = getId(m.user);
      const mId = getId(m);
      return mUserId === targetId || mId === targetId;
    });

    if (matched?.user?.name) return matched.user.name;
    if (matched?.name) return matched.name;
  }

  // If still not matched, return fallback instead of raw hex ObjectId
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

const CATEGORIES = [
  "grocery",
  "electricity",
  "internet",
  "rent",
  "water",
  "cleaning",
  "maintenance",
  "dining",
  "household",
  "other",
];

const Expenses = () => {
  const { currentHousehold } = useHousehold();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [participantReason, setParticipantReason] = useState("");
  const [createdExpense, setCreatedExpense] = useState(null);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "grocery",
    paidBy: "",
    date: new Date().toISOString().split("T")[0],
    participantMode: "automatic",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const now = new Date();
  const [receiptMonth, setReceiptMonth] = useState(now.getMonth() + 1);
  const [receiptYear, setReceiptYear] = useState(now.getFullYear());

  const currentUserId = getId(user);

  // Active household members
  const activeMembers = useMemo(() => {
    return members.filter((member) => member.isActive);
  }, [members]);

  // Set default paidBy when active members load
  useEffect(() => {
    if (activeMembers.length > 0 && !form.paidBy) {
      setForm((prev) => ({
        ...prev,
        paidBy: getId(activeMembers[0]?.user) || getId(activeMembers[0]),
      }));
    }
  }, [activeMembers, form.paidBy]);

  const fetchData = useCallback(async () => {
    if (!currentHousehold?._id) return;

    try {
      setFetching(true);
      setError("");

      const [expenseResponse, memberResponse] = await Promise.all([
        api.get(`/expenses/${currentHousehold._id}`),
        api.get(`/households/${currentHousehold._id}/members`),
      ]);

      setExpenses(expenseResponse.data.expenses || []);
      setMembers(memberResponse.data.members || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load expenses");
    } finally {
      setFetching(false);
    }
  }, [currentHousehold?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleParticipant = (userId) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const createExpense = async (e) => {
    e.preventDefault();

    if (!currentHousehold?._id) return;

    if (form.participantMode === "manual") {
      if (selectedParticipants.length === 0) {
        setError("Select at least one participant");
        return;
      }
      if (!participantReason.trim()) {
        setError("Please provide a reason for manual splitting");
        return;
      }
    }

    try {
      setLoading(true);
      setError("");
      setCreatedExpense(null);

      const payload = {
        description: form.description.trim(),
        amount: Number(form.amount),
        category: form.category,
        date: form.date,
        paidBy: form.paidBy || undefined,
        participantMode: form.participantMode,
        ...(form.participantMode === "manual" && {
          participants: selectedParticipants,
          participantReason: participantReason.trim(),
        }),
      };

      const response = await api.post(
        `/expenses/${currentHousehold._id}`,
        payload,
      );

      setCreatedExpense(response.data.expense);
      setForm((prev) => ({
        ...prev,
        description: "",
        amount: "",
      }));
      setSelectedParticipants([]);
      setParticipantReason("");

      await fetchData();
      toast.success("Expense added successfully");
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to add expense";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const triggerBlobDownload = (blobData, filename) => {
    const blob = new Blob([blobData], { type: "application/pdf" });
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

      // Blob responses can contain the backend error as JSON.
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
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M3 10.5L12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6"
                />
              </svg>
            </div>
            <h1 className="mt-6 text-2xl font-bold text-slate-900">
              Select a household
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Select a household before adding or viewing shared expenses.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ================= HEADER ================= */}
        <div className="mb-6">
          <p className="text-sm font-medium text-indigo-600">
            {currentHousehold.name}
          </p>

          <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Expenses
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Add, manage and track your household expenses.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Month Picker */}
              <select
                value={receiptMonth}
                onChange={(e) => setReceiptMonth(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              >
                {MONTHS.map((name, index) => (
                  <option key={index + 1} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Picker */}
              <select
                value={receiptYear}
                onChange={(e) => setReceiptYear(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
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

              {/* Personal Receipt */}
              <button
                type="button"
                onClick={() => downloadMonthlyReceipt("personal")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
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
                My Receipt
              </button>

              {/* Household Statement */}
              <button
                type="button"
                onClick={() => downloadMonthlyReceipt("household")}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
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
                Household Statement
              </button>
            </div>
          </div>
        </div>

        {/* ================= ERROR BANNER ================= */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
              <svg
                className="h-4 w-4 text-red-600"
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
              <p className="text-sm font-semibold text-red-800">
                Something went wrong
              </p>
              <p className="mt-0.5 text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* ================= CONTENT GRID ================= */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* ================= RECENT EXPENSES LIST ================= */}
          <section className="order-2 rounded-3xl border border-slate-200 bg-white shadow-sm lg:order-1">
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Recent expenses
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Your household's recorded activity.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {expenses.length}{" "}
                  {expenses.length === 1 ? "expense" : "expenses"}
                </span>
              </div>
            </div>

            {fetching ? (
              <div className="divide-y divide-slate-100">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="animate-pulse p-5">
                    <div className="flex gap-4">
                      <div className="h-11 w-11 rounded-xl bg-slate-100" />
                      <div className="flex-1">
                        <div className="h-4 w-40 rounded bg-slate-100" />
                        <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
                      </div>
                      <div className="h-5 w-20 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className="px-6 py-16 text-center">
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
                      d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM9 7h6M9 11h6M9 15h4"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">
                  No expenses yet
                </h3>
                <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-slate-500">
                  Add your first household expense using the creation form.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {expenses.map((expense) => {
                  const excluded = expense.excludedMembers || [];
                  const isUserExcluded = excluded.some(
                    (m) =>
                      getId(m.user) === currentUserId ||
                      getId(m) === currentUserId,
                  );
                  const awayMembers = excluded
                    .filter((m) => m.status === "away" || m.reason)
                    .map((m) => resolveMemberName(m.user || m, members));

                  const icon =
                    CATEGORY_ICONS[expense.category?.toLowerCase()] || "💳";
                  const payerName = resolveMemberName(expense.paidBy, members);

                  return (
                    <div
                      key={expense._id}
                      className="flex w-full items-center gap-3 p-5 transition hover:bg-slate-50"
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/expenses/${expense._id}`)}
                        className="flex min-w-0 flex-1 items-center gap-4 text-left"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl">
                          {icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold text-slate-900">
                              {expense.description}
                            </h3>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              {formatCategory(expense.category)}
                            </span>
                          </div>

                          <p className="mt-0.5 text-sm text-slate-500">
                            Paid by{" "}
                            <span className="font-medium text-slate-700">
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
                          {isUserExcluded ? (
                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              <span>●</span>
                              You were away
                            </div>
                          ) : awayMembers.length > 0 ? (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-slate-400">
                                Away:
                              </span>
                              {awayMembers.map((name, idx) => (
                                <span
                                  key={`${name}-${idx}`}
                                  className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-bold text-slate-900">
                            {formatCurrency(expense.amount)}
                          </p>
                          {expense.participantMode === "manual" && (
                            <span className="mt-1 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600">
                              Manual
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Download Specific Receipt Button */}
                      <button
                        type="button"
                        onClick={() => downloadReceipt(expense._id)}
                        className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
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

          {/* ================= ADD EXPENSE FORM ================= */}
          <section className="order-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:order-2">
            <div className="bg-indigo-600 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 5v14M5 12h14"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Add expense</h2>
                  <p className="text-sm text-indigo-200">
                    Record a shared expense
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={createExpense} className="space-y-5 p-6">
              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Description
                </label>
                <input
                  id="description"
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="e.g. Monthly groceries"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              {/* Amount & Paid By Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="amount"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Amount
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-slate-400">
                      ₹
                    </span>
                    <input
                      id="amount"
                      type="number"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="paidBy"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Paid by
                  </label>
                  <select
                    id="paidBy"
                    name="paidBy"
                    value={form.paidBy}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  >
                    {activeMembers.map((member) => {
                      const memberId = getId(member.user) || getId(member);
                      const memberName = resolveMemberName(
                        member.user || member,
                        members,
                      );
                      return (
                        <option key={memberId} value={memberId}>
                          {memberName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Category & Date Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="category"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {formatCategory(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="date"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>
              </div>

              {/* Split Mode Selector */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Split method
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        participantMode: "automatic",
                      }))
                    }
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      form.participantMode === "automatic"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Automatic (All Active)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        participantMode: "manual",
                      }))
                    }
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      form.participantMode === "manual"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Manual Selection
                  </button>
                </div>
              </div>

              {/* Manual Participant Picker */}
              {form.participantMode === "manual" && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Select participants
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Choose which members should share this expense.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {activeMembers.map((member) => {
                      const userId = getId(member.user) || getId(member);
                      const memberName = resolveMemberName(
                        member.user || member,
                        members,
                      );
                      const isSelected = selectedParticipants.includes(userId);

                      return (
                        <label
                          key={userId}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition ${
                            isSelected
                              ? "border-indigo-200 bg-white shadow-sm"
                              : "border-transparent bg-white/60 hover:border-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleParticipant(userId)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {getInitial(memberName)}
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {memberName}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="participantReason"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Reason for manual split
                    </label>
                    <textarea
                      id="participantReason"
                      value={participantReason}
                      onChange={(e) => setParticipantReason(e.target.value)}
                      placeholder="Why are specific members selected?"
                      rows={2}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
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
                    Adding expense...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 5v14M5 12h14"
                      />
                    </svg>
                    Add expense
                  </>
                )}
              </button>
            </form>
          </section>
        </div>

        {/* ================= SUCCESS NOTIFICATION CARD ================= */}
        {createdExpense && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
            <div className="flex items-center gap-4 border-b border-emerald-100 bg-emerald-50 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  className="h-6 w-6 text-emerald-600"
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
              </div>
              <div>
                <h2 className="font-bold text-emerald-900">
                  Expense created successfully
                </h2>
                <p className="mt-0.5 text-sm text-emerald-700">
                  The expense has been distributed and saved.
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {createdExpense.description}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Paid by{" "}
                    <span className="font-medium text-slate-700">
                      {resolveMemberName(createdExpense.paidBy, members)}
                    </span>
                  </p>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(createdExpense.amount)}
                </p>
              </div>

              {/* Split Details Breakdown */}
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Split details
                  </h3>
                  <span className="text-xs font-medium text-slate-400">
                    {createdExpense.participants?.length || 0} members
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  {createdExpense.participants?.map((participant) => (
                    <div
                      key={getId(participant.user)}
                      className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {resolveMemberName(
                          participant.user || participant,
                          members,
                        )}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(participant.share)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Excluded Members Box */}
              {createdExpense.excludedMembers?.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">
                    Excluded members
                  </h3>
                  <div className="space-y-2">
                    {createdExpense.excludedMembers.map((member) => (
                      <div
                        key={getId(member.user)}
                        className="flex items-center justify-between rounded-xl border border-amber-200/60 bg-amber-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                            {getInitial(
                              resolveMemberName(member.user || member, members),
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {resolveMemberName(
                                member.user || member,
                                members,
                              )}
                            </p>
                            <p className="text-xs text-amber-700">
                              {member.status === "away" ? "Away" : "Excluded"}
                              {member.reason ? ` — ${member.reason}` : ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          ₹0.00
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate(`/expenses/${createdExpense._id}`)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                View expense details
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
                    d="M5 12h14m-6-6l6 6-6 6"
                  />
                </svg>
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Expenses;
