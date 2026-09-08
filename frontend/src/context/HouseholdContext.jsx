import { createContext, useContext, useEffect, useRef, useState } from "react";

import api from "../services/api";

import { useAuth } from "./AuthContext";

const HouseholdContext = createContext(null);

export const HouseholdProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  const [households, setHouseholds] = useState([]);
  const [currentHousehold, setCurrentHousehold] = useState(null);
  const [loading, setLoading] = useState(true);

  const requestIdRef = useRef(0);

  const fetchHouseholds = async () => {
    if (!user) {
      setHouseholds([]);
      setCurrentHousehold(null);
      setLoading(false);

      return [];
    }

    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);

      const response = await api.get("/households/my-households");

      const data = Array.isArray(response.data?.households)
        ? response.data.households
        : [];

      // Ignore stale request
      if (requestId !== requestIdRef.current) {
        return data;
      }

      setHouseholds(data);

      const savedHouseholdId = localStorage.getItem("selectedHouseholdId");

      if (savedHouseholdId) {
        const savedHousehold = data.find(
          (household) =>
            household?._id?.toString() === savedHouseholdId.toString(),
        );

        if (savedHousehold) {
          setCurrentHousehold(savedHousehold);

          return data;
        }
      }

      if (data.length > 0) {
        setCurrentHousehold(data[0]);

        if (data[0]?._id) {
          localStorage.setItem("selectedHouseholdId", data[0]._id.toString());
        }
      } else {
        setCurrentHousehold(null);

        localStorage.removeItem("selectedHouseholdId");
      }

      return data;
    } catch (error) {
      console.error("Failed to fetch households:", error);

      if (requestId === requestIdRef.current) {
        setLoading(false);
      }

      return [];
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      // Invalidate pending requests
      requestIdRef.current += 1;

      setHouseholds([]);
      setCurrentHousehold(null);
      setLoading(false);

      localStorage.removeItem("selectedHouseholdId");

      return;
    }

    fetchHouseholds();
  }, [user, authLoading]);

  const selectHousehold = (household) => {
    if (!household) {
      return;
    }

    setCurrentHousehold(household);

    if (household?._id) {
      localStorage.setItem("selectedHouseholdId", household._id.toString());
    }
  };

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
