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
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [sortOrder, setSortOrder] = useState("desc");
  const [sortField, setSortField] = useState("timestamp");

  useEffect(() => {
    loadScanOutData();
  }, []);

  useEffect(() => {
    filterAndSortData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanOutList, searchTerm, dateFilter, sortOrder, sortField]);

  const loadScanOutData = () => {
    const data = storage.get(STORAGE_KEYS.SCAN_OUT_LIST, []);
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
    const todayEntries = scanOutList.filter(
      (entry) =>
        new Date(entry.timestamp).toDateString() === today.toDateString()
    );

    // Calculate average duration
    const entriesWithDuration = scanOutList.filter(
      (entry) => entry.duration > 0
    );
    const avgDuration =
      entriesWithDuration.length > 0
        ? Math.round(
            entriesWithDuration.reduce(
              (sum, entry) => sum + entry.duration,
              0
            ) / entriesWithDuration.length
          )
        : 0;

    return {
      total: scanOutList.length,
      today: todayEntries.length,
      thisWeek: scanOutList.filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return entryDate >= weekAgo;
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
    doc.text("Check-Out Report", pageWidth / 2, 20, { align: "center" });

    // Date and stats
    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth / 2, 30, {
      align: "center",
    });
    doc.text(`Total Entries: ${filteredList.length}`, pageWidth / 2, 38, {
      align: "center",
    });
    doc.text(`Filter: ${dateFilter}`, pageWidth / 2, 46, { align: "center" });

    // Table
    const tableData = filteredList.map((entry) => [
      entry.userId,
      entry.name,
      entry.email,
      entry.checkInTime ? formatDateTime(entry.checkInTime) : "--",
      formatDateTime(entry.timestamp),
      formatDuration(entry.duration),
      entry.entryMethod || "QR Code",
    ]);

    doc.autoTable({
      head: [
        [
          "User ID",
          "Name",
          "Email",
          "Check-In",
          "Check-Out",
          "Duration",
          "Method",
        ],
      ],
      body: tableData,
      startY: 55,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [244, 67, 54] },
    });

    doc.save("check-out-report.pdf");
  };

  const exportToCSVFile = () => {
    const headers = [
      "userId",
      "name",
      "email",
      "checkInTime",
      "checkOutTime",
      "duration",
      "entryMethod",
    ];
    const data = filteredList.map((entry) => ({
      userId: entry.userId,
      name: entry.name,
      email: entry.email,
      checkInTime: entry.checkInTime ? formatDateTime(entry.checkInTime) : "--",
      checkOutTime: formatDateTime(entry.timestamp),
      duration: formatDuration(entry.duration),
      entryMethod: entry.entryMethod || "QR Code",
    }));

    exportToCSV(data, headers, "check-out-report.csv");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const stats = getStatistics();

    const printContent = `
      <html>
        <head>
          <title>Check-Out Report</title>
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
            .method-qr { color: #2196f3; font-weight: bold; }
            .method-manual { color: #ff9800; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Check-Out Report</div>
            <div class="info">Generated: ${formatDateTime(new Date())}</div>
            <div class="info">Filter: ${dateFilter}</div>
            <div class="info">Total Entries: ${filteredList.length}</div>
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
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Duration</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              ${filteredList
                .map(
                  (entry) => `
                <tr>
                  <td>${entry.userId}</td>
                  <td>${entry.name}</td>
                  <td>${entry.email}</td>
                  <td>${
                    entry.checkInTime ? formatDateTime(entry.checkInTime) : "--"
                  }</td>
                  <td>${formatDateTime(entry.timestamp)}</td>
                  <td>${formatDuration(entry.duration)}</td>
                  <td class="method-${(entry.entryMethod || "qr")
                    .toLowerCase()
                    .replace(" ", "-")}">${entry.entryMethod || "QR Code"}</td>
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
          {filteredList.length === 0 ? (
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
                      onClick={() => handleSort("checkInTime")}
                    >
                      Check-In Time
                      {sortField === "checkInTime" &&
                        (sortOrder === "asc" ? (
                          <FaSortAlphaDown />
                        ) : (
                          <FaSortAlphaUp />
                        ))}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("timestamp")}
                    >
                      Check-Out Time
                      {sortField === "timestamp" &&
                        (sortOrder === "asc" ? (
                          <FaSortAlphaDown />
                        ) : (
                          <FaSortAlphaUp />
                        ))}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("duration")}
                    >
                      Duration
                      {sortField === "duration" &&
                        (sortOrder === "asc" ? (
                          <FaSortAlphaDown />
                        ) : (
                          <FaSortAlphaUp />
                        ))}
                    </th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((entry) => (
                    <tr key={entry.id}>
                      <td className="entry-id">{entry.userId}</td>
                      <td className="entry-name">{entry.name}</td>
                      <td className="entry-email">{entry.email}</td>
                      <td className="entry-time">
                        {entry.checkInTime ? (
                          <div className="time-info">
                            <div className="time">
                              {formatTime(entry.checkInTime)}
                            </div>
                            <div className="date">
                              {new Date(entry.checkInTime).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="no-data">--</span>
                        )}
                      </td>
                      <td className="entry-time">
                        <div className="time-info">
                          <div className="time">
                            {formatTime(entry.timestamp)}
                          </div>
                          <div className="date">
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="entry-duration">
                        <span
                          className={`duration-badge ${
                            entry.duration > 480
                              ? "long"
                              : entry.duration > 240
                              ? "medium"
                              : "short"
                          }`}
                        >
                          {formatDuration(entry.duration)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`method-badge ${
                            entry.entryMethod === "manual" ? "manual" : "qr"
                          }`}
                        >
                          {entry.entryMethod === "manual"
                            ? "Manual"
                            : "QR Code"}
                        </span>
                      </td>
                    </tr>
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
