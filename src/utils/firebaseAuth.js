import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

class FirebaseAuthService {
  constructor() {
    this.currentUser = null;
    this.authStateCallbacks = [];

    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.authStateCallbacks.forEach((callback) => callback(user));
    });
  }

  // Register new user
  async register(email, password, displayName = null) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Update display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName,
        });
      }

      console.log(
        "✅ User registered successfully:",
        userCredential.user.email
      );
      return userCredential.user;
    } catch (error) {
      console.error("❌ Registration failed:", error);
      throw error;
    }
  }

  // Sign in existing user
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("✅ User signed in successfully:", userCredential.user.email);
      return userCredential.user;
    } catch (error) {
      console.error("❌ Sign in failed:", error);
      throw error;
    }
  }

  // Sign out current user
  async logout() {
    try {
      await signOut(auth);
      console.log("✅ User signed out successfully");
    } catch (error) {
      console.error("❌ Sign out failed:", error);
      throw error;
    }
  }

  // Send password reset email
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("✅ Password reset email sent");
    } catch (error) {
      console.error("❌ Password reset failed:", error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback) {
    this.authStateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.authStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1);
      }
    };
  }

  // Get auth token for database rules
  async getAuthToken() {
    if (this.currentUser) {
      return await this.currentUser.getIdToken();
    }
    return null;
  }
}

// Create and export singleton instance
export const firebaseAuth = new FirebaseAuthService();
export default firebaseAuth;
