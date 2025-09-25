import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  FaKeyboard,
  FaUsers,
  // FaSignInAlt,
  // FaSignOutAlt,
  FaBars,
  FaTimes,
  FaTachometerAlt,
  FaPowerOff,
  FaDatabase,
} from "react-icons/fa";
import "./Navigation.css";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { logout, currentUser } = useAuth();

  const navItems = [
    { path: "/", icon: FaTachometerAlt, label: "Dashboard" },
    { path: "/scan-in", icon: FaKeyboard, label: "ScanIn" },
    { path: "/scan-out", icon: FaKeyboard, label: "ScanOut" },
    { path: "/registered-list", icon: FaUsers, label: "Reg List" },
    // { path: "/scan-in-list", icon: FaSignInAlt, label: "ScanIn List" },
    // { path: "/scan-out-list", icon: FaSignOutAlt, label: "ScanOut List" },
    { path: "/data-management", icon: FaDatabase, label: "Data Mgmt" },
  ];

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
