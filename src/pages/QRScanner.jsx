import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  FaQrcode,
  FaCheckCircle,
  FaTimesCircle,
  FaUser,
  FaClock,
  FaPlay,
  FaStop,
  FaCamera,
} from "react-icons/fa";
import { storage, STORAGE_KEYS, generateId } from "../utils/storage";
import "./QRScanner.css";

const QRScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [autoClearCountdown, setAutoClearCountdown] = useState(0);
  const [scanHistory, setScanHistory] = useState([]);
  const [cameraPermission, setCameraPermission] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    // Check camera permission on mount
    checkCameraPermission();

    // Cleanup scanner on unmount
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraPermission(true);
      // Stop the stream immediately as we just wanted to check permission
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("Camera permission denied:", error);
      setCameraPermission(false);
      setScanError(
        "Camera permission is required for QR scanning. Please allow camera access and refresh the page."
      );
    }
  };

  const startScanning = () => {
    if (!cameraPermission) {
      setScanError(
        "Camera permission is required. Please allow camera access and refresh the page."
      );
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setScanError(null);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false,
      supportedScanTypes: [Html5QrcodeSupportedFormats.QR_CODE],
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
      rememberLastUsedCamera: true,
      showTorchButtonIfSupported: true,
    };

    try {
      const scanner = new Html5QrcodeScanner("qr-reader", config, false);
      html5QrCodeRef.current = scanner;
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => handleScanSuccess(decodedText),
        (error) => handleScanError(error)
      );

      console.log("QR Scanner started successfully");
    } catch (error) {
      console.error("Failed to start scanner:", error);
      setScanError(
        "Failed to initialize QR scanner. Please refresh the page and try again."
      );
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current
        .clear()
        .then(() => {
          console.log("QR Scanner stopped successfully");
        })
        .catch((error) => {
          console.error("Error stopping scanner:", error);
        });
      html5QrCodeRef.current = null;
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (decodedText) => {
    console.log("QR Code scanned:", decodedText);

    // Stop scanning immediately to prevent multiple scans
    stopScanning();

    // Process the scanned QR code
    await processQRCode(decodedText);
  };

  const handleScanError = (error) => {
    // Only log errors, don't show them to user as they're frequent during scanning
    if (error && !error.includes("QR code not found")) {
      console.log("Scan error:", error);
    }
  };

  const processQRCode = async (qrData) => {
    try {
      // QR code should only contain email - no parsing needed
      const email = qrData.trim();
      console.log("Processing scanned email:", email);

      // Basic email validation
      if (!email.includes("@") || !email.includes(".")) {
        setScanResult({
          success: false,
          message: `Invalid QR code format. Expected email address, got: ${email}`,
          data: { email },
        });
        return;
      }

      // Check if user is registered
      const registeredUsers = await storage.get(
        STORAGE_KEYS.REGISTERED_USERS,
        []
      );

      // Find user by exact email match only
      const user = registeredUsers.find((u) => u.email === email);

      if (!user) {
        setScanResult({
          success: false,
          message: `No registered user found with email: ${email}`,
          data: { email },
        });

        // Add to scan history even for failed scans
        addToScanHistory({
          qrData: email,
          result: "failed",
          user: "Unknown",
          action: "not-found",
          timestamp: new Date().toISOString(),
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

        // Update storage
        await storage.set(STORAGE_KEYS.SCAN_IN_LIST, updatedScanInList);
        await storage.addScanOut(scanOutEntry);

        setScanResult({
          success: true,
          message: `${user.name} checked out successfully`,
          data: { ...user, action: "check-out", timestamp, duration },
        });

        // Add to scan history
        addToScanHistory({
          qrData: email,
          result: "success",
          user: user.name,
          action: "check-out",
          timestamp,
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

        // Update storage
        await storage.addScanIn(scanInEntry);

        setScanResult({
          success: true,
          message: `${user.name} checked in successfully`,
          data: { ...user, action: "check-in", timestamp },
        });

        // Add to scan history
        addToScanHistory({
          qrData: email,
          result: "success",
          user: user.name,
          action: "check-in",
          timestamp,
        });
      }

      // Start auto-clear countdown after successful scan
      if (scanResult?.success) {
        setAutoClearCountdown(5);
        const countdownInterval = setInterval(() => {
          setAutoClearCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              // Clear the results and restart scanning
              setScanResult(null);
              setScanError(null);
              if (!isScanning) {
                setTimeout(() => startScanning(), 500); // Small delay before restarting
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      setScanResult({
        success: false,
        message: "Failed to process QR code. Please try again.",
        data: { error: error.message },
      });

      // Add error to scan history
      addToScanHistory({
        qrData: qrData,
        result: "error",
        user: "Error",
        action: "error",
        timestamp: new Date().toISOString(),
      });
    }
  };

  const addToScanHistory = (historyEntry) => {
    const entryWithId = {
      ...historyEntry,
      id: Date.now() + Math.random(), // Ensure unique ID
    };

    setScanHistory((prevHistory) => {
      const updatedHistory = [entryWithId, ...prevHistory.slice(0, 9)]; // Keep last 10
      return updatedHistory;
    });
  };

  const clearResults = () => {
    setScanResult(null);
    setScanError(null);
    setAutoClearCountdown(0);
  };

  const restartScanning = () => {
    clearResults();
    if (!isScanning) {
      startScanning();
    }
  };

  return (
    <div className="qr-scanner fade-in">
      <div className="container">
        <div className="scanner-header">
          <FaQrcode className="scanner-icon" />
          <div>
            <h1 className="scanner-title">QR Code Scanner</h1>
            <p className="scanner-subtitle">
              Scan QR codes for quick check-in/check-out
            </p>
            {cameraPermission === false && (
              <div className="permission-warning">
                <FaCamera />
                <span>Camera access required</span>
              </div>
            )}
          </div>
        </div>

        <div className="scanner-content">
          <div className="scanner-section">
            <div className="scanner-controls">
              {!isScanning ? (
                <button
                  className="btn btn-primary scanner-btn"
                  onClick={startScanning}
                  disabled={cameraPermission === false}
                >
                  <FaPlay />
                  Start Scanning
                </button>
              ) : (
                <button
                  className="btn btn-secondary scanner-btn"
                  onClick={stopScanning}
                >
                  <FaStop />
                  Stop Scanning
                </button>
              )}

              {scanResult && (
                <button
                  className="btn btn-outline scanner-btn"
                  onClick={restartScanning}
                >
                  <FaQrcode />
                  Scan Again
                </button>
              )}
            </div>

            <div className="scanner-area">
              {isScanning && (
                <div className="scanner-container">
                  <div id="qr-reader"></div>
                  <div className="scanning-overlay">
                    <div className="scanning-frame"></div>
                    <p className="scanning-text">
                      Position QR code within the frame
                    </p>
                  </div>
                </div>
              )}

              {!isScanning && !scanResult && !scanError && (
                <div className="scanner-placeholder">
                  <FaQrcode className="placeholder-icon" />
                  <h3>Ready to Scan</h3>
                  <p>Click Start Scanning to begin</p>
                  <div className="scanner-tips">
                    <h4>Scanning Tips:</h4>
                    <ul>
                      <li>Hold device steady</li>
                      <li>Ensure good lighting</li>
                      <li>Position QR code within frame</li>
                      <li>Keep QR code flat and clean</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {scanResult && (
              <div
                className={`alert ${
                  scanResult.success ? "alert-success" : "alert-error"
                }`}
              >
                {scanResult.success ? <FaCheckCircle /> : <FaTimesCircle />}
                <div className="alert-content">
                  <div className="alert-message">{scanResult.message}</div>
                  {autoClearCountdown > 0 && scanResult.success && (
                    <div className="auto-clear-notice">
                      🔄 Auto-restarting scan in {autoClearCountdown} second
                      {autoClearCountdown !== 1 ? "s" : ""}...
                    </div>
                  )}
                  {scanResult.data && scanResult.data.name && (
                    <div className="alert-details">
                      <div className="user-info">
                        <FaUser className="user-icon" />
                        <span className="user-name">
                          {scanResult.data.name}
                        </span>
                        {scanResult.data.email && (
                          <span className="user-email">
                            {scanResult.data.email}
                          </span>
                        )}
                      </div>
                      <div className="scan-metadata">
                        <span className="scan-action">
                          Action: {scanResult.data.action}
                        </span>
                        <span className="scan-time">
                          Time:{" "}
                          {new Date(
                            scanResult.data.timestamp
                          ).toLocaleTimeString()}
                        </span>
                        {scanResult.data.duration && (
                          <span className="scan-duration">
                            Duration: {scanResult.data.duration} minutes
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button className="clear-btn" onClick={clearResults}>
                  ×
                </button>
              </div>
            )}

            {scanError && (
              <div className="alert alert-error">
                <FaTimesCircle />
                <div className="alert-content">
                  <div className="alert-message">{scanError}</div>
                  <div className="error-actions">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => window.location.reload()}
                    >
                      Refresh Page
                    </button>
                  </div>
                </div>
                <button
                  className="clear-btn"
                  onClick={() => setScanError(null)}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="history-section">
            <h3 className="history-title">
              <FaClock />
              Recent Scans ({scanHistory.length})
            </h3>
            {scanHistory.length === 0 ? (
              <div className="empty-history">
                <FaClock className="empty-icon" />
                <p>No scans yet</p>
                <small>Scan history will appear here</small>
              </div>
            ) : (
              <div className="history-list">
                {scanHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className={`history-item ${entry.result}`}
                  >
                    <div className="history-header">
                      <span className="history-user">{entry.user}</span>
                      <span className={`history-action ${entry.action}`}>
                        {entry.action}
                      </span>
                    </div>
                    <div className="history-details">
                      <span className="history-time">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                      <span className={`history-result ${entry.result}`}>
                        {entry.result}
                      </span>
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
