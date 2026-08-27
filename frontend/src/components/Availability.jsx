import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useHousehold } from "../context/HouseholdContext";

const Availability = () => {
  const { currentHousehold } = useHousehold();

  const [status, setStatus] = useState("available");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const householdId = currentHousehold?._id;

  const fetchAvailability = useCallback(async () => {
    if (!householdId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/users/availability/${householdId}`);
      setStatus(response.data.availability?.status || "available");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load availability");
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const changeStatus = async (newStatus) => {
    if (!householdId || newStatus === status || updating) return;

    try {
      setUpdating(true);
      const response = await api.patch(`/users/availability/${householdId}`, {
        status: newStatus,
      });

      setStatus(response.data.availability.status);
      toast.success(
        newStatus === "available"
          ? "You are now marked as available"
          : "You are now marked as away"
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update availability"
      );
    } finally {
      setUpdating(false);
    }
  };

  const isAvailable = status === "available";

  /* ================= NO HOUSEHOLD ================= */
  if (!currentHousehold) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              No household selected
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Select or join a household to configure your split status and away preferences.
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                to="/households"
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Go to Households
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================= LOADING SKELETON ================= */
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl animate-pulse space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="h-9 w-48 rounded-lg bg-slate-200" />
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="h-28 rounded-2xl bg-slate-100" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="h-32 rounded-2xl bg-slate-100" />
              <div className="h-32 rounded-2xl bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* ================= HEADER ================= */}
        <div>
          <p className="text-sm font-medium text-indigo-600">
            {currentHousehold.name}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Availability status
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Let roommates know if you're home or away to automate fair expense exclusions.
          </p>
        </div>

        {/* ================= STATUS HERO CARD ================= */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          
          {/* Status Banner */}
          <div
            className={`border-b px-6 py-7 transition-colors sm:px-8 ${
              isAvailable
                ? "border-emerald-100 bg-emerald-50/60"
                : "border-amber-100 bg-amber-50/60"
            }`}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                    isAvailable
                      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                      : "bg-amber-100 text-amber-700 ring-amber-200"
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full ${
                      isAvailable
                        ? "bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.2)]"
                        : "bg-amber-500 shadow-[0_0_0_5px_rgba(245,158,11,0.2)]"
                    }`}
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Your current status
                  </p>
                  <h2
                    className={`mt-0.5 text-2xl font-bold ${
                      isAvailable ? "text-emerald-900" : "text-amber-950"
                    }`}
                  >
                    {isAvailable ? "Available" : "Away"}
                  </h2>
                </div>
              </div>

              <span
                className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  isAvailable
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isAvailable ? "bg-emerald-600" : "bg-amber-600"
                  }`}
                />
                {isAvailable ? "Included in splits" : "Excluded from daily splits"}
              </span>
            </div>
          </div>

          {/* Status Selection Cards */}
          <div className="p-6 sm:p-8">
            <label className="mb-3 block text-sm font-semibold text-slate-700">
              Select your status
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              
              {/* Option: Available */}
              <button
                type="button"
                disabled={updating}
                onClick={() => changeStatus("available")}
                className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-all ${
                  isAvailable
                    ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {isAvailable && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <h3 className="font-bold text-slate-900">Available</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    You are residing at home and will share all daily household and grocery costs.
                  </p>
                </div>
              </button>

              {/* Option: Away */}
              <button
                type="button"
                disabled={updating}
                onClick={() => changeStatus("away")}
                className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-all ${
                  !isAvailable
                    ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.36 6.64a9 9 0 11-12.73 0M12 3v9" />
                    </svg>
                  </div>
                  {!isAvailable && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <h3 className="font-bold text-slate-900">Away</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    You are out of town. Automatic expenses will mark you as excluded while away.
                  </p>
                </div>
              </button>
            </div>

            {/* Explanation Note */}
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
                  <path strokeLinecap="round" strokeWidth={1.8} d="M12 11v5M12 8h.01" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-950">
                  How does FairShare use this?
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-indigo-900/80">
                  When members record new expenses under automatic split mode, FairShare checks your availability at that moment and automatically excludes you if you are marked as away.
                </p>
              </div>
            </div>

          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Status updates take effect instantly across all upcoming household expense splits.
        </p>

      </div>
    </div>
  );
};

export default Availability;