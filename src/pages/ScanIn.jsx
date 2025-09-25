import { useState, useEffect } from "react";
import {
  FaKeyboard,
  FaCheckCircle,
  FaTimesCircle,
  FaUser,
  FaSearch,
} from "react-icons/fa";
import "./ManualCode.css";
import axios from "axios";
import { toast } from "react-toastify";

const ScanIn = () => {
  const apiUrl = "https://id-code-432903898833.europe-west1.run.app/api/v1/";
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [uuid, setUuid] = useState("");

  const handleCodeChange = (e) => {
    const value = e.target.value;
    setUuid(value);
    setMessage(null);
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    setMessage(null);
    if (!uuid.trim()) return;
    setIsLoading(true);
  };

  const clearResults = () => setMessage(null);

  const ScanoutUser = async (value) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("idCodeToken");

      // eslint-disable-next-line no-unused-vars
      const response = await axios.post(
        `${apiUrl}event/attendance/${uuid}/checked_in`,
        { nin: value },
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
        "Login Error Response:",
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(uuid)) {
      const delayDebounce = setTimeout(() => {
        ScanoutUser(uuid);
      }, 800);

      return () => clearTimeout(delayDebounce);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid]);
  return (
    <div className="manual-code fade-in">
      <div className="container">
        <div className="code-header">
          <FaKeyboard className="code-icon" />
          <div>
            <h1 className="code-title">Scan In Registered Users</h1>
            <p className="code-subtitle">Enter exact user id</p>
          </div>
        </div>

        <div className="code-content">
          <div className="code-section">
            <form onSubmit={handleCodeSubmit} className="code-form">
              <div className="form-group">
                <label htmlFor="code" className="form-label">
                  Enter User ID
                </label>

                <div className="input-wrapper">
                  <input
                    id="code"
                    type="text"
                    value={uuid}
                    onChange={handleCodeChange}
                    className="form-input code-input"
                    placeholder="Enter exact email, ID, serial number, name, or backup code"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="search-btn"
                    disabled={isLoading || !uuid.trim()}
                    title="Submit"
                  >
                    {isLoading ? <div className="loading"></div> : <FaSearch />}
                  </button>
                </div>
              </div>
            </form>

            {message && (
              <div
                className={`alert ${
                  message.type === "success" ? "alert-success" : "alert-error"
                }`}
              >
                {message.type === "success" ? (
                  <FaCheckCircle />
                ) : (
                  <FaTimesCircle />
                )}
                <div className="alert-content">
                  <div className="alert-message">{message.text}</div>
                  {message.data && (
                    <div className="alert-details">
                      <div className="user-info">
                        <FaUser className="user-icon" />
                        <span>{message.data.name}</span>
                        {message.data.email && (
                          <span className="user-email">
                            {" "}
                            • {message.data.email}
                          </span>
                        )}
                      </div>
                      <small>
                        Action: {message.data.action} | Method:{" "}
                        {message.data.method} | Time:{" "}
                        {new Date(message.data.timestamp).toLocaleTimeString()}
                      </small>
                    </div>
                  )}
                </div>
                <button className="clear-btn" onClick={clearResults}>
                  ×
                </button>
              </div>
            )}

            <div className="code-help">
              <h3>Accepted Code Formats:</h3>
              <ul>
                <li>
                  <strong>User ID:</strong> e.g.,
                  123e4567-e89b-12d3-a456-426614174000
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanIn;
