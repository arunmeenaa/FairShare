import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import api from "../services/api";
import { useAuth } from "./AuthContext";

const HouseholdContext = createContext(null);

export const HouseholdProvider = ({ children }) => {
  const {
    user,
    household: authHousehold,
    loading: authLoading,
  } = useAuth();

  const [households, setHouseholds] = useState([]);

  // Start with household from AuthContext if available
  const [currentHousehold, setCurrentHousehold] = useState(
    authHousehold || null
  );

  // Household cannot be considered resolved until auth + household request finish
  const [loading, setLoading] = useState(true);

  const requestIdRef = useRef(0);

  const fetchHouseholds = async (preferredHouseholdId = null) => {
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

      // --------------------------------------------------
      // 1. Preferred household
      // --------------------------------------------------
      if (preferredHouseholdId) {
        const preferredHousehold = data.find(
          (household) =>
            household?._id?.toString() ===
            preferredHouseholdId.toString()
        );

        if (preferredHousehold) {
          setCurrentHousehold(preferredHousehold);

          localStorage.setItem(
            "selectedHouseholdId",
            preferredHousehold._id.toString()
          );

          return data;
        }
      }

      // --------------------------------------------------
      // 2. Previously selected household
      // --------------------------------------------------
      const savedHouseholdId = localStorage.getItem(
        "selectedHouseholdId"
      );

      if (savedHouseholdId) {
        const savedHousehold = data.find(
          (household) =>
            household?._id?.toString() ===
            savedHouseholdId.toString()
        );

        if (savedHousehold) {
          setCurrentHousehold(savedHousehold);
          return data;
        }
      }

      // --------------------------------------------------
      // 3. AuthContext household
      // --------------------------------------------------
      if (authHousehold?._id) {
        const authenticatedHousehold = data.find(
          (household) =>
            household?._id?.toString() ===
            authHousehold._id.toString()
        );

        if (authenticatedHousehold) {
          setCurrentHousehold(authenticatedHousehold);

          localStorage.setItem(
            "selectedHouseholdId",
            authenticatedHousehold._id.toString()
          );

          return data;
        }
      }

      // --------------------------------------------------
      // 4. First available household
      // --------------------------------------------------
      if (data.length > 0) {
        setCurrentHousehold(data[0]);

        if (data[0]?._id) {
          localStorage.setItem(
            "selectedHouseholdId",
            data[0]._id.toString()
          );
        }
      } else {
        setCurrentHousehold(null);
        localStorage.removeItem("selectedHouseholdId");
      }

      return data;
    } catch (error) {
      console.error("Failed to fetch households:", error);

      /*
       * IMPORTANT:
       * Do NOT clear currentHousehold here.
       *
       * If /my-households temporarily fails but /auth/me
       * already told us the user belongs to a household,
       * keep that household instead of showing Create/Join.
       */

      if (requestId === requestIdRef.current) {
        if (authHousehold?._id) {
          setCurrentHousehold(authHousehold);
        }
      }

      return [];
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Auth still being restored
    if (authLoading) {
      setLoading(true);
      return;
    }

    // User is logged out
    if (!user) {
      requestIdRef.current += 1;

      setHouseholds([]);
      setCurrentHousehold(null);
      setLoading(false);

      localStorage.removeItem("selectedHouseholdId");

      return;
    }

    /*
     * Immediately restore household from /auth/me.
     * This prevents currentHousehold from being null
     * during the refresh process.
     */
    if (authHousehold?._id) {
      setCurrentHousehold(authHousehold);
    }

    fetchHouseholds();
  }, [user, authLoading, authHousehold]);

  const selectHousehold = (household) => {
    if (!household) return;

    setCurrentHousehold(household);

    if (household?._id) {
      localStorage.setItem(
        "selectedHouseholdId",
        household._id.toString()
      );
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