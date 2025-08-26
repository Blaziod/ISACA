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
  const [autoClearCountdown, setAutoClearCountdown] = useState(0);
  const [lastProcessedCode, setLastProcessedCode] = useState(""); // Track last processed code
  const [recentCodes, setRecentCodes] = useState([]);

  const handleCodeChange = (e) => {
    const value = e.target.value;
    setCode(value);
    setError("");
    setSearchResult(null);

    // Handle various malformed QR patterns
    if (value.trim().startsWith("{") || value.includes("@")) {
      try {
        let cleanedValue = value.trim();
        let extractedEmail = null;
        let extractedId = null;

        // Method 1: Extract email from anywhere in the text using regex
        const emailMatches = value.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
        );
        if (emailMatches && emailMatches.length > 0) {
          // Use the first valid email found
          extractedEmail = emailMatches[0];
        }

        // Method 2: Try to extract ID from JSON-like structure
        const idMatch = value.match(/"id"\s*:\s*"([^"]+)"/);
        if (idMatch) {
          extractedId = idMatch[1];
        }

        // Method 3: Try to fix and parse JSON if it looks like JSON
        if (value.trim().startsWith("{")) {
          try {
            // Fix common JSON issues
            let jsonFix = cleanedValue;

            // Remove duplicate lines after the first closing brace
            const firstBraceIndex = jsonFix.indexOf("}");
            if (firstBraceIndex !== -1) {
              jsonFix = jsonFix.substring(0, firstBraceIndex + 1);
            }

            // Try to fix incomplete "email" field name
            jsonFix = jsonFix.replace(/"emai[^"]*"/, '"email"');

            const parsed = JSON.parse(jsonFix);

            // Use parsed data if successful
            if (parsed.email && !extractedEmail) {
              extractedEmail = parsed.email;
            }
            if (parsed.id && !extractedId) {
              extractedId = parsed.id;
            }

            setParsedJson(parsed);
            setInputType("json");
          } catch {
            // JSON parsing failed, use extracted values
            const mockParsed = {};
            if (extractedEmail) mockParsed.email = extractedEmail;
            if (extractedId) mockParsed.id = extractedId;

            if (Object.keys(mockParsed).length > 0) {
              setParsedJson(mockParsed);
              setInputType("json");
            }
          }
        } else if (extractedEmail || extractedId) {
          // Not JSON format but found email/id
          const mockParsed = {};
          if (extractedEmail) mockParsed.email = extractedEmail;
          if (extractedId) mockParsed.id = extractedId;

          setParsedJson(mockParsed);
          setInputType("json");
        }

        // Auto-search with the best available data
        if (extractedEmail) {
          setSearchField("email");
          performAutoSearch(extractedEmail);
          return;
        } else if (extractedId) {
          setSearchField("id");
          performAutoSearch(extractedId);
          return;
        }
      } catch {
        // Final fallback: extract any email found
        const emailMatch = value.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        );
        if (emailMatch) {
          const email = emailMatch[0];
          setParsedJson({ email });
          setInputType("json");
          setSearchField("email");
          performAutoSearch(email);
          return;
        }

        setParsedJson(null);
        setInputType("single");
      }
    } else {
      setParsedJson(null);
      setInputType("single");
    }
  };

  const performAutoSearch = async (searchValue) => {
    if (!searchValue || isLoading) return;

    setIsLoading(true);
    setError("");
    setSearchResult(null);

    try {
      const result = await processManualCode(searchValue);
      setSearchResult(result);
      setLastProcessedCode(searchValue); // Track that this code was processed

      if (result.success) {
        // Add to recent codes
        const newRecentCode = {
          id: Date.now(),
          code: searchValue,
          user: result.data.name,
          action: result.data.action,
          timestamp: new Date().toISOString(),
        };

        const updatedRecentCodes = [newRecentCode, ...recentCodes.slice(0, 9)];
        setRecentCodes(updatedRecentCodes);

        // Clear the code input after successful auto-search (with countdown)
        setAutoClearCountdown(2);
        const countdownInterval = setInterval(() => {
          setAutoClearCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              setCode("");
              setParsedJson(null);
              setInputType("single");
              setSearchField("auto");
              setLastProcessedCode(""); // Reset tracking
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch {
      setError("Failed to process code. Please try again.");
    }

    setIsLoading(false);
  };

  // Fuzzy email matching function
  const findBestEmailMatch = (searchEmail, registeredUsers) => {
    if (!searchEmail) return null;

    const searchEmailLower = searchEmail.toLowerCase();

    // Extract consecutive letter sequences (5+ characters) from search email
    const searchSequences = searchEmailLower.match(/[a-z]{5,}/g) || [];

    if (searchSequences.length === 0) {
      // Fallback to exact match if no long sequences found
      return registeredUsers.find(
        (u) => u.email?.toLowerCase() === searchEmailLower
      );
    }

    let bestMatch = null;
    let bestScore = 0;

    registeredUsers.forEach((user) => {
      if (!user.email) return;

      const userEmailLower = user.email.toLowerCase();
      let score = 0;

      // Check each search sequence against user email
      searchSequences.forEach((sequence) => {
        if (userEmailLower.includes(sequence)) {
          score += sequence.length; // Longer matches get higher scores
        }
      });

      // Bonus points for exact match
      if (userEmailLower === searchEmailLower) {
        score += 1000;
      }

      // Bonus points for domain match
      const searchDomain = searchEmailLower.split("@")[1];
      const userDomain = userEmailLower.split("@")[1];
      if (searchDomain && userDomain && searchDomain === userDomain) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = user;
      }
    });

    // Only return match if we found meaningful similarity
    return bestScore >= 5 ? bestMatch : null;
  };
  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter a code");
      return;
    }

    // Prevent double processing if auto-search already handled this code
    if (lastProcessedCode === code.trim()) {
      console.log(
        "Code already processed by auto-search, skipping manual submit"
      );
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
      setLastProcessedCode(code.trim()); // Track that this code was processed

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

        // Clear the code input after successful processing
        setCode("");
        setParsedJson(null);
        setInputType("single");
        setSearchField("auto");
        setLastProcessedCode(""); // Reset tracking
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
      // Use fuzzy email matching
      user = findBestEmailMatch(searchValue, registeredUsers);
    } else if (searchCriteria === "name") {
      user = registeredUsers.find(
        (u) =>
          u.name?.toLowerCase() === searchValue.toLowerCase() ||
          u.name?.toLowerCase().includes(searchValue.toLowerCase())
      );
    } else {
      // Auto search - try all fields with fuzzy email matching
      user = registeredUsers.find(
        (u) =>
          u.id === searchValue ||
          u.phone === searchValue ||
          u.backupCode === searchValue ||
          u.name?.toLowerCase().includes(searchValue.toLowerCase())
      );

      // If no exact match found, try fuzzy email matching
      if (!user) {
        user = findBestEmailMatch(searchValue, registeredUsers);
      }
    }

    if (!user) {
      const searchTypeText =
        inputType === "json" ? `using ${searchCriteria}` : "";
      const fuzzyText =
        searchCriteria === "email" ? " (tried fuzzy matching)" : "";
      return {
        success: false,
        message: `No matching user found ${searchTypeText}${fuzzyText}. Please verify the ${
          searchCriteria === "auto" ? "information" : searchCriteria
        } and try again.`,
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

      const fuzzyMatchText =
        searchCriteria === "email" && searchValue !== user.email
          ? ` (matched via similar email: ${user.email})`
          : "";

      return {
        success: true,
        message: `${user.name} checked out successfully${fuzzyMatchText}`,
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

      const fuzzyMatchText =
        searchCriteria === "email" && searchValue !== user.email
          ? ` (matched via similar email: ${user.email})`
          : "";

      return {
        success: true,
        message: `${user.name} checked in successfully${fuzzyMatchText}`,
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
              Paste any QR code data (even corrupted) - Smart fuzzy email
              matching with auto-search
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
                    placeholder={`Paste any QR code data (auto-searches):

Format 1: {"id":"USR8A","email":"AISHA.AHMED@FIRS.GOV.NG"}"AISHA.AHMED@FIRS.GOV.NG"}

Format 2: {"id":"USAH4679N BABAYO","emaiS.GOV.NG"}
AHMAN.GIDADO@FIRS.GOV.NG"}
AHMAN.GIDADO@FIRS.GOV.NG"}

Or enter manually: backup123, user@email.com, John Doe`}
                    autoComplete="off"
                    rows={inputType === "json" ? 6 : 1}
                  />
                  <button
                    type="submit"
                    className="search-btn"
                    disabled={isLoading || !code.trim()}
                    title="Manual search (QR codes auto-search)"
                  >
                    {isLoading ? <div className="loading"></div> : <FaSearch />}
                  </button>
                </div>

                <div className="input-type-indicator">
                  {inputType === "json" ? (
                    <span className="type-badge json-badge">
                      <FaCode /> QR Mode - Auto-Search
                    </span>
                  ) : (
                    <span className="type-badge single-badge">
                      <FaKeyboard /> Manual Entry
                    </span>
                  )}
                  {isLoading && (
                    <span className="type-badge loading-badge">
                      <div className="mini-loading"></div> Searching...
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
                    inputType === "json" && (
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
