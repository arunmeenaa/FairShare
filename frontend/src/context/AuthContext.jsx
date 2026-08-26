import { createContext, useContext, useEffect, useState } from "react";

import api from "../services/api";
import socket from "../services/socket";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getCurrentUser = async () => {
    try {
      const response = await api.get("/auth/me");

      setUser(response.data.user);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error("Failed to get current user:", error);
      }

      setUser(null);
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

    setUser(response.data.user);

    return response.data;
  };

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (socket.connected) {
        socket.disconnect();
      }

      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const joinUser = () => {
      console.log("Joining user room:", user._id);

      socket.emit("join-user", user._id);
    };

    if (socket.connected) {
      joinUser();
    } else {
      socket.once("connect", joinUser);
    }

    return () => {
      socket.off("connect", joinUser);
    };
  }, [user, loading]);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);

      // Clear selected household
      localStorage.removeItem("selectedHouseholdId");

      // Disconnect socket
      if (socket.connected) {
        socket.disconnect();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        getCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
