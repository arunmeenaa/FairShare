import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";

import { useHousehold } from "../context/HouseholdContext";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const Navbar = () => {
  const {
    households,
    currentHousehold,
    selectHousehold,
    loading: householdLoading,
  } = useHousehold();

  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const menuRef = useRef(null);

  // =========================
  // CLOSE PROFILE MENU
  // =========================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    try {
      setMenuOpen(false);
      setMobileOpen(false);

      await logout();

      navigate("/login");
    } catch (error) {
      console.error(
        "Logout failed:",
        error,
      );
    }
  };

  // =========================
  // HOUSEHOLD CHANGE
  // =========================

  const handleHouseholdChange = (e) => {
    const household =
      households.find(
        (item) =>
          item._id === e.target.value,
      );

    if (household) {
      selectHousehold(household);
    }
  };

  // =========================
  // NAVIGATION STYLE
  // =========================

  const navLinkClass = ({
    isActive,
  }) =>
    `relative rounded-lg px-3 py-2 text-sm font-semibold transition ${
      isActive
        ? "bg-indigo-50 text-indigo-700"
        : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
    }`;

  const mobileNavLinkClass = ({
    isActive,
  }) =>
    `flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-indigo-50 text-indigo-700"
        : "text-slate-600 hover:bg-slate-50"
    }`;

  const initial =
    user?.name
      ?.charAt(0)
      ?.toUpperCase() || "?";

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">

      {/* ========================= */}
      {/* DESKTOP / TOP NAVBAR */}
      {/* ========================= */}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* LEFT */}

        <div className="flex min-w-0 items-center gap-4">

          {/* LOGO */}

          <Link
            to="/"
            className="shrink-0 text-2xl font-extrabold tracking-tight text-slate-900 transition hover:opacity-90"
          >
            Fair
            <span className="text-indigo-600">
              Share
            </span>
          </Link>

          {/* DIVIDER */}

          <div className="hidden h-7 w-px bg-slate-200 sm:block" />

          {/* HOUSEHOLD */}

          {householdLoading ? (
            <div className="hidden h-9 w-32 animate-pulse rounded-xl bg-slate-100 sm:block" />
          ) : currentHousehold ? (
            <div className="relative hidden sm:block">

              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-4 w-4 text-indigo-500"
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
                value={
                  currentHousehold._id
                }
                onChange={
                  handleHouseholdChange
                }
                className="max-w-48 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm font-semibold text-slate-700 outline-none transition hover:border-indigo-200 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              >
                {households.map(
                  (household) => (
                    <option
                      key={
                        household._id
                      }
                      value={
                        household._id
                      }
                    >
                      {household.name}
                    </option>
                  ),
                )}
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
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
                    d="M6 9l6 6 6-6"
                  />
                </svg>
              </div>
            </div>
          ) : (
            <span className="hidden rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 sm:block">
              No household
            </span>
          )}
        </div>

        {/* CENTER NAVIGATION */}

        <div className="hidden items-center gap-1 lg:flex">

          <NavLink
            to="/"
            className={navLinkClass}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/expenses"
            className={navLinkClass}
          >
            Expenses
          </NavLink>

          <NavLink
            to="/settlement"
            className={navLinkClass}
          >
            Settlement
          </NavLink>

          <NavLink
            to="/members"
            className={navLinkClass}
          >
            Members
          </NavLink>

          <NavLink
            to="/availability"
            className={navLinkClass}
          >
            Availability
          </NavLink>
        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-2">

          {/* MOBILE MENU BUTTON */}

          <button
            type="button"
            onClick={() =>
              setMobileOpen(
                (prev) => !prev,
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 lg:hidden"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? (
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
                  d="M6 18L18 6M6 6l12 12"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>

          {/* NOTIFICATIONS */}

          <div className="rounded-xl transition hover:bg-slate-50">
            <NotificationBell />
          </div>

          {/* PROFILE */}

          <div
            ref={menuRef}
            className="relative"
          >
            <button
              type="button"
              onClick={() =>
                setMenuOpen(
                  (prev) => !prev,
                )
              }
              className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition hover:bg-slate-50"
            >

              {/* Avatar */}

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm">
                {initial}
              </div>

              {/* User */}

              <div className="hidden max-w-32 text-left sm:block">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {user?.name}
                </p>

                <p className="text-xs text-slate-400">
                  Account
                </p>
              </div>

              {/* Arrow */}

              <svg
                className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${
                  menuOpen
                    ? "rotate-180"
                    : ""
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

            {/* ========================= */}
            {/* PROFILE DROPDOWN */}
            {/* ========================= */}

            {menuOpen && (
              <div className="absolute right-0 top-14 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">

                {/* User header */}

                <div className="bg-indigo-600 px-4 py-4">
                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg font-bold text-white ring-1 ring-white/20">
                      {initial}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {user?.name}
                      </p>

                      <p className="truncate text-xs text-indigo-200">
                        {user?.email}
                      </p>
                    </div>

                  </div>
                </div>

                {/* Menu */}

                <div className="p-2">

                  <Link
                    to="/profile"
                    onClick={() =>
                      setMenuOpen(
                        false,
                      )
                    }
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                      <svg
                        className="h-4 w-4 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeWidth={1.8}
                          d="M20 21a8 8 0 00-16 0m12-11a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>

                    Profile
                  </Link>

                  <div className="my-2 h-px bg-slate-100" />

                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                      <svg
                        className="h-4 w-4 text-red-600"
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

                    Logout
                  </button>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================= */}
      {/* MOBILE NAVIGATION */}
      {/* ========================= */}

      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 lg:hidden">

          {/* Mobile household */}

          {currentHousehold && (
            <div className="mb-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Household
              </label>

              <div className="relative">
                <select
                  value={
                    currentHousehold._id
                  }
                  onChange={
                    handleHouseholdChange
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                >
                  {households.map(
                    (household) => (
                      <option
                        key={
                          household._id
                        }
                        value={
                          household._id
                        }
                      >
                        {household.name}
                      </option>
                    ),
                  )}
                </select>

                <svg
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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

          {/* Mobile links */}

          <div className="space-y-1">

            <NavLink
              to="/"
              onClick={() =>
                setMobileOpen(false)
              }
              className={
                mobileNavLinkClass
              }
            >
              Dashboard
            </NavLink>

            <NavLink
              to="/expenses"
              onClick={() =>
                setMobileOpen(false)
              }
              className={
                mobileNavLinkClass
              }
            >
              Expenses
            </NavLink>

            <NavLink
              to="/settlement"
              onClick={() =>
                setMobileOpen(false)
              }
              className={
                mobileNavLinkClass
              }
            >
              Settlement
            </NavLink>

            <NavLink
              to="/members"
              onClick={() =>
                setMobileOpen(false)
              }
              className={
                mobileNavLinkClass
              }
            >
              Members
            </NavLink>

            <NavLink
              to="/availability"
              onClick={() =>
                setMobileOpen(false)
              }
              className={
                mobileNavLinkClass
              }
            >
              Availability
            </NavLink>

            <NavLink
              to="/profile"
              onClick={() =>
                setMobileOpen(false)
              }
              className={
                mobileNavLinkClass
              }
            >
              Profile
            </NavLink>

          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;