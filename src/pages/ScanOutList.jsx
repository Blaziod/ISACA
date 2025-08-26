import { useState, useEffect } from "react";
import {
  FaSignOutAlt,
  FaSearch,
  FaDownload,
  FaPrint,
  FaUser,
  FaCalendarAlt,
  FaFilter,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaHourglassHalf,
  FaChevronDown,
  FaChevronRight,
  FaClock,
} from "react-icons/fa";
import {
  storage,
  STORAGE_KEYS,
  formatDateTime,
  formatTime,
  exportToCSV,
} from "../utils/storage";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./ScanOutList.css";

const ScanOutList = () => {
  const [scanOutList, setScanOutList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [consolidatedUsers, setConsolidatedUsers] = useState([]);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [sortField, setSortField] = useState("totalDuration");

  useEffect(() => {
    const initializeAndLoad = async () => {
      await storage.initialize();
      loadScanOutData();
    };
    initializeAndLoad();
  }, []);

  useEffect(() => {
    filterAndSortData();
    consolidateUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanOutList, searchTerm, dateFilter, sortOrder, sortField]);

  const loadScanOutData = async () => {
    const data = await storage.get(STORAGE_KEYS.SCAN_OUT_LIST, []);
    setScanOutList(data);
  };

  const filterAndSortData = () => {
    let filtered = scanOutList.filter((entry) => {
      // Search filter
      const matchesSearch =
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.userId.toLowerCase().includes(searchTerm.toLowerCase());

      // Date filter
      const entryDate = new Date(entry.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let matchesDate = true;

      if (dateFilter === "today") {
        matchesDate = entryDate.toDateString() === today.toDateString();
      } else if (dateFilter === "yesterday") {
        matchesDate = entryDate.toDateString() === yesterday.toDateString();
      } else if (dateFilter === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = entryDate >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = entryDate >= monthAgo;
      }

      return matchesSearch && matchesDate;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "timestamp" || sortField === "checkInTime") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortField === "duration") {
        aValue = a.duration || 0;
        bValue = b.duration || 0;
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredList(filtered);
  };

  const consolidateUserData = () => {
    // Group scan-out entries by user
    const userGroups = {};

    filteredList.forEach((entry) => {
      const userKey = entry.userId;

      if (!userGroups[userKey]) {
        userGroups[userKey] = {
          userId: entry.userId,
          name: entry.name,
          email: entry.email,
          sessions: [],
          totalDuration: 0,
          sessionCount: 0,
          lastCheckOut: entry.timestamp,
          firstCheckIn: entry.checkInTime || entry.timestamp,
        };
      }

      userGroups[userKey].sessions.push({
        checkInTime: entry.checkInTime,
        checkOutTime: entry.timestamp,
        duration: entry.duration || 0,
        entryMethod: entry.entryMethod || "QR Code",
        id: entry.id,
      });

      userGroups[userKey].totalDuration += entry.duration || 0;
      userGroups[userKey].sessionCount++;

      // Update last checkout time
      if (
        new Date(entry.timestamp) > new Date(userGroups[userKey].lastCheckOut)
      ) {
        userGroups[userKey].lastCheckOut = entry.timestamp;
      }

      // Update first check-in time
      if (
        entry.checkInTime &&
        new Date(entry.checkInTime) < new Date(userGroups[userKey].firstCheckIn)
      ) {
        userGroups[userKey].firstCheckIn = entry.checkInTime;
      }
    });

    // Convert to array and sort sessions by time
    const consolidated = Object.values(userGroups).map((user) => ({
      ...user,
      sessions: user.sessions.sort(
        (a, b) =>
          new Date(a.checkInTime || a.checkOutTime) -
          new Date(b.checkInTime || b.checkOutTime)
      ),
    }));

    // Sort consolidated users
    consolidated.sort((a, b) => {
      let aValue = a[sortField] || a.totalDuration;
      let bValue = b[sortField] || b.totalDuration;

      if (sortField === "lastCheckOut" || sortField === "firstCheckIn") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (
        sortField === "totalDuration" ||
        sortField === "sessionCount"
      ) {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setConsolidatedUsers(consolidated);
  };

  const toggleUserExpansion = (userId) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getStatistics = () => {
    const today = new Date();

    // Calculate average duration for consolidated users
    const totalUsersWithDuration = consolidatedUsers.filter(
      (user) => user.totalDuration > 0
    );
    const avgDuration =
      totalUsersWithDuration.length > 0
        ? Math.round(
            totalUsersWithDuration.reduce(
              (sum, user) => sum + user.totalDuration,
              0
            ) / totalUsersWithDuration.length
          )
        : 0;

    // Calculate total sessions today
    const todayUsers = consolidatedUsers.filter((user) =>
      user.sessions.some(
        (session) =>
          new Date(session.checkOutTime).toDateString() === today.toDateString()
      )
    );

    return {
      total: consolidatedUsers.length,
      today: todayUsers.length,
      thisWeek: consolidatedUsers.filter((user) => {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return user.sessions.some(
          (session) => new Date(session.checkOutTime) >= weekAgo
        );
      }).length,
      avgDuration: avgDuration,
      lastEntry:
        scanOutList.length > 0
          ? Math.max(...scanOutList.map((entry) => new Date(entry.timestamp)))
          : null,
    };
  };

  const formatDuration = (minutes) => {
    if (!minutes || minutes <= 0) return "--";

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("Check-Out Report (Consolidated)", pageWidth / 2, 20, {
      align: "center",
    });

    // Date and stats
    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth / 2, 30, {
      align: "center",
    });
    doc.text(`Total Users: ${consolidatedUsers.length}`, pageWidth / 2, 38, {
      align: "center",
    });
    doc.text(`Filter: ${dateFilter}`, pageWidth / 2, 46, { align: "center" });

    // Table with consolidated data
    const tableData = consolidatedUsers.map((user) => [
      user.userId,
      user.name,
      user.email,
      user.sessionCount.toString(),
      formatDuration(user.totalDuration),
      formatDateTime(user.lastCheckOut),
    ]);

    doc.autoTable({
      head: [
        [
          "User ID",
          "Name",
          "Email",
          "Sessions",
          "Total Duration",
          "Last Check-Out",
        ],
      ],
      body: tableData,
      startY: 55,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [244, 67, 54] },
      columnStyles: {
        3: { halign: "center" }, // Sessions column centered
        4: { halign: "center" }, // Duration column centered
      },
    });

    doc.save("check-out-report-consolidated.pdf");
  };

  const exportToCSVFile = () => {
    const data = consolidatedUsers.map((user) => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      sessionCount: user.sessionCount,
      totalDuration: formatDuration(user.totalDuration),
      lastCheckOut: formatDateTime(user.lastCheckOut),
      firstCheckIn: formatDateTime(user.firstCheckIn),
    }));

    exportToCSV(data, "check-out-report-consolidated.csv");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const stats = getStatistics();

    const printContent = `
      <html>
        <head>
          <title>Check-Out Report (Consolidated)</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .info { font-size: 14px; color: #666; margin-bottom: 5px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat { text-align: center; }
            .stat-number { font-size: 20px; font-weight: bold; color: #f44336; }
            .stat-label { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f44336; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .count-badge { 
              background-color: #2196f3; 
              color: white; 
              padding: 2px 8px; 
              border-radius: 12px; 
              font-size: 12px; 
              font-weight: bold; 
            }
            .duration-badge { 
              padding: 4px 8px; 
              border-radius: 4px; 
              font-weight: bold; 
              color: white;
            }
            .duration-badge.short { background-color: #4caf50; }
            .duration-badge.medium { background-color: #ff9800; }
            .duration-badge.long { background-color: #f44336; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Check-Out Report (Consolidated View)</div>
            <div class="info">Generated: ${formatDateTime(new Date())}</div>
            <div class="info">Filter: ${dateFilter}</div>
            <div class="info">Total Users: ${consolidatedUsers.length}</div>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-number">${stats.today}</div>
              <div class="stat-label">Today</div>
            </div>
            <div class="stat">
              <div class="stat-number">${stats.thisWeek}</div>
              <div class="stat-label">This Week</div>
            </div>
            <div class="stat">
              <div class="stat-number">${stats.total}</div>
              <div class="stat-label">Total</div>
            </div>
            <div class="stat">
              <div class="stat-number">${formatDuration(
                stats.avgDuration
              )}</div>
              <div class="stat-label">Avg Duration</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th class="center">Sessions</th>
                <th class="center">Total Duration</th>
                <th>Last Check-Out</th>
              </tr>
            </thead>
            <tbody>
              ${consolidatedUsers
                .map(
                  (user) => `
                <tr>
                  <td>${user.userId}</td>
                  <td>${user.name}</td>
                  <td>${user.email}</td>
                  <td class="center">
                    <span class="count-badge">${user.sessionCount}</span>
                  </td>
                  <td class="center">
                    <span class="duration-badge ${
                      user.totalDuration > 480
                        ? "long"
                        : user.totalDuration > 240
                        ? "medium"
                        : "short"
                    }">${formatDuration(user.totalDuration)}</span>
                  </td>
                  <td>${formatDateTime(user.lastCheckOut)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const stats = getStatistics();

  return (
    <div className="scan-out-list fade-in">
      <div className="container">
        <div className="list-header">
          <div className="header-content">
            <FaSignOutAlt className="list-icon" />
            <div>
              <h1 className="list-title">Check-Out List</h1>
              <p className="list-subtitle">
                View all check-out entries with duration tracking (
                {filteredList.length} of {scanOutList.length})
              </p>
            </div>
          </div>

          <div className="header-actions">
            <button className="btn btn-secondary" onClick={handlePrint}>
              <FaPrint />
              Print
            </button>
            <button className="btn btn-primary" onClick={exportToPDF}>
              <FaDownload />
              PDF
            </button>
            <button className="btn btn-success" onClick={exportToCSVFile}>
              <FaDownload />
              CSV
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-icon today">
              <FaCalendarAlt />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.today}</div>
              <div className="stat-label">Today</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon week">
              <FaSignOutAlt />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.thisWeek}</div>
              <div className="stat-label">This Week</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon total">
              <FaUser />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon avg-duration">
              <FaHourglassHalf />
            </div>
            <div className="stat-content">
              <div className="stat-number">
                {formatDuration(stats.avgDuration)}
              </div>
              <div className="stat-label">Avg Duration</div>
            </div>
          </div>
        </div>

        <div className="list-controls">
          <div className="search-section">
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email, or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-group">
              <FaFilter className="filter-icon" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="filter-select"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-section">
          {consolidatedUsers.length === 0 ? (
            <div className="empty-state">
              <FaSignOutAlt className="empty-icon" />
              <h3>No check-outs found</h3>
              <p>
                {scanOutList.length === 0
                  ? "No one has checked out yet."
                  : "No check-outs match your current filters."}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="entries-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>Sessions</th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("userId")}
                    >
                      User ID
                      {sortField === "userId" &&
                        (sortOrder === "asc" ? (
                          <FaSortAlphaDown />
                        ) : (
                          <FaSortAlphaUp />
                        ))}
                    </th>
                    <th className="sortable" onClick={() => handleSort("name")}>
                      Name
                      {sortField === "name" &&
                        (sortOrder === "asc" ? (
                          <FaSortAlphaDown />
                        ) : (
                          <FaSortAlphaUp />
                        ))}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("email")}
                    >
                      Email
                      {sortField === "email" &&
                        (sortOrder === "asc" ? (
                          <FaSortAlphaDown />
                        ) : (
                          <FaSortAlphaUp />
                        ))}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("sessionCount")}
                    >
                      Sessions
                      {sortField === "sessionCount" &&
                        (sortOrder === "asc" ? (
                          <FaSortAlphaDown />
                        ) : (
                          <FaSortAlphaUp />
                        ))}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("totalDuration")}
                    >
                      Total Duration
                      {sortField === "totalDuration" &&
                        (sortOrder === "asc" ? (
                          <FaSortAlphaDown />
                        ) : (
                          <FaSortAlphaUp />
                        ))}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("lastCheckOut")}
                    >
                      Last Check-Out
                      {sortField === "lastCheckOut" &&
                        (sortOrder === "asc" ? (
                          <FaSortAlphaDown />
                        ) : (
                          <FaSortAlphaUp />
                        ))}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {consolidatedUsers.map((user) => (
                    <>
                      <tr key={user.userId} className="user-row">
                        <td className="expand-cell">
                          <button
                            className="expand-button"
                            onClick={() => toggleUserExpansion(user.userId)}
                            title={`${
                              expandedUsers.has(user.userId) ? "Hide" : "Show"
                            } session details`}
                          >
                            {expandedUsers.has(user.userId) ? (
                              <FaChevronDown />
                            ) : (
                              <FaChevronRight />
                            )}
                          </button>
                        </td>
                        <td className="entry-id">{user.userId}</td>
                        <td className="entry-name">{user.name}</td>
                        <td className="entry-email">{user.email}</td>
                        <td className="session-count">
                          <span className="count-badge">
                            {user.sessionCount}
                          </span>
                        </td>
                        <td className="entry-duration">
                          <span
                            className={`duration-badge total ${
                              user.totalDuration > 480
                                ? "long"
                                : user.totalDuration > 240
                                ? "medium"
                                : "short"
                            }`}
                          >
                            {formatDuration(user.totalDuration)}
                          </span>
                        </td>
                        <td className="entry-time">
                          <div className="time-info">
                            <div className="time">
                              {formatTime(user.lastCheckOut)}
                            </div>
                            <div className="date">
                              {new Date(user.lastCheckOut).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {expandedUsers.has(user.userId) && (
                        <tr
                          key={`${user.userId}-details`}
                          className="session-details-row"
                        >
                          <td colSpan="7" className="session-details-cell">
                            <div className="session-details">
                              <div className="session-header">
                                <FaClock className="session-icon" />
                                <h4>Session Details</h4>
                              </div>
                              <div className="sessions-list">
                                {user.sessions.map((session, index) => (
                                  <div
                                    key={session.id || index}
                                    className="session-item"
                                  >
                                    <div className="session-number">
                                      #{index + 1}
                                    </div>
                                    <div className="session-times">
                                      <div className="session-time">
                                        <span className="time-label">
                                          Check-In:
                                        </span>
                                        <span className="time-value">
                                          {session.checkInTime
                                            ? formatDateTime(
                                                session.checkInTime
                                              )
                                            : "--"}
                                        </span>
                                      </div>
                                      <div className="session-time">
                                        <span className="time-label">
                                          Check-Out:
                                        </span>
                                        <span className="time-value">
                                          {formatDateTime(session.checkOutTime)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="session-duration">
                                      <span
                                        className={`duration-badge ${
                                          session.duration > 480
                                            ? "long"
                                            : session.duration > 240
                                            ? "medium"
                                            : "short"
                                        }`}
                                      >
                                        {formatDuration(session.duration)}
                                      </span>
                                    </div>
                                    <div className="session-method">
                                      <span
                                        className={`method-badge ${
                                          session.entryMethod === "manual"
                                            ? "manual"
                                            : "qr"
                                        }`}
                                      >
                                        {session.entryMethod === "manual"
                                          ? "Manual"
                                          : "QR Code"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanOutList;
