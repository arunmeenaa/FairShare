import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";
import socket from "../services/socket";
import { useAuth } from "./AuthContext";

const HouseholdContext = createContext(null);

export const HouseholdProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  const [households, setHouseholds] = useState([]);
  const [currentHousehold, setCurrentHousehold] =
    useState(null);

  const [loading, setLoading] = useState(true);

  // =========================
  // FETCH HOUSEHOLDS
  // =========================

  const fetchHouseholds = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/households/my-households",
      );

      const data =
        response.data.households || [];

      setHouseholds(data);

      // Restore previously selected household
      const savedHouseholdId =
        localStorage.getItem(
          "selectedHouseholdId",
        );

      if (savedHouseholdId) {
        const savedHousehold = data.find(
          (household) =>
            household._id === savedHouseholdId,
        );

        if (savedHousehold) {
          setCurrentHousehold(
            savedHousehold,
          );

          return;
        }
      }

      // Select first household
      if (data.length > 0) {
        setCurrentHousehold(data[0]);

        localStorage.setItem(
          "selectedHouseholdId",
          data[0]._id,
        );
      } else {
        setCurrentHousehold(null);

        localStorage.removeItem(
          "selectedHouseholdId",
        );
      }
    } catch (error) {
      console.error(
        "Failed to fetch households:",
        error,
      );

      setHouseholds([]);
      setCurrentHousehold(null);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // AUTH → HOUSEHOLDS
  // =========================

  useEffect(() => {
    // AuthContext is still checking /auth/me
    if (authLoading) {
      return;
    }

    // User is logged out
    if (!user) {
      setHouseholds([]);
      setCurrentHousehold(null);
      setLoading(false);

      localStorage.removeItem(
        "selectedHouseholdId",
      );

      return;
    }

    // User is authenticated
    fetchHouseholds();
  }, [user, authLoading]);

  // =========================
  // SELECT HOUSEHOLD
  // =========================

  const selectHousehold = (household) => {
    setCurrentHousehold(household);

    if (household?._id) {
      localStorage.setItem(
        "selectedHouseholdId",
        household._id,
      );
    }
  };

  // =========================
  // JOIN HOUSEHOLD SOCKET ROOM
  // =========================

  useEffect(() => {
    if (!currentHousehold) {
      return;
    }

    const householdId =
      currentHousehold._id;

    const joinHousehold = () => {
      console.log(
        "Joining household:",
        householdId,
      );

      socket.emit(
        "join-household",
        householdId,
      );
    };

    if (socket.connected) {
      joinHousehold();
    } else {
      socket.once(
        "connect",
        joinHousehold,
      );
    }

    return () => {
      socket.off(
        "connect",
        joinHousehold,
      );

      if (socket.connected) {
        socket.emit(
          "leave-household",
          householdId,
        );
      }
    };
  }, [currentHousehold]);

  // =========================
  // REAL-TIME NOTIFICATIONS
  // =========================

  useEffect(() => {
    const handleNotification = (
      notification,
    ) => {
      console.log(
        "REAL-TIME NOTIFICATION:",
        notification,
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
  }, []);

  return (
    <HouseholdContext.Provider
      value={{
        households,
        currentHousehold,
        loading,
        selectHousehold,
        fetchHouseholds,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
};

export const useHousehold = () => {
  return useContext(HouseholdContext);
};