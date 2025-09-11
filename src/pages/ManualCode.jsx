import { useState, useRef, useEffect } from "react";
import {
  FaKeyboard,
  FaCheckCircle,
  FaTimesCircle,
  FaUser,
  FaSearch,
  FaEnvelope,
} from "react-icons/fa";
import { storage, STORAGE_KEYS, generateId } from "../utils/storage";
import "./ManualCode.css";

const ManualCode = () => {
  const [code, setCode] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputType, setInputType] = useState("single");
  const [autoClearCountdown, setAutoClearCountdown] = useState(0);
  const [lastProcessedCode, setLastProcessedCode] = useState(""); // Track last processed code
  const [recentCodes, setRecentCodes] = useState([]);

  const normalizeInput = (input) => {
    const str = (input || "").trim();
    if (str.toLowerCase().startsWith("mailto:")) return str.slice(7);
    return str;
  };

  const isValidEmail = (s) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test((s || "").trim());

  const isPotentialEmail = (s) => (s || "").includes("@");

  const emailDebounceRef = useRef(null);
  const requestSeqRef = useRef(0);

  const normalizedForDup = (v) => normalizeInput(v).trim().toLowerCase();

  // optional: clear pending debounce on unmount
  useEffect(() => {
    return () => clearTimeout(emailDebounceRef.current);
  }, []);
  // -----------------------------------------------------------

  const handleCodeChange = (e) => {
    const value = e.target.value;
    setCode(value);
    setError("");
    setSearchResult(null);

    if (isPotentialEmail(value)) setInputType("email");
    else setInputType("single");

    clearTimeout(emailDebounceRef.current);
    emailDebounceRef.current = setTimeout(() => {
      const normalized = normalizeInput(value).trim();
      if (isValidEmail(normalized)) {
        performAutoSearch(normalized);
      }
    }, 400);
  };

  const handleCodeSubmit = async (e) => {
  e.preventDefault();
  const normalized = normalizedForDup(code);
  if (!normalized || normalized === lastProcessedCode) return;

  setIsLoading(true);
  setError("");
  setSearchResult(null);

  try {
    const result = await processManualCode(normalized);
    setSearchResult(result);
    setLastProcessedCode(normalized);
    if (result.success) {
      const newRecentCode = {
        id: Date.now(),
        code: normalized,
        user: result.data.name,
        action: result.data.action,
        timestamp: new Date().toISOString(),
      };
      setRecentCodes((prev) => [newRecentCode, ...prev.slice(0, 9)]);
      setTimeout(() => {
        setCode("");
        setInputType("single");
        setLastProcessedCode("");
      }, 2000);
    }
  } catch (err) {
    console.error("Error processing code:", err);
    setError("Failed to process code. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

const performAutoSearch = async (raw) => {
  const normalized = normalizedForDup(raw);
  if (!normalized || isLoading || normalized === lastProcessedCode) return;

  const mySeq = ++requestSeqRef.current;

  setIsLoading(true);
  setError("");
  setSearchResult(null);

  try {
    const result = await processManualCode(normalized);

    // If another keystroke triggered a newer search, ignore this result
    if (mySeq !== requestSeqRef.current) return;

    setSearchResult(result);
    setLastProcessedCode(normalized);

    if (result.success) {
      const newRecentCode = {
        id: Date.now(),
        code: normalized,
        user: result.data.name,
        action: result.data.action,
        timestamp: new Date().toISOString(),
      };
      setRecentCodes((prev) => [newRecentCode, ...prev.slice(0, 9)]);

      setAutoClearCountdown(2);
      const countdown = setInterval(() => {
        setAutoClearCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            setCode("");
            setInputType("single");
            setLastProcessedCode("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  } catch (err) {
    // also ignore stale errors
    if (mySeq === requestSeqRef.current) {
      console.error("Error in auto-search:", err);
      setError("Failed to process code. Please try again.");
    }
  } finally {
    if (mySeq === requestSeqRef.current) setIsLoading(false);
  }
};

  const processManualCode = async (inputCode) => {
    // Get registered users
    const registeredUsers = await storage.get(
      STORAGE_KEYS.REGISTERED_USERS,
      []
    );

    let searchValue = normalizeInput(inputCode);

// Case-insensitive email check
const user = registeredUsers.find(
  (u) =>
    (u.email && u.email.toLowerCase() === searchValue.toLowerCase()) ||
    u.id === searchValue ||
    u.phone === searchValue ||
    u.backupCode === searchValue ||
    (u.name && u.name.toLowerCase() === searchValue.toLowerCase())
);

    if (!user) {
      return {
        success: false,
        message: `No matching user found for: ${searchValue}. Please verify the information and try again.`,
        data: null,
      };
    }

    // Check current status
    const scanInList = await storage.get(STORAGE_KEYS.SCAN_IN_LIST, []);
    const isCheckedIn = scanInList.some((entry) => entry.userId === user.id);
    const timestamp = new Date().toISOString();

    if (isCheckedIn) {
      // User is checking out
      const checkInEntry = scanInList.find((entry) => entry.userId === user.id);
      const checkInTime = checkInEntry ? checkInEntry.timestamp : null;

      // Calculate duration in minutes
      const duration = checkInTime
        ? Math.floor(
            (new Date(timestamp) - new Date(checkInTime)) / (1000 * 60)
          )
        : 0;

      const updatedScanInList = scanInList.filter(
        (entry) => entry.userId !== user.id
      );

      const scanOutEntry = {
        id: generateId("OUT"),
        userId: user.id,
        name: user.name,
        email: user.email,
        timestamp: timestamp,
        checkInTime: checkInTime,
        duration: duration,
        type: "manual-out",
        entryMethod: "manual",
      };

      // Use individual Firebase requests for each operation
      await storage.set(STORAGE_KEYS.SCAN_IN_LIST, updatedScanInList);
      await storage.addScanOut(scanOutEntry);

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

      // Use individual Firebase request for scan-in
      await storage.addScanIn(scanInEntry);

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
              Enter exact email, ID, phone, name, or backup code for secure
              access
            </p>
          </div>
        </div>

        <div className="code-content">
          <div className="code-section">
            <form onSubmit={handleCodeSubmit} className="code-form">
              <div className="form-group">
                <label htmlFor="code" className="form-label">
                  Enter Email, ID, Phone, Name, or Backup Code
                </label>

                <div className="input-wrapper">
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    className="form-input code-input"
                    placeholder="Enter exact email, ID, phone, name, or backup code"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="search-btn"
                    disabled={isLoading || !normalizeInput(code).trim()}
                    title="Search for exact match"
                  >
                    {isLoading ? <div className="loading"></div> : <FaSearch />}
                  </button>
                </div>

                <div className="input-type-indicator">
                  {inputType === "email" ? (
                    <span className="type-badge email-badge">
                      <FaEnvelope /> Email Detected - Auto-Search
                    </span>
                  ) : (
                    <span className="type-badge manual-badge">
                      <FaKeyboard /> Manual Entry
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
                  {autoClearCountdown > 0 &&
                    searchResult.success &&
                    inputType === "email" && (
                      <div className="auto-clear-notice">
                        🔄 Auto-clearing in {autoClearCountdown} second
                        {autoClearCountdown !== 1 ? "s" : ""}...
                      </div>
                    )}
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
