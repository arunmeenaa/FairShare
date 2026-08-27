import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useHousehold } from "../../context/HouseholdContext";

const FEATURES = [
  "Track household expenses with roommate transparency",
  "Automated settlement calculations and split algorithms",
  "Generate tamper-proof statement receipts instantly",
];

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

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleModeChange = (mode) => {
    setFormData((prev) => ({
      ...prev,
      householdMode: mode,
      householdName: "",
      inviteCode: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const householdName = formData.householdName.trim();
    const inviteCode = formData.inviteCode.trim().toUpperCase();

    if (!name) {
      toast.error("Please enter your full name");
      return;
    }

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (formData.householdMode === "create" && !householdName) {
      toast.error("Please enter a household name");
      return;
    }

    if (formData.householdMode === "join" && !inviteCode) {
      toast.error("Please enter the invitation code");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name,
        email,
        password,
        householdMode: formData.householdMode,
        ...(formData.householdMode === "create" && { householdName }),
        ...(formData.householdMode === "join" && { inviteCode }),
      };

      await api.post("/auth/register", payload);

      await getCurrentUser();
      await fetchHouseholds();

      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (err) {
      console.error("Registration failed:", err);
      toast.error(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">

        {/* ================= LEFT BRAND PANEL ================= */}
        <div className="relative hidden overflow-hidden bg-indigo-600 lg:flex lg:w-1/2">
          {/* Decorative shapes */}
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-500 opacity-50" />
          <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-indigo-700 opacity-50" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                <svg
                  className="h-6 w-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 1.12-3 2.5S10.343 13 12 13s3 1.12 3 2.5S13.657 18 12 18m0-10V6m0 12v-2m0 2a6 6 0 100-12 6 6 0 000 12z"
                  />
                </svg>
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                FairShare
              </span>
            </div>

            {/* Main content */}
            <div className="max-w-lg">
              <div className="mb-6 inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-indigo-100 ring-1 ring-white/20">
                Transparent Household Accounting
              </div>

              <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
                Get started with
                <span className="block text-indigo-200">smarter expense sharing.</span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-7 text-indigo-100">
                Create or join a household to automate bills, track contributions, and settle shared balances fairly.
              </p>

              {/* Features */}
              <div className="mt-10 space-y-3.5">
                {FEATURES.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                      <svg
                        className="h-3.5 w-3.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-indigo-100">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <p className="text-xs font-medium text-indigo-200">
              FairShare • Spend together. Settle fairly.
            </p>
          </div>
        </div>

        {/* ================= RIGHT REGISTRATION FORM PANEL ================= */}
        <div className="flex w-full items-center justify-center px-5 py-10 sm:px-8 lg:w-1/2 lg:px-12 xl:px-20">
          <div className="w-full max-w-lg">

            {/* Mobile Header Logo */}
            <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-200">
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
                    d="M12 8c-1.657 0-3 1.12-3 2.5S10.343 13 12 13s3 1.12 3 2.5S13.657 18 12 18m0-10V6m0 12v-2m0 2a6 6 0 100-12 6 6 0 000 12z"
                  />
                </svg>
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                FairShare
              </span>
            </div>

            {/* Form Introduction */}
            <div className="mb-8">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-indigo-600">
                Get Started
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Create your account
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Fill in your details and choose your household setup below.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Account Information Section */}
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Full name
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
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
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M3 7l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect
                          x="5"
                          y="10"
                          width="14"
                          height="10"
                          rx="2"
                          strokeWidth={1.8}
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M8 10V7a4 4 0 018 0v3"
                        />
                      </svg>
                    </div>

                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 transition hover:text-slate-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M3 3l18 18M10.58 10.58a2 2 0 102.83 2.83M9.88 5.09A10.94 10.94 0 0112 5c5 0 8.5 3.5 9 7-.18 1.23-.7 2.36-1.5 3.36M6.53 6.53C4.53 7.8 3.25 9.52 3 12c.5 3.5 4 7 9 7 1.36 0 2.6-.27 3.69-.74"
                          />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"
                          />
                          <circle cx="12" cy="12" r="2.5" strokeWidth={1.8} />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Household Mode Switcher */}
              <div className="pt-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Household setup
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleModeChange("create")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      formData.householdMode === "create"
                        ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          formData.householdMode === "create"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5M9 21v-6h6v6"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Create household</p>
                        <p className="text-xs text-slate-500">Become household admin</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange("join")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      formData.householdMode === "join"
                        ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          formData.householdMode === "join"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M13.5 6.5l4-4m0 0l4 4m-4-4v8m-4 5l-4 4m0 0l-4-4m4 4v-8"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Join household</p>
                        <p className="text-xs text-slate-500">Use an invitation code</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Create Mode Input */}
                {formData.householdMode === "create" && (
                  <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                    <label
                      htmlFor="householdName"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      Household name
                    </label>
                    <input
                      id="householdName"
                      name="householdName"
                      type="text"
                      placeholder="e.g. Skyline Apartment"
                      value={formData.householdName}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      You will receive an invitation code to invite your roommates.
                    </p>
                  </div>
                )}

                {/* Join Mode Input */}
                {formData.householdMode === "join" && (
                  <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                    <label
                      htmlFor="inviteCode"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
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
                      autoComplete="off"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm uppercase tracking-widest text-slate-900 outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Ask your household administrator for their code.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>
                    {formData.householdMode === "create"
                      ? "Create Account & Household"
                      : "Create Account & Join"}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Login Redirection */}
            <p className="mt-8 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-indigo-600 transition hover:text-indigo-700 hover:underline"
              >
                Sign in
              </Link>
            </p>

            <p className="mt-6 text-center text-xs text-slate-400">
              Protected by FairShare automated account security.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;