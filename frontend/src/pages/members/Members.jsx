import { useEffect, useState } from "react";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

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

  const fetchMembers = async () => {
    if (!currentHousehold) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/households/${currentHousehold._id}/members`,
      );

      setMembers(response.data.members || []);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentHousehold]);

  const currentMember = members.find(
    (member) => member.user?._id === user?._id,
  );

  const isAdmin = currentMember?.role === "admin";

  const copyInviteCode = async () => {
    if (!currentHousehold?.inviteCode) return;

    try {
      await navigator.clipboard.writeText(currentHousehold.inviteCode);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy invite code:", error);
    }
  };

  const regenerateInviteCode = async () => {
    if (!currentHousehold || !isAdmin) return;

    const confirmed = window.confirm(
      "Regenerating the invite code will invalidate the current code. Continue?",
    );

    if (!confirmed) return;

    try {
      setRegenerating(true);
      setError("");

      await api.patch(`/households/${currentHousehold._id}/invite-code`);

      await fetchHouseholds();
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to regenerate invite code",
      );
    } finally {
      setRegenerating(false);
    }
  };

  const updateGroceryParticipation = async (memberId, value) => {
    try {
      await api.patch(
        `/households/${currentHousehold._id}/members/${memberId}/grocery`,
        {
          groceryParticipant: value,
        },
      );

      setMembers((prev) =>
        prev.map((member) =>
          member.user?._id === memberId
            ? {
                ...member,
                groceryParticipant: value,
              }
            : member,
        ),
      );
      toast.success(
        value
          ? "Grocery participation enabled"
          : "Grocery participation disabled",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to update grocery participation",
      );
    }
  };

  const removeMember = async (memberId, memberName) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Remove ${memberName} from this household?`,
    );

    if (!confirmed) return;

    try {
      setRemovingMember(memberId);

      await api.delete(
        `/households/${currentHousehold._id}/members/${memberId}`,
      );

      setMembers((prev) =>
        prev.filter((member) => member.user?._id !== memberId),
      );
    } catch (error) {
      alert(error.response?.data?.message || "Failed to remove member");
    } finally {
      setRemovingMember(null);
    }
  };

  const leaveHousehold = async () => {
    if (!currentHousehold || isAdmin) return;

    const confirmed = window.confirm(
      "Are you sure you want to leave this household?",
    );

    if (!confirmed) return;

    try {
      setLeaving(true);

      await api.post(`/households/${currentHousehold._id}/leave`);

      await fetchHouseholds();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to leave household");
    } finally {
      setLeaving(false);
    }
  };

  if (!currentHousehold) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
            🏠
          </div>

          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            No household selected
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Create a household or join an existing household using an invitation
            code.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              onClick={() => {}}
            >
              Create Household
            </button>

            <button
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              onClick={() => {}}
            >
              Join Household
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-5">
          <div className="h-32 rounded-3xl bg-gray-200" />

          <div className="h-28 rounded-2xl bg-gray-200" />

          <div className="h-24 rounded-2xl bg-gray-200" />
          <div className="h-24 rounded-2xl bg-gray-200" />
          <div className="h-24 rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">{error}</p>

          <button
            onClick={fetchMembers}
            className="mt-3 text-sm font-semibold text-red-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              🏠
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {currentHousehold.name}
              </h1>

              <p className="mt-0.5 text-sm text-gray-500">
                {members.length} {members.length === 1 ? "member" : "members"}{" "}
                in this household
              </p>
            </div>
          </div>
        </div>

        {!isAdmin && (
          <button
            onClick={leaveHousehold}
            disabled={leaving}
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {leaving ? "Leaving..." : "Leave Household"}
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="mt-7 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                    🔗
                  </span>

                  <h2 className="font-bold text-gray-900">Invite members</h2>
                </div>

                <p className="mt-2 max-w-lg text-sm text-gray-600">
                  Share this invitation code with people you want to add to your
                  household.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-xl border border-blue-200 bg-white px-4 py-2.5">
                  <span className="font-mono text-lg font-bold tracking-[0.2em] text-gray-900">
                    {currentHousehold.inviteCode}
                  </span>
                </div>

                <button
                  onClick={copyInviteCode}
                  className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="mt-5 border-t border-blue-100 pt-4">
              <button
                onClick={regenerateInviteCode}
                disabled={regenerating}
                className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {regenerating
                  ? "Generating new code..."
                  : "Regenerate invite code"}
              </button>

              <span className="ml-2 text-xs text-gray-500">
                The previous code will stop working.
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Household members
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Manage members and grocery participation.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {members.map((member) => {
            const memberUser = member.user;

            const isCurrentUser = memberUser?._id === user?._id;

            const isMemberAdmin = member.role === "admin";

            return (
              <div
                key={member._id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* User */}
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                        isMemberAdmin
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {memberUser?.name?.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-gray-900">
                          {memberUser?.name}
                        </h3>

                        {isCurrentUser && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            You
                          </span>
                        )}

                        {isMemberAdmin && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                            Admin
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-sm text-gray-500">
                        {memberUser?.email}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}

                  <div className="flex flex-col gap-3 sm:items-end">
                    {/* Grocery participation - ADMIN ONLY */}
                    {isAdmin && (
                      <label className="flex cursor-pointer items-center gap-3">
                        <span className="text-sm text-gray-600">
                          Grocery participant
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            updateGroceryParticipation(
                              memberUser._id,
                              !member.groceryParticipant,
                            )
                          }
                          className={`relative h-6 w-11 rounded-full transition ${
                            member.groceryParticipant
                              ? "bg-blue-600"
                              : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                              member.groceryParticipant ? "left-6" : "left-1"
                            }`}
                          />
                        </button>
                      </label>
                    )}

                    {/* Remove member - ADMIN ONLY */}
                    {isAdmin && !isCurrentUser && !isMemberAdmin && (
                      <button
                        onClick={() =>
                          removeMember(memberUser._id, memberUser.name)
                        }
                        disabled={removingMember === memberUser._id}
                        className="text-left text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 sm:text-right"
                      >
                        {removingMember === memberUser._id
                          ? "Removing..."
                          : "Remove member"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isAdmin && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex gap-3">
            <span className="text-lg">💡</span>

            <div>
              <p className="text-sm font-semibold text-gray-800">
                Household admin
              </p>

              <p className="mt-1 text-sm text-gray-500">
                You can manage members, grocery participation and the household
                invitation code.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
