import { createContext, useContext, useEffect, useState } from "react";

import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);

  const getCurrentUser = async () => {
    try {
      const response = await api.get("/auth/me");

      setUser(response.data.user);
      setHousehold(response.data.household || null);
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
        setHousehold(null);
      } else {
        console.error("Failed to get current user:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    if (response.data.token) {
      localStorage.setItem("fairshare_token", response.data.token);
    }

    setUser(response.data.user);
    setHousehold(response.data.household || null);

    return response.data;
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => ({
      ...prev,
      ...updatedUser,
    }));
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      setHousehold(null);

      localStorage.removeItem("fairshare_token");
      localStorage.removeItem("selectedHouseholdId");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        household,
        loading,
        login,
        logout,
        getCurrentUser,
        updateUser,
        setHousehold,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
