import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useHousehold } from "../../context/HouseholdContext";
import toast from "react-hot-toast";


const Register = () => {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const { fetchHouseholds } = useHousehold();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    householdMode: "create",
    householdName: "",
    inviteCode: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  const handleModeChange = (mode) => {
    setFormData((prev) => ({
      ...prev,
      householdMode: mode,
      householdName: "",
      inviteCode: "",
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (formData.householdMode === "create") {
      if (!formData.householdName.trim()) {
        setError("Please enter a household name.");
        return;
      }
    }

    if (formData.householdMode === "join") {
      if (!formData.inviteCode.trim()) {
        setError("Please enter the invitation code.");
        return;
      }
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        householdMode: formData.householdMode,
      };

      if (formData.householdMode === "create") {
        payload.householdName = formData.householdName.trim();
      }

      if (formData.householdMode === "join") {
        payload.inviteCode = formData.inviteCode.trim().toUpperCase();
      }

      await api.post("/auth/register", payload);

      // Backend creates the authentication cookie.
      // Refresh the frontend auth state.
      await getCurrentUser();

      // Load the newly created/joined household.
      await fetchHouseholds();
      toast.success("Account created successfully!");
      navigate("/");
    } catch (error) {
      console.error("Registration failed:", error);

      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 font-sans sm:px-6">
      {/* Background glow */}
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-purple-600/40 blur-[120px]" />

      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-cyan-600/40 blur-[120px]" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/20 bg-white/10 p-7 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl sm:p-9">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300">
            FairShare
          </h1>

          <h2 className="text-xl font-semibold text-white">
            Create your account
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Start managing your shared expenses.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3">
            <p className="text-center text-sm font-medium text-red-200">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Full name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-slate-500 outline-none transition focus:border-purple-400/60 focus:bg-white/10 focus:ring-2 focus:ring-purple-400/20"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-slate-500 outline-none transition focus:border-purple-400/60 focus:bg-white/10 focus:ring-2 focus:ring-purple-400/20"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-slate-500 outline-none transition focus:border-purple-400/60 focus:bg-white/10 focus:ring-2 focus:ring-purple-400/20"
            />
          </div>

          {/* Household setup */}
          <div className="pt-2">
            <label className="mb-3 block text-sm font-medium text-slate-200">
              Set up your household
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Create */}
              <button
                type="button"
                onClick={() => handleModeChange("create")}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  formData.householdMode === "create"
                    ? "border-purple-400/60 bg-purple-500/20 text-white shadow-lg shadow-purple-500/10"
                    : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="text-lg">🏠</div>

                <div className="mt-1">Create household</div>

                <div className="mt-1 text-xs font-normal opacity-70">
                  Become admin
                </div>
              </button>

              {/* Join */}
              <button
                type="button"
                onClick={() => handleModeChange("join")}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  formData.householdMode === "join"
                    ? "border-cyan-400/60 bg-cyan-500/20 text-white shadow-lg shadow-cyan-500/10"
                    : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="text-lg">🔗</div>

                <div className="mt-1">Join household</div>

                <div className="mt-1 text-xs font-normal opacity-70">
                  Use invite code
                </div>
              </button>
            </div>
          </div>

          {/* Create household */}
          {formData.householdMode === "create" && (
            <div className="rounded-2xl border border-purple-400/20 bg-purple-500/5 p-4">
              <label
                htmlFor="householdName"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Household name
              </label>

              <input
                id="householdName"
                name="householdName"
                type="text"
                placeholder="e.g. My Flat"
                value={formData.householdName}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-purple-400/60 focus:ring-2 focus:ring-purple-400/20"
              />

              <p className="mt-2 text-xs text-slate-500">
                You will automatically become the household admin.
              </p>
            </div>
          )}

          {/* Join household */}
          {formData.householdMode === "join" && (
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
              <label
                htmlFor="inviteCode"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Invitation code
              </label>

              <input
                id="inviteCode"
                name="inviteCode"
                type="text"
                placeholder="e.g. FS8K29X7"
                value={formData.inviteCode}
                onChange={handleChange}
                required
                maxLength={30}
                autoCapitalize="characters"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono uppercase tracking-widest text-white placeholder-slate-500 placeholder:normal-case placeholder:tracking-normal outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
              />

              <p className="mt-2 text-xs text-slate-500">
                Ask your household admin for the invitation code.
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:from-purple-400 hover:to-cyan-400 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading ? (
              <>
                <svg
                  className="mr-2 h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />

                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Creating account...
              </>
            ) : formData.householdMode === "create" ? (
              "Create Account & Household"
            ) : (
              "Create Account & Join"
            )}
          </button>
        </form>

        {/* Login */}
        <div className="mt-7 border-t border-white/10 pt-6 text-center">
          <p className="text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
