// Firebase-only storage operations
import {
  getRegisteredUsers,
  setRegisteredUsers,
  getScanInList,
  setScanInList,
  getScanOutList,
  setScanOutList,
  addScanInEntry,
  addScanOutEntry,
  getStorageStatus,
  waitForStorageInitialization,
  exportAllData,
  importAllData,
} from "./firebaseStorage";

// Data key constants
export const STORAGE_KEYS = {
  REGISTERED_USERS: "registeredUsers",
  SCAN_IN_LIST: "scanInList",
  SCAN_OUT_LIST: "scanOutList",
  SCAN_HISTORY: "scanHistory",
  RECENT_CODES: "recentCodes",
};

export const storage = {
  // Get data from Firebase only
  get: async (key, defaultValue = []) => {
    try {
      switch (key) {
        case STORAGE_KEYS.REGISTERED_USERS:
          return await getRegisteredUsers();
        case STORAGE_KEYS.SCAN_IN_LIST:
          return await getScanInList();
        case STORAGE_KEYS.SCAN_OUT_LIST:
          return await getScanOutList();
        default:
          console.warn(`Unknown storage key: ${key}. Returning default value.`);
          return defaultValue;
      }
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      throw error; // Let the calling code handle Firebase errors
    }
  },

  // Set data in Firebase only
  set: async (key, value) => {
    try {
      switch (key) {
        case STORAGE_KEYS.REGISTERED_USERS:
          return await setRegisteredUsers(value);
        case STORAGE_KEYS.SCAN_IN_LIST:
          return await setScanInList(value);
        case STORAGE_KEYS.SCAN_OUT_LIST:
          return await setScanOutList(value);
        default:
          console.warn(`Unknown storage key: ${key}. Data not saved.`);
          throw new Error(`Unknown storage key: ${key}`);
      }
    } catch (error) {
      console.error(`Error writing ${key}:`, error);
      throw error; // Let the calling code handle Firebase errors
    }
  },

  // Add single item to Firebase list (individual scan operations)
  addScanIn: async (entry) => {
    console.log("🔥 Adding individual scan-in entry:", entry);
    return await addScanInEntry(entry);
  },

  addScanOut: async (entry) => {
    console.log("🔥 Adding individual scan-out entry:", entry);
    return await addScanOutEntry(entry);
  },

  // Initialize Firebase (ensure connection)
  initialize: async () => {
    return await waitForStorageInitialization();
  },

  // Get status
  getStatus: () => getStorageStatus(),

  // Export/Import
  exportAll: async () => await exportAllData(),
  importAll: async (data) => await importAllData(data),
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

// Export default
export default storage;
