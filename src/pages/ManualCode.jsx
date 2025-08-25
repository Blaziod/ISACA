import { useState } from "react";
import {
  FaKeyboard,
  FaCheckCircle,
  FaTimesCircle,
  FaUser,
  FaSearch,
  FaCode,
} from "react-icons/fa";
import { storage, STORAGE_KEYS, generateId } from "../utils/storage";
import "./ManualCode.css";

const ManualCode = () => {
  const [code, setCode] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchField, setSearchField] = useState("auto"); // auto, id, name, email
  const [inputType, setInputType] = useState("single"); // single, json
  const [parsedJson, setParsedJson] = useState(null);
  const [recentCodes, setRecentCodes] = useState(() => {
    return JSON.parse(localStorage.getItem("recentCodes") || "[]");
  });

  const handleCodeChange = (e) => {
    const value = e.target.value;
    setCode(value);
    setError("");
    setSearchResult(null);

    // Try to detect and parse JSON
    if (value.trim().startsWith("{") && value.trim().endsWith("}")) {
      try {
        const parsed = JSON.parse(value.trim());
        setParsedJson(parsed);
        setInputType("json");
      } catch {
        setParsedJson(null);
        setInputType("single");
      }
    } else {
      setParsedJson(null);
      setInputType("single");
    }
  };

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
      const result = await processManualCode(code.trim());
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

  const processManualCode = async (inputCode) => {
    // Get registered users
    const registeredUsers = await storage.get(
      STORAGE_KEYS.REGISTERED_USERS,
      []
    );

    let searchValue = inputCode;
    let searchCriteria = "auto";

    // Handle JSON input
    if (inputType === "json" && parsedJson) {
      if (searchField === "auto") {
        // Auto-detect: try ID first, then email, then name
        if (parsedJson.id) {
          searchValue = parsedJson.id;
          searchCriteria = "id";
        } else if (parsedJson.email) {
          searchValue = parsedJson.email;
          searchCriteria = "email";
        } else if (parsedJson.name) {
          searchValue = parsedJson.name;
          searchCriteria = "name";
        }
      } else {
        // Use specific field
        searchValue = parsedJson[searchField] || "";
        searchCriteria = searchField;
      }
    }

    // Find user based on search criteria
    let user;
    if (searchCriteria === "id") {
      user = registeredUsers.find((u) => u.id === searchValue);
    } else if (searchCriteria === "email") {
      user = registeredUsers.find(
        (u) => u.email?.toLowerCase() === searchValue.toLowerCase()
      );
    } else if (searchCriteria === "name") {
      user = registeredUsers.find(
        (u) =>
          u.name?.toLowerCase() === searchValue.toLowerCase() ||
          u.name?.toLowerCase().includes(searchValue.toLowerCase())
      );
    } else {
      // Auto search - try all fields
      user = registeredUsers.find(
        (u) =>
          u.id === searchValue ||
          u.email?.toLowerCase() === searchValue.toLowerCase() ||
          u.phone === searchValue ||
          u.backupCode === searchValue ||
          u.name?.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    if (!user) {
      const searchTypeText =
        inputType === "json" ? `using ${searchCriteria}` : "";
      return {
        success: false,
        message: `User not found ${searchTypeText}. Please check the ${
          searchCriteria === "auto" ? "code" : searchCriteria
        } and try again.`,
        data: null,
      };
    }

    // Check current status
    const scanInList = await storage.get(STORAGE_KEYS.SCAN_IN_LIST, []);
    const scanOutList = await storage.get(STORAGE_KEYS.SCAN_OUT_LIST, []);

    const isCheckedIn = scanInList.some((entry) => entry.userId === user.id);
    const timestamp = new Date().toISOString();

    if (isCheckedIn) {
      // User is checking out
      const updatedScanInList = scanInList.filter(
        (entry) => entry.userId !== user.id
      );
      const scanOutEntry = {
        id: generateId("OUT"),
        userId: user.id,
        name: user.name,
        email: user.email,
        timestamp: timestamp,
        type: "manual-out",
        entryMethod: "manual",
      };

      await storage.set(STORAGE_KEYS.SCAN_IN_LIST, updatedScanInList);
      await storage.set(STORAGE_KEYS.SCAN_OUT_LIST, [
        ...scanOutList,
        scanOutEntry,
      ]);

      return {
        success: true,
        message: `${user.name} checked out successfully`,
        data: { ...user, action: "check-out", timestamp, method: "manual" },
      };
    } else {
      // User is checking in
      const scanInEntry = {
        id: generateId("IN"),
        userId: user.id,
        name: user.name,
        email: user.email,
        timestamp: timestamp,
        type: "manual-in",
        entryMethod: "manual",
      };

      await storage.set(STORAGE_KEYS.SCAN_IN_LIST, [
        ...scanInList,
        scanInEntry,
      ]);

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
                  Enter Code, ID, Email, Name, or JSON
                </label>

                {/* Search Field Selector */}
                {inputType === "json" && parsedJson && (
                  <div className="search-options">
                    <label className="search-label">Search by:</label>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="searchField"
                          value="auto"
                          checked={searchField === "auto"}
                          onChange={(e) => setSearchField(e.target.value)}
                        />
                        <span>Auto-detect</span>
                      </label>
                      {parsedJson.id && (
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="searchField"
                            value="id"
                            checked={searchField === "id"}
                            onChange={(e) => setSearchField(e.target.value)}
                          />
                          <span>ID ({parsedJson.id})</span>
                        </label>
                      )}
                      {parsedJson.name && (
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="searchField"
                            value="name"
                            checked={searchField === "name"}
                            onChange={(e) => setSearchField(e.target.value)}
                          />
                          <span>
                            Name ({parsedJson.name.substring(0, 20)}...)
                          </span>
                        </label>
                      )}
                      {parsedJson.email && (
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="searchField"
                            value="email"
                            checked={searchField === "email"}
                            onChange={(e) => setSearchField(e.target.value)}
                          />
                          <span>Email ({parsedJson.email})</span>
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* JSON Preview */}
                {inputType === "json" && parsedJson && (
                  <div className="json-preview">
                    <FaCode className="json-icon" />
                    <span className="json-label">Detected JSON:</span>
                    <div className="json-content">
                      {Object.entries(parsedJson).map(([key, value]) => (
                        <div key={key} className="json-field">
                          <strong>{key}:</strong> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="input-wrapper">
                  <textarea
                    id="code"
                    value={code}
                    onChange={handleCodeChange}
                    className={`form-input code-input ${
                      inputType === "json" ? "json-input" : ""
                    }`}
                    placeholder={`Single value: backup123, user@email.com, John Doe
JSON format:
{
  "id": "USR8943749",
  "name": "ABOYEJI OYEKANMI MOSES", 
  "email": "OYEKANMI.ABOYEJI@FIRS.GOV.NG"
}`}
                    autoComplete="off"
                    rows={inputType === "json" ? 6 : 1}
                  />
                  <button
                    type="submit"
                    className="search-btn"
                    disabled={isLoading || !code.trim()}
                  >
                    {isLoading ? <div className="loading"></div> : <FaSearch />}
                  </button>
                </div>

                <div className="input-type-indicator">
                  {inputType === "json" ? (
                    <span className="type-badge json-badge">
                      <FaCode /> JSON Mode
                    </span>
                  ) : (
                    <span className="type-badge single-badge">
                      <FaKeyboard /> Single Value
                    </span>
                  )}
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
