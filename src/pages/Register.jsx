/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import {
  sendWelcomeEmail,
  sendBulkWelcomeEmails,
  validateEmailConfig,
  initEmailJS,
} from "../utils/emailService";
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
  FaMailBulk,
} from "react-icons/fa";
import "./Register.css";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    backupCode: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);
  const [lastGeneratedUser, setLastGeneratedUser] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [isEmailConfigured, setIsEmailConfigured] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [activeTab, setActiveTab] = useState("single"); // 'single' or 'bulk'
  const [emailProgress, setEmailProgress] = useState(null);
  const fileInputRef = useRef(null);

  // Initialize EmailJS on component mount
  useEffect(() => {
    initEmailJS();
    const emailConfig = validateEmailConfig();
    setIsEmailConfigured(emailConfig.isConfigured);
    if (!emailConfig.isConfigured) {
      console.warn(emailConfig.message);
    }
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
      const existingUsers = JSON.parse(
        localStorage.getItem("registeredUsers") || "[]"
      );
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
      const qrData = JSON.stringify({
        id: userId,
        name: formData.name,
        email: formData.email,
      });

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
      };

      // Save to localStorage
      const updatedUsers = [...existingUsers, newUser];
      localStorage.setItem("registeredUsers", JSON.stringify(updatedUsers));

      // Store the generated user for QR display
      setLastGeneratedUser(newUser);

      setSubmitMessage({
        type: "success",
        message: `User registered successfully! ID: ${userId}, Backup Code: ${backupCode}`,
      });

      // Send welcome email if email service is configured
      if (isEmailConfigured) {
        setEmailStatus({
          type: "sending",
          message: "Sending welcome email...",
        });

        try {
          const emailResult = await sendWelcomeEmail(newUser);

          if (emailResult.success) {
            setEmailStatus({
              type: "success",
              message: "Welcome email with QR code sent successfully!",
            });
          } else {
            setEmailStatus({
              type: "error",
              message: `Email sending failed: ${emailResult.message}`,
            });
          }
        } catch (emailError) {
          setEmailStatus({
            type: "error",
            message: "Failed to send welcome email",
          });
        }
      } else {
        setEmailStatus({
          type: "warning",
          message:
            "Email service not configured. User registered without email notification.",
        });
      }

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        department: "",
        backupCode: "",
        notes: "",
      });
    } catch {
      setSubmitMessage({
        type: "error",
        message: "Failed to register user. Please try again.",
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
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    return lines
      .slice(1)
      .map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
        const user = {};

        headers.forEach((header, i) => {
          if (header === "name") user.name = values[i] || "";
          else if (header === "email") user.email = values[i] || "";
          else if (header === "phone") user.phone = values[i] || "";
          else if (header === "department") user.department = values[i] || "";
          else if (header === "backupcode") user.backupCode = values[i] || "";
          else if (header === "notes") user.notes = values[i] || "";
        });

        return user;
      })
      .filter((user) => user.name && user.email);
  };

  const processBulkRegistration = async () => {
    if (bulkData.length === 0) {
      setSubmitMessage({
        type: "error",
        message: "No data to process",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const existingUsers = JSON.parse(
        localStorage.getItem("registeredUsers") || "[]"
      );
      const newUsers = [];
      const skippedUsers = [];

      for (const userData of bulkData) {
        // Check if user already exists
        const userExists = existingUsers.some(
          (user) =>
            user.email === userData.email || user.phone === userData.phone
        );

        if (userExists) {
          skippedUsers.push(userData.email);
          continue;
        }

        // Generate user ID and backup code
        const userId = `USR${Date.now().toString().slice(-6)}${Math.random()
          .toString(36)
          .substring(2, 3)
          .toUpperCase()}`;
        const backupCode =
          userData.backupCode ||
          `BAK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Generate QR code
        const qrData = JSON.stringify({
          id: userId,
          name: userData.name,
          email: userData.email,
        });

        let qrCodeDataURL = "";
        try {
          qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 200,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
        } catch (qrError) {
          console.error(
            "QR code generation failed for user:",
            userData.name,
            qrError
          );
        }

        newUsers.push({
          id: userId,
          ...userData,
          backupCode,
          qrCode: qrCodeDataURL,
          registeredAt: new Date().toISOString(),
          status: "active",
        });
      }

      // Save to localStorage
      const updatedUsers = [...existingUsers, ...newUsers];
      localStorage.setItem("registeredUsers", JSON.stringify(updatedUsers));

      setSubmitMessage({
        type: "success",
        message: `Successfully registered ${newUsers.length} users. ${
          skippedUsers.length > 0
            ? `Skipped ${skippedUsers.length} existing users.`
            : ""
        }`,
      });

      // Send bulk welcome emails if email service is configured
      if (isEmailConfigured && newUsers.length > 0) {
        setEmailStatus({
          type: "sending",
          message: `Sending welcome emails to ${newUsers.length} users...`,
        });

        try {
          const emailResults = await sendBulkWelcomeEmails(
            newUsers,
            (progress) => {
              setEmailProgress(progress);
            }
          );

          setEmailStatus({
            type: "success",
            message: `Email sending completed! Success: ${emailResults.summary.success}, Failed: ${emailResults.summary.failed}`,
          });

          // Clear progress after a delay
          setTimeout(() => setEmailProgress(null), 3000);
        } catch (emailError) {
          setEmailStatus({
            type: "error",
            message: "Failed to send bulk welcome emails",
          });
        }
      } else if (!isEmailConfigured) {
        setEmailStatus({
          type: "warning",
          message:
            "Email service not configured. Users registered without email notifications.",
        });
      }

      setBulkData([]);
    } catch {
      setSubmitMessage({
        type: "error",
        message: "Failed to process bulk registration",
      });
    }

    setIsSubmitting(false);
  };

  const downloadTemplate = (format) => {
    let content = "";
    let filename = "";
    let mimeType = "";

    if (format === "csv") {
      content =
        "name,email,phone,department,backupcode,notes\nJohn Doe,john@example.com,+1234567890,IT,BAK123,Sample user";
      filename = "bulk_registration_template.csv";
      mimeType = "text/csv";
    } else {
      content = JSON.stringify(
        [
          {
            name: "John Doe",
            email: "john@example.com",
            phone: "+1234567890",
            department: "IT",
            backupCode: "BAK123",
            notes: "Sample user",
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
            <h1 className="register-title">User Registration</h1>
            <p className="register-subtitle">
              Add new users individually or in bulk
            </p>
          </div>
        </div>

        <div className="register-tabs">
          <button
            className={`tab-btn ${activeTab === "single" ? "active" : ""}`}
            onClick={() => setActiveTab("single")}
          >
            <FaUser />
            Single Registration
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

        {emailStatus && (
          <div
            className={`alert ${
              emailStatus.type === "success"
                ? "alert-success"
                : emailStatus.type === "error"
                ? "alert-error"
                : emailStatus.type === "sending"
                ? "alert-info"
                : "alert-warning"
            }`}
          >
            <span>
              {emailStatus.type === "sending" && (
                <FaMailBulk className="spinning" />
              )}
              {emailStatus.message}
            </span>
            <button className="clear-btn" onClick={() => setEmailStatus(null)}>
              ×
            </button>
          </div>
        )}

        {emailProgress && (
          <div className="progress-container">
            <div className="progress-header">
              <span>
                Sending emails: {emailProgress.current} of {emailProgress.total}
              </span>
              <span>{emailProgress.currentUser}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${
                    (emailProgress.current / emailProgress.total) * 100
                  }%`,
                }}
              ></div>
            </div>
            <div className="progress-stats">
              <span className="success">
                ✓ {emailProgress.successCount} sent
              </span>
              <span className="error">✗ {emailProgress.failCount} failed</span>
            </div>
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
                  <label htmlFor="department" className="form-label">
                    Department
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter department (optional)"
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
                  {isSubmitting ? "Registering..." : "Register User"}
                  {isSubmitting && <div className="loading"></div>}
                </button>
              </div>
            </form>

            {/* QR Code Display */}
            {lastGeneratedUser && (
              <div className="qr-display">
                <h3>Registration Complete!</h3>
                <div className="qr-card">
                  <div className="qr-info">
                    <h4>{lastGeneratedUser.name}</h4>
                    <p>
                      <strong>ID:</strong> {lastGeneratedUser.id}
                    </p>
                    <p>
                      <strong>Email:</strong> {lastGeneratedUser.email}
                    </p>
                    <p>
                      <strong>Backup Code:</strong>{" "}
                      {lastGeneratedUser.backupCode}
                    </p>
                  </div>
                  <div className="qr-code">
                    <img src={lastGeneratedUser.qrCode} alt="QR Code" />
                    <button
                      className="btn btn-secondary"
                      onClick={() => downloadQRCode(lastGeneratedUser)}
                    >
                      <FaDownload />
                      Download QR Code
                    </button>
                  </div>
                </div>
                <button
                  className="btn btn-outline"
                  onClick={() => setLastGeneratedUser(null)}
                >
                  Register Another User
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bulk-content">
            <div className="bulk-section">
              <h3>Download Templates</h3>
              <div className="template-buttons">
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

            <div className="bulk-section">
              <h3>Upload File</h3>
              <div className="upload-area">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.json"
                  style={{ display: "none" }}
                />
                <button
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FaUpload />
                  Choose CSV or JSON File
                </button>
                <p className="upload-help">
                  Upload a CSV or JSON file with user data
                </p>
              </div>
            </div>

            {bulkData.length > 0 && (
              <div className="bulk-section">
                <div className="bulk-header">
                  <h3>Preview Data ({bulkData.length} users)</h3>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setBulkData([])}
                  >
                    <FaTrash />
                    Clear
                  </button>
                </div>
                <div className="bulk-preview">
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkData.slice(0, 10).map((user, index) => (
                          <tr key={index}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.phone}</td>
                            <td>{user.department || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkData.length > 10 && (
                      <p className="preview-more">
                        ... and {bulkData.length - 10} more users
                      </p>
                    )}
                  </div>
                </div>
                <div className="bulk-actions">
                  <button
                    className="btn btn-primary"
                    onClick={processBulkRegistration}
                    disabled={isSubmitting}
                  >
                    <FaSave />
                    {isSubmitting
                      ? "Processing..."
                      : `Register ${bulkData.length} Users`}
                    {isSubmitting && <div className="loading"></div>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
