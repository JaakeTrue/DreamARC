import React, { createContext, useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { fetchToken, register as apiRegister, API_BASE } from "../api";

const STORAGE_KEY = "dreamarc.auth";
export const AuthContext = createContext(null);

const LoadingScreen = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", width: "100vw", backgroundColor: "#1a1a1a", color: "white", fontSize: "18px", fontFamily: "Arial, sans-serif" }}>
    <div><div style={{ textAlign: "center", marginBottom: "20px" }}>🦡</div>Loading DreamARC...</div>
  </div>
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkStoredAuth = () => {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEY);
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          // Only set user if the token exists
          if (parsed.access_token) {
            setUser(parsed);
          }
        }
      } catch (err) {
        console.error("Auth hydration failed:", err);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setAuthLoading(false);
      }
    };
    checkStoredAuth();
  }, []);

  const login = async (username, password) => {
    setAuthLoading(true);
    try {
      const userData = await fetchToken(username, password);
      
      if (!userData?.access_token) {
        throw new Error("Login failed: Missing access token from server.");
      }

      // Ensure 'id' is always present for navigation in Welcome.jsx
      const enhancedUser = {
        ...userData,
        id: userData.id || userData.student_id, 
        name: userData.name || username,
        email: userData.email || username,
      };

      setUser(enhancedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enhancedUser));
      toast.success(`Welcome back, ${enhancedUser.name}!`);
      return enhancedUser;
    } catch (err) {
      // Error is caught here and re-thrown to be displayed in Welcome.jsx
      const msg = err.response?.data?.detail || err.message || "Login failed.";
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (username, password, grade) => {
    setAuthLoading(true);
    try {
      // Changed: Matching Welcome.jsx where grade is optional
      const userData = await apiRegister({ 
        username, 
        password, 
        grade: grade || "Not Specified" 
      });
      
      const enhancedUser = {
        ...userData,
        id: userData.id || userData.student_id,
        name: username,
      };

      // Note: If your backend doesn't log the user in immediately after register,
      // you might want to remove these two lines and let them log in manually.
      setUser(enhancedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enhancedUser));
      
      toast.success(`Account created, ${username}!`);
      return enhancedUser;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Registration failed.";
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout, register }}>
      {authLoading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};



