/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import {
  FaUsers,
  FaSearch,
  FaDownload,
  FaPrint,
  FaSortAlphaDown,
  FaSortAlphaUp,
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
  const [statusFilter, setStatusFilter] = useState("all"); // all | registered | checked_out | checked_in
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name"); // name | email | grade_level | checked_in_at
  const [sortOrder, setSortOrder] = useState("asc"); // asc | desc
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const eventId = "7edc69a2-fa32-43fc-aa9f-d026f434a24e";
  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/event/events/${eventId}/attendees`, {
          // params,
          // signal: controller.signal,
        });
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const exportCSV = () => {
    const headers = [
      "id",
      "name",
      "email",
      "grade_level",
      "remark",
      "status",
      "checked_in_at",
      "checked_out_at",
      "event_id",
      "qrcode",
      "picture_url",
    ];
    const rows = filtered.map((u) =>
      headers
        .map((h) => {
          const v = u[h] ?? "";
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
                <th>Status</th><th>Checked In</th><th>Checked Out</th><th>QR</th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .map((u) => {
                  const qr = u.qrcode
                    ? `<img src="${u.qrcode}" alt="QR" />`
                    : "";
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

  function DownloadQrButton({ raw }) {
    const handleDownload = async () => {
      try {
        const response = await axios.get(
          `${apiUrl}event/attendees/${raw.id}/qrcode`,
          {
            responseType: "blob", // This should be in the config object, not as a second parameter
          }
        );

        // Create blob with correct MIME type
        const blob = new Blob([response.data], { type: "image/png" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");

        const contentDisposition = response.headers["content-disposition"];
        let fileName = `${raw?.name || raw?.full_name || "Access"} Qrcode.png`; // Use 'name' or 'full_name' since that's what you have in your data
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
          height: "40px", // Increased height for better UX
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
                  : `${filtered.length} of ${raw.length}`}
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
                    <th className="sortable" onClick={() => handleSort("name")}>
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
                    <th>Remark</th>
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
                    <th>QR</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id}>
                      <td className="user-id">{u.id || "-"}</td>
                      <td className="user-name">{u.name || "-"}</td>
                      <td className="user-email">{u.email || "-"}</td>
                      <td>{u.grade_level || "-"}</td>
                      <td>{u.remark || "-"}</td>
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
                        <DownloadQrButton raw={u} />
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

export default RegisteredList;
