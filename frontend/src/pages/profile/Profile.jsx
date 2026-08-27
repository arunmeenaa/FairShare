import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useHousehold } from "../../context/HouseholdContext";
import api from "../../services/api";

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

const getInitials = (fullName) => {
  if (!fullName?.trim()) return "?";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { currentHousehold } = useHousehold();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const currentUserId = getId(user);

  const currentMember = useMemo(() => {
    if (!currentHousehold || !currentUserId) return null;
    return (currentHousehold.members || []).find(
      (member) => getId(member.user) === currentUserId
    );
  }, [currentHousehold, currentUserId]);

  const isAdmin = currentMember?.role === "admin";

  const hasChanges =
    name.trim() !== (user?.name || "").trim() ||
    phone.trim() !== (user?.phone || "").trim();

  // ==========================================
  // PROFILE UPDATE HANDLER
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasChanges) return;

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setLoading(true);
      const response = await api.patch("/profile", {
        name: name.trim(),
        phone: phone.trim(),
      });

      if (response.data.user) {
        updateUser(response.data.user);
      }

      toast.success(response.data.message || "Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // PASSWORD UPDATE HANDLER
  // ==========================================

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setPasswordLoading(true);

      await api.post("/auth/change-password", {
        email: user?.email,
        currentPassword,
        newPassword,
      });

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const togglePasswordForm = () => {
    setShowPasswordForm((prev) => !prev);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div>
          <p className="text-sm font-semibold text-indigo-600">Account</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your personal information and account security.
          </p>
        </div>

        {/* Profile Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* Header Banner */}
          <div className="bg-indigo-600 px-6 py-7 sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white ring-1 ring-white/25">
                {getInitials(user?.name)}
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-white">
                  {user?.name || "User"}
                </h2>
                <p className="mt-0.5 truncate text-sm text-indigo-200">
                  {user?.email || ""}
                </p>

                {currentHousehold && (
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                      {isAdmin ? "Household Admin" : "Household Member"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Personal information</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Keep your profile and contact details up to date.
              </p>
            </div>

            <div className="space-y-5">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Full name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M20 21a8 8 0 00-16 0m12-11a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm0 1l8 6 8-6"
                      />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-3 pl-11 pr-11 text-sm text-slate-500"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 15v2m-5-5V9a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Email address is linked to authentication and cannot be edited.
                </p>
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Phone number
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M6.5 3h3L11 7 8.5 9a15 15 0 006.5 6.5l2-2.5 4 1.5v3a2 2 0 01-2 2C10.16 19.5 4.5 13.84 4.5 7A2 2 0 016.5 5V3z"
                      />
                    </svg>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-7 flex justify-end border-t border-slate-100 pt-6">
              <button
                type="submit"
                disabled={loading || !hasChanges}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                    </svg>
                    Saving changes...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Current Household Info */}
        {currentHousehold && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"
                  />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{currentHousehold.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {currentHousehold.members?.filter((m) => m.isActive).length || 0} active members
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isAdmin
                        ? "bg-indigo-50 text-indigo-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isAdmin ? "ADMIN" : "MEMBER"}
                  </span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-4 rounded-xl bg-indigo-50/80 px-4 py-3">
                <p className="text-xs leading-5 text-indigo-700">
                  You are the administrator of this household. Household invitations and member management settings are accessible under the Members page.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Account Security Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 15v2m-5-5V9a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">Account security</h2>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  Change your password to keep your FairShare account secure.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={togglePasswordForm}
              className="shrink-0 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {showPasswordForm ? "Cancel" : "Change password"}
            </button>
          </div>

          {showPasswordForm && (
            <form
              onSubmit={handlePasswordSubmit}
              className="border-t border-slate-100 p-5"
            >
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    Current password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    New password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  />
                  <p className="mt-1 text-xs text-slate-400">Minimum 6 characters.</p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {passwordLoading ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    "Update password"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};

export default Profile;