import { ref, set, get, remove } from "firebase/database";
import { database } from "./firebaseConfig";

// Storage keys for Firebase paths
export const STORAGE_KEYS = {
  REGISTERED_USERS: "registeredUsers",
  SCAN_IN_LIST: "scanInList",
  SCAN_OUT_LIST: "scanOutList",
  SCAN_HISTORY: "scanHistory",
  RECENT_CODES: "recentCodes",
};

class FirebaseStorageService {
  constructor() {
    this.firebaseAvailable = true;
    this.initialized = false;
    this.pendingOperations = new Map(); // Track pending operations
    this.authUser = null; // Track current authenticated user

    // Don't initialize immediately - wait for auth
    this.initializeService();
  }

  async initializeService() {
    console.log("🔥 Initializing Firebase Storage Service...");
    try {
      // Just mark as initialized - we'll check auth on each operation
      this.firebaseAvailable = true;
      this.initialized = true;
      console.log("✅ Firebase Storage Service initialized (auth-aware mode)");
    } catch (error) {
      console.error("❌ Firebase initialization failed:", error);
      this.firebaseAvailable = false;
      this.initialized = true; // Still mark as initialized even if failed
    }
  }

  // Set the current authenticated user
  setAuthUser(user) {
    this.authUser = user;
    console.log(`🔐 Auth user set: ${user ? user.email : "none"}`);
  }

  // Check if user is authenticated
  checkAuthRequired() {
    if (!this.authUser) {
      throw new Error("Authentication required. Please log in to access data.");
    }
  }

  // Get data directly from Firebase
  async getData(key) {
    console.log(`🔍 getData called for ${key}`);

    if (!this.firebaseAvailable) {
      throw new Error("Firebase is not available. Cannot retrieve data.");
    }

    // Check if user is authenticated
    this.checkAuthRequired();

    try {
      console.log(`🔥 Fetching ${key} from Firebase...`);
      const dataRef = ref(database, key);
      const snapshot = await get(dataRef);

      if (snapshot.exists()) {
        const firebaseData = snapshot.val();
        let data = [];

        // Handle new format with metadata
        if (firebaseData && firebaseData.items) {
          data = Array.isArray(firebaseData.items)
            ? firebaseData.items
            : Object.values(firebaseData.items || {});
          console.log(
            `✅ Firebase data loaded for ${key} (${data.length} items, version: ${firebaseData.version})`
          );
        }
        // Handle old format (direct array/object)
        else {
          data = Array.isArray(firebaseData)
            ? firebaseData
            : Object.values(firebaseData || {});
          console.log(
            `✅ Firebase data loaded for ${key} (${data.length} items, legacy format)`
          );
        }

        return [...data];
      } else {
        console.log(`📭 No Firebase data found for ${key}`);
        return [];
      }
    } catch (error) {
      console.error(`❌ Firebase get failed for ${key}:`, error);
      throw new Error(`Failed to fetch ${key} from Firebase: ${error.message}`);
    }
  }

  // Set data directly to Firebase
  async setData(key, data) {
    console.log(
      `🔥 setData called for ${key}:`,
      Array.isArray(data) ? `${data.length} items` : data
    );

    if (!this.firebaseAvailable) {
      throw new Error("Firebase is not available. Cannot save data.");
    }

    // Check if user is authenticated
    this.checkAuthRequired();

    // Prevent concurrent operations on the same key
    if (this.pendingOperations.has(key)) {
      console.log(`⏳ Operation already pending for ${key}, waiting...`);
      await this.pendingOperations.get(key);
    }

    // Create operation promise
    const operationPromise = this._performSetOperation(key, data);
    this.pendingOperations.set(key, operationPromise);

    try {
      await operationPromise;
    } finally {
      this.pendingOperations.delete(key);
    }

    return data;
  }

  async _performSetOperation(key, data) {
    // Validate data
    if (!Array.isArray(data)) {
      console.warn(`⚠️ Data for ${key} is not an array, converting...`);
      data = data ? [data] : [];
    }

    try {
      console.log(`🔥 Writing to Firebase for ${key}...`);
      const dataRef = ref(database, key);

      // Add metadata to Firebase data
      const firebaseData = {
        items: data,
        lastUpdated: Date.now(),
        version: this.generateVersion(),
      };

      await set(dataRef, firebaseData);
      console.log(
        `✅ Firebase write successful for ${key} (${data.length} items)`
      );
    } catch (error) {
      console.error(`❌ Firebase write failed for ${key}:`, error);
      throw new Error(`Failed to save ${key} to Firebase: ${error.message}`);
    }
  }

  generateVersion() {
    return `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add a single item to a Firebase list
  async addItem(key, item) {
    console.log(`🔥 Adding single item to ${key}:`, item);

    if (!this.firebaseAvailable) {
      throw new Error("Firebase is not available. Cannot add item.");
    }

    // Get current data and add new item
    const currentData = await this.getData(key);
    const newData = [...currentData, item];

    // Save back to Firebase
    await this.setData(key, newData);

    console.log(`✅ Item added to ${key} (now ${newData.length} items)`);
    return newData;
  }

  // Remove item from list by ID
  async removeItem(key, itemId) {
    console.log(`🔥 Removing item ${itemId} from ${key}`);

    if (!this.firebaseAvailable) {
      throw new Error("Firebase is not available. Cannot remove item.");
    }

    const currentData = await this.getData(key);
    const newData = currentData.filter((item) => item.id !== itemId);

    await this.setData(key, newData);

    console.log(`✅ Item removed from ${key} (now ${newData.length} items)`);
    return newData;
  }

  // Update item in list by ID
  async updateItem(key, itemId, updatedItem) {
    console.log(`🔥 Updating item ${itemId} in ${key}:`, updatedItem);

    if (!this.firebaseAvailable) {
      throw new Error("Firebase is not available. Cannot update item.");
    }

    const currentData = await this.getData(key);
    const newData = currentData.map((item) =>
      item.id === itemId ? { ...item, ...updatedItem } : item
    );

    await this.setData(key, newData);

    console.log(`✅ Item updated in ${key}`);
    return newData;
  }

  // Clear all data from Firebase
  async clearAllData() {
    if (!this.firebaseAvailable) {
      throw new Error("Firebase is not available. Cannot clear data.");
    }

    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        const dataRef = ref(database, key);
        await remove(dataRef);
        console.log(`✅ Cleared ${key} from Firebase`);
      }
      console.log("✅ All data cleared from Firebase");
    } catch (error) {
      console.error("❌ Firebase clear failed:", error);
      throw new Error(`Failed to clear data from Firebase: ${error.message}`);
    }
  }

  // Get storage status
  getStatus() {
    return {
      firebaseAvailable: this.firebaseAvailable,
      initialized: this.initialized,
      pendingOperations: this.pendingOperations.size,
      isOnline: this.firebaseAvailable && navigator.onLine, // Check both Firebase and network
      cacheSize: 0, // No cache in Firebase-only mode
      queueSize: 0, // No queue in Firebase-only mode
      storageMode: this.firebaseAvailable ? "firebase" : "offline", // Add storage mode for navigation
    };
  }

  // Wait for initialization to complete
  async waitForInitialization() {
    if (this.initialized) return;

    // Poll until initialized
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Firebase initialization timeout"));
      }, 10000); // 10 second timeout

      const checkInitialized = () => {
        if (this.initialized) {
          clearTimeout(timeout);
          if (this.firebaseAvailable) {
            resolve();
          } else {
            reject(new Error("Firebase is not available"));
          }
        } else {
          setTimeout(checkInitialized, 100);
        }
      };
      checkInitialized();
    });
  }

  // Check data integrity and repair if needed
  async verifyDataIntegrity() {
    console.log("🔍 Verifying data integrity...");

    if (!this.firebaseAvailable) {
      throw new Error(
        "Firebase is not available. Cannot verify data integrity."
      );
    }

    for (const key of Object.values(STORAGE_KEYS)) {
      try {
        const data = await this.getData(key);

        // Check if data is valid
        if (!Array.isArray(data)) {
          console.warn(`⚠️ Invalid data type for ${key}, converting to array`);
          await this.setData(key, []);
          continue;
        }

        // Check for duplicates (by id field)
        const seen = new Set();
        const duplicates = [];
        const cleaned = data.filter((item) => {
          if (!item || !item.id) {
            duplicates.push(item);
            return false;
          }
          if (seen.has(item.id)) {
            duplicates.push(item);
            return false;
          }
          seen.add(item.id);
          return true;
        });

        if (duplicates.length > 0) {
          console.warn(
            `🧹 Cleaned ${duplicates.length} invalid/duplicate items from ${key}`
          );
          await this.setData(key, cleaned);
        }

        console.log(
          `✅ ${key} integrity verified (${cleaned.length} valid items)`
        );
      } catch (error) {
        console.error(`❌ Failed to verify ${key}:`, error);
      }
    }
  }

  // Export data for backup
  async exportAllData() {
    if (!this.firebaseAvailable) {
      throw new Error("Firebase is not available. Cannot export data.");
    }

    const backup = {};
    for (const key of Object.values(STORAGE_KEYS)) {
      backup[key] = await this.getData(key);
    }
    return backup;
  }

  // Import data from backup
  async importAllData(backupData) {
    if (!this.firebaseAvailable) {
      throw new Error("Firebase is not available. Cannot import data.");
    }

    for (const [key, data] of Object.entries(backupData)) {
      if (Object.values(STORAGE_KEYS).includes(key)) {
        await this.setData(key, data);
      }
    }
  }
}

// Create singleton instance
const firebaseStorageService = new FirebaseStorageService();

// Helper functions for easy use
export const getRegisteredUsers = () =>
  firebaseStorageService.getData(STORAGE_KEYS.REGISTERED_USERS);
export const setRegisteredUsers = (users) =>
  firebaseStorageService.setData(STORAGE_KEYS.REGISTERED_USERS, users);

export const getScanInList = () =>
  firebaseStorageService.getData(STORAGE_KEYS.SCAN_IN_LIST);
export const setScanInList = (list) =>
  firebaseStorageService.setData(STORAGE_KEYS.SCAN_IN_LIST, list);

export const getScanOutList = () =>
  firebaseStorageService.getData(STORAGE_KEYS.SCAN_OUT_LIST);
export const setScanOutList = (list) =>
  firebaseStorageService.setData(STORAGE_KEYS.SCAN_OUT_LIST, list);

export const addScanInEntry = (entry) =>
  firebaseStorageService.addItem(STORAGE_KEYS.SCAN_IN_LIST, entry);
export const addScanOutEntry = (entry) =>
  firebaseStorageService.addItem(STORAGE_KEYS.SCAN_OUT_LIST, entry);

export const getStorageStatus = () => firebaseStorageService.getStatus();
export const setAuthUser = (user) => firebaseStorageService.setAuthUser(user);
export const verifyDataIntegrity = () =>
  firebaseStorageService.verifyDataIntegrity();
export const clearAllData = () => firebaseStorageService.clearAllData();
export const waitForStorageInitialization = () =>
  firebaseStorageService.waitForInitialization();
export const exportAllData = () => firebaseStorageService.exportAllData();
export const importAllData = (data) =>
  firebaseStorageService.importAllData(data);

export default firebaseStorageService;
