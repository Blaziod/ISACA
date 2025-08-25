// Utility functions for local storage operations

export const storage = {
  // Get data from localStorage
  get: (key, defaultValue = []) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return defaultValue;
    }
  },

  // Set data in localStorage
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing ${key} to localStorage:`, error);
      return false;
    }
  },

  // Remove item from localStorage
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
