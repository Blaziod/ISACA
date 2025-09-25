/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import {
  FaUsers,
  FaSearch,
  FaDownload,
  FaPrint,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
} from "react-icons/fa";
import "./RegisteredList.css";
import axios from "axios";
import { toast } from "react-toastify";

const RegisteredList = () => {
  const api = axios.create({
    baseURL: "https://id-code-432903898833.europe-west1.run.app/api/v1",
    timeout: 20000,
  });
  const apiUrl = "https://id-code-432903898833.europe-west1.run.app/api/v1/";
  const [raw, setRaw] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const eventId = "7edc69a2-fa32-43fc-aa9f-d026f434a24e";

  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(
          `/event/events/${eventId}/attendees?limit=1000&offset=0`
        );
        setRaw(Array.isArray(data) ? data : []);
      } catch (e) {
        const code = e.response?.status
          ? `HTTP ${e.response.status}`
          : e.code || "ERR_NETWORK";
        if (axios.isCancel?.(e)) return; // unmount
        setError(`Failed to load registrations. ${code}`);
        setRaw([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortField, sortOrder]);

  // Filter + search
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return raw
      .filter((u) => {
        if (
          statusFilter !== "all" &&
          (u.status || "").toLowerCase() !== statusFilter
        ) {
          // Special case: treat "checked_in" if checked_in_at exists and not checked_out_at
          if (statusFilter === "checked_in") {
            const inOnly = !!u.checked_in_at && !u.checked_out_at;
            return inOnly;
          }
          return false;
        }
        if (!s) return true;
        return (
          (u.name || "").toLowerCase().includes(s) ||
          (u.email || "").toLowerCase().includes(s) ||
          (u.grade_level || "").toLowerCase().includes(s) ||
          (u.remark || "").toLowerCase().includes(s) ||
          (u.id || "").toLowerCase().includes(s)
        );
      })
      .sort((a, b) => {
        let av = a[sortField];
        let bv = b[sortField];
        if (sortField.includes("_at")) {
          av = av ? new Date(av).getTime() : 0;
          bv = bv ? new Date(bv).getTime() : 0;
        } else {
          av = (av ?? "").toString().toLowerCase();
          bv = (bv ?? "").toString().toLowerCase();
        }
        if (av < bv) return sortOrder === "asc" ? -1 : 1;
        if (av > bv) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [raw, statusFilter, search, sortField, sortOrder]);

  // Pagination calculations
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedData = filtered.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of table for better UX
      document.querySelector(".table-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Generate pagination buttons
  const generatePaginationNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const pages = [];
    const startPage = Math.max(1, currentPage - delta);
    const endPage = Math.min(totalPages, currentPage + delta);

    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push("...");
      }
    }

    // Add pages around current page
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add last page and ellipsis if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push("...");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const exportCSV = () => {
    // Export all filtered data, not just current page
    const headers = [
      "id",
      "name",
      "email",
      "grade_level",
      "remark",
      "status",
      "checked_in_at",
      "checked_out_at",
      "duration",
      "event_id",
      "qrcode",
      "picture_url",
    ];

    const rows = filtered.map((u) =>
      headers
        .map((h) => {
          let v;
          if (h === "duration") {
            v = calculateDuration(u.checked_in_at, u.checked_out_at) || "";
          } else {
            v = u[h] ?? "";
          }
          const cell =
            typeof v === "string" ? v.replace(/"/g, '""') : String(v);
          return `"${cell}"`;
        })
        .join(",")
    );

    const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "registrations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const printTable = () => {
    // Print all filtered data, not just current page
    const win = window.open("", "_blank");
    const html = `
      <html>
        <head>
          <title>Registrations</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { margin: 0 0 8px; }
            .meta { color: #666; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #4caf50; color: #fff; }
            tr:nth-child(even){ background: #f7f7f7; }
            img { height: 48px; }
            .duration-active { color: #28a745; font-weight: bold; }
            .duration-complete { color: #6c757d; }
          </style>
        </head>
        <body>
          <h1>Registrations</h1>
          <div class="meta">Generated: ${new Date().toLocaleString()} • Total: ${
      filtered.length
    }</div>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Email</th><th>Grade</th><th>Remark</th>
                <th>Status</th><th>Checked In</th><th>Checked Out</th><th>Duration</th><th>QR</th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .map((u) => {
                  const qr = u.qrcode
                    ? `<img src="${u.qrcode}" alt="QR" />`
                    : "";
                  const duration =
                    calculateDuration(u.checked_in_at, u.checked_out_at) || "-";
                  const durationClass =
                    u.checked_in_at && !u.checked_out_at
                      ? "duration-active"
                      : "duration-complete";

                  return `<tr>
                    <td>${u.id || "-"}</td>
                    <td>${u.name || "-"}</td>
                    <td>${u.email || "-"}</td>
                    <td>${u.grade_level || "-"}</td>
                    <td>${u.remark || "-"}</td>
                    <td>${u.status || "-"}</td>
                    <td>${
                      u.checked_in_at
                        ? new Date(u.checked_in_at).toLocaleString()
                        : "-"
                    }</td>
                    <td>${
                      u.checked_out_at
                        ? new Date(u.checked_out_at).toLocaleString()
                        : "-"
                    }</td>
                    <td class="${durationClass}">${duration}</td>
                    <td>${qr}</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>`;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const calculateDuration = (checkedInAt, checkedOutAt) => {
    if (!checkedInAt) return null;

    const checkIn = new Date(checkedInAt);
    const checkOut = checkedOutAt ? new Date(checkedOutAt) : new Date();

    const durationMs = checkOut.getTime() - checkIn.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0 && minutes === 0) {
      return "< 1 min";
    }

    if (hours === 0) {
      return `${minutes}m`;
    }

    if (minutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${minutes}m`;
  };

  const DurationDisplay = ({ checkedInAt, checkedOutAt }) => {
    const duration = calculateDuration(checkedInAt, checkedOutAt);

    if (!duration) {
      return <span className="duration-none">-</span>;
    }

    const isStillCheckedIn = checkedInAt && !checkedOutAt;

    return (
      <span
        className={`duration ${
          isStillCheckedIn ? "duration-active" : "duration-complete"
        }`}
      >
        {duration}
        {isStillCheckedIn && (
          <span className="duration-indicator" title="Currently checked in">
            🟢
          </span>
        )}
      </span>
    );
  };

  function DownloadQrButton({ raw }) {
    const handleDownload = async () => {
      try {
        const response = await axios.get(
          `${apiUrl}event/attendees/${raw.id}/qrcode`,
          {
            responseType: "blob",
          }
        );

        const blob = new Blob([response.data], { type: "image/png" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");

        const contentDisposition = response.headers["content-disposition"];
        let fileName = `${raw?.name || raw?.full_name || "Access"} Qrcode.png`;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?(.+)"?/);
          if (match && match[1]) fileName = match[1];
        }

        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        toast.success("QR Code downloaded successfully!", {
          position: "top-center",
          autoClose: 2000,
          hideProgressBar: true,
          closeOnClick: true,
          style: {
            backgroundColor: "#4CAF50",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "16px",
            fontSize: "14px",
            fontWeight: "bold",
          },
        });
      } catch (error) {
        let errorMessage = "An unexpected error occurred. Please try again.";
        const toastOptions = {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          style: {
            backgroundColor: "#D32F2F",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "16px",
            fontSize: "16px",
            fontWeight: "bold",
          },
        };

        if (error.response && error.response.status === 403) {
          errorMessage =
            "Company not yet verified. Please complete company verification.";
        } else if (error.response && error.response.data) {
          const responseData = error.response.data;

          if (responseData.detail) {
            errorMessage = `${
              responseData.detail.charAt(0).toUpperCase() +
              responseData.detail.slice(1)
            }`;
          } else if (responseData.message) {
            errorMessage = responseData.message;
          } else {
            errorMessage = `${responseData.detail} Please try again.`;
          }
        } else if (error.request) {
          errorMessage =
            "Sorry something went wrong, our engineers are working on it! Please try again later.";
        } else {
          errorMessage = "An error occurred while preparing the request.";
        }

        toast.error(errorMessage, toastOptions);
      }
    };

    return (
      <button
        style={{
          height: "40px",
          border: "1px solid #D1D5DB",
          backgroundColor: "#093",
          color: "#fff",
          borderRadius: "7px",
          width: "100%",
          fontSize: "14px",
          fontWeight: "bold",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
        onClick={handleDownload}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 16L7 11H10V4H14V11H17L12 16ZM5 18V20H19V18H5Z"
            fill="currentColor"
          />
        </svg>
        Download QR Code
      </button>
    );
  }

  function ScanoutButton({ raw }) {
    const ScanoutUser = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("idCodeToken");

        await axios.post(
          `${apiUrl}event/attendance/${raw.id}/checked_out`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        toast.success("User Checked Out Successfully!", {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          style: {
            backgroundColor: "#4CAF50",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "16px",
            fontSize: "16px",
            fontWeight: "bold",
          },
        });

        // Refresh the list after check-out
        const { data } = await api.get(`/event/events/${eventId}/attendees`);
        setRaw(Array.isArray(data) ? data : []);
      } catch (error) {
        let errorMessage = "An unexpected error occurred. Please try again.";
        const toastOptions = {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          style: {
            backgroundColor: "#D32F2F",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "16px",
            fontSize: "16px",
            fontWeight: "bold",
          },
        };

        console.error(
          "Check-out Error Response:",
          error.response?.data || error.message
        );

        if (error.response && error.response.data) {
          const responseData = error.response.data;

          if (responseData.detail && Array.isArray(responseData.detail)) {
            const firstError = responseData.detail[0];
            const field = firstError.loc?.[1] || "Input";
            const msg = firstError.msg || "is invalid";
            errorMessage = `${
              field.charAt(0).toUpperCase() + field.slice(1)
            }: ${msg}`;
          } else if (responseData.message) {
            errorMessage = responseData.message;
          } else {
            errorMessage = `${responseData.detail} Please try again.`;
          }
        } else if (error.request) {
          errorMessage =
            "Sorry something went wrong, our engineers are working on it! Please try again later.";
        } else {
          errorMessage = "An error occurred while preparing the request.";
        }

        toast.error(errorMessage, toastOptions);
      } finally {
        setLoading(false);
      }
    };

    return (
      <button
        style={{
          height: "40px",
          border: "1px solid #D1D5DB",
          backgroundColor: "red",
          color: "#fff",
          borderRadius: "7px",
          width: "100%",
          fontSize: "14px",
          fontWeight: "bold",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
        onClick={ScanoutUser}
      >
        Check Out
      </button>
    );
  }

  // Update the useEffect hook for more responsive scrolling
  useEffect(() => {
    const tableContainer = document.querySelector(".table-container");
    const topScroll = document.querySelector(".top-scroll-container");
    const topScrollContent = document.querySelector(".top-scroll-content");
    const table = document.querySelector(".users-table");

    if (!tableContainer || !topScroll || !topScrollContent || !table) return;

    // Set the scroll content width to match the table width
    const updateScrollWidth = () => {
      const tableWidth = table.scrollWidth;
      topScrollContent.style.width = `${tableWidth}px`;
    };

    // Update scroll width initially and on window resize
    updateScrollWidth();
    window.addEventListener("resize", updateScrollWidth);

    // Sync top scroll with table scroll (immediate, no throttling)
    const handleTableScroll = () => {
      // Use requestAnimationFrame for smooth, immediate updates
      requestAnimationFrame(() => {
        topScroll.scrollLeft = tableContainer.scrollLeft;
      });

      // Update scroll indicators
      const { scrollLeft, scrollWidth, clientWidth } = tableContainer;
      const isScrolledLeft = scrollLeft > 10;
      const isScrolledRight = scrollLeft < scrollWidth - clientWidth - 10;

      tableContainer.classList.toggle("scrolled-left", isScrolledLeft);
      tableContainer.classList.toggle("scrolled-right", isScrolledRight);
      topScroll.classList.toggle("scrolled-left", isScrolledLeft);
      topScroll.classList.toggle("scrolled-right", isScrolledRight);
    };

    // Sync table scroll with top scroll (immediate, no throttling)
    const handleTopScroll = () => {
      // Use requestAnimationFrame for smooth, immediate updates
      requestAnimationFrame(() => {
        tableContainer.scrollLeft = topScroll.scrollLeft;
      });
    };

    // Add event listeners with passive option for better performance
    tableContainer.addEventListener("scroll", handleTableScroll, {
      passive: true,
    });
    topScroll.addEventListener("scroll", handleTopScroll, { passive: true });

    // Initialize scroll indicators
    handleTableScroll();

    // Cleanup
    return () => {
      tableContainer.removeEventListener("scroll", handleTableScroll);
      topScroll.removeEventListener("scroll", handleTopScroll);
      window.removeEventListener("resize", updateScrollWidth);
    };
  }, [filtered.length]);

  return (
    <div className="registered-list fade-in">
      <div className="container">
        <div className="list-header">
          <div className="header-content">
            <FaUsers className="list-icon" />
            <div>
              <h1 className="list-title">Registered Users</h1>
              <p className="list-subtitle">
                {loading
                  ? "Loading…"
                  : error
                  ? "Error"
                  : `${filtered.length} of ${raw.length} users`}
              </p>
            </div>
          </div>

          <div className="header-actions">
            <button className="btn btn-secondary" onClick={printTable}>
              <FaPrint /> Print
            </button>
            <button className="btn btn-success" onClick={exportCSV}>
              <FaDownload /> CSV
            </button>
          </div>
        </div>

        <div className="list-controls">
          <div className="search-section">
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search name, email, grade, remark, ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-group">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All</option>
                <option value="registered">Registered</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="items-per-page" className="filter-label">
                Show:
              </label>
              <select
                id="items-per-page"
                value={itemsPerPage}
                onChange={(e) =>
                  handleItemsPerPageChange(Number(e.target.value))
                }
                className="filter-select"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-section">
          {error ? (
            <div className="empty-state">
              <h3>Failed to load registrations</h3>
            </div>
          ) : loading ? (
            <div className="empty-state">
              <h3>Loading…</h3>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <h3>No users found</h3>
              <p>
                {raw.length === 0
                  ? "No data from API."
                  : "No matches for your query."}
              </p>
            </div>
          ) : (
            <>
              {/* Pagination Info */}
              <div className="pagination-info">
                <span>
                  Showing {startIndex + 1}-{endIndex} of {totalItems} users
                </span>
              </div>

              {/* Top Horizontal Scroll Bar */}
              <div className="top-scroll-wrapper">
                <div className="top-scroll-container">
                  <div className="top-scroll-content"></div>
                </div>
              </div>

              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th className="sortable" onClick={() => handleSort("id")}>
                        ID{" "}
                        {sortField === "id" ? (
                          sortOrder === "asc" ? (
                            <FaSortAlphaDown />
                          ) : (
                            <FaSortAlphaUp />
                          )
                        ) : null}
                      </th>
                      <th
                        className="sortable"
                        onClick={() => handleSort("name")}
                      >
                        Name{" "}
                        {sortField === "name" ? (
                          sortOrder === "asc" ? (
                            <FaSortAlphaDown />
                          ) : (
                            <FaSortAlphaUp />
                          )
                        ) : null}
                      </th>
                      <th
                        className="sortable"
                        onClick={() => handleSort("email")}
                      >
                        Email{" "}
                        {sortField === "email" ? (
                          sortOrder === "asc" ? (
                            <FaSortAlphaDown />
                          ) : (
                            <FaSortAlphaUp />
                          )
                        ) : null}
                      </th>
                      <th
                        className="sortable"
                        onClick={() => handleSort("grade_level")}
                      >
                        Grade{" "}
                        {sortField === "grade_level" ? (
                          sortOrder === "asc" ? (
                            <FaSortAlphaDown />
                          ) : (
                            <FaSortAlphaUp />
                          )
                        ) : null}
                      </th>
                      <th
                        className="sortable"
                        onClick={() => handleSort("checked_in_at")}
                      >
                        Checked In{" "}
                        {sortField === "checked_in_at" ? (
                          sortOrder === "asc" ? (
                            <FaSortAlphaDown />
                          ) : (
                            <FaSortAlphaUp />
                          )
                        ) : null}
                      </th>
                      <th>Checked Out</th>
                      <th>Duration</th>
                      <th>QR</th>
                      <th>Check-Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((u) => (
                      <tr key={u.id}>
                        <td className="user-id">{u.id || "-"}</td>
                        <td className="user-name">{u.name || "-"}</td>
                        <td className="user-email">{u.email || "-"}</td>
                        <td>{u.grade_level || "-"}</td>
                        <td>
                          {u.checked_in_at
                            ? new Date(u.checked_in_at).toLocaleString()
                            : "-"}
                        </td>
                        <td>
                          {u.checked_out_at
                            ? new Date(u.checked_out_at).toLocaleString()
                            : "-"}
                        </td>
                        <td>
                          <DurationDisplay
                            checkedInAt={u.checked_in_at}
                            checkedOutAt={u.checked_out_at}
                          />
                        </td>
                        <td>
                          <DownloadQrButton raw={u} />
                        </td>
                        <td>
                          <ScanoutButton raw={u} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn pagination-btn-nav"
                      onClick={goToFirstPage}
                      disabled={currentPage === 1}
                      title="First page"
                    >
                      <FaAngleDoubleLeft />
                    </button>
                    <button
                      className="pagination-btn pagination-btn-nav"
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      title="Previous page"
                    >
                      <FaChevronLeft />
                    </button>

                    <div className="pagination-numbers">
                      {generatePaginationNumbers().map((page, index) => (
                        <button
                          key={index}
                          className={`pagination-btn ${
                            page === currentPage
                              ? "pagination-btn-active"
                              : page === "..."
                              ? "pagination-ellipsis"
                              : ""
                          }`}
                          onClick={() => page !== "..." && goToPage(page)}
                          disabled={page === "..."}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      className="pagination-btn pagination-btn-nav"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      title="Next page"
                    >
                      <FaChevronRight />
                    </button>
                    <button
                      className="pagination-btn pagination-btn-nav"
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages}
                      title="Last page"
                    >
                      <FaAngleDoubleRight />
                    </button>
                  </div>

                  <div className="pagination-summary">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisteredList;
