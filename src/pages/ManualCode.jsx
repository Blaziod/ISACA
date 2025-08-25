import { useState } from "react";
import {
  FaKeyboard,
  FaCheckCircle,
  FaTimesCircle,
  FaUser,
} from "react-icons/fa";
import "./ManualCode.css";

const ManualCode = () => {
  const [code, setCode] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recentCodes, setRecentCodes] = useState(() => {
    return JSON.parse(localStorage.getItem("recentCodes") || "[]");
  });

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter a code");
      return;
    }

    setIsLoading(true);
    setError("");
    setSearchResult(null);

    // Simulate loading delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const result = processManualCode(code.trim());
      setSearchResult(result);

      if (result.success) {
        // Add to recent codes
        const newRecentCode = {
          id: Date.now(),
          code: code.trim(),
          user: result.data.name,
          action: result.data.action,
          timestamp: new Date().toISOString(),
        };

        const updatedRecentCodes = [newRecentCode, ...recentCodes.slice(0, 9)]; // Keep last 10
        setRecentCodes(updatedRecentCodes);
        localStorage.setItem("recentCodes", JSON.stringify(updatedRecentCodes));

        // Clear the code input after successful processing
        setCode("");
      }
    } catch {
      setError("Failed to process code. Please try again.");
    }

    setIsLoading(false);
  };

  const processManualCode = (inputCode) => {
    // Get registered users
    const registeredUsers = JSON.parse(
      localStorage.getItem("registeredUsers") || "[]"
    );

    // Find user by code, ID, email, or phone
    const user = registeredUsers.find(
      (u) =>
        u.id === inputCode ||
        u.email === inputCode ||
        u.phone === inputCode ||
        u.backupCode === inputCode ||
        u.name.toLowerCase().includes(inputCode.toLowerCase())
    );

    if (!user) {
      return {
        success: false,
        message: "User not found. Please check the code and try again.",
        data: null,
      };
    }

    // Check current status
    const scanInList = JSON.parse(localStorage.getItem("scanInList") || "[]");
    const scanOutList = JSON.parse(localStorage.getItem("scanOutList") || "[]");

    const isCheckedIn = scanInList.some((entry) => entry.userId === user.id);
    const timestamp = new Date().toISOString();

    if (isCheckedIn) {
      // User is checking out
      const updatedScanInList = scanInList.filter(
        (entry) => entry.userId !== user.id
      );
      const scanOutEntry = {
        id: Date.now(),
        userId: user.id,
        name: user.name,
        email: user.email,
        timestamp: timestamp,
        type: "manual-out",
        entryMethod: "manual",
      };

      localStorage.setItem("scanInList", JSON.stringify(updatedScanInList));
      localStorage.setItem(
        "scanOutList",
        JSON.stringify([...scanOutList, scanOutEntry])
      );

      return {
        success: true,
        message: `${user.name} checked out successfully`,
        data: { ...user, action: "check-out", timestamp, method: "manual" },
      };
    } else {
      // User is checking in
      const scanInEntry = {
        id: Date.now(),
        userId: user.id,
        name: user.name,
        email: user.email,
        timestamp: timestamp,
        type: "manual-in",
        entryMethod: "manual",
      };

      localStorage.setItem(
        "scanInList",
        JSON.stringify([...scanInList, scanInEntry])
      );

      return {
        success: true,
        message: `${user.name} checked in successfully`,
        data: { ...user, action: "check-in", timestamp, method: "manual" },
      };
    }
  };

  const clearResults = () => {
    setSearchResult(null);
    setError("");
  };

  const handleCodeSelect = (selectedCode) => {
    setCode(selectedCode);
    setError("");
    setSearchResult(null);
  };

  const formatCode = (code) => {
    // Add some formatting to make codes more readable
    if (code.length > 8) {
      return code.substring(0, 8) + "...";
    }
    return code;
  };

  return (
    <div className="manual-code fade-in">
      <div className="container">
        <div className="code-header">
          <FaKeyboard className="code-icon" />
          <div>
            <h1 className="code-title">Manual Code Entry</h1>
            <p className="code-subtitle">
              Enter backup codes, user IDs, or search by name/email
            </p>
          </div>
        </div>

        <div className="code-content">
          <div className="code-section">
            <form onSubmit={handleCodeSubmit} className="code-form">
              <div className="form-group">
                <label htmlFor="code" className="form-label">
                  Enter Code, ID, Email, or Name
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="form-input code-input"
                    placeholder="e.g., backup123, user@email.com, John Doe"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="search-btn"
                    disabled={isLoading || !code.trim()}
                  >
                    {isLoading ? <div className="loading"></div> : "Search"}
                  </button>
                </div>
              </div>
            </form>

            {error && (
              <div className="alert alert-error">
                <FaTimesCircle />
                <span>{error}</span>
                <button className="clear-btn" onClick={clearResults}>
                  ×
                </button>
              </div>
            )}

            {searchResult && (
              <div
                className={`alert ${
                  searchResult.success ? "alert-success" : "alert-error"
                }`}
              >
                {searchResult.success ? <FaCheckCircle /> : <FaTimesCircle />}
                <div className="alert-content">
                  <div className="alert-message">{searchResult.message}</div>
                  {searchResult.data && (
                    <div className="alert-details">
                      <div className="user-info">
                        <FaUser className="user-icon" />
                        <span>{searchResult.data.name}</span>
                        {searchResult.data.email && (
                          <span className="user-email">
                            {" "}
                            • {searchResult.data.email}
                          </span>
                        )}
                      </div>
                      <small>
                        Action: {searchResult.data.action} | Method:{" "}
                        {searchResult.data.method} | Time:{" "}
                        {new Date(
                          searchResult.data.timestamp
                        ).toLocaleTimeString()}
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
                  <strong>Backup Codes:</strong> backup123, emergency456
                </li>
                <li>
                  <strong>User IDs:</strong> USR001, 12345
                </li>
                <li>
                  <strong>Email Addresses:</strong> user@email.com
                </li>
                <li>
                  <strong>Names:</strong> John Doe, Jane Smith
                </li>
                <li>
                  <strong>Phone Numbers:</strong> +1234567890
                </li>
              </ul>
            </div>
          </div>

          <div className="recent-section">
            <h3 className="recent-title">Recent Codes</h3>
            {recentCodes.length === 0 ? (
              <div className="empty-recent">
                <p>No recent codes used</p>
              </div>
            ) : (
              <div className="recent-list">
                {recentCodes.map((entry) => (
                  <div key={entry.id} className="recent-item">
                    <button
                      className="recent-btn"
                      onClick={() => handleCodeSelect(entry.code)}
                      title={`Click to use code: ${entry.code}`}
                    >
                      <div className="recent-header">
                        <span className="recent-code">
                          {formatCode(entry.code)}
                        </span>
                        <span className={`recent-action ${entry.action}`}>
                          {entry.action}
                        </span>
                      </div>
                      <div className="recent-details">
                        <span className="recent-user">{entry.user}</span>
                        <span className="recent-time">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualCode;
