import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaQrcode,
  FaKeyboard,
  FaUserPlus,
  FaUsers,
  FaSignInAlt,
  FaSignOutAlt,
  FaChartBar,
  FaClock,
} from "react-icons/fa";
import {
  storage,
  STORAGE_KEYS,
  getStorageStatus,
  verifyDataIntegrity,
  syncData,
} from "../utils/storage";
import "./Dashboard.css";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalRegistered: 0,
    checkedIn: 0,
    checkedOut: 0,
    lastActivity: null,
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [storageHealth, setStorageHealth] = useState(null);
  const [isRepairing, setIsRepairing] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        await storage.initialize();
        const registered = await storage.get(STORAGE_KEYS.REGISTERED_USERS);
        const scanInList = await storage.get(STORAGE_KEYS.SCAN_IN_LIST);
        const scanOutList = await storage.get(STORAGE_KEYS.SCAN_OUT_LIST);

        setStats({
          totalRegistered: registered.length,
          checkedIn: scanInList.length,
          checkedOut: scanOutList.length,
          lastActivity:
            scanInList.length > 0 || scanOutList.length > 0
              ? new Date(
                  Math.max(
                    scanInList.length > 0
                      ? new Date(scanInList[scanInList.length - 1].timestamp)
                      : 0,
                    scanOutList.length > 0
                      ? new Date(scanOutList[scanOutList.length - 1].timestamp)
                      : 0
                  )
                )
              : null,
        });

        // Check storage health
        const health = getStorageStatus();
        setStorageHealth(health);

        // Log health status for debugging
        console.log("📊 Storage Health:", health);
      } catch (error) {
        console.error("Error loading dashboard stats:", error);
      }
    };

    loadStats();

    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRepairStorage = async () => {
    setIsRepairing(true);
    try {
      console.log("🔧 Starting storage repair...");

      // Verify and repair data integrity
      await verifyDataIntegrity();

      // Force sync with Firebase
      await syncData();

      // Refresh health status
      const health = getStorageStatus();
      setStorageHealth(health);

      console.log("✅ Storage repair completed");
      alert("Storage repair completed successfully!");
    } catch (error) {
      console.error("❌ Storage repair failed:", error);
      alert("Storage repair failed. Check console for details.");
    } finally {
      setIsRepairing(false);
    }
  };

  const quickActions = [
    {
      title: "QR Scanner",
      description: "Scan QR codes for quick check-in/out",
      icon: FaQrcode,
      path: "/scan",
      color: "#3498db",
      bgColor: "#e3f2fd",
    },
    {
      title: "Manual Code",
      description: "Enter backup codes manually",
      icon: FaKeyboard,
      path: "/code",
      color: "#9c27b0",
      bgColor: "#f3e5f5",
    },
    {
      title: "Register User",
      description: "Add new users to the system",
      icon: FaUserPlus,
      path: "/register",
      color: "#4caf50",
      bgColor: "#e8f5e8",
    },
    {
      title: "User Lists",
      description: "View all registered users",
      icon: FaUsers,
      path: "/registered-list",
      color: "#ff9800",
      bgColor: "#fff3e0",
    },
  ];

  const recentActivities = [
    {
      title: "Scan In List",
      description: "View who has checked in today",
      icon: FaSignInAlt,
      path: "/scan-in-list",
      count: stats.checkedIn,
      color: "#4caf50",
    },
    {
      title: "Scan Out List",
      description: "View who has checked out",
      icon: FaSignOutAlt,
      path: "/scan-out-list",
      count: stats.checkedOut,
      color: "#f44336",
    },
  ];

  return (
    <div className="dashboard fade-in">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title">Welcome to Access IDCODE</h1>
          <p className="dashboard-subtitle">
            Manage access control and attendance tracking efficiently
          </p>
        </div>
        <div className="time-section">
          <FaClock className="clock-icon" />
          <div className="time-display">
            <div className="current-time">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="current-date">
              {currentTime.toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ color: "#3498db" }}>
            <FaUsers />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalRegistered}</div>
            <div className="stat-label">Total Registered</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: "#4caf50" }}>
            <FaSignInAlt />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.checkedIn}</div>
            <div className="stat-label">Checked In</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: "#f44336" }}>
            <FaSignOutAlt />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.checkedOut}</div>
            <div className="stat-label">Checked Out</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: "#ff9800" }}>
            <FaChartBar />
          </div>
          <div className="stat-content">
            <div className="stat-number">
              {stats.lastActivity
                ? stats.lastActivity.toLocaleTimeString()
                : "--:--"}
            </div>
            <div className="stat-label">Last Activity</div>
          </div>
        </div>
      </div>

      {/* Storage Health Indicator */}
      {storageHealth && (
        <div className="storage-health-section">
          <div className="storage-health-card">
            <div className="storage-health-header">
              <h3>Storage Health</h3>
              <div
                className={`status-indicator ${
                  storageHealth.firebaseAvailable && storageHealth.isOnline
                    ? "healthy"
                    : "warning"
                }`}
              >
                {storageHealth.firebaseAvailable && storageHealth.isOnline
                  ? "🟢 Healthy"
                  : "🟡 Issues Detected"}
              </div>
            </div>
            <div className="storage-health-details">
              <div className="health-item">
                <span>
                  Firebase:{" "}
                  {storageHealth.firebaseAvailable
                    ? "✅ Available"
                    : "❌ Unavailable"}
                </span>
              </div>
              <div className="health-item">
                <span>
                  Online:{" "}
                  {storageHealth.isOnline ? "✅ Connected" : "❌ Offline"}
                </span>
              </div>
              <div className="health-item">
                <span>Storage Mode: Firebase Direct</span>
              </div>
              {storageHealth.pendingOperations > 0 && (
                <div className="health-item warning">
                  <span>
                    ⚠️ Active operations: {storageHealth.pendingOperations}
                  </span>
                </div>
              )}
            </div>
            {!storageHealth.firebaseAvailable && (
              <button
                className="repair-button"
                onClick={handleRepairStorage}
                disabled={isRepairing}
              >
                {isRepairing ? "🔧 Repairing..." : "🔧 Repair Storage"}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="dashboard-content">
        <div className="section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <Link
                  key={index}
                  to={action.path}
                  className="action-card"
                  style={{
                    backgroundColor: action.bgColor,
                    borderLeft: `4px solid ${action.color}`,
                  }}
                >
                  <div className="action-icon" style={{ color: action.color }}>
                    <IconComponent />
                  </div>
                  <div className="action-content">
                    <h3 className="action-title">{action.title}</h3>
                    <p className="action-description">{action.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activities-grid">
            {recentActivities.map((activity, index) => {
              const IconComponent = activity.icon;
              return (
                <Link key={index} to={activity.path} className="activity-card">
                  <div
                    className="activity-icon"
                    style={{ color: activity.color }}
                  >
                    <IconComponent />
                  </div>
                  <div className="activity-content">
                    <h3 className="activity-title">{activity.title}</h3>
                    <p className="activity-description">
                      {activity.description}
                    </p>
                    <div
                      className="activity-count"
                      style={{ color: activity.color }}
                    >
                      {activity.count} entries
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
