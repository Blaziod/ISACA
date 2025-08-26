import { useState } from "react";
import {
  FaDownload,
  FaUpload,
  FaTrash,
  FaDatabase,
  FaCloudUploadAlt,
  FaExclamationTriangle,
} from "react-icons/fa";
import { storage, getStorageStatus } from "../utils/storage";
import "./DataManagement.css";

const DataManagement = () => {
  const [status, setStatus] = useState(getStorageStatus());
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const updateStatus = () => {
    setStatus(getStorageStatus());
  };

  const exportData = async () => {
    try {
      setIsLoading(true);
      const data = await storage.exportAll();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `access-idcode-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage("✅ Data exported successfully!");
    } catch (error) {
      setMessage("❌ Export failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);

      await storage.importAll(data);
      updateStatus();
      setMessage("✅ Data imported successfully!");
    } catch (error) {
      setMessage("❌ Import failed: " + error.message);
    } finally {
      setIsLoading(false);
      event.target.value = ""; // Reset file input
    }
  };

  const clearAllData = async () => {
    if (
      !window.confirm(
        "⚠️ This will delete ALL data including registered users and scan history. This cannot be undone. Are you sure?"
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      await storage.clearAllData();
      updateStatus();
      setMessage("✅ All data cleared successfully!");
    } catch (error) {
      setMessage("❌ Clear failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const syncData = async () => {
    try {
      setIsLoading(true);
      // Firebase-only storage doesn't need manual sync
      updateStatus();
      setMessage("✅ Firebase storage is always synced!");
    } catch (error) {
      setMessage("❌ Error checking status: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="data-management fade-in">
      <div className="container">
        <div className="header">
          <FaDatabase className="header-icon" />
          <div>
            <h1>Data Management</h1>
            <p>Backup, restore, and manage your application data</p>
          </div>
        </div>

        {/* Storage Status */}
        <div className="status-card">
          <h3>Storage Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Mode:</span>
              <span className={`status-value ${status.storageMode}`}>
                {status.storageMode === "firebase"
                  ? "☁️ Firebase"
                  : "💾 Local Only"}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Connection:</span>
              <span
                className={`status-value ${
                  status.isOnline ? "online" : "offline"
                }`}
              >
                {status.isOnline ? "🟢 Online" : "🔴 Offline"}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Firebase:</span>
              <span
                className={`status-value ${
                  status.firebaseAvailable ? "available" : "unavailable"
                }`}
              >
                {status.firebaseAvailable ? "✅ Available" : "❌ Unavailable"}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Initialized:</span>
              <span
                className={`status-value ${
                  status.initialized ? "ready" : "loading"
                }`}
              >
                {status.initialized ? "✅ Ready" : "⏳ Loading"}
              </span>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={updateStatus}>
            🔄 Refresh Status
          </button>
        </div>

        {/* Actions */}
        <div className="actions-grid">
          <div className="action-card">
            <FaDownload className="action-icon export" />
            <h3>Export Data</h3>
            <p>Download a backup of all your data as a JSON file</p>
            <button
              className="btn btn-primary"
              onClick={exportData}
              disabled={isLoading}
            >
              {isLoading ? "Exporting..." : "Export Backup"}
            </button>
          </div>

          <div className="action-card">
            <FaUpload className="action-icon import" />
            <h3>Import Data</h3>
            <p>Restore data from a backup file</p>
            <label className="btn btn-success">
              {isLoading ? "Importing..." : "Choose Backup File"}
              <input
                type="file"
                accept=".json"
                onChange={importData}
                style={{ display: "none" }}
                disabled={isLoading}
              />
            </label>
          </div>

          <div className="action-card">
            <FaCloudUploadAlt className="action-icon sync" />
            <h3>Sync Data</h3>
            <p>Force sync local data to Firebase</p>
            <button
              className="btn btn-info"
              onClick={syncData}
              disabled={isLoading || !status.firebaseAvailable}
            >
              {isLoading ? "Syncing..." : "Sync Now"}
            </button>
          </div>

          <div className="action-card danger">
            <FaTrash className="action-icon clear" />
            <h3>Clear All Data</h3>
            <p>⚠️ Permanently delete all data (use with caution)</p>
            <button
              className="btn btn-danger"
              onClick={clearAllData}
              disabled={isLoading}
            >
              {isLoading ? "Clearing..." : "Clear All Data"}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`message ${
              message.includes("❌") ? "error" : "success"
            }`}
          >
            {message}
            <button className="message-close" onClick={() => setMessage("")}>
              ×
            </button>
          </div>
        )}

        {/* Warnings */}
        {!status.firebaseAvailable && (
          <div className="warning-card">
            <FaExclamationTriangle className="warning-icon" />
            <h3>Firebase Not Available</h3>
            <p>
              Your data is currently stored locally only. It will be lost when
              you deploy to production. Please set up Firebase following the
              instructions in <code>FIREBASE_SETUP.md</code>
            </p>
          </div>
        )}

        {/* Data Summary */}
        <div className="summary-card">
          <h3>Quick Tips</h3>
          <ul>
            <li>
              💾 <strong>Export regularly:</strong> Create backups before major
              changes
            </li>
            <li>
              ☁️ <strong>Use Firebase:</strong> Ensures data persists across
              deployments
            </li>
            <li>
              🔄 <strong>Sync when switching devices:</strong> Keeps data up to
              date
            </li>
            <li>
              ⚠️ <strong>Clear with caution:</strong> This action cannot be
              undone
            </li>
            <li>
              🔧 <strong>Check status:</strong> Green indicators mean everything
              is working
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
