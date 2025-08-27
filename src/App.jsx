import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import QRScanner from "./pages/QRScanner";
import ManualCode from "./pages/ManualCode";
import Register from "./pages/Register";
import ReRegister from "./pages/ReRegister";
import MissedCheckin from "./pages/MissedCheckin";
import RegisteredList from "./pages/RegisteredList";
import ScanInList from "./pages/ScanInList";
import ScanOutList from "./pages/ScanOutList";
import DataManagement from "./pages/DataManagement";
import { storage } from "./utils/storage";
import "./App.css";

function AppContent() {
  const [storageStatus, setStorageStatus] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for storage service to initialize (no auth check)
        await storage.initialize();

        // Get the storage status (will reflect auth state)
        const status = storage.getStatus();
        setStorageStatus(status);
        console.log("App initialized with storage status:", status);
      } catch (error) {
        console.error("App initialization error:", error);
        setStorageStatus({
          storageMode: "firebase",
          firebaseAvailable: false,
          initialized: false,
        });
      } finally {
        setIsInitialized(true);
      }
    };

    // Only initialize after auth state is determined
    if (!isLoading) {
      initializeApp();
    }
  }, [isLoading, currentUser]);

  if (!isInitialized || isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing Access IDCODE...</p>
      </div>
    );
  }

  return (
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
              <Route path="/re-register" element={<ReRegister />} />
              <Route path="/missed-checkin" element={<MissedCheckin />} />
              <Route path="/registered-list" element={<RegisteredList />} />
              <Route path="/scan-in-list" element={<ScanInList />} />
              <Route path="/scan-out-list" element={<ScanOutList />} />
              <Route path="/data-management" element={<DataManagement />} />
            </Routes>
          </main>
        </ProtectedRoute>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
