/* eslint-disable react/prop-types */
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  FaQrcode,
  FaKeyboard,
  FaUserPlus,
  FaUsers,
  FaSignInAlt,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaTachometerAlt,
  FaCloud,
  FaWifi,
  FaExclamationTriangle,
  FaPowerOff,
} from "react-icons/fa";
import "./Navigation.css";

const Navigation = ({ storageStatus }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { logout, currentUser } = useAuth();

  const navItems = [
    { path: "/", icon: FaTachometerAlt, label: "Dashboard" },
    { path: "/scan", icon: FaQrcode, label: "Scan" },
    { path: "/code", icon: FaKeyboard, label: "Code" },
    { path: "/register", icon: FaUserPlus, label: "Register" },
    { path: "/registered-list", icon: FaUsers, label: "Reg List" },
    { path: "/scan-in-list", icon: FaSignInAlt, label: "Scan In List" },
    { path: "/scan-out-list", icon: FaSignOutAlt, label: "Scan Out List" },
  ];

  const getStorageIcon = () => {
    if (!storageStatus) return FaExclamationTriangle;
    if (storageStatus.storageMode === "cloud") return FaCloud;
    if (storageStatus.isOnline) return FaWifi;
    return FaExclamationTriangle;
  };

  const getStorageStatus = () => {
    if (!storageStatus)
      return { text: "Initializing...", className: "warning" };
    if (storageStatus.storageMode === "cloud")
      return { text: "Cloud Storage", className: "success" };
    if (storageStatus.isOnline)
      return { text: "Local Storage", className: "warning" };
    return { text: "Offline Mode", className: "error" };
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/" className="brand-link">
            <FaQrcode className="brand-icon" />
            <span className="brand-text">Access IDCODE</span>
          </Link>
        </div>

        <button className="mobile-toggle" onClick={toggleMenu}>
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={`nav-menu ${isMenuOpen ? "nav-menu-open" : ""}`}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${
                  location.pathname === item.path ? "nav-link-active" : ""
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <IconComponent className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}

          {/* Storage Status Indicator */}
          <div className="storage-status">
            {(() => {
              const status = getStorageStatus();
              const IconComponent = getStorageIcon();
              return (
                <div
                  className={`status-indicator ${status.className}`}
                  title={status.text}
                >
                  <IconComponent className="status-icon" />
                  <span className="status-text">{status.text}</span>
                </div>
              );
            })()}
          </div>

          {/* User Section */}
          <div className="user-section">
            <div className="user-info">
              <span className="username">{currentUser?.username}</span>
            </div>
            <button
              className="logout-button"
              onClick={handleLogout}
              title="Logout"
            >
              <FaPowerOff />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
