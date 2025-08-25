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
  const html5QrcodeScannerRef = useRef(null);

  useEffect(() => {
    // Load scan history from localStorage
    const history = JSON.parse(localStorage.getItem("scanHistory") || "[]");
    setScanHistory(history);

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
      // Parse QR data (assuming it's JSON with user info)
      let userData;
      try {
        userData = JSON.parse(qrData);
      } catch {
        // If not JSON, treat as simple ID
        userData = { id: qrData, name: "Unknown User" };
      }

      // Check if user is registered
      const registeredUsers = await storage.get(
        STORAGE_KEYS.REGISTERED_USERS,
        []
      );
      const user = registeredUsers.find(
        (u) => u.id === userData.id || u.email === userData.email
      );

      if (!user) {
        setScanResult({
          success: false,
          message: "User not found in registered users list",
          data: userData,
        });
        return;
      }

      // Check current status
      const scanInList = await storage.get(STORAGE_KEYS.SCAN_IN_LIST, []);
      const scanOutList = await storage.get(STORAGE_KEYS.SCAN_OUT_LIST, []);

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

        await storage.set(STORAGE_KEYS.SCAN_IN_LIST, updatedScanInList);
        await storage.set(STORAGE_KEYS.SCAN_OUT_LIST, [
          ...scanOutList,
          scanOutEntry,
        ]);

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

        await storage.set(STORAGE_KEYS.SCAN_IN_LIST, [
          ...scanInList,
          scanInEntry,
        ]);

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
      localStorage.setItem("scanHistory", JSON.stringify(updatedHistory));
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
