import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
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

const CreateExpense = () => {
  const { currentHousehold } = useHousehold();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [participantReason, setParticipantReason] = useState("");
  const [createdExpense, setCreatedExpense] = useState(null);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "grocery",
    date: new Date().toISOString().split("T")[0],
    participantMode: "automatic",
  });

  const [loading, setLoading] = useState(false);
  const [fetchingMembers, setFetchingMembers] = useState(true);
  const [error, setError] = useState("");

  const currentUserId = getId(user);

  // Active household members
  const activeMembers = useMemo(() => {
    return members.filter((member) => member.isActive);
  }, [members]);

  const fetchMembers = useCallback(async () => {
    if (!currentHousehold?._id) return;

    try {
      setFetchingMembers(true);
      setError("");
      const response = await api.get(`/households/${currentHousehold._id}/members`);
      setMembers(response.data.members || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load members");
    } finally {
      setFetchingMembers(false);
    }
  }, [currentHousehold?._id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentHousehold?._id) return;

    if (form.participantMode === "manual") {
      if (selectedParticipants.length === 0) {
        setError("Select at least one participant");
        toast.error("Select at least one participant");
        return;
      }

      // 🔒 Validation: Ensure the creator is included
      if (!selectedParticipants.includes(currentUserId)) {
        const errMsg =
          "You must include yourself as a participant in your expense";
        setError(errMsg);
        toast.error(errMsg);
        return;
      }

      if (!participantReason.trim()) {
        setError("Please provide a reason for manual splitting");
        toast.error("Please provide a reason for manual splitting");
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

      toast.success("Expense added successfully");
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to add expense";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!currentHousehold) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
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
              Select a household before creating an expense.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 pb-28 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* ================= HEADER & BREADCRUMB ================= */}
        <div className="mb-6">
          <Link
            to="/expenses"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
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
            Back to Expenses
          </Link>
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            {currentHousehold.name}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Add Expense
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Record and split a new household expense.
          </p>
        </div>

        {/* ================= ERROR BANNER ================= */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
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
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                Something went wrong
              </p>
              <p className="mt-0.5 text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* ================= ADD EXPENSE FORM ================= */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                <h2 className="text-lg font-bold text-white">Expense Details</h2>
                <p className="text-sm text-indigo-200">
                  Fill out the parameters for this bill
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-950/50"
              />
            </div>

            {/* Amount */}
            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
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
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-950/50"
                />
              </div>
            </div>

            {/* Category & Date Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-950/50"
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
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-950/50"
                />
              </div>
            </div>

            {/* Split Mode Selector */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Split method
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
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
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Automatic (All Active)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      participantMode: "manual",
                    }));
                    if (
                      currentUserId &&
                      !selectedParticipants.includes(currentUserId)
                    ) {
                      setSelectedParticipants([currentUserId]);
                    }
                  }}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    form.participantMode === "manual"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Manual Selection
                </button>
              </div>
            </div>

            {/* Manual Participant Picker */}
            {form.participantMode === "manual" && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Select participants
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Choose which members should share this expense.
                  </p>
                </div>

                {fetchingMembers ? (
                  <p className="py-2 text-xs text-slate-400 dark:text-slate-500">Loading members...</p>
                ) : (
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
                              ? "border-indigo-200 bg-white shadow-sm dark:border-indigo-800 dark:bg-slate-800"
                              : "border-transparent bg-white/60 hover:border-slate-200 dark:bg-slate-900/60 dark:hover:border-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleParticipant(userId)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                            {getInitial(memberName)}
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {memberName}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4">
                  <label
                    htmlFor="participantReason"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    Reason for manual split
                  </label>
                  <textarea
                    id="participantReason"
                    value={participantReason}
                    onChange={(e) => setParticipantReason(e.target.value)}
                    placeholder="Why are specific members selected?"
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-950/50"
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

        {/* ================= SUCCESS NOTIFICATION CARD ================= */}
        {createdExpense && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-900/60 dark:bg-slate-900">
            <div className="flex items-center gap-4 border-b border-emerald-100 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/25">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
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
                <h2 className="font-bold text-emerald-900 dark:text-emerald-200">
                  Expense created successfully
                </h2>
                <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-300">
                  The expense has been distributed and saved.
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {createdExpense.description}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Paid by{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {resolveMemberName(createdExpense.paidBy, members)}
                    </span>
                  </p>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(createdExpense.amount)}
                </p>
              </div>

              {/* Split Details Breakdown */}
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Split details
                  </h3>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {createdExpense.participants?.length || 0} members
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                  {createdExpense.participants?.map((participant) => (
                    <div
                      key={getId(participant.user)}
                      className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800"
                    >
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {resolveMemberName(
                          participant.user || participant,
                          members,
                        )}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(participant.share)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Excluded Members Box */}
              {createdExpense.excludedMembers?.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
                    Excluded members
                  </h3>
                  <div className="space-y-2">
                    {createdExpense.excludedMembers.map((member) => (
                      <div
                        key={getId(member.user)}
                        className="flex items-center justify-between rounded-xl border border-amber-200/60 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/25"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                            {getInitial(
                              resolveMemberName(member.user || member, members),
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
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
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          ₹0.00
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(`/expenses/${createdExpense._id}`)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                >
                  View expense details
                </button>
                <Link
                  to="/expenses"
                  className="flex flex-1 items-center justify-center rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Back to All Expenses
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default CreateExpense;