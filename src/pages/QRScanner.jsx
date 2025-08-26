import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  FaQrcode,
  FaPlay,
  FaStop,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { storage, STORAGE_KEYS, generateId } from "../utils/storage";
import "./QRScanner.css";

const QRScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [autoClearCountdown, setAutoClearCountdown] = useState(0);
  const html5QrcodeScannerRef = useRef(null);

  useEffect(() => {
    // Initialize scan history as empty array (no localStorage)
    setScanHistory([]);

    return () => {
      // Cleanup scanner when component unmounts
      if (html5QrcodeScannerRef.current) {
        try {
          html5QrcodeScannerRef.current.clear();
        } catch (error) {
          console.error("Error clearing scanner on unmount:", error);
        }
      }
    };
  }, []);

  // Fuzzy email matching function (same as ManualCode)
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

  // Enhanced QR data parsing (same as ManualCode)
  const parseQRData = (qrData) => {
    let extractedEmail = null;
    let extractedId = null;

    // Method 1: Extract email from anywhere in the text using regex
    const emailMatches = qrData.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    );
    if (emailMatches && emailMatches.length > 0) {
      extractedEmail = emailMatches[0];
    }

    // Method 2: Try to extract ID from JSON-like structure
    const idMatch = qrData.match(/"id"\s*:\s*"([^"]+)"/);
    if (idMatch) {
      extractedId = idMatch[1];
    }

    // Method 3: Try to fix and parse JSON if it looks like JSON
    if (qrData.trim().startsWith("{")) {
      try {
        let jsonFix = qrData.trim();

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

        return { email: extractedEmail, id: extractedId, originalData: qrData };
      } catch {
        // JSON parsing failed, use extracted values
        return { email: extractedEmail, id: extractedId, originalData: qrData };
      }
    }

    return { email: extractedEmail, id: extractedId, originalData: qrData };
  };

  const startScanning = async () => {
    setIsLoading(true);
    setScanError(null);
    setScanResult(null);

    try {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
      };

      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        config,
        false
      );

      html5QrcodeScannerRef.current = html5QrcodeScanner;

      html5QrcodeScanner.render(
        (decodedText, decodedResult) => {
          handleScanSuccess(decodedText, decodedResult);
        },
        () => {
          // Handle scan errors (can be ignored for continuous scanning)
        }
      );

      setIsScanning(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Error starting scanner:", error);
      setScanError("Failed to start camera. Please check permissions.");
      setIsLoading(false);
    }
  };

  const stopScanning = () => {
    if (html5QrcodeScannerRef.current) {
      try {
        html5QrcodeScannerRef.current.clear();
        setIsScanning(false);
        setScanError(null);
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleScanSuccess = async (decodedText, decodedResult) => {
    // Process the scanned QR code
    await processQRCode(decodedText);

    // Stop scanning after successful scan
    stopScanning();
  };

  const processQRCode = async (qrData) => {
    try {
      // Use enhanced parsing to handle corrupted QR codes
      const parsedData = parseQRData(qrData);
      console.log("Parsed QR data:", parsedData);

      // Check if user is registered
      const registeredUsers = await storage.get(
        STORAGE_KEYS.REGISTERED_USERS,
        []
      );

      // Use fuzzy matching to find user by email
      let user = null;

      if (parsedData.email) {
        user = findBestEmailMatch(parsedData.email, registeredUsers);
      }

      // Fallback to ID matching if email fuzzy matching didn't work
      if (!user && parsedData.id) {
        user = registeredUsers.find((u) => u.id === parsedData.id);
      }

      // Legacy fallback - try to parse as simple JSON
      if (!user) {
        let userData;
        try {
          userData = JSON.parse(qrData);
        } catch {
          userData = { id: qrData, name: "Unknown User" };
        }

        user = registeredUsers.find(
          (u) => u.id === userData.id || u.email === userData.email
        );
      }

      if (!user) {
        setScanResult({
          success: false,
          message: `User not found in registered users list. Searched for: ${
            parsedData.email || parsedData.id || qrData
          }`,
          data: parsedData,
        });
        return;
      }

      // Check current status
      const scanInList = await storage.get(STORAGE_KEYS.SCAN_IN_LIST, []);

      const isCheckedIn = scanInList.some((entry) => entry.userId === user.id);
      const timestamp = new Date().toISOString();

      if (isCheckedIn) {
        // User is checking out
        const checkInEntry = scanInList.find(
          (entry) => entry.userId === user.id
        );
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
          entryMethod: "qr",
          type: "scan-out",
        };

        // Use individual Firebase requests for each operation
        await storage.set(STORAGE_KEYS.SCAN_IN_LIST, updatedScanInList);
        await storage.addScanOut(scanOutEntry);

        setScanResult({
          success: true,
          message: `${user.name} checked out successfully`,
          data: { ...user, action: "check-out", timestamp },
        });
      } else {
        // User is checking in
        const scanInEntry = {
          id: generateId("IN"),
          userId: user.id,
          name: user.name,
          email: user.email,
          timestamp: timestamp,
          entryMethod: "qr",
          type: "scan-in",
        };

        // Use individual Firebase request for scan-in
        await storage.addScanIn(scanInEntry);

        setScanResult({
          success: true,
          message: `${user.name} checked in successfully`,
          data: { ...user, action: "check-in", timestamp },
        });
      }

      // Add to scan history
      const historyEntry = {
        id: Date.now(),
        qrData,
        result: "success",
        user: user.name,
        action: isCheckedIn ? "check-out" : "check-in",
        timestamp,
      };

      const updatedHistory = [historyEntry, ...scanHistory.slice(0, 9)]; // Keep last 10
      setScanHistory(updatedHistory);

      // Start auto-clear countdown after successful scan
      setAutoClearCountdown(5);
      const countdownInterval = setInterval(() => {
        setAutoClearCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Clear the results and restart scanning
            setScanResult(null);
            setScanError(null);
            if (!isScanning) {
              startScanning(); // Automatically restart scanning
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error processing QR code:", error);
      setScanResult({
        success: false,
        message: "Failed to process QR code",
        data: { error: error.message },
      });
    }
  };

  const clearResults = () => {
    setScanResult(null);
    setScanError(null);
  };

  return (
    <div className="qr-scanner fade-in">
      <div className="container">
        <div className="scanner-header">
          <FaQrcode className="scanner-icon" />
          <div>
            <h1 className="scanner-title">QR Code Scanner</h1>
            <p className="scanner-subtitle">
              Scan QR codes for quick check-in and check-out
            </p>
          </div>
        </div>

        <div className="scanner-content">
          <div className="scanner-section">
            <div className="scanner-controls">
              {!isScanning ? (
                <button
                  className="btn btn-primary scanner-btn"
                  onClick={startScanning}
                  disabled={isLoading}
                >
                  <FaPlay />
                  {isLoading ? "Starting Camera..." : "Start Scanning"}
                  {isLoading && <div className="loading"></div>}
                </button>
              ) : (
                <button
                  className="btn btn-danger scanner-btn"
                  onClick={stopScanning}
                >
                  <FaStop />
                  Stop Scanning
                </button>
              )}
            </div>

            <div className="scanner-area">
              <div
                id="qr-reader"
                className={`qr-reader ${isScanning ? "active" : ""}`}
              ></div>
              {!isScanning && !isLoading && (
                <div className="scanner-placeholder">
                  <FaQrcode className="placeholder-icon" />
                  <p>Click &quot;Start Scanning&quot; to begin</p>
                </div>
              )}
            </div>

            {scanError && (
              <div className="alert alert-error">
                <FaTimesCircle />
                <span>{scanError}</span>
                <button className="clear-btn" onClick={clearResults}>
                  ×
                </button>
              </div>
            )}

            {scanResult && (
              <div
                className={`alert ${
                  scanResult.success ? "alert-success" : "alert-error"
                }`}
              >
                {scanResult.success ? <FaCheckCircle /> : <FaTimesCircle />}
                <div className="alert-content">
                  <div className="alert-message">{scanResult.message}</div>
                  {scanResult.data && (
                    <div className="alert-details">
                      <small>
                        Action: {scanResult.data.action || "scan"} | Time:{" "}
                        {new Date(
                          scanResult.data.timestamp || Date.now()
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

            {autoClearCountdown > 0 && (
              <div className="countdown-alert">
                <div className="countdown-content">
                  <span className="countdown-text">
                    Auto-clearing in {autoClearCountdown} seconds...
                  </span>
                  <div className="countdown-bar">
                    <div
                      className="countdown-progress"
                      style={{
                        width: `${(autoClearCountdown / 5) * 100}%`,
                        transition: "width 1s linear",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="history-section">
            <h3 className="history-title">Recent Scans</h3>
            {scanHistory.length === 0 ? (
              <div className="empty-history">
                <p>No recent scans</p>
              </div>
            ) : (
              <div className="history-list">
                {scanHistory.map((entry) => (
                  <div key={entry.id} className="history-item">
                    <div className="history-header">
                      <span className="history-user">{entry.user}</span>
                      <span className={`history-action ${entry.action}`}>
                        {entry.action}
                      </span>
                    </div>
                    <div className="history-time">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
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

export default QRScanner;
