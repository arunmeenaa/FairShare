import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useHousehold } from "../context/HouseholdContext";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import { useTheme } from "../context/ThemeContext";

const getId = (target) => {
  if (!target) return "";

  if (typeof target === "object") {
    return (
      target._id ||
      target.id ||
      target.user?._id ||
      target.user ||
      ""
    ).toString();
  }

  return target.toString();
};

const getInitial = (name) => {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
};

const ThemeToggleIcon = ({ theme }) => (
  <span className="relative flex h-5 w-5 items-center justify-center">
    {/* Sun */}
    <svg
      aria-hidden="true"
      className={`absolute h-[18px] w-[18px] transition-all duration-300 ease-out ${
        theme === "dark"
          ? "rotate-0 scale-100 text-amber-300"
          : "rotate-90 scale-0 text-slate-500"
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="3.5" strokeWidth={1.8} />

      <path
        strokeLinecap="round"
        strokeWidth={1.8}
        d="M12 2.5v2M12 19.5v2M4.58 4.58l1.42 1.42M18 18l1.42 1.42M2.5 12h2M19.5 12h2M4.58 19.42L6 18M18 6l1.42-1.42"
      />
    </svg>

    {/* Moon */}
    <svg
      aria-hidden="true"
      className={`absolute h-[17px] w-[17px] transition-all duration-300 ease-out ${
        theme === "dark"
          ? "-rotate-90 scale-0 text-slate-400"
          : "rotate-0 scale-100 text-indigo-600 dark:text-indigo-300"
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M21 12.8A8.5 8.5 0 1111.2 3 6.7 6.7 0 0021 12.8z"
      />
    </svg>
  </span>
);

const BrandMark = () => (
  <span
    aria-hidden="true"
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-[0_8px_20px_rgba(99,102,241,0.28)] ring-1 ring-white/50 dark:from-indigo-400 dark:via-violet-500 dark:to-fuchsia-500 dark:ring-white/15"
  >
    <svg
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3.5 11.5L12 4l8.5 7.5M5.5 10.5V20h13v-9.5M9 20v-5.5h6V20"
      />

      <path
        strokeLinecap="round"
        strokeWidth={1.8}
        d="M18.5 3.5v3M17 5h3"
      />
    </svg>
  </span>
);

const DesktopNavLink = ({ children, ...props }) => (
  <NavLink
    {...props}
    className={({ isActive }) =>
      `relative flex items-center rounded-[13px] px-3 py-2 text-[12px] font-semibold transition-all duration-300 xl:px-4 xl:text-[13px] ${
        isActive
          ? "bg-gradient-to-b from-white/95 to-white/65 text-indigo-700 shadow-[0_5px_16px_rgba(79,70,229,0.12)] ring-1 ring-white/80 dark:from-indigo-400/20 dark:to-violet-400/10 dark:text-indigo-100 dark:ring-indigo-300/15"
          : "text-slate-600 hover:-translate-y-px hover:bg-white/65 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-indigo-100"
      }`
    }
  >
    {children}
  </NavLink>
);

const BottomNavIcon = ({ type, active }) => {
  const className = `h-[19px] w-[19px] ${
    active
      ? "text-indigo-600 dark:text-indigo-300"
      : "text-slate-500 dark:text-slate-400"
  }`;

  if (type === "dashboard") {
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 12l9-8 9 8M5 10v10h14V10M9 20v-6h6v6"
        />
      </svg>
    );
  }

  if (type === "expenses") {
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M7 3h10M7 21h10M8 3v4a4 4 0 002 3.46L12 12l2-1.54A4 4 0 0016 7V3M8 21v-4a4 4 0 012-3.46L12 12l2 1.54A4 4 0 0016 17v4"
        />
      </svg>
    );
  }

  if (type === "settlement") {
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 7h18M3 12h18M3 17h18M7 4v16M17 4v16"
        />
      </svg>
    );
  }

  if (type === "members") {
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m9-10a4 4 0 100-8 4 4 0 000 8zm7 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        />
      </svg>
    );
  }

  return null;
};

