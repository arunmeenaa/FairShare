import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useNotifications } from "../context/NotificationContext";

// ==========================================
// UTILITIES & HELPERS
// ==========================================

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getNotificationIcon = (type) => {
  switch (type) {
    case "expense_created":
      return "💸";
    case "settlement_ready":
      return "🧾";
    case "payment_marked":
      return "✓";
    case "availability_changed":
      return "🕒";
    case "member_joined":
      return "👋";
    default:
      return "🔔";
  }
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const NotificationBell = () => {
  const {
    notifications = [],
    unreadCount = 0,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle Mark All As Read
  const handleMarkAllAsRead = async () => {
    if (!markAllAsRead || unreadCount === 0 || markingAll) return;

    try {
      setMarkingAll(true);
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error(error.response?.data?.message || "Failed to update notifications");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = useCallback(
    async (notification) => {
      if (!notification.isRead && markAsRead) {
        await markAsRead(notification._id);
      }

      setOpen(false);

      // Dynamic routing based on notification type
      if (notification.type === "expense_created" && notification.data?.expenseId) {
        navigate(`/expenses/${notification.data.expenseId}`);
      } else if (
        notification.type === "settlement_ready" ||
        notification.type === "payment_marked"
      ) {
        navigate("/settlement");
      } else if (
        notification.type === "availability_changed" ||
        notification.type === "member_joined"
      ) {
        navigate("/members");
      }
    },
    [markAsRead, navigate]
  );

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus:ring-indigo-400/30"
        aria-label="Notifications"
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
            strokeWidth={1.8}
            d="M15 17h5l-1.5-1.5A2 2 0 0118 14v-3a6 6 0 10-12 0v3a2 2 0 01-.5 1.5L4 17h5m6 0v1a3 3 0 01-6 0v-1"
          />
        </svg>

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:bg-indigo-500 dark:ring-[#0d1525]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Container */}
      {open && (
        <div className="absolute right-0 top-12 z-[1000] w-[min(360px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/80 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/5 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.10] dark:bg-[#111827]/90 dark:shadow-[0_22px_65px_rgba(0,0,0,0.52)] dark:ring-white/[0.04]">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.035]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markingAll}
                onClick={handleMarkAllAsRead}
                 className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-300 dark:hover:text-indigo-200"
              >
                {markingAll ? (
                  <>
                     <svg className="h-3.5 w-3.5 animate-spin text-indigo-600 dark:text-indigo-300" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                    </svg>
                    Marking...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Mark all as read
                  </>
                )}
              </button>
            )}
          </div>

          {/* List Area */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.07]">
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex animate-pulse gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-200 dark:bg-white/[0.09]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-white/[0.09]" />
                      <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/[0.06]" />
                      <div className="h-2.5 w-1/3 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl dark:bg-white/[0.07]">
                  🔔
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">No notifications</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  You're all caught up with household activity.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const isUnread = !notification.isRead;
                const icon = getNotificationIcon(notification.type);

                return (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`group cursor-pointer px-4 py-3.5 transition ${
                      isUnread
                         ? "bg-indigo-50/40 hover:bg-indigo-50/70 dark:bg-indigo-400/[0.08] dark:hover:bg-indigo-400/[0.13]"
                         : "bg-white hover:bg-slate-50 dark:bg-transparent dark:hover:bg-white/[0.045]"
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Avatar Icon */}
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${
                          isUnread
                             ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-400/15 dark:text-indigo-200 dark:ring-indigo-300/20"
                             : "bg-slate-100 text-slate-600 dark:bg-white/[0.07] dark:text-slate-300"
                        }`}
                      >
                        {icon}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`truncate text-sm ${
                              isUnread
                                 ? "font-bold text-slate-900 dark:text-white"
                                 : "font-semibold text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {notification.title}
                          </p>

                          {isUnread && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                          )}
                        </div>

                         <p className="mt-0.5 text-xs leading-relaxed text-slate-600 line-clamp-2 dark:text-slate-400">
                          {notification.message}
                        </p>

                         <p className="mt-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;