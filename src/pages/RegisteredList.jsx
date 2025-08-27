import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  sendWelcomeEmail,
  validateEmailConfig,
  initEmailJS,
} from "../utils/emailService";
import { storage, STORAGE_KEYS } from "../utils/storage";
import {
  FaUsers,
  FaSearch,
  FaDownload,
  FaPrint,
  FaEdit,
  FaTrash,
  FaUserCheck,
  FaUserTimes,
  FaFilter,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaQrcode,
  FaEnvelope,
} from "react-icons/fa";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./RegisteredList.css";

const RegisteredList = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("name");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEmailConfigured, setIsEmailConfigured] = useState(false);

  useEffect(() => {
    loadUsers();
    // Initialize EmailJS
    initEmailJS();
    const emailConfig = validateEmailConfig();
    setIsEmailConfigured(emailConfig.isConfigured);
  }, []);

  useEffect(() => {
    filterAndSortUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchTerm, filterStatus, sortOrder, sortField]);

  const loadUsers = async () => {
    try {
      await storage.initialize();
      const registeredUsers = await storage.get(STORAGE_KEYS.REGISTERED_USERS);
      setUsers(registeredUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      // Fallback to empty array
      setUsers([]);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterStatus === "all" || user.status === filterStatus;

      return matchesSearch && matchesFilter;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "registeredAt") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredUsers(filtered);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((user) => user.id));
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleEditUser = (user) => {
    setUserToEdit(user);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      isacaId: user.isacaId || "",
      participationCategory: user.participationCategory || "",
      organisation: user.organisation || "",
      designation: user.designation || "",
      backupCode: user.backupCode || "",
      notes: user.notes || "",
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (editErrors[name]) {
      setEditErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateEditForm = () => {
    const newErrors = {};

    if (!editFormData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!editFormData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(editFormData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!editFormData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[+]?[\d\s\-()]+$/.test(editFormData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    // Check for duplicate email/phone (excluding current user)
    const emailExists = users.some(
      (u) => u.id !== userToEdit.id && u.email === editFormData.email.trim()
    );
    const phoneExists = users.some(
      (u) => u.id !== userToEdit.id && u.phone === editFormData.phone.trim()
    );

    if (emailExists) {
      newErrors.email = "Email already exists for another user";
    }
    if (phoneExists) {
      newErrors.phone = "Phone number already exists for another user";
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateUser = async () => {
    if (!validateEditForm()) {
      return;
    }

    setIsUpdating(true);

    try {
      // Create updated user object
      const updatedUser = {
        ...userToEdit,
        ...editFormData,
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
        name: editFormData.name.trim(),
        updatedAt: new Date().toISOString(),
      };

      // Update users list
      const updatedUsers = users.map((user) =>
        user.id === userToEdit.id ? updatedUser : user
      );

      await storage.set(STORAGE_KEYS.REGISTERED_USERS, updatedUsers);
      setUsers(updatedUsers);

      // Update scan lists if name or email changed
      if (
        userToEdit.name !== updatedUser.name ||
        userToEdit.email !== updatedUser.email
      ) {
        const [scanInList, scanOutList] = await Promise.all([
          storage.get(STORAGE_KEYS.SCAN_IN_LIST, []),
          storage.get(STORAGE_KEYS.SCAN_OUT_LIST, []),
        ]);

        // Update scan-in list
        const updatedScanInList = scanInList.map((entry) =>
          entry.userId === userToEdit.id
            ? { ...entry, name: updatedUser.name, email: updatedUser.email }
            : entry
        );

        // Update scan-out list
        const updatedScanOutList = scanOutList.map((entry) =>
          entry.userId === userToEdit.id
            ? { ...entry, name: updatedUser.name, email: updatedUser.email }
            : entry
        );

        await Promise.all([
          storage.set(STORAGE_KEYS.SCAN_IN_LIST, updatedScanInList),
          storage.set(STORAGE_KEYS.SCAN_OUT_LIST, updatedScanOutList),
        ]);
      }

      // Close modal and reset state
      setShowEditModal(false);
      setUserToEdit(null);
      setEditFormData({});
      setEditErrors({});
    } catch (error) {
      console.error("Error updating user:", error);
      setEditErrors({
        submit: "Failed to update user. Please try again.",
      });
    }

    setIsUpdating(false);
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setUserToEdit(null);
    setEditFormData({});
    setEditErrors({});
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      const updatedUsers = users.filter((user) => user.id !== userToDelete.id);
      setUsers(updatedUsers);
      await storage.set(STORAGE_KEYS.REGISTERED_USERS, updatedUsers);

      // Also remove from scan lists
      const scanInList = await storage.get(STORAGE_KEYS.SCAN_IN_LIST);
      const scanOutList = await storage.get(STORAGE_KEYS.SCAN_OUT_LIST);

      const updatedScanInList = scanInList.filter(
        (entry) => entry.userId !== userToDelete.id
      );
      const updatedScanOutList = scanOutList.filter(
        (entry) => entry.userId !== userToDelete.id
      );

      await storage.set(STORAGE_KEYS.SCAN_IN_LIST, updatedScanInList);
      await storage.set(STORAGE_KEYS.SCAN_OUT_LIST, updatedScanOutList);
    }

    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleStatusChange = async (userId, newStatus) => {
    const updatedUsers = users.map((user) =>
      user.id === userId ? { ...user, status: newStatus } : user
    );
    setUsers(updatedUsers);
    await storage.set(STORAGE_KEYS.REGISTERED_USERS, updatedUsers);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("Registered Users Report", pageWidth / 2, 20, { align: "center" });

    // Date
    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      30,
      { align: "center" }
    );
    doc.text(`Total Users: ${filteredUsers.length}`, pageWidth / 2, 38, {
      align: "center",
    });

    // Table
    const tableData = filteredUsers.map((user) => [
      user.id,
      user.name,
      user.email,
      user.phone,
      user.organisation || "-",
      user.status,
      new Date(user.registeredAt).toLocaleDateString(),
    ]);

    doc.autoTable({
      head: [
        [
          "ID",
          "Name",
          "Email",
          "Phone",
          "Organisation",
          "Status",
          "Registered",
        ],
      ],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [76, 175, 80] },
    });

    doc.save("registered-users.pdf");
  };

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Name",
      "Email",
      "Phone",
      "Department",
      "Status",
      "Backup Code",
      "Registered Date",
    ];
    const csvData = [
      headers.join(","),
      ...filteredUsers.map((user) =>
        [
          user.id,
          `"${user.name}"`,
          user.email,
          user.phone,
          `"${user.organisation || ""}"`,
          user.status,
          user.backupCode,
          new Date(user.registeredAt).toLocaleDateString(),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "registered-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const printContent = `
      <html>
        <head>
          <title>Registered Users Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .info { font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4caf50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .status-active { color: #4caf50; font-weight: bold; }
            .status-inactive { color: #f44336; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Registered Users Report</div>
            <div class="info">Generated: ${new Date().toLocaleDateString()}</div>
            <div class="info">Total Users: ${filteredUsers.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Organisation</th>
                <th>Status</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              ${filteredUsers
                .map(
                  (user) => `
                <tr>
                  <td>${user.id}</td>
                  <td>${user.name}</td>
                  <td>${user.email}</td>
                  <td>${user.phone}</td>
                  <td>${user.organisation || "-"}</td>
                  <td class="status-${user.status}">${user.status}</td>
                  <td>${new Date(user.registeredAt).toLocaleDateString()}</td>
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

  const downloadUserQR = (user) => {
    if (!user.qrCode) return;

    const link = document.createElement("a");
    link.download = `${user.name.replace(/\s+/g, "_")}_QR_Code.png`;
    link.href = user.qrCode;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateQRForUser = async (user) => {
    try {
      const qrData = JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
      });

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Update user with QR code
      const updatedUsers = users.map((u) =>
        u.id === user.id ? { ...u, qrCode: qrCodeDataURL } : u
      );

      setUsers(updatedUsers);
      await storage.set(STORAGE_KEYS.REGISTERED_USERS, updatedUsers);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const sendEmailToUser = async (user) => {
    if (!isEmailConfigured) {
      alert(
        "Email service is not configured. Please check EMAIL_SETUP.md for instructions."
      );
      return;
    }

    if (!user.qrCode) {
      alert("User does not have a QR code. Please generate one first.");
      return;
    }

    try {
      const result = await sendWelcomeEmail(user);
      if (result.success) {
        alert(`Welcome email sent successfully to ${user.name}!`);
      } else {
        alert(`Failed to send email: ${result.message}`);
      }
    } catch (error) {
      alert("Failed to send email. Please try again.");
      console.error("Email sending error:", error);
    }
  };

  return (
    <div className="registered-list fade-in">
      <div className="container">
        <div className="list-header">
          <div className="header-content">
            <FaUsers className="list-icon" />
            <div>
              <h1 className="list-title">Registered Users</h1>
              <p className="list-subtitle">
                Manage and view all registered users ({filteredUsers.length} of{" "}
                {users.length})
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
            <button className="btn btn-success" onClick={exportToCSV}>
              <FaDownload />
              CSV
            </button>
          </div>
        </div>

        <div className="list-controls">
          <div className="search-section">
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or ID..."
                value={searchTerm}
                onChange={handleSearch}
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-group">
              <FaFilter className="filter-icon" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-section">
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <FaUsers className="empty-icon" />
              <h3>No users found</h3>
              <p>
                {users.length === 0
                  ? "No users have been registered yet."
                  : "No users match your search criteria."}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length}
                        onChange={handleSelectAll}
                        className="checkbox"
                      />
                    </th>
                    <th className="sortable" onClick={() => handleSort("id")}>
                      ID
                      {sortField === "id" &&
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
                    <th>Phone</th>
                    <th>Organisation</th>
                    <th>Status</th>
                    <th>QR Code</th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("registeredAt")}
                    >
                      Registered
                      {sortField === "registeredAt" &&
                        (sortOrder === "asc" ? (
                          <FaSortAlphaDown />
                        ) : (
                          <FaSortAlphaUp />
                        ))}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={
                        selectedUsers.includes(user.id) ? "selected" : ""
                      }
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="checkbox"
                        />
                      </td>
                      <td className="user-id">{user.id}</td>
                      <td className="user-name">{user.name}</td>
                      <td className="user-email">{user.email}</td>
                      <td className="user-phone">{user.phone}</td>
                      <td className="user-department">
                        {user.organisation || "-"}
                      </td>
                      <td>
                        <select
                          value={user.status}
                          onChange={(e) =>
                            handleStatusChange(user.id, e.target.value)
                          }
                          className={`status-select status-${user.status}`}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="qr-cell">
                        {user.qrCode ? (
                          <div className="qr-actions">
                            <img
                              src={user.qrCode}
                              alt="QR Code"
                              className="qr-thumbnail"
                              title="Click to download"
                              onClick={() => downloadUserQR(user)}
                            />
                            <div className="qr-buttons">
                              <button
                                className="action-btn qr-btn"
                                onClick={() => downloadUserQR(user)}
                                title="Download QR Code"
                              >
                                <FaQrcode />
                              </button>
                              <button
                                className="action-btn email-btn"
                                onClick={() => sendEmailToUser(user)}
                                title="Send Email with QR Code"
                                disabled={!isEmailConfigured}
                              >
                                <FaEnvelope />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="action-btn generate-qr-btn"
                            onClick={() => generateQRForUser(user)}
                            title="Generate QR Code"
                          >
                            <FaQrcode />
                          </button>
                        )}
                      </td>
                      <td className="user-registered">
                        {new Date(user.registeredAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEditUser(user)}
                            title="Edit User"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteUser(user)}
                            title="Delete User"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedUsers.length > 0 && (
          <div className="bulk-actions">
            <div className="bulk-info">
              {selectedUsers.length} user(s) selected
            </div>
            <div className="bulk-buttons">
              <button className="btn btn-success">
                <FaUserCheck />
                Mark Active
              </button>
              <button className="btn btn-secondary">
                <FaUserTimes />
                Mark Inactive
              </button>
              <button className="btn btn-danger">
                <FaTrash />
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to delete user{" "}
              <strong>{userToDelete?.name}</strong>? This action cannot be
              undone and will also remove them from all scan lists.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h3>
                <FaEdit /> Edit User: {userToEdit?.name}
              </h3>
              <button className="modal-close" onClick={cancelEdit}>
                ×
              </button>
            </div>

            <form className="edit-form" onSubmit={(e) => e.preventDefault()}>
              {editErrors.submit && (
                <div className="alert alert-error">{editErrors.submit}</div>
              )}

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="edit-name" className="form-label">
                    <FaUsers />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    name="name"
                    value={editFormData.name || ""}
                    onChange={handleEditInputChange}
                    className={`form-input ${editErrors.name ? "error" : ""}`}
                    placeholder="Enter full name"
                  />
                  {editErrors.name && (
                    <span className="error-text">{editErrors.name}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="edit-email" className="form-label">
                    <FaEnvelope />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="edit-email"
                    name="email"
                    value={editFormData.email || ""}
                    onChange={handleEditInputChange}
                    className={`form-input ${editErrors.email ? "error" : ""}`}
                    placeholder="Enter email address"
                  />
                  {editErrors.email && (
                    <span className="error-text">{editErrors.email}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="edit-phone" className="form-label">
                    📞 Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="edit-phone"
                    name="phone"
                    value={editFormData.phone || ""}
                    onChange={handleEditInputChange}
                    className={`form-input ${editErrors.phone ? "error" : ""}`}
                    placeholder="Enter phone number"
                  />
                  {editErrors.phone && (
                    <span className="error-text">{editErrors.phone}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="edit-isacaId" className="form-label">
                    🆔 ISACA ID
                  </label>
                  <input
                    type="text"
                    id="edit-isacaId"
                    name="isacaId"
                    value={editFormData.isacaId || ""}
                    onChange={handleEditInputChange}
                    className="form-input"
                    placeholder="Enter ISACA ID"
                  />
                </div>

                <div className="form-group">
                  <label
                    htmlFor="edit-participationCategory"
                    className="form-label"
                  >
                    📊 Participation Category
                  </label>
                  <select
                    id="edit-participationCategory"
                    name="participationCategory"
                    value={editFormData.participationCategory || ""}
                    onChange={handleEditInputChange}
                    className="form-input"
                  >
                    <option value="">Select category</option>
                    <option value="Physical">Physical</option>
                    <option value="Virtual">Virtual</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-organisation" className="form-label">
                    🏢 Organisation
                  </label>
                  <input
                    type="text"
                    id="edit-organisation"
                    name="organisation"
                    value={editFormData.organisation || ""}
                    onChange={handleEditInputChange}
                    className="form-input"
                    placeholder="Enter organisation"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-designation" className="form-label">
                    💼 Designation
                  </label>
                  <input
                    type="text"
                    id="edit-designation"
                    name="designation"
                    value={editFormData.designation || ""}
                    onChange={handleEditInputChange}
                    className="form-input"
                    placeholder="Enter job title/designation"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-backupCode" className="form-label">
                    🔑 Backup Code
                  </label>
                  <input
                    type="text"
                    id="edit-backupCode"
                    name="backupCode"
                    value={editFormData.backupCode || ""}
                    onChange={handleEditInputChange}
                    className="form-input"
                    placeholder="Backup access code"
                  />
                </div>

                <div className="form-group form-group-full">
                  <label htmlFor="edit-notes" className="form-label">
                    📝 Notes
                  </label>
                  <textarea
                    id="edit-notes"
                    name="notes"
                    value={editFormData.notes || ""}
                    onChange={handleEditInputChange}
                    className="form-input form-textarea"
                    placeholder="Additional notes (optional)"
                    rows="3"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelEdit}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpdateUser}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <div className="loading"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <FaEdit />
                      Update User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisteredList;
