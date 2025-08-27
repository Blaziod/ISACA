/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect } from "react";
import { firebaseAuth } from "../utils/firebaseAuth";
import { setAuthUser } from "../utils/firebaseStorage";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = firebaseAuth.onAuthStateChange((user) => {
      setCurrentUser(user);
      // Update the storage service with the current auth user
      setAuthUser(user);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const user = await firebaseAuth.signIn(email, password);
      return { success: true, message: "Login successful", user };
    } catch (error) {
      let message = "Login failed";

      // Handle specific Firebase auth errors
      switch (error.code) {
        case "auth/user-not-found":
          message = "No account found with this email";
          break;
        case "auth/wrong-password":
          message = "Incorrect password";
          break;
        case "auth/invalid-email":
          message = "Invalid email address";
          break;
        case "auth/too-many-requests":
          message = "Too many failed attempts. Please try again later";
          break;
        default:
          message = error.message || "Login failed";
      }

      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email, password, displayName = null) => {
    try {
      setIsLoading(true);
      const user = await firebaseAuth.register(email, password, displayName);
      return { success: true, message: "Registration successful", user };
    } catch (error) {
      let message = "Registration failed";

      // Handle specific Firebase auth errors
      switch (error.code) {
        case "auth/email-already-in-use":
          message = "Email is already registered";
          break;
        case "auth/weak-password":
          message = "Password should be at least 6 characters";
          break;
        case "auth/invalid-email":
          message = "Invalid email address";
          break;
        default:
          message = error.message || "Registration failed";
      }

      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await firebaseAuth.logout();
      return { success: true, message: "Logout successful" };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, message: "Logout failed" };
    }
  };

  const resetPassword = async (email) => {
    try {
      await firebaseAuth.resetPassword(email);
      return { success: true, message: "Password reset email sent" };
    } catch (error) {
      let message = "Password reset failed";

      switch (error.code) {
        case "auth/user-not-found":
          message = "No account found with this email";
          break;
        case "auth/invalid-email":
          message = "Invalid email address";
          break;
        default:
          message = error.message || "Password reset failed";
      }

      return { success: false, message };
    }
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    login,
    register,
    logout,
    resetPassword,
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
