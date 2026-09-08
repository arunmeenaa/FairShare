import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";
import { useAuth } from "../../context/AuthContext";

// ==========================================
// UTILITIES & HELPERS
// ==========================================

const getId = (target) => {
  if (!target) return "";
  if (typeof target === "object") {
    return (target._id || target.id || target.user?._id || target.user || "").toString();
  }
  return target.toString();
};

const getInitial = (name) => {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
};

// ==========================================
// REUSABLE SUB-COMPONENTS
// ==========================================

const AvailabilityBadge = ({ status }) => {
  const isAway = status === "away";
  const isAvailable = status === "available";

  const dotColor = isAway ? "bg-amber-500" : isAvailable ? "bg-emerald-500" : "bg-slate-400";
  const textColor = isAway
    ? "text-amber-700 dark:text-amber-300"
    : isAvailable
      ? "text-emerald-700 dark:text-emerald-300"
      : "text-slate-500 dark:text-slate-400";
  const label = isAway ? "Currently away" : isAvailable ? "Currently available" : "Availability not set";

  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      <span className={`text-xs font-medium ${textColor}`}>{label}</span>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const Members = () => {
  const { currentHousehold, fetchHouseholds } = useHousehold();
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);
  const [leaving, setLeaving] = useState(false);

  const householdId = currentHousehold?._id;
  const currentUserId = getId(user);

  const fetchMembers = useCallback(async () => {
    if (!householdId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/households/${householdId}/members`);
      setMembers(response.data.members || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const currentMember = useMemo(() => {
    return members.find((member) => getId(member.user) === currentUserId);
  }, [members, currentUserId]);

  const isAdmin = currentMember?.role === "admin";

  const copyInviteCode = async () => {
    if (!currentHousehold?.inviteCode) return;

    try {
      await navigator.clipboard.writeText(currentHousehold.inviteCode);
      setCopied(true);
      toast.success("Invite code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy invite code:", err);
      toast.error("Failed to copy invite code");
    }
  };

  const regenerateInviteCode = async () => {
    if (!currentHousehold || !isAdmin) return;

    const confirmed = window.confirm(
      "Regenerating the invite code will invalidate the current code immediately. Continue?"
    );
    if (!confirmed) return;

    try {
      setRegenerating(true);
      setError("");

      await api.patch(`/households/${currentHousehold._id}/invite-code`);
      await fetchHouseholds();
      toast.success("Invite code regenerated");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to regenerate invite code";
      setError(msg);
      toast.error(msg);
    } finally {
      setRegenerating(false);
    }
  };

  const updateGroceryParticipation = async (memberId, value) => {
    try {
      await api.patch(
        `/households/${currentHousehold._id}/members/${memberId}/grocery`,
        { groceryParticipant: value }
      );

      setMembers((prev) =>
        prev.map((member) =>
          getId(member.user) === memberId
            ? { ...member, groceryParticipant: value }
            : member
        )
      );

      toast.success(
        value ? "Grocery participation enabled" : "Grocery participation disabled"
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update grocery participation"
      );
    }
  };

  const removeMember = async (memberId, memberName) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Remove ${memberName} from this household?`
    );
    if (!confirmed) return;

    try {
      setRemovingMember(memberId);
      await api.delete(`/households/${currentHousehold._id}/members/${memberId}`);

      setMembers((prev) => prev.filter((member) => getId(member.user) !== memberId));
      toast.success(`${memberName} has been removed`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    } finally {
      setRemovingMember(null);
    }
  };

  const leaveHousehold = async () => {
    if (!currentHousehold || isAdmin) return;

    const confirmed = window.confirm(
      "Are you sure you want to leave this household? You will lose access to its shared records."
    );
    if (!confirmed) return;

    try {
      setLeaving(true);
      await api.post(`/households/${currentHousehold._id}/leave`);
      await fetchHouseholds();
      toast.success("You have left the household");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave household");
    } finally {
      setLeaving(false);
    }
  };

  /* ================= NO HOUSEHOLD ================= */
  if (!currentHousehold) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 px-4 py-10 pb-28 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
              <svg className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-slate-100">No household selected</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
              Create a household or join an existing household using an invitation code to manage members.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/households/new"
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Create Household
              </Link>
              <Link
                to="/households/join"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Join Household
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 px-4 py-8 pb-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-28 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-36 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-24 rounded-2xl bg-white dark:bg-slate-900 shadow-sm" />
          <div className="h-24 rounded-2xl bg-white dark:bg-slate-900 shadow-sm" />
        </div>
      </div>
    );
  }

  /* ================= ERROR ================= */
  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 px-4 py-8 pb-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-5">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
            <button
              type="button"
              onClick={fetchMembers}
              className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 px-4 py-6 pb-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Roster & Management</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {currentHousehold.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {members.length} {members.length === 1 ? "member" : "members"} in this household
            </p>
          </div>

          {!isAdmin && (
            <button
              type="button"
              onClick={leaveHousehold}
              disabled={leaving}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 dark:hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {leaving ? "Leaving..." : "Leave Household"}
            </button>
          )}
        </div>

        {/* ================= ADMIN INVITE CARD ================= */}
        {isAdmin && (
          <div className="overflow-hidden rounded-3xl border border-indigo-100 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 dark:from-indigo-950/60 dark:via-slate-900 dark:to-violet-950/40 shadow-sm">
            <div className="p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-950/40">
                      🔗
                    </span>
                    <h2 className="font-bold text-slate-900 dark:text-slate-100">Invite new members</h2>
                  </div>
                  <p className="mt-2 max-w-lg text-sm text-slate-600 dark:text-slate-300">
                    Share this unique invitation code with roommates to grant them access to this household.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 shadow-sm">
                    <span className="font-mono text-base font-bold tracking-[0.25em] text-slate-900 dark:text-slate-100">
                      {currentHousehold.inviteCode}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={copyInviteCode}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    {copied ? (
                      <>
                        <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-5 border-t border-indigo-100/80 dark:border-indigo-900/60 pt-4">
                <button
                  type="button"
                  onClick={regenerateInviteCode}
                  disabled={regenerating}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 transition hover:text-indigo-800 dark:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {regenerating ? "Generating new code..." : "Regenerate invite code"}
                </button>
                <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                  • Previous codes will stop functioning immediately
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= MEMBERS LIST ================= */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Household members</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Manage members, grocery participation, and permissions.
            </p>
          </div>

          <div className="space-y-3">
            {members.map((member) => {
              const memberUser = member.user || {};
              const memberUserId = getId(memberUser);
              const isCurrentUser = memberUserId === currentUserId;
              const isMemberAdmin = member.role === "admin";

              return (
                <div
                  key={member._id || memberUserId}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    
                    {/* Member Information */}
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold ${
                          isMemberAdmin
                            ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {getInitial(memberUser.name)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">
                            {memberUser.name || "Unknown Member"}
                          </h3>

                          {isCurrentUser && (
                            <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                              You
                            </span>
                          )}

                          {isMemberAdmin && (
                            <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                              Admin
                            </span>
                          )}
                        </div>

                        <div className="mt-1">
                          <AvailabilityBadge status={member.availabilityStatus} />
                        </div>

                        <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                          {memberUser.email || "No email available"}
                        </p>
                      </div>
                    </div>

                    {/* Member Admin Actions */}
                    <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                      {isAdmin && (
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            Grocery split
                          </span>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={Boolean(member.groceryParticipant)}
                            onClick={() =>
                              updateGroceryParticipation(
                                memberUserId,
                                !member.groceryParticipant
                              )
                            }
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                              member.groceryParticipant ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 shadow ring-0 transition duration-200 ease-in-out ${
                                member.groceryParticipant ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      )}

                      {/* Remove Button */}
                      {isAdmin && !isCurrentUser && !isMemberAdmin && (
                        <button
                          type="button"
                          onClick={() => removeMember(memberUserId, memberUser.name)}
                          disabled={removingMember === memberUserId}
                          className="rounded-lg border border-red-200 dark:border-red-900/60 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {removingMember === memberUserId ? "Removing..." : "Remove"}
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= ADMIN FOOTER BADGE ================= */}
        {isAdmin && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className="flex gap-3">
              <span className="text-base">💡</span>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Admin privileges active</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  You have administrative control over household settings, member allocations, grocery sharing flags, and security keys.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Members;