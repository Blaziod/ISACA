// API endpoints for persistent storage
const API_BASE_URL = "https://isaca-kappa.vercel.app/api";

// Fallback to localStorage if API is not available
const STORAGE_KEYS = {
  REGISTERED_USERS: "registeredUsers",
  SCAN_IN_LIST: "scanInList",
  SCAN_OUT_LIST: "scanOutList",
};

class StorageService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.apiAvailable = false;
    this.checkApiAvailability();

    // Listen for online/offline events
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.syncLocalToRemote();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  async checkApiAvailability() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      this.apiAvailable = response.ok;
    } catch (error) {
      console.warn(
        "API not available, using localStorage only:",
        error.message
      );
      this.apiAvailable = false;
    }
  }

  // Get data with fallback
  async getData(key) {
    if (this.apiAvailable && this.isOnline) {
      try {
        const response = await fetch(`${API_BASE_URL}/${key}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          // Also store locally as backup
          localStorage.setItem(key, JSON.stringify(data));
          return data;
        }
      } catch (error) {
        console.warn("API get failed, using localStorage:", error.message);
      }
    }

    // Fallback to localStorage
    const localData = localStorage.getItem(key);
    return localData ? JSON.parse(localData) : [];
  }

  // Set data with sync
  async setData(key, data) {
    // Always store locally first
    localStorage.setItem(key, JSON.stringify(data));

    if (this.apiAvailable && this.isOnline) {
      try {
        const response = await fetch(`${API_BASE_URL}/${key}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          console.warn("API set failed, data saved locally only");
        }
      } catch (error) {
        console.warn("API set failed, data saved locally only:", error.message);
      }
    }

    return data;
  }

  // Sync local storage to remote when coming online
  async syncLocalToRemote() {
    if (!this.apiAvailable || !this.isOnline) return;

    console.log("Syncing local data to remote...");

    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        const localData = localStorage.getItem(key);
        if (localData) {
          await this.setData(key, JSON.parse(localData));
        }
      }
      console.log("Sync completed successfully");
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }

  // Sync remote to local (for when switching devices)
  async syncRemoteToLocal() {
    if (!this.apiAvailable || !this.isOnline) return;

    console.log("Syncing remote data to local...");

    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        await this.getData(key); // This will automatically update localStorage
      }
      console.log("Remote sync completed");
    } catch (error) {
      console.error("Remote sync failed:", error);
    }
  }

  // Clear all data
  async clearAllData() {
    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    // Clear remote if available
    if (this.apiAvailable && this.isOnline) {
      try {
        await fetch(`${API_BASE_URL}/clear`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.warn("Remote clear failed:", error.message);
      }
    }
  }

  // Get storage status
  getStatus() {
    return {
      isOnline: this.isOnline,
      apiAvailable: this.apiAvailable,
      storageMode: this.apiAvailable && this.isOnline ? "cloud" : "local",
    };
  }
}

// Create singleton instance
const storageService = new StorageService();

// Helper functions for easy use
export const getRegisteredUsers = () =>
  storageService.getData(STORAGE_KEYS.REGISTERED_USERS);
export const setRegisteredUsers = (users) =>
  storageService.setData(STORAGE_KEYS.REGISTERED_USERS, users);

export const getScanInList = () =>
  storageService.getData(STORAGE_KEYS.SCAN_IN_LIST);
export const setScanInList = (list) =>
  storageService.setData(STORAGE_KEYS.SCAN_IN_LIST, list);

export const getScanOutList = () =>
  storageService.getData(STORAGE_KEYS.SCAN_OUT_LIST);
export const setScanOutList = (list) =>
  storageService.setData(STORAGE_KEYS.SCAN_OUT_LIST, list);

export const syncData = () => storageService.syncRemoteToLocal();
export const getStorageStatus = () => storageService.getStatus();
export const clearAllData = () => storageService.clearAllData();

export default storageService;
