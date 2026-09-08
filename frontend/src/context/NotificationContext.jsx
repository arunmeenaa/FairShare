import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";
import socket from "../services/socket";

import { useAuth } from "./AuthContext";
import { useHousehold } from "./HouseholdContext";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { currentHousehold } = useHousehold();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  /* =========================
     HELPERS
  ========================= */

  const getUserId = useCallback(() => {
    if (!user) return "";

    return (
      user._id ||
      user.id ||
      user.user?._id ||
      user.user ||
      ""
    ).toString();
  }, [user]);

  const getHouseholdId = useCallback(() => {
    if (!currentHousehold) return "";

    return (
      currentHousehold._id ||
      currentHousehold.id ||
      ""
    ).toString();
  }, [currentHousehold]);

  /* =========================
     FETCH NOTIFICATIONS
  ========================= */

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const params = {};

      const householdId = getHouseholdId();

      if (householdId) {
        params.householdId = householdId;
      }

      const response = await api.get("/notifications", {
        params,
      });

      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error(
        "Failed to fetch notifications:",
        error
      );

      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user, getHouseholdId]);

  /* =========================
     AUTH + HOUSEHOLD CHANGE
  ========================= */

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchNotifications();
  }, [
    user,
    authLoading,
    currentHousehold,
    fetchNotifications,
  ]);

  /* =========================
     SOCKET CONNECTION
  ========================= */

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    const userId = getUserId();

    if (!userId) {
      return;
    }

    const handleConnect = () => {
      console.log(
        "Socket connected:",
        socket.id
      );

      socket.emit("join-user", userId);

      const householdId = getHouseholdId();

      if (householdId) {
        socket.emit(
          "join-household",
          householdId
        );
      }
    };

    const handleConnectError = (error) => {
      console.error(
        "Socket connection error:",
        error.message
      );
    };

    const handleDisconnect = (reason) => {
      console.log(
        "Socket disconnected:",
        reason
      );
    };

    socket.on("connect", handleConnect);
    socket.on(
      "connect_error",
      handleConnectError
    );
    socket.on(
      "disconnect",
      handleDisconnect
    );

    /*
     * autoConnect is false in services/socket.js,
     * so we must explicitly connect.
     */
    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off(
        "connect_error",
        handleConnectError
      );
      socket.off(
        "disconnect",
        handleDisconnect
      );
    };
  }, [
    authLoading,
    user,
    getUserId,
    getHouseholdId,
  ]);

  /* =========================
     HOUSEHOLD ROOM SYNC
  ========================= */

  useEffect(() => {
    if (
      authLoading ||
      !user ||
      !currentHousehold
    ) {
      return;
    }

    const householdId = getHouseholdId();

    if (!householdId) {
      return;
    }

    /*
     * If the socket is already connected,
     * immediately join the new household.
     *
     * If it is not connected yet, the connect
     * handler above will join it after connection.
     */
    if (socket.connected) {
      socket.emit(
        "join-household",
        householdId
      );
    }

    return () => {
      if (socket.connected) {
        socket.emit(
          "leave-household",
          householdId
        );
      }
    };
  }, [
    authLoading,
    user,
    currentHousehold,
    getHouseholdId,
  ]);

  /* =========================
     REAL-TIME NOTIFICATIONS
  ========================= */

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    const handleNotification = (
      notification
    ) => {
      console.log(
        "New socket notification:",
        notification
      );

      /*
       * Support household being either:
       * - a string/objectId
       * - a populated object
       */
      const notificationHousehold =
        notification?.household?._id ||
        notification?.household?.id ||
        notification?.household ||
        "";

      const currentHouseholdId =
        getHouseholdId();

      /*
       * When a household is selected,
       * ignore notifications from another household.
       */
      if (
        currentHouseholdId &&
        notificationHousehold &&
        notificationHousehold.toString() !==
          currentHouseholdId.toString()
      ) {
        return;
      }

      setNotifications((prev) => {
        /*
         * Prevent duplicate notifications.
         */
        if (
          notification?._id &&
          prev.some(
            (item) =>
              item._id === notification._id
          )
        ) {
          return prev;
        }

        return [
          notification,
          ...prev,
        ];
      });

      /*
       * New realtime notifications are unread.
       */
      setUnreadCount(
        (prev) => prev + 1
      );
    };

    socket.on(
      "notification",
      handleNotification
    );

    return () => {
      socket.off(
        "notification",
        handleNotification
      );
    };
  }, [
    authLoading,
    user,
    currentHousehold,
    getHouseholdId,
  ]);

  /* =========================
     MARK ONE AS READ
  ========================= */

  const markAsRead = async (
    notificationId
  ) => {
    try {
      const notification =
        notifications.find(
          (item) =>
            item._id === notificationId
        );

      if (
        !notification ||
        notification.isRead
      ) {
        return;
      }

      await api.patch(
        `/notifications/${notificationId}/read`
      );

      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notificationId
            ? {
                ...item,
                isRead: true,
                readAt: new Date(),
              }
            : item
        )
      );

      setUnreadCount((prev) =>
        Math.max(prev - 1, 0)
      );
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error
      );
    }
  };

  /* =========================
     MARK ALL AS READ
  ========================= */

  const markAllAsRead = async () => {
    const householdId =
      getHouseholdId();

    if (!householdId) {
      return;
    }

    try {
      await api.patch(
        "/notifications/read-all",
        {
          householdId,
        }
      );

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          isRead: true,
          readAt:
            notification.readAt ||
            new Date(),
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error
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