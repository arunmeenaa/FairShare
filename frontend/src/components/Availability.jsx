import { useEffect, useState } from "react";
import api from "../services/api";
import { useHousehold } from "../context/HouseholdContext";
import toast from "react-hot-toast";


const Availability = () => {
  const { currentHousehold } = useHousehold();

  const [status, setStatus] = useState("available");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const fetchAvailability = async () => {
    if (!currentHousehold) return;

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/users/availability/${currentHousehold._id}`,
      );

      setStatus(response.data.availability?.status || "available");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [currentHousehold]);

  const changeStatus = async (newStatus) => {
    if (!currentHousehold) return;

    try {
      setUpdating(true);
      setError("");

      const response = await api.patch(
        `/users/availability/${currentHousehold._id}`,
        {
          status: newStatus,
        },
      );

      setStatus(response.data.availability.status);

      toast.success(
        newStatus === "available"
          ? "You are now available"
          : "You are now marked as away",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update availability",
      );
    } finally {
      setUpdating(false);
    }
  };

  if (!currentHousehold) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
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
                d="M3 10h18M5 10v8m14-8v8M4 18h16M6 10V8a6 6 0 0112 0v2"
              />
            </svg>
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-900">
            No household selected
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Select a household to manage your availability.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl animate-pulse">
          <div className="h-8 w-40 rounded-lg bg-slate-200" />

          <div className="mt-2 h-4 w-72 rounded bg-slate-200" />

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8">
            <div className="h-28 rounded-2xl bg-slate-100" />

            <div className="mt-6 h-12 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  const isAvailable = status === "available";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm font-medium text-indigo-600">
            {currentHousehold.name}
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Availability
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Let your household members know whether you're currently available.
          </p>
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* Status section */}
          <div
            className={`p-6 sm:p-8 ${
              isAvailable ? "bg-emerald-50/70" : "bg-red-50/70"
            }`}
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {/* Status icon */}
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${
                    isAvailable ? "bg-emerald-100" : "bg-red-100"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full ${
                      isAvailable
                        ? "bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.15)]"
                        : "bg-red-500 shadow-[0_0_0_6px_rgba(239,68,68,0.15)]"
                    }`}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Current status
                  </p>

                  <h2
                    className={`mt-1 text-2xl font-bold ${
                      isAvailable ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {isAvailable ? "Available" : "Away"}
                  </h2>
                </div>
              </div>

              {/* Status badge */}
              <span
                className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
                  isAvailable
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isAvailable ? "Currently available" : "Currently away"}
              </span>
            </div>
          </div>

          {/* Action section */}
          <div className="p-6 sm:p-8">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
                    <path
                      strokeLinecap="round"
                      strokeWidth="1.8"
                      d="M12 11v5M12 8h.01"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Why does availability matter?
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Your availability can affect who is included when household
                    expenses are automatically split.
                  </p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
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

                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            {/* Action */}
            <button
              type="button"
              disabled={updating}
              onClick={() => changeStatus(isAvailable ? "away" : "available")}
              className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                isAvailable
                  ? "bg-red-600 hover:bg-red-700 focus:ring-red-100"
                  : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-100"
              }`}
            >
              {updating ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
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
                  {isAvailable ? (
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
                        d="M18.36 6.64a9 9 0 11-12.73 0M12 3v9"
                      />
                    </svg>
                  ) : (
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}

                  {isAvailable ? "Mark as Away" : "Mark as Available"}
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs text-slate-400">
              You can change your availability at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Availability;
