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
    this.isOnline = navigator.onLine;
    this.firebaseAvailable = true;
    this.initialized = false;
    this.localCache = new Map();

    // Listen for online/offline events
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.syncLocalToFirebase();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });

    this.initializeService();
  }

  async initializeService() {
    try {
      // Test Firebase connection by trying to read existing data
      const testRef = ref(database, STORAGE_KEYS.REGISTERED_USERS);
      await get(testRef);

      this.firebaseAvailable = true;

      // Load existing data to local cache
      await this.loadCacheFromFirebase();
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      this.firebaseAvailable = false;

      // Load from localStorage as fallback
      this.loadCacheFromLocalStorage();
    } finally {
      this.initialized = true;
    }
  }

  async loadCacheFromFirebase() {
    if (!this.firebaseAvailable || !this.isOnline) return;

    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        const dataRef = ref(database, key);
        const snapshot = await get(dataRef);
        const data = snapshot.exists() ? snapshot.val() : [];

        // Convert Firebase object to array if needed
        const arrayData = Array.isArray(data)
          ? data
          : Object.values(data || {});
        this.localCache.set(key, arrayData);

        // Also store in localStorage as backup
        localStorage.setItem(key, JSON.stringify(arrayData));
      }
    } catch (error) {
      console.error("❌ Failed to load from Firebase:", error);
      this.loadCacheFromLocalStorage();
    }
  }

  loadCacheFromLocalStorage() {
    for (const key of Object.values(STORAGE_KEYS)) {
      const localData = localStorage.getItem(key);
      const data = localData ? JSON.parse(localData) : [];
      this.localCache.set(key, data);
    }
  }

  // Get data with fallback chain: cache -> Firebase -> localStorage
  async getData(key) {
    // Return from cache if available
    if (this.localCache.has(key)) {
      return this.localCache.get(key);
    }

    // Try Firebase if online and available
    if (this.firebaseAvailable && this.isOnline) {
      try {
        const dataRef = ref(database, key);
        const snapshot = await get(dataRef);
        const data = snapshot.exists() ? snapshot.val() : [];

        // Convert Firebase object to array if needed
        const arrayData = Array.isArray(data)
          ? data
          : Object.values(data || {});

        // Cache the result
        this.localCache.set(key, arrayData);

        // Also store locally as backup
        localStorage.setItem(key, JSON.stringify(arrayData));

        return arrayData;
      } catch (error) {
        console.warn(
          "⚠️ Firebase get failed, using localStorage:",
          error.message
        );
      }
    }

    // Fallback to localStorage
    const localData = localStorage.getItem(key);
    const data = localData ? JSON.parse(localData) : [];
    this.localCache.set(key, data);
    return data;
  }

  // Set data with Firebase sync
  async setData(key, data) {
    // Always update cache first
    this.localCache.set(key, data);

    // Always store locally as backup
    localStorage.setItem(key, JSON.stringify(data));

    // Try to sync to Firebase if available
    if (this.firebaseAvailable && this.isOnline) {
      try {
        const dataRef = ref(database, key);
        await set(dataRef, data);
      } catch (error) {
        console.warn(
          `⚠️ Firebase set failed for ${key}, data saved locally:`,
          error.message
        );
        // Data is still saved locally, so this is not a critical failure
      }
    }

    return data;
  }

  // Add a single item to a list
  async addItem(key, item) {
    const currentData = await this.getData(key);
    const newData = [...currentData, item];
    return await this.setData(key, newData);
  }

  // Remove item from list by ID
  async removeItem(key, itemId) {
    const currentData = await this.getData(key);
    const newData = currentData.filter((item) => item.id !== itemId);
    return await this.setData(key, newData);
  }

  // Update item in list by ID
  async updateItem(key, itemId, updatedItem) {
    const currentData = await this.getData(key);
    const newData = currentData.map((item) =>
      item.id === itemId ? { ...item, ...updatedItem } : item
    );
    return await this.setData(key, newData);
  }

  // Sync local storage to Firebase when coming online
  async syncLocalToFirebase() {
    if (!this.firebaseAvailable || !this.isOnline) return;

    try {
      for (const [key, data] of this.localCache.entries()) {
        const dataRef = ref(database, key);
        await set(dataRef, data);
      }
    } catch (error) {
      console.error("❌ Sync to Firebase failed:", error);
    }
  }

  // Clear all data
  async clearAllData() {
    // Clear cache
    this.localCache.clear();

    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    // Clear Firebase if available
    if (this.firebaseAvailable && this.isOnline) {
      try {
        for (const key of Object.values(STORAGE_KEYS)) {
          const dataRef = ref(database, key);
          await remove(dataRef);
        }
      } catch (error) {
        console.warn("⚠️ Firebase clear failed:", error.message);
      }
    }
  }

  // Get storage status
  getStatus() {
    return {
      isOnline: this.isOnline,
      firebaseAvailable: this.firebaseAvailable,
      storageMode:
        this.firebaseAvailable && this.isOnline ? "firebase" : "local",
      initialized: this.initialized,
      cacheSize: this.localCache.size,
    };
  }

  // Wait for initialization to complete
  async waitForInitialization() {
    if (this.initialized) return;

    // Poll until initialized
    return new Promise((resolve) => {
      const checkInitialized = () => {
        if (this.initialized) {
          resolve();
        } else {
          setTimeout(checkInitialized, 100);
        }
      };
      checkInitialized();
    });
  }

  // Export data for backup
  async exportAllData() {
    const backup = {};
    for (const key of Object.values(STORAGE_KEYS)) {
      backup[key] = await this.getData(key);
    }
    return backup;
  }

  // Import data from backup
  async importAllData(backupData) {
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
export const clearAllData = () => firebaseStorageService.clearAllData();
export const waitForStorageInitialization = () =>
  firebaseStorageService.waitForInitialization();
export const syncData = () => firebaseStorageService.syncLocalToFirebase();
export const exportAllData = () => firebaseStorageService.exportAllData();
export const importAllData = (data) =>
  firebaseStorageService.importAllData(data);

export default firebaseStorageService;
