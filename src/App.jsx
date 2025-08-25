import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import QRScanner from "./pages/QRScanner";
import ManualCode from "./pages/ManualCode";
import Register from "./pages/Register";
import RegisteredList from "./pages/RegisteredList";
import ScanInList from "./pages/ScanInList";
import ScanOutList from "./pages/ScanOutList";
import { storage } from "./utils/storage";
import "./App.css";

function App() {
  const [storageStatus, setStorageStatus] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Sync data when app starts
        await storage.sync();
        const status = storage.getStatus();
        setStorageStatus(status);
        console.log("App initialized with storage status:", status);
      } catch (error) {
        console.error("App initialization error:", error);
        setStorageStatus({
          storageMode: "local",
          isOnline: navigator.onLine,
          apiAvailable: false,
        });
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  if (!isInitialized) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing Access IDCODE...</p>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <ProtectedRoute>
            <Navigation storageStatus={storageStatus} />
            <main className="main-content">
              <Routes>
                <Route
                  path="/"
                  element={<Dashboard storageStatus={storageStatus} />}
                />
                <Route path="/scan" element={<QRScanner />} />
                <Route path="/code" element={<ManualCode />} />
                <Route path="/register" element={<Register />} />
                <Route path="/registered-list" element={<RegisteredList />} />
                <Route path="/scan-in-list" element={<ScanInList />} />
                <Route path="/scan-out-list" element={<ScanOutList />} />
              </Routes>
            </main>
          </ProtectedRoute>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
