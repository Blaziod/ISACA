/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

// Default credentials (in production, these should be environment variables)
const DEFAULT_CREDENTIALS = {
  username: "admin",
  password: "admin123",
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("authToken");
    const loginTime = localStorage.getItem("loginTime");

    if (token && loginTime) {
      // Check if token is still valid (24 hours)
      const now = new Date().getTime();
      const loginTimestamp = parseInt(loginTime);
      const hoursPassed = (now - loginTimestamp) / (1000 * 60 * 60);

      if (hoursPassed < 24) {
        setIsAuthenticated(true);
      } else {
        // Token expired, clear it
        localStorage.removeItem("authToken");
        localStorage.removeItem("loginTime");
      }
    }

    setIsLoading(false);
  }, []);

  const login = (username, password) => {
    if (
      username === DEFAULT_CREDENTIALS.username &&
      password === DEFAULT_CREDENTIALS.password
    ) {
      const token = btoa(`${username}:${password}:${Date.now()}`);
      const loginTime = new Date().getTime().toString();

      localStorage.setItem("authToken", token);
      localStorage.setItem("loginTime", loginTime);
      setIsAuthenticated(true);

      return { success: true, message: "Login successful" };
    } else {
      return { success: false, message: "Invalid username or password" };
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("loginTime");
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    currentUser: isAuthenticated
      ? { username: DEFAULT_CREDENTIALS.username, role: "admin" }
      : null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
