import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import QRScanner from "./pages/QRScanner";
import ManualCode from "./pages/ManualCode";
import Register from "./pages/Register";
import RegisteredList from "./pages/RegisteredList";
import ScanInList from "./pages/ScanInList";
import ScanOutList from "./pages/ScanOutList";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan" element={<QRScanner />} />
            <Route path="/code" element={<ManualCode />} />
            <Route path="/register" element={<Register />} />
            <Route path="/registered-list" element={<RegisteredList />} />
            <Route path="/scan-in-list" element={<ScanInList />} />
            <Route path="/scan-out-list" element={<ScanOutList />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