const MoreIcon = ({ open }) => (
  <svg
    className={`h-[19px] w-[19px] transition-all duration-300 ${
      open ? "rotate-90" : ""
    }`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

const Navbar = () => {
  const {
    households,
    currentHousehold,
    selectHousehold,
    loading: householdLoading,
  } = useHousehold();

  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!mobileMoreOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMoreOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setMobileMoreOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setMenuOpen(false);
      setMobileMoreOpen(false);

      await logout();

      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to log out");
    }
  };

  const handleHouseholdChange = (e) => {
    const targetId = e.target.value;

    const selected = (households || []).find(
      (household) => getId(household) === targetId,
    );

    if (selected) {
      selectHousehold(selected);
    }
  };

  const closeMobileMore = () => {
    setMobileMoreOpen(false);
  };

  const initial = getInitial(user?.name);
  const currentHouseholdId = getId(currentHousehold);

  return (
    <>
      {/* ========================================================= */}
      {/* DESKTOP NAVBAR                                            */}
      {/* ========================================================= */}

      <nav className="hidden px-4 pt-3 lg:block">
        <div className="mx-auto max-w-7xl">
          <div className="relative grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center rounded-[24px] border border-white/75 bg-white/55 px-3 shadow-[0_18px_50px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 dark:border-white/[0.10] dark:bg-[#0d1525]/70 dark:shadow-[0_20px_55px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.06)] lg:px-4">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/25" />

            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-l-[24px] bg-gradient-to-r from-white/25 to-transparent dark:from-indigo-400/[0.06]" />

            <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-violet-400/10 blur-3xl dark:bg-indigo-500/10" />

            {/* LEFT */}
            <div className="relative z-10 flex min-w-0 items-center gap-2 lg:gap-3">
              <Link
                to="/"
                className="group flex shrink-0 items-center gap-2 text-slate-900 transition-opacity hover:opacity-90 dark:text-white"
              >
                <BrandMark />

                <span className="hidden text-[21px] font-extrabold tracking-[-0.04em] xl:inline">
                  Fair
                  <span className="text-indigo-600 dark:text-indigo-400">
                    Share
                  </span>
                </span>
              </Link>

              <div className="mx-1 hidden h-7 w-px bg-slate-300/70 sm:block dark:bg-white/10" />

              {householdLoading ? (
                <div className="hidden h-9 w-32 animate-pulse rounded-[13px] bg-slate-200/70 sm:block xl:w-36 dark:bg-white/10" />
              ) : currentHousehold ? (
                <div className="relative hidden sm:block">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-500 dark:text-indigo-400">
                    <svg
                      className="h-4 w-4"
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

                  <select
                    value={currentHouseholdId}
                    onChange={handleHouseholdChange}
                    aria-label="Select household"
                    className="max-w-40 cursor-pointer appearance-none rounded-[13px] border border-white/75 bg-white/45 py-2 pl-9 pr-8 text-xs font-semibold text-slate-700 outline-none backdrop-blur-xl transition-all duration-200 hover:border-indigo-200/80 hover:bg-white/75 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-400/10 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-200 dark:hover:border-indigo-300/20 dark:hover:bg-white/[0.08] dark:focus:border-indigo-400/40 xl:max-w-48"
                  >
                    {households.map((household) => (
                      <option
                        key={getId(household)}
                        value={getId(household)}
                        className="dark:bg-slate-900 dark:text-slate-200"
                      >
                        {household.name}
                      </option>
                    ))}
                  </select>

                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 dark:text-slate-500">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 9l6 6 6-6"
                      />
                    </svg>
                  </div>
                </div>
              ) : (
                <span className="hidden rounded-[13px] border border-white/70 bg-white/40 px-3 py-1.5 text-xs font-medium text-slate-400 backdrop-blur-xl sm:block dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500">
                  No household
                </span>
              )}
            </div>

            {/* CENTER */}
            <div className="relative z-10 justify-self-center">
              <div className="flex items-center gap-0.5 rounded-[17px] border border-white/85 bg-white/45 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_9px_28px_rgba(15,23,42,0.08)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.10] dark:bg-white/[0.045] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_32px_rgba(0,0,0,0.30)]">
                <DesktopNavLink to="/" end>
                  Dashboard
                </DesktopNavLink>

                <DesktopNavLink to="/expenses">
                  Expenses
                </DesktopNavLink>

                <DesktopNavLink to="/settlement">
                  Settlement
                </DesktopNavLink>

                <DesktopNavLink to="/members">
                  Members
                </DesktopNavLink>

                <DesktopNavLink to="/availability">
                  Availability
                </DesktopNavLink>
              </div>
            </div>

            {/* RIGHT */}
            <div className="relative z-10 ml-auto flex items-center gap-1.5 justify-self-end xl:gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-white/75 bg-white/40 text-slate-600 backdrop-blur-xl transition-all duration-200 hover:-translate-y-px hover:border-indigo-200/80 hover:bg-white/75 hover:text-indigo-600 dark:border-white/[0.10] dark:bg-white/[0.045] dark:text-slate-300 dark:hover:border-indigo-400/30 dark:hover:bg-white/[0.08] dark:hover:text-indigo-200">
                <NotificationBell />
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[13px] border border-white/80 bg-white/50 text-slate-600 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-600 hover:shadow-md dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                aria-pressed={theme === "dark"}
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400/0 via-transparent to-indigo-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <ThemeToggleIcon theme={theme} />
              </button>

              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((previous) => !previous)}
                  className="flex items-center gap-2 rounded-[15px] border border-transparent p-0.5 transition-all duration-200 hover:bg-white/50 focus:outline-none focus:ring-4 focus:ring-indigo-400/10 dark:hover:bg-white/[0.05]"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                    {initial}
                  </div>

                  <div className="hidden max-w-32 text-left xl:block">
                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {user?.name || "User"}
                    </p>

                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Account
                    </p>
                  </div>

                  <svg
                    className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform duration-200 xl:block dark:text-slate-500 ${
                      menuOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 9l6 6 6-6"
                    />
                  </svg>
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 top-14 w-64 overflow-hidden rounded-[22px] border border-white/80 bg-white/75 shadow-[0_20px_55px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/5 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-[#111827]/88 dark:shadow-[0_22px_60px_rgba(0,0,0,0.55)] dark:ring-white/[0.04]"
                    role="menu"
                  >
                    <div className="bg-gradient-to-br from-indigo-600/95 to-violet-600/95 px-4 py-4 backdrop-blur-xl">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 font-bold text-white ring-1 ring-white/20">
                          {initial}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {user?.name || "User"}
                          </p>

                          <p className="truncate text-xs text-indigo-100/90">
                            {user?.email || ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <Link
                        to="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/[0.06]"
                        role="menuitem"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.8}
                              d="M20 21a8 8 0 00-16 0m12-11a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        </div>

                        Profile Settings
                      </Link>

                      <div className="my-1.5 h-px bg-slate-200/70 dark:bg-white/[0.08]" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50/80 dark:text-red-400 dark:hover:bg-red-500/10"
                        role="menuitem"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.8}
                              d="M10 17l5-5-5-5m5 5H3m13-9h3a2 2 0 012 2v10a2 2 0 01-2 2h-3"
                            />
                          </svg>
                        </div>

                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ========================================================= */}
      {/* MOBILE TOP BAR                                            */}
      {/* ========================================================= */}

      <header className="px-3 pt-2 lg:hidden">
        <div className="relative flex h-[64px] items-center justify-between rounded-[22px] border border-white/80 bg-white/60 px-3 shadow-[0_12px_38px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 dark:border-white/[0.10] dark:bg-[#0d1525]/75 dark:shadow-[0_14px_42px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/20" />

          <div className="pointer-events-none absolute -right-10 -top-16 h-32 w-32 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />

          {/* Profile */}
          <Link
            to="/profile"
            className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/50 transition-transform active:scale-95 dark:ring-white/15"
            aria-label="Open profile"
          >
            {initial}
          </Link>

          {/* Center logo */}
          <Link
            to="/"
            className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 text-[20px] font-extrabold tracking-[-0.04em] text-slate-900 dark:text-white"
          >
            <BrandMark />

            <span>
              Fair
              <span className="text-indigo-600 dark:text-indigo-400">
                Share
              </span>
            </span>
          </Link>

          {/* Notification */}
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/75 bg-white/45 text-slate-600 backdrop-blur-xl dark:border-white/[0.10] dark:bg-white/[0.045] dark:text-slate-300">
            <NotificationBell />
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM NAVIGATION                                  */}
      {/* ========================================================= */}

      <nav
  className="fixed bottom-0 left-1/2 z-50 w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 px-0 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden"
  aria-label="Mobile navigation"
>
  <div className="pointer-events-auto w-full">
    <div className="pointer-events-none absolute -inset-1 rounded-[29px] bg-indigo-500/5 blur-xl dark:bg-indigo-500/10" />

    <div className="relative w-full overflow-hidden rounded-[26px] border border-white/80 bg-white/65 px-1.5 py-1.5 shadow-[0_16px_48px_rgba(15,23,42,0.17),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.10] dark:bg-[#0d1525]/78 dark:shadow-[0_18px_54px_rgba(0,0,0,0.50),inset_0_1px_0_rgba(255,255,255,0.06)]">

      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90 dark:via-white/25" />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent dark:from-white/[0.025]" />

      <div className="relative flex items-stretch">
        {/* KEEP YOUR EXISTING NAVLINKS HERE */}
    
              {/* Home */}
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `group flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center rounded-[19px] py-1 transition-all duration-200 touch-manipulation select-none ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-300"
                      : "text-slate-500 dark:text-slate-400"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-8 w-11 items-center justify-center rounded-[13px] transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-b from-indigo-500/15 to-violet-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_4px_12px_rgba(99,102,241,0.10)] dark:from-indigo-400/20 dark:to-violet-400/10"
                          : "group-hover:bg-white/50 dark:group-hover:bg-white/[0.05]"
                      }`}
                    >
                      <BottomNavIcon type="dashboard" active={isActive} />
                    </span>

                    <span className="mt-0.5 whitespace-nowrap text-[9px] font-semibold leading-none">
                      Home
                    </span>
                  </>
                )}
              </NavLink>

              {/* Expenses */}
              <NavLink
                to="/expenses"
                end
                className={({ isActive }) =>
                  `group flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center rounded-[19px] py-1 transition-all duration-200 touch-manipulation select-none ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-300"
                      : "text-slate-500 dark:text-slate-400"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-8 w-11 items-center justify-center rounded-[13px] transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-b from-indigo-500/15 to-violet-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_4px_12px_rgba(99,102,241,0.10)] dark:from-indigo-400/20 dark:to-violet-400/10"
                          : "group-hover:bg-white/50 dark:group-hover:bg-white/[0.05]"
                      }`}
                    >
                      <BottomNavIcon type="expenses" active={isActive} />
                    </span>

                    <span className="mt-0.5 whitespace-nowrap text-[9px] font-semibold leading-none">
                      Expenses
                    </span>
                  </>
                )}
              </NavLink>

              {/* Add Expense */}
              <NavLink
                to="/expenses/create"
                aria-label="Add expense"
                className={({ isActive }) =>
                  `group relative flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center rounded-[19px] py-1 transition-all duration-200 touch-manipulation select-none ${
                    isActive
                      ? "text-indigo-700 dark:text-indigo-200"
                      : "text-indigo-600 dark:text-indigo-300"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`relative flex h-9 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-[0_7px_18px_rgba(79,70,229,0.28)] ring-1 ring-white/60 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_24px_rgba(79,70,229,0.34)] dark:from-indigo-500 dark:to-violet-500 dark:ring-white/15 ${
                        isActive
                          ? "scale-105 shadow-[0_10px_24px_rgba(79,70,229,0.38)] ring-2 ring-indigo-300/40 dark:ring-indigo-300/25"
                          : ""
                      }`}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.2}
                          d="M12 5v14M5 12h14"
                        />
                      </svg>

                      <span className="pointer-events-none absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-white/90 shadow-sm dark:bg-indigo-100" />
                    </span>

                    <span className="mt-0.5 whitespace-nowrap text-[9px] font-bold leading-none">
                      Add Expense
                    </span>
                  </>
                )}
              </NavLink>

              {/* Settlement */}
              <NavLink
                to="/settlement"
                className={({ isActive }) =>
                  `group flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center rounded-[19px] py-1 transition-all duration-200 touch-manipulation select-none ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-300"
                      : "text-slate-500 dark:text-slate-400"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-8 w-11 items-center justify-center rounded-[13px] transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-b from-indigo-500/15 to-violet-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_4px_12px_rgba(99,102,241,0.10)] dark:from-indigo-400/20 dark:to-violet-400/10"
                          : "group-hover:bg-white/50 dark:group-hover:bg-white/[0.05]"
                      }`}
                    >
                      <BottomNavIcon type="settlement" active={isActive} />
                    </span>

                    <span className="mt-0.5 whitespace-nowrap text-[9px] font-semibold leading-none">
                      Settle
                    </span>
                  </>
                )}
              </NavLink>

             
             

              {/* More */}
              <button
                type="button"
                onClick={() =>
                  setMobileMoreOpen((previous) => !previous)
                }
                className={`group flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center rounded-[19px] py-1 transition-all duration-200 touch-manipulation select-none ${
                  mobileMoreOpen
                    ? "text-indigo-600 dark:text-indigo-300"
                    : "text-slate-500 dark:text-slate-400"
                }`}
                aria-label="Open more options"
                aria-expanded={mobileMoreOpen}
              >
                <span
                  className={`flex h-8 w-11 items-center justify-center rounded-[13px] transition-all duration-200 ${
                    mobileMoreOpen
                      ? "bg-gradient-to-b from-indigo-500/15 to-violet-500/10 dark:from-indigo-400/20 dark:to-violet-400/10"
                      : "group-hover:bg-white/50 dark:group-hover:bg-white/[0.05]"
                  }`}
                >
                  <MoreIcon open={mobileMoreOpen} />
                </span>

                <span className="mt-0.5 whitespace-nowrap text-[9px] font-semibold leading-none">
                  More
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

     

      {mobileMoreOpen && (
        <div className="fixed inset-0 z-[60] h-[100dvh] w-screen max-w-[100vw] overflow-hidden lg:hidden">
          {/* Overlay */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMobileMore}
            className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-[3px] dark:bg-black/60"
          />

          {/* Sheet */}
          <div className="absolute inset-x-3 bottom-[calc(4.75rem+max(10px,env(safe-area-inset-bottom)))] max-h-[calc(100dvh-7rem-env(safe-area-inset-bottom))] min-w-0 max-w-[calc(100vw-1.5rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[28px] border border-white/80 bg-white/75 px-4 pb-4 pt-3 shadow-[0_24px_80px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/5 backdrop-blur-2xl backdrop-saturate-150 [-webkit-overflow-scrolling:touch] dark:border-white/[0.08] dark:bg-[#111827]/88 dark:shadow-[0_24px_80px_rgba(0,0,0,0.58)] dark:ring-white/[0.04]">
            {/* Reflection */}
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/20" />

            <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />

            {/* Handle */}
            <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-slate-300/80 dark:bg-slate-700" />

            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  More
                </p>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Manage your FairShare account
                </p>
              </div>

              <button
                type="button"
                onClick={closeMobileMore}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/55 text-slate-500 backdrop-blur-xl transition hover:bg-white/80 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-400 dark:hover:bg-white/[0.09]"
                aria-label="Close more menu"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 6l12 12M18 6L6 18"
                  />
                </svg>
              </button>
            </div>

            {/* User */}
            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/45 p-3 backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.035]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                {initial}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {user?.name || "User"}
                </p>

                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {user?.email || ""}
                </p>
              </div>
            </div>

            {/* Household */}
            {currentHousehold && (
              <div className="mb-3 rounded-2xl border border-white/80 bg-white/45 p-3 backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.035]">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Active Household
                </label>

                <div className="relative">
                  <select
                    value={currentHouseholdId}
                    onChange={handleHouseholdChange}
                    aria-label="Select household"
                    className="w-full appearance-none rounded-xl border border-white/80 bg-white/60 px-4 py-3 pr-10 text-sm font-semibold text-slate-700 outline-none backdrop-blur-xl transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-400/10 dark:border-white/[0.08] dark:bg-slate-950/50 dark:text-slate-200 dark:focus:border-indigo-400/40"
                  >
                    {households.map((household) => (
                      <option
                        key={getId(household)}
                        value={getId(household)}
                        className="dark:bg-slate-900 dark:text-slate-200"
                      >
                        {household.name}
                      </option>
                    ))}
                  </select>

                  <svg
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 9l6 6 6-6"
                    />
                  </svg>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {/* Availability */}
              <NavLink
                to="/availability"
                onClick={closeMobileMore}
                className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/45 px-4 py-3.5 text-sm font-semibold text-slate-700 backdrop-blur-xl transition hover:bg-white/70 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-200 dark:hover:bg-white/[0.06]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 3v18M3 12h18"
                      />
                    </svg>
                  </span>

                  Availability
                </span>

                <svg
                  className="h-4 w-4 text-slate-400"
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
              </NavLink>

               <NavLink
                to="/members"
                onClick={closeMobileMore}
                className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/45 px-4 py-3.5 text-sm font-semibold text-slate-700 backdrop-blur-xl transition hover:bg-white/70 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-200 dark:hover:bg-white/[0.06]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m9-10a4 4 0 100-8 4 4 0 000 8zm7 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                      />
                    </svg>
                  </span>
 
                  Members
                </span>
 
                <svg
                  className="h-4 w-4 text-slate-400"
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
              </NavLink>

              {/* Profile */}
              <Link
                to="/profile"
                onClick={closeMobileMore}
                className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/45 px-4 py-3.5 text-sm font-semibold text-slate-700 backdrop-blur-xl transition hover:bg-white/70 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-200 dark:hover:bg-white/[0.06]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M20 21a8 8 0 00-16 0m12-11a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </span>

                  Profile Settings
                </span>

                <svg
                  className="h-4 w-4 text-slate-400"
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
              </Link>

              {/* Theme */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-2xl border border-white/80 bg-white/45 px-4 py-3.5 text-sm font-semibold text-slate-700 backdrop-blur-xl transition hover:bg-white/70 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-200 dark:hover:bg-white/[0.06]"
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                aria-pressed={theme === "dark"}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10">
                    <ThemeToggleIcon theme={theme} />
                  </span>

                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </span>

                <span className="rounded-full border border-white/60 bg-white/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-slate-400">
                  {theme}
                </span>
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-between rounded-2xl border border-red-200/60 bg-red-50/65 px-4 py-3.5 text-sm font-semibold text-red-600 backdrop-blur-xl transition hover:bg-red-100/70 dark:border-red-500/10 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100/80 dark:bg-red-500/10">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M10 17l5-5-5-5m5 5H3m13-9h3a2 2 0 012 2v10a2 2 0 01-2 2h-3"
                      />
                    </svg>
                  </span>

                  Sign Out
                </span>

                <svg
                  className="h-4 w-4"
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
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;