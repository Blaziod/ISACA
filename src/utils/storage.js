// Utility functions for local storage operations

// Utility functions for Firebase and local storage operations
import {
  getRegisteredUsers,
  setRegisteredUsers,
  getScanInList,
  setScanInList,
  getScanOutList,
  setScanOutList,
  getStorageStatus,
  syncData,
  waitForStorageInitialization,
  exportAllData,
  importAllData,
} from "./firebaseStorage";

export const storage = {
  // Get data from cloud/localStorage
  get: async (key, defaultValue = []) => {
    try {
      switch (key) {
        case STORAGE_KEYS.REGISTERED_USERS:
          return await getRegisteredUsers();
        case STORAGE_KEYS.SCAN_IN_LIST:
          return await getScanInList();
        case STORAGE_KEYS.SCAN_OUT_LIST:
          return await getScanOutList();
        default: {
          // Fallback to localStorage for other keys
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : defaultValue;
        }
      }
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      // Fallback to localStorage
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    }
  },

  // Set data in cloud/localStorage
  set: async (key, value) => {
    try {
      switch (key) {
        case STORAGE_KEYS.REGISTERED_USERS:
          await setRegisteredUsers(value);
          break;
        case STORAGE_KEYS.SCAN_IN_LIST:
          await setScanInList(value);
          break;
        case STORAGE_KEYS.SCAN_OUT_LIST:
          await setScanOutList(value);
          break;
        default: {
          // Fallback to localStorage for other keys
          localStorage.setItem(key, JSON.stringify(value));
        }
      }
      return true;
    } catch (error) {
      console.error(`Error writing ${key}:`, error);
      // Fallback to localStorage
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }
  },

  // Remove item from localStorage (cloud items are managed differently)
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
      return false;
    }
  },

  // Clear all localStorage
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Error clearing localStorage:", error);
      return false;
    }
  },

  // Get storage status
  getStatus: () => getStorageStatus(),

  // Sync data
  sync: () => syncData(),

  // Initialize storage (wait for Firebase connection)
  initialize: () => waitForStorageInitialization(),

  // Backup and restore functions
  exportAll: () => exportAllData(),
  importAll: (data) => importAllData(data),
};

// Data key constants
export const STORAGE_KEYS = {
  REGISTERED_USERS: "registeredUsers",
  SCAN_IN_LIST: "scanInList",
  SCAN_OUT_LIST: "scanOutList",
  SCAN_HISTORY: "scanHistory",
  RECENT_CODES: "recentCodes",
};

// Generate unique ID
export const generateId = (prefix = "ID") => {
  return `${prefix}${Date.now().toString().slice(-6)}${Math.random()
    .toString(36)
    .substring(2, 4)
    .toUpperCase()}`;
};

// Generate backup code
export const generateBackupCode = () => {
  return `BAK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

// Format date and time
export const formatDateTime = (date) => {
  return new Date(date).toLocaleString();
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString();
};

// Export data as CSV
export const exportToCSV = (data, headers, filename) => {
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || "";
          return typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Re-export functions for direct access (already imported from firebaseStorage)
export {
  getStorageStatus,
  syncData,
  waitForStorageInitialization,
  exportAllData,
  importAllData,
};
