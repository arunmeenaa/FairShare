import { useEffect, useState } from "react";
import api from "../../services/api";
import { useHousehold } from "../../context/HouseholdContext";
import { useAuth } from "../../context/AuthContext";
import Availability from "../../components/Availability";

const Members = () => {
  const { currentHousehold } = useHousehold();
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMembers = async () => {
    if (!currentHousehold) return;

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/households/${currentHousehold._id}/members`,
      );

      setMembers(response.data.members || []);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load members",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentHousehold]);

  const updateGroceryParticipation = async (
    memberId,
    value,
  ) => {
    try {
      await api.patch(
        `/households/${currentHousehold._id}/members/${memberId}/grocery`,
        {
          groceryParticipant: value,
        },
      );

      setMembers((prev) =>
        prev.map((member) =>
          member.user._id === memberId
            ? {
                ...member,
                groceryParticipant: value,
              }
            : member,
        ),
      );
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to update grocery participation",
      );
    }
  };

  const getInitial = (name) => {
    return (
      name?.trim()?.charAt(0)?.toUpperCase() ||
      "?"
    );
  };

  const formatRole = (role) => {
    if (!role) return "Member";

    return (
      role.charAt(0).toUpperCase() +
      role.slice(1)
    );
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
              Select a household to view and manage
              its members.
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
          <div className="mt-3 h-9 w-48 rounded-lg bg-slate-200" />
          <div className="mt-2 h-4 w-72 rounded bg-slate-200" />

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(
              (item) => (
                <div
                  key={item}
                  className="h-52 rounded-2xl bg-white"
                />
              ),
            )}
          </div>
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
              Unable to load members
            </h2>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* ================= HEADER ================= */}

        <div className="mb-7">
          <p className="text-sm font-medium text-indigo-600">
            {currentHousehold.name}
          </p>

          <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Household members
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage members and their household
                participation.
              </p>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                <svg
                  className="h-4 w-4 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeWidth={1.8}
                    d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m7-10a4 4 0 100-8 4 4 0 000 8zm7-3a4 4 0 010 8m0-8a4 4 0 010 8m0 0h2a4 4 0 014 4v1"
                  />
                </svg>
              </div>

              <span className="text-sm font-semibold text-slate-700">
                {members.length}{" "}
                {members.length === 1
                  ? "member"
                  : "members"}
              </span>
            </div>
          </div>
        </div>

        {/* ================= MEMBER GRID ================= */}

        {members.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
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
                  d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m7-10a4 4 0 100-8 4 4 0 000 8zm7-3a4 4 0 010 8"
                />
              </svg>
            </div>

            <h2 className="mt-4 font-semibold text-slate-900">
              No members found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              This household doesn't have any members
              yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => {
              const isCurrentUser =
                member.user._id === user?._id;

              const canChangeGrocery =
                isCurrentUser ||
                member.role === "admin";

              return (
                <div
                  key={member._id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* Card top */}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-bold text-indigo-700">
                            {getInitial(
                              member.user.name,
                            )}
                          </div>

                          {/* Active indicator */}

                          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate font-bold text-slate-900">
                              {member.user.name}
                            </h2>

                            {isCurrentUser && (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                                YOU
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 truncate text-sm text-slate-500">
                            {member.user.email}
                          </p>
                        </div>
                      </div>

                      {/* Role */}

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          member.role === "admin"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {formatRole(
                          member.role,
                        )}
                      </span>
                    </div>

                    {/* Divider */}

                    <div className="my-5 h-px bg-slate-100" />

                    {/* Grocery setting */}

                    <div
                      className={`rounded-xl border p-4 ${
                        member.groceryParticipant
                          ? "border-emerald-100 bg-emerald-50/60"
                          : "border-slate-100 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                              member.groceryParticipant
                                ? "bg-emerald-100"
                                : "bg-slate-200"
                            }`}
                          >
                            <svg
                              className={`h-4 w-4 ${
                                member.groceryParticipant
                                  ? "text-emerald-600"
                                  : "text-slate-500"
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M3 3h2l2.5 11h10L20 6H6M8 19a1 1 0 100 2 1 1 0 000-2zm9 0a1 1 0 100 2 1 1 0 000-2z"
                              />
                            </svg>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              Grocery participant
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {member.groceryParticipant
                                ? "Included in grocery splits"
                                : "Excluded from grocery splits"}
                            </p>
                          </div>
                        </div>

                        {/* Toggle */}

                        <button
                          type="button"
                          disabled={
                            !canChangeGrocery
                          }
                          onClick={() =>
                            updateGroceryParticipation(
                              member.user._id,
                              !member.groceryParticipant,
                            )
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${
                            member.groceryParticipant
                              ? "bg-emerald-500"
                              : "bg-slate-300"
                          } ${
                            !canChangeGrocery
                              ? "cursor-not-allowed opacity-50"
                              : "cursor-pointer"
                          }`}
                          aria-label="Toggle grocery participation"
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                              member.groceryParticipant
                                ? "left-6"
                                : "left-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Permission note */}

                    {!canChangeGrocery && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M7 11V8a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z"
                          />
                        </svg>

                        Only the member or an admin can
                        change this setting.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= AVAILABILITY ================= */}

        <div className="mt-6">
          <Availability />
        </div>

      </div>
    </div>
  );
};

export default Members;