/* eslint-disable no-unused-vars */
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  FaUser,
  FaLock,
  FaSignInAlt,
  FaEye,
  FaEyeSlash,
  FaQrcode,
  FaUserPlus,
} from "react-icons/fa";
import "./Login.css";

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState("login"); // "login" or "register"
  const { login, register, resetPassword } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (error) {
      setError("");
    }
    if (success) {
      setSuccess("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!credentials.email || !credentials.password) {
      setError("Please enter both email and password");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      let result;
      if (mode === "register") {
        result = await register(credentials.email, credentials.password);
        if (result.success) {
          setSuccess("Registration successful! You can now log in.");
          setMode("login");
          setCredentials({ email: "", password: "" });
        }
      } else {
        result = await login(credentials.email, credentials.password);
      }

      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!credentials.email) {
      setError("Please enter your email address first");
      return;
    }

    try {
      const result = await resetPassword(credentials.email);
      if (result.success) {
        setSuccess("Password reset email sent! Check your inbox.");
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to send password reset email");
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <FaQrcode className="logo-icon" />
            </div>
            <h1 className="login-title">Access IDCODE</h1>
            <p className="login-subtitle">Secure Access Control System</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="success-message">
                <span>{success}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <FaUser className="label-icon" />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={credentials.email}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <FaLock className="label-icon" />
                Password
              </label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  className="form-input password-input"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={
                isLoading || !credentials.email || !credentials.password
              }
            >
              <FaSignInAlt className="button-icon" />
              {isLoading
                ? mode === "register"
                  ? "Creating Account..."
                  : "Signing in..."
                : mode === "register"
                ? "Create Account"
                : "Sign In"}
              {isLoading && <div className="button-spinner"></div>}
            </button>
          </form>

          <div className="login-footer">
            <div className="auth-links">
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                  setSuccess("");
                }}
              >
                {mode === "login"
                  ? "Need an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>

              {mode === "login" && (
                <button
                  type="button"
                  className="link-button"
                  onClick={handleForgotPassword}
                  disabled={!credentials.email}
                >
                  Forgot Password?
                </button>
              )}
            </div>

            <div className="auth-note">
              <p>
                <strong>First Time Setup:</strong>
              </p>
              <p>Create an admin account to secure your database</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
