import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

// ==========================================
// ICON COMPONENTS (Extracted for clean JSX)
// ==========================================
const LogoIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.12-3 2.5S10.343 13 12 13s3 1.12 3 2.5S13.657 18 12 18m0-10V6m0 12v-2m0 2a6 6 0 100-12 6 6 0 000 12z" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const MailIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="10" width="14" height="10" rx="2" strokeWidth={1.8} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10V7a4 4 0 018 0v3" />
  </svg>
);

const EyeIcon = ({ className, show }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {show ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3l18 18M10.58 10.58a2 2 0 102.83 2.83M9.88 5.09A10.94 10.94 0 0112 5c5 0 8.5 3.5 9 7-.18 1.23-.7 2.36-1.5 3.36M6.53 6.53C4.53 7.8 3.25 9.52 3 12c.5 3.5 4 7 9 7 1.36 0 2.6-.27 3.69-.74" />
    ) : (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
        <circle cx="12" cy="12" r="2.5" strokeWidth={1.8} />
      </>
    )}
  </svg>
);

const SpinnerIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
  </svg>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
const FEATURES = [
  "Track household expenses in real time",
  "Automatically split bills and grocery shares",
  "Generate tamper-proof statement receipts",
];

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [{ email, password }, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      await login(cleanEmail, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <div className="flex min-h-screen">
        
        {/* ================= LEFT BRAND PANEL ================= */}
        <div className="relative hidden overflow-hidden bg-indigo-600 lg:flex lg:w-1/2">
          {/* Decorative shapes */}
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-500 opacity-50 blur-2xl transition-all dark:bg-indigo-500/30" />
          <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-indigo-700 opacity-50 blur-2xl transition-all dark:bg-indigo-800/40" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
                <LogoIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                FairShare
              </span>
            </div>

            {/* Main content */}
            <div className="max-w-lg">
              <div className="mb-6 inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-indigo-100 ring-1 ring-white/20 backdrop-blur-md">
                Transparent Household Accounting
              </div>

              <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
                Your household
                <span className="block text-indigo-200 dark:text-indigo-300">expenses, simplified.</span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-7 text-indigo-100 dark:text-indigo-200/80">
                Keep track of shared expenses, know who owes what, and settle everything fairly with precision.
              </p>

              {/* Features */}
              <div className="mt-10 space-y-4">
                {FEATURES.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                      <CheckIcon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-indigo-50">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <p className="text-xs font-medium text-indigo-200/80">
              FairShare • Spend together. Settle fairly.
            </p>
          </div>
        </div>

        {/* ================= RIGHT LOGIN FORM PANEL ================= */}
        <div className="flex w-full items-center justify-center bg-white px-5 py-10 transition-colors duration-300 sm:px-8 lg:w-1/2 lg:px-12 xl:px-20 dark:bg-slate-950">
          <div className="w-full max-w-md">
            
            {/* Mobile Header Logo */}
            <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-200 dark:shadow-none">
                <LogoIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                FairShare
              </span>
            </div>

            {/* Form Introduction */}
            <div className="mb-8">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Welcome Back
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sign in to your account
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Enter your credentials to access your household dashboard.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Email address
                </label>
                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors dark:text-slate-500 dark:group-focus-within:text-indigo-400">
                    <MailIcon className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={handleChange}
                    required
                    className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/10"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                    Forgot password?
                  </Link>
                </div>

                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors dark:text-slate-500 dark:group-focus-within:text-indigo-400">
                    <LockIcon className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={handleChange}
                    required
                    className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none rounded-r-xl"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon className="h-5 w-5" show={showPassword} />
                  </button>
                </div>
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 bg-white transition-all checked:border-indigo-600 checked:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-1 dark:border-slate-700 dark:bg-slate-900 dark:checked:border-indigo-500 dark:checked:bg-indigo-500 dark:focus:ring-offset-slate-950"
                    />
                    <svg className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 select-none">
                    Keep me signed in
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-none dark:hover:bg-indigo-500"
              >
                {loading ? (
                  <>
                    <SpinnerIcon className="h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign in
                    <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Registration Redirection */}
            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold text-indigo-600 transition hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300">
                Create an account
              </Link>
            </p>

            <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600">
              Protected by FairShare automated account security.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;