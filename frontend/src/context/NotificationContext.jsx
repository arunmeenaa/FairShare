import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";
import socket from "../services/socket";

import { useAuth } from "./AuthContext";
import { useHousehold } from "./HouseholdContext";

const NotificationContext =
  createContext(null);

export const NotificationProvider = ({
  children,
}) => {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const { currentHousehold } =
    useHousehold();

  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  // =========================
  // FETCH NOTIFICATIONS
  // =========================

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const params = {};

      if (currentHousehold) {
        params.householdId =
          currentHousehold._id;
      }

      const response = await api.get(
        "/notifications",
        {
          params,
        },
      );

      setNotifications(
        response.data.notifications || [],
      );

      setUnreadCount(
        response.data.unreadCount || 0,
      );
    } catch (error) {
      console.error(
        "Failed to fetch notifications:",
        error,
      );

      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // AUTH + HOUSEHOLD CHANGE
  // =========================

  useEffect(() => {
    // Auth is still being initialized
    if (authLoading) {
      return;
    }

    // User is logged out
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);

      return;
    }

    // User is authenticated
    fetchNotifications();
  }, [
    user,
    authLoading,
    currentHousehold,
  ]);

  // =========================
  // REAL-TIME NOTIFICATIONS
  // =========================

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    const handleNotification = (
      notification,
    ) => {
      console.log(
        "New notification:",
        notification,
      );

      // Ignore notifications belonging
      // to another household
      if (
        currentHousehold &&
        notification.household?.toString() !==
          currentHousehold._id?.toString()
      ) {
        return;
      }

      setNotifications((prev) => {
        // Prevent duplicate notification
        if (
          prev.some(
            (item) =>
              item._id ===
              notification._id,
          )
        ) {
          return prev;
        }

        return [
          notification,
          ...prev,
        ];
      });

      setUnreadCount(
        (prev) => prev + 1,
      );
    };

    socket.on(
      "notification",
      handleNotification,
    );

    return () => {
      socket.off(
        "notification",
        handleNotification,
      );
    };
  }, [
    user,
    authLoading,
    currentHousehold,
  ]);

  // =========================
  // MARK ONE AS READ
  // =========================

  const markAsRead = async (
    notificationId,
  ) => {
    try {
      const notification =
        notifications.find(
          (item) =>
            item._id === notificationId,
        );

      if (
        !notification ||
        notification.isRead
      ) {
        return;
      }

      await api.patch(
        `/notifications/${notificationId}/read`,
      );

      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notificationId
            ? {
                ...item,
                isRead: true,
                readAt: new Date(),
              }
            : item,
        ),
      );

      setUnreadCount(
        (prev) =>
          Math.max(prev - 1, 0),
      );
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error,
      );
    }
  };

  // =========================
  // MARK ALL AS READ
  // =========================

  const markAllAsRead = async () => {
    if (!currentHousehold) {
      return;
    }

    try {
      await api.patch(
        "/notifications/read-all",
        {
          householdId:
            currentHousehold._id,
        },
      );

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          isRead: true,
          readAt:
            notification.readAt ||
            new Date(),
        })),
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error,
      );
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () =>
  useContext(NotificationContext);