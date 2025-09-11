import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import { storage, STORAGE_KEYS } from "../utils/storage";
import {
  FaUserPlus,
  FaUpload,
  FaTrash,
  FaSave,
  FaFileExcel,
  FaFileCsv,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaIdCard,
  FaDownload,
  FaBuilding,
  FaUserTie,
  FaUsers,
  FaExclamationTriangle,
} from "react-icons/fa";
import "./ReRegister.css";

const ReRegister = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    participationCategory: "",
    organisation: "",
    designation: "",
    backupCode: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);
  const [lastGeneratedUser, setLastGeneratedUser] = useState(null);
  const [bulkData, setBulkData] = useState([]);
  const [activeTab, setActiveTab] = useState("single"); // 'single' or 'bulk'
  const fileInputRef = useRef(null);

  // Initialize storage on component mount
  useEffect(() => {
    const initializeComponent = async () => {
      await storage.initialize();
    };
    initializeComponent();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[+]?[\d\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Check if user already exists
      const existingUsers = await storage.get(STORAGE_KEYS.REGISTERED_USERS);
      const userExists = existingUsers.some(
        (user) => user.email === formData.email || user.phone === formData.phone
      );

      if (userExists) {
        setSubmitMessage({
          type: "error",
          message: "User with this email or phone number already exists",
        });
        setIsSubmitting(false);
        return;
      }

      // Generate user ID and backup code if not provided
      const userId = `USR${Date.now().toString().slice(-6)}`;
      const backupCode =
        formData.backupCode ||
        `BAK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Generate QR code data URL
      const qrData = formData.email; // Only store email, no JSON

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      const newUser = {
        id: userId,
        ...formData,
        backupCode,
        qrCode: qrCodeDataURL,
        registeredAt: new Date().toISOString(),
        status: "active",
        reRegistered: true, // Flag to indicate this was re-registered
        emailSent: false, // Explicitly mark that no email was sent
      };

      // Save to cloud storage
      const updatedUsers = [...existingUsers, newUser];
      await storage.set(STORAGE_KEYS.REGISTERED_USERS, updatedUsers);

      // Store the generated user for QR display
      setLastGeneratedUser(newUser);

      setSubmitMessage({
        type: "success",
        message: `User re-registered successfully! ID: ${userId}, Backup Code: ${backupCode} (No email sent)`,
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        participationCategory: "",
        organisation: "",
        designation: "",
        backupCode: "",
        notes: "",
      });
    } catch {
      setSubmitMessage({
        type: "error",
        message: "Failed to re-register user. Please try again.",
      });
    }

    setIsSubmitting(false);
  };

  const downloadQRCode = (user) => {
    if (!user || !user.qrCode) return;

    const link = document.createElement("a");
    link.download = `${user.name.replace(/\s+/g, "_")}_QR_Code.png`;
    link.href = user.qrCode;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let data = [];

        if (file.name.endsWith(".csv")) {
          data = parseCSV(content);
        } else if (file.name.endsWith(".json")) {
          data = JSON.parse(content);
        } else {
          alert("Please upload a CSV or JSON file");
          return;
        }

        setBulkData(data);
        setSubmitMessage({
          type: "success",
          message: `Loaded ${data.length} users from file`,
        });
      } catch {
        setSubmitMessage({
          type: "error",
          message: "Failed to parse file. Please check the format.",
        });
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvContent) => {
    const lines = csvContent.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/"/g, ""));

    return lines
      .slice(1)
      .map((line) => {
        // Handle CSV with potential commas in quoted fields
        const values = [];
        let currentValue = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = "";
          } else {
            currentValue += char;
          }
        }

        // Add the last value
        values.push(currentValue.trim());

        // Map values to object based on headers
        const user = {};
        headers.forEach((header, index) => {
          const value = values[index] ? values[index].replace(/"/g, "") : "";

          // Map common header variations to our field names
          if (header.includes("name")) user.name = value;
          else if (header.includes("email")) user.email = value;
          else if (header.includes("phone")) user.phone = value;
          else if (header.includes("isaca")) user.isacaId = value;
          else if (
            header.includes("participation") ||
            header.includes("category")
          )
            user.participationCategory = value;
          else if (
            header.includes("organisation") ||
            header.includes("organization")
          )
            user.organisation = value;
          else if (header.includes("designation") || header.includes("title"))
            user.designation = value;
          else if (header.includes("backup")) user.backupCode = value;
          else if (header.includes("notes")) user.notes = value;
        });

        return user;
      })
      .filter((user) => user.name && user.email); // Only include users with required fields
  };

  const handleBulkSubmit = async () => {
    if (bulkData.length === 0) {
      setSubmitMessage({
        type: "error",
        message: "No data to submit. Please upload a file first.",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const existingUsers = await storage.get(STORAGE_KEYS.REGISTERED_USERS);
      const newUsers = [];

      for (const userData of bulkData) {
        // Check for duplicates
        const userExists = existingUsers.some(
          (user) =>
            user.email === userData.email || user.phone === userData.phone
        );

        if (!userExists) {
          const userId = `USR${Date.now().toString().slice(-6)}${Math.random()
            .toString(36)
            .substring(2, 4)}`;
          const backupCode =
            userData.backupCode ||
            `BAK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

          // Generate QR code
          const qrData = userData.email; // Only store email, no JSON

          const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 200,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });

          newUsers.push({
            id: userId,
            ...userData,
            backupCode,
            qrCode: qrCodeDataURL,
            registeredAt: new Date().toISOString(),
            status: "active",
            reRegistered: true,
            emailSent: false,
          });
        }
      }

      // Save all new users
      const updatedUsers = [...existingUsers, ...newUsers];
      await storage.set(STORAGE_KEYS.REGISTERED_USERS, updatedUsers);

      setSubmitMessage({
        type: "success",
        message: `Successfully re-registered ${newUsers.length} users out of ${bulkData.length} (No emails sent)`,
      });

      // Clear bulk data
      setBulkData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setSubmitMessage({
        type: "error",
        message: "Failed to process bulk registration. Please try again.",
      });
    }

    setIsSubmitting(false);
  };

  const clearBulkData = () => {
    setBulkData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSubmitMessage(null);
  };

  const downloadTemplate = (format = "csv") => {
    let content, filename, mimeType;

    if (format === "csv") {
      content =
        "S/N,Name,Phone Number,Email, Participation Category,Organisation,Designation\n1,John Doe,08036184466,john@example.com,571458,Physical,Nigerian Communications Commission,Information Security Manager";
      filename = "bulk_registration_template.csv";
      mimeType = "text/csv";
    } else {
      content = JSON.stringify(
        [
          {
            name: "John Doe",
            email: "john@example.com",
            phone: "08036184466",
            participationCategory: "Physical",
            organisation: "Nigerian Communications Commission",
            designation: "Information Security Manager",
            backupCode: "",
            notes: "",
          },
        ],
        null,
        2
      );
      filename = "bulk_registration_template.json";
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="register fade-in">
      <div className="container">
        <div className="register-header">
          <FaUserPlus className="register-icon" />
          <div>
            <h1 className="register-title">User Re-registration</h1>
            <p className="register-subtitle">
              Re-register users without sending emails
            </p>
            <div className="info-badge">
              <FaExclamationTriangle />
              <span>No email notifications will be sent</span>
            </div>
          </div>
        </div>

        <div className="register-tabs">
          <button
            className={`tab-btn ${activeTab === "single" ? "active" : ""}`}
            onClick={() => setActiveTab("single")}
          >
            <FaUser />
            Single Re-registration
          </button>
          <button
            className={`tab-btn ${activeTab === "bulk" ? "active" : ""}`}
            onClick={() => setActiveTab("bulk")}
          >
            <FaUpload />
            Bulk Upload
          </button>
        </div>

        {submitMessage && (
          <div
            className={`alert ${
              submitMessage.type === "success" ? "alert-success" : "alert-error"
            }`}
          >
            <span>{submitMessage.message}</span>
            <button
              className="clear-btn"
              onClick={() => setSubmitMessage(null)}
            >
              ×
            </button>
          </div>
        )}

        {activeTab === "single" ? (
          <div className="register-content">
            <form onSubmit={handleSubmit} className="register-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    <FaUser />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`form-input ${errors.name ? "error" : ""}`}
                    placeholder="Enter full name"
                  />
                  {errors.name && (
                    <span className="error-text">{errors.name}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    <FaEnvelope />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`form-input ${errors.email ? "error" : ""}`}
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <span className="error-text">{errors.email}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="form-label">
                    <FaPhone />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`form-input ${errors.phone ? "error" : ""}`}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <span className="error-text">{errors.phone}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="participationCategory" className="form-label">
                    <FaUsers />
                    Participation Category
                  </label>
                  <select
                    id="participationCategory"
                    name="participationCategory"
                    value={formData.participationCategory}
                    onChange={handleInputChange}
                    className="form-input"
                  >
                    <option value="">Select category</option>
                    <option value="Physical">Physical</option>
                    <option value="Virtual">Virtual</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="organisation" className="form-label">
                    <FaBuilding />
                    Organisation
                  </label>
                  <input
                    type="text"
                    id="organisation"
                    name="organisation"
                    value={formData.organisation}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter organisation"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="designation" className="form-label">
                    <FaUserTie />
                    Designation
                  </label>
                  <input
                    type="text"
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter job title/designation"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="backupCode" className="form-label">
                    <FaIdCard />
                    Backup Code
                  </label>
                  <input
                    type="text"
                    id="backupCode"
                    name="backupCode"
                    value={formData.backupCode}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Auto-generated if empty"
                  />
                </div>

                <div className="form-group form-group-full">
                  <label htmlFor="notes" className="form-label">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="form-input form-textarea"
                    placeholder="Additional notes (optional)"
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary submit-btn"
                  disabled={isSubmitting}
                >
                  <FaSave />
                  {isSubmitting ? "Re-registering..." : "Re-register User"}
                  {isSubmitting && <div className="loading"></div>}
                </button>
              </div>
            </form>

            {lastGeneratedUser && (
              <div className="qr-display">
                <h3>Generated QR Code</h3>
                <div className="qr-content">
                  <img
                    src={lastGeneratedUser.qrCode}
                    alt="QR Code"
                    className="qr-image"
                  />
                  <div className="qr-info">
                    <p>
                      <strong>Name:</strong> {lastGeneratedUser.name}
                    </p>
                    <p>
                      <strong>ID:</strong> {lastGeneratedUser.id}
                    </p>
                    <p>
                      <strong>Backup Code:</strong>{" "}
                      {lastGeneratedUser.backupCode}
                    </p>
                    <button
                      className="btn btn-secondary"
                      onClick={() => downloadQRCode(lastGeneratedUser)}
                    >
                      <FaDownload />
                      Download QR Code
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="register-content">
            <div className="bulk-upload-section">
              <div className="upload-controls">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.json"
                  className="file-input"
                />
                <div className="template-downloads">
                  <button
                    className="btn btn-secondary"
                    onClick={() => downloadTemplate("csv")}
                  >
                    <FaFileCsv />
                    Download CSV Template
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => downloadTemplate("json")}
                  >
                    <FaFileExcel />
                    Download JSON Template
                  </button>
                </div>
              </div>

              {bulkData.length > 0 && (
                <div className="bulk-preview">
                  <div className="preview-header">
                    <h3>Preview ({bulkData.length} users)</h3>
                    <button
                      className="btn btn-secondary clear-btn"
                      onClick={clearBulkData}
                    >
                      <FaTrash />
                      Clear Data
                    </button>
                  </div>

                  <div className="preview-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Organisation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkData.slice(0, 5).map((user, index) => (
                          <tr key={index}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.phone}</td>
                            <td>{user.organisation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkData.length > 5 && (
                      <p className="more-records">
                        ... and {bulkData.length - 5} more records
                      </p>
                    )}
                  </div>

                  <button
                    className="btn btn-primary bulk-submit-btn"
                    onClick={handleBulkSubmit}
                    disabled={isSubmitting}
                  >
                    <FaUsers />
                    {isSubmitting
                      ? "Processing..."
                      : `Re-register ${bulkData.length} Users`}
                    {isSubmitting && <div className="loading"></div>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReRegister;
