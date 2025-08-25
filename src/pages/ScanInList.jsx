import { useState, useEffect } from "react";
import {
  FaSignInAlt,
  FaSearch,
  FaDownload,
  FaPrint,
  FaClock,
  FaUser,
  FaCalendarAlt,
  FaFilter,
  FaSortAlphaDown,
  FaSortAlphaUp,
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
import "./ScanInList.css";

const ScanInList = () => {
  const [scanInList, setScanInList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [sortOrder, setSortOrder] = useState("desc");
  const [sortField, setSortField] = useState("timestamp");

  useEffect(() => {
    const initializeAndLoad = async () => {
      await storage.initialize();
      loadScanInData();
    };
    initializeAndLoad();
  }, []);

  useEffect(() => {
    filterAndSortData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanInList, searchTerm, dateFilter, sortOrder, sortField]);

  const loadScanInData = async () => {
    const data = await storage.get(STORAGE_KEYS.SCAN_IN_LIST, []);
    setScanInList(data);
  };

  const filterAndSortData = () => {
    let filtered = scanInList.filter((entry) => {
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

      if (sortField === "timestamp") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
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
    const todayEntries = scanInList.filter(
      (entry) =>
        new Date(entry.timestamp).toDateString() === today.toDateString()
    );

    return {
      total: scanInList.length,
      today: todayEntries.length,
      thisWeek: scanInList.filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return entryDate >= weekAgo;
      }).length,
      lastEntry:
        scanInList.length > 0
          ? Math.max(...scanInList.map((entry) => new Date(entry.timestamp)))
          : null,
    };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("Check-In Report", pageWidth / 2, 20, { align: "center" });

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
      formatDateTime(entry.timestamp),
      entry.entryMethod || "QR Code",
    ]);

    doc.autoTable({
      head: [["User ID", "Name", "Email", "Check-In Time", "Method"]],
      body: tableData,
      startY: 55,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [76, 175, 80] },
    });

    doc.save("check-in-report.pdf");
  };

  const exportToCSVFile = () => {
    const headers = ["userId", "name", "email", "timestamp", "entryMethod"];
    const data = filteredList.map((entry) => ({
      userId: entry.userId,
      name: entry.name,
      email: entry.email,
      timestamp: formatDateTime(entry.timestamp),
      entryMethod: entry.entryMethod || "QR Code",
    }));

    exportToCSV(data, headers, "check-in-report.csv");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const stats = getStatistics();

    const printContent = `
      <html>
        <head>
          <title>Check-In Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .info { font-size: 14px; color: #666; margin-bottom: 5px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat { text-align: center; }
            .stat-number { font-size: 20px; font-weight: bold; color: #4caf50; }
            .stat-label { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4caf50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .method-qr { color: #2196f3; font-weight: bold; }
            .method-manual { color: #ff9800; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Check-In Report</div>
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
          </div>
          
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Check-In Time</th>
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
                  <td>${formatDateTime(entry.timestamp)}</td>
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
    <div className="scan-in-list fade-in">
      <div className="container">
        <div className="list-header">
          <div className="header-content">
            <FaSignInAlt className="list-icon" />
            <div>
              <h1 className="list-title">Check-In List</h1>
              <p className="list-subtitle">
                View all check-in entries with timestamps ({filteredList.length}{" "}
                of {scanInList.length})
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
              <FaSignInAlt />
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
            <div className="stat-icon last">
              <FaClock />
            </div>
            <div className="stat-content">
              <div className="stat-number">
                {stats.lastEntry ? formatTime(stats.lastEntry) : "--:--"}
              </div>
              <div className="stat-label">Last Entry</div>
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
              <FaSignInAlt className="empty-icon" />
              <h3>No check-ins found</h3>
              <p>
                {scanInList.length === 0
                  ? "No one has checked in yet."
                  : "No check-ins match your current filters."}
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
                      onClick={() => handleSort("timestamp")}
                    >
                      Check-In Time
                      {sortField === "timestamp" &&
                        (sortOrder === "asc" ? (
                          <FaSortAlphaDown />
                        ) : (
                          <FaSortAlphaUp />
                        ))}
                    </th>
                    <th>Method</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((entry) => {
                    const checkInTime = new Date(entry.timestamp);
                    const now = new Date();
                    const duration = Math.floor(
                      (now - checkInTime) / (1000 * 60)
                    ); // minutes

                    return (
                      <tr key={entry.id}>
                        <td className="entry-id">{entry.userId}</td>
                        <td className="entry-name">{entry.name}</td>
                        <td className="entry-email">{entry.email}</td>
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
                        <td className="entry-duration">
                          {duration < 60
                            ? `${duration}m`
                            : `${Math.floor(duration / 60)}h ${duration % 60}m`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanInList;
