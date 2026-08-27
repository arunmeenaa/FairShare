import { useEffect, useState } from "react";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Expenses = () => {
  const { currentHousehold } = useHousehold();
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

  const fetchData = async () => {
    if (!currentHousehold) return;

    try {
      setFetching(true);
      setError("");

      const [expenseResponse, memberResponse] = await Promise.all([
        api.get(`/expenses/${currentHousehold._id}`),
        api.get(`/households/${currentHousehold._id}/members`),
      ]);

      setExpenses(expenseResponse.data.expenses || []);

      setMembers(memberResponse.data.members || []);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load expenses");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentHousehold]);

  const toggleParticipant = (userId) => {
    setSelectedParticipants((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }

      return [...prev, userId];
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const createExpense = async (e) => {
    e.preventDefault();

    if (!currentHousehold) return;

    if (
      form.participantMode === "manual" &&
      selectedParticipants.length === 0
    ) {
      setError("Select at least one participant");
      return;
    }

    if (form.participantMode === "manual" && !participantReason.trim()) {
      setError("Please provide a reason for manual splitting");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setCreatedExpense(null);

      const response = await api.post(`/expenses/${currentHousehold._id}`, {
        description: form.description,
        amount: Number(form.amount),
        category: form.category,
        date: form.date,
        participantMode: form.participantMode,

        ...(form.participantMode === "manual" && {
          participants: selectedParticipants,
          participantReason: participantReason.trim(),
        }),
      });

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
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

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

          <div className="mt-1 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Expenses
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Add, manage and track your household expenses.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
              <svg
                className="h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeWidth={1.8}
                  d="M3 10h18M5 10v8m14-8v8M4 18h16M6 10V8a6 6 0 0112 0v2"
                />
              </svg>

              <span className="text-sm font-medium text-slate-700">
                {currentHousehold.name}
              </span>
            </div>
          </div>
        </div>

        {/* ================= ERROR ================= */}

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
          {/* ================= RECENT EXPENSES ================= */}

          <section className="order-2 rounded-3xl border border-slate-200 bg-white shadow-sm lg:order-1">
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Recent expenses
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Your household's latest expenses.
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
                      strokeWidth={1.8}
                      d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM9 7h6M9 11h6M9 15h4"
                    />
                  </svg>
                </div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  No expenses yet
                </h3>

                <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-slate-500">
                  Add your first household expense using the form.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {expenses.map((expense) => (
                  <button
                    type="button"
                    key={expense._id}
                    onClick={() => navigate(`/expenses/${expense._id}`)}
                    className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                      {getInitial(expense.description)}
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

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                        <span>•</span>

                        <span>{formatDate(expense.date)}</span>

                        <span>•</span>

                        <span>
                          {expense.participantMode === "manual"
                            ? "Manual split"
                            : "Automatic split"}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-bold text-slate-900">
                        {formatCurrency(expense.amount)}
                      </p>

                      <svg
                        className="ml-auto mt-1 h-4 w-4 text-slate-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ================= ADD EXPENSE ================= */}

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

              {/* Amount */}

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

              {/* Category + Date */}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
                    <option value="grocery">Grocery</option>
                    <option value="electricity">Electricity</option>
                    <option value="internet">Internet</option>
                    <option value="rent">Rent</option>
                    <option value="water">Water</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="dining">Dining</option>
                    <option value="household">Household</option>
                    <option value="other">Other</option>
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

              {/* Split mode */}

              <div>
                <label
                  htmlFor="participantMode"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
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
                    Automatic
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
                    Manual
                  </button>
                </div>
              </div>

              {/* Manual participants */}

              {form.participantMode === "manual" && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      Select participants
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Choose the members who should share this expense.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {members
                      .filter((member) => member.isActive)
                      .map((member) => {
                        const userId = member.user._id;

                        const selected = selectedParticipants.includes(userId);

                        return (
                          <label
                            key={userId}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                              selected
                                ? "border-indigo-200 bg-white shadow-sm"
                                : "border-transparent bg-white/60 hover:border-slate-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleParticipant(userId)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />

                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                              {getInitial(member.user.name)}
                            </div>

                            <span className="text-sm font-medium text-slate-700">
                              {member.user.name}
                            </span>
                          </label>
                        );
                      })}
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="participantReason"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Reason for manual split
                    </label>

                    <textarea
                      id="participantReason"
                      value={participantReason}
                      onChange={(e) => setParticipantReason(e.target.value)}
                      placeholder="Why are these members selected?"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                    />
                  </div>
                </div>
              )}

              {/* Submit */}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
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

        {/* ================= SUCCESS ================= */}

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
                  The expense has been added to your household.
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
                      {createdExpense.paidBy?.name || "Unknown"}
                    </span>
                  </p>
                </div>

                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(createdExpense.amount)}
                </p>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Split details
                  </h3>

                  <span className="text-xs font-medium text-slate-400">
                    {createdExpense.participants?.length} members
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  {createdExpense.participants?.map((participant) => (
                    <div
                      key={participant.user?._id || participant.user}
                      className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {participant.user?.name || "Unknown"}
                      </span>

                      <span className="font-semibold text-slate-900">
                        {formatCurrency(participant.share)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {createdExpense.excludedMembers?.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">
                    Excluded members
                  </h3>

                  <div className="space-y-2">
                    {createdExpense.excludedMembers.map((member) => (
                      <div
                        key={member.user._id}
                        className="flex flex-col justify-between gap-1 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center"
                      >
                        <span className="text-sm font-medium text-slate-700">
                          {member.user.name}
                        </span>

                        <span className="text-xs text-slate-500">
                          ₹0.00 — {member.reason}
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
