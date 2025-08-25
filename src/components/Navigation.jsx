import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
} from "react-icons/fa";
import "./Navigation.css";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: "/", icon: FaTachometerAlt, label: "Dashboard" },
    { path: "/scan", icon: FaQrcode, label: "Scan" },
    { path: "/code", icon: FaKeyboard, label: "Code" },
    { path: "/register", icon: FaUserPlus, label: "Register" },
    { path: "/registered-list", icon: FaUsers, label: "Reg List" },
    { path: "/scan-in-list", icon: FaSignInAlt, label: "Scan In List" },
    { path: "/scan-out-list", icon: FaSignOutAlt, label: "Scan Out List" },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
