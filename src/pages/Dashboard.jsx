/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FaQrcode,
  FaKeyboard,
  FaUsers,
  FaSignInAlt,
  FaChartBar,
  FaClock,
} from "react-icons/fa";
import "./Dashboard.css";

const API_URL = "https://id-code-432903898833.europe-west1.run.app/api/v1";
const STATS_PATH =
  "/event/events/7edc69a2-fa32-43fc-aa9f-d026f434a24e/analytics";

const Dashboard = () => {
  const [stats, setStats] = useState({
    registration_count: 0,
    live_attendance_count: 0,
    no_show_count: 0,
    average_duration: 0, // minutes (per your sample)
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const eventId = localStorage.getItem("eventId");

  // clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // fetch stats
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const params = eventId ? { event_id: eventId } : {};
        const { data } = await axios.get(`${API_URL}${STATS_PATH}`, {
          params,
          signal: controller.signal,
          // headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
        });
        // expected shape:
        // { live_attendance_count, registration_count, no_show_count, average_duration }
        setStats({
          registration_count: Number(data.registration_count || 0),
          live_attendance_count: Number(data.live_attendance_count || 0),
          no_show_count: Number(data.no_show_count || 0),
          average_duration: Number(data.average_duration || 0),
        });
      } catch (e) {
        if (axios.isCancel?.(e)) return;
        const code = e.response?.status
          ? `HTTP ${e.response.status}`
          : e.code || "ERR_NETWORK";
        setError(`Failed to load stats. ${code}`);
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [eventId]);

  const quickActions = [
    {
      title: "QR Scanner",
      description: "Scan QR for check-in/out",
      icon: FaQrcode,
      path: "/scan-in",
      color: "#3498db",
      bgColor: "#e3f2fd",
    },
    {
      title: "Manual Code",
      description: "Enter backup codes",
      icon: FaKeyboard,
      path: "/scan-in",
      color: "#9c27b0",
      bgColor: "#f3e5f5",
    },

    {
      title: "User Lists",
      description: "All registered users",
      icon: FaUsers,
      path: "/registered-list",
      color: "#ff9800",
      bgColor: "#fff3e0",
    },
  ];

  const recentActivities = [
    {
      title: "Live Attendance",
      description: "Currently checked in",
      icon: FaSignInAlt,
      path: "/scan-in",
      count: stats.live_attendance_count,
      color: "#4caf50",
    },
    {
      title: "Registrations",
      description: "Total registered",
      icon: FaUsers,
      path: "/registered-list",
      count: stats.registration_count,
      color: "#3498db",
    },
  ];

  const avgDurationLabel =
    stats.average_duration > 0
      ? `${Math.round(stats.average_duration)} min`
      : "--";

  return (
    <div className="dashboard fade-in">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title">Access IDCODE</h1>
          <p className="dashboard-subtitle">API-driven attendance dashboard</p>
          {error && <p className="error-text">{error}</p>}
          {loading && !error && <p className="muted">Loading…</p>}
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
            <div className="stat-number">{stats.registration_count}</div>
            <div className="stat-label">Total Registered</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: "#4caf50" }}>
            <FaSignInAlt />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.live_attendance_count}</div>
            <div className="stat-label">Live Attendance</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: "#f44336" }}>
            <FaChartBar />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.no_show_count}</div>
            <div className="stat-label">Scanned In</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: "#ff9800" }}>
            <FaChartBar />
          </div>
          <div className="stat-content">
            <div className="stat-number">{avgDurationLabel}</div>
            <div className="stat-label">Avg Duration</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            {quickActions.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link
                  key={i}
                  to={a.path}
                  className="action-card"
                  style={{
                    backgroundColor: a.bgColor,
                    borderLeft: `4px solid ${a.color}`,
                  }}
                >
                  <div className="action-icon" style={{ color: a.color }}>
                    <Icon />
                  </div>
                  <div className="action-content">
                    <h3 className="action-title">{a.title}</h3>
                    <p className="action-description">{a.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activities-grid">
            {recentActivities.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link key={i} to={a.path} className="activity-card">
                  <div className="activity-icon" style={{ color: a.color }}>
                    <Icon />
                  </div>
                  <div className="activity-content">
                    <h3 className="activity-title">{a.title}</h3>
                    <p className="activity-description">{a.description}</p>
                    <div className="activity-count" style={{ color: a.color }}>
                      {a.count} entries
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
