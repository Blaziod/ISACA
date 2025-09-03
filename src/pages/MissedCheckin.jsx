/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import {
  FaClock,
  FaUserClock,
  FaSearch,
  FaCalendarAlt,
  FaCheckCircle,
  FaUser,
  FaUndo,
  FaExclamationTriangle,
} from "react-icons/fa";
import { storage, STORAGE_KEYS, generateId } from "../utils/storage";
import "./MissedCheckin.css";

const MissedCheckin = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [checkinDateTime, setCheckinDateTime] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [scanInList, setScanInList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [recentEntries, setRecentEntries] = useState([]);

  useEffect(() => {
    const initializeData = async () => {
      await storage.initialize();
      await loadData();
    };
    initializeData();
  }, []);

  const filterUsers = () => {
    let filtered = registeredUsers.filter((user) => {
      // Ensure user exists and has required properties
      if (!user || typeof user !== "object") return false;

      const matchesSearch =
        (user.name &&
          user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email &&
          user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.id && user.id.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesSearch;
    });

    // Sort by name with null check
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    setFilteredUsers(filtered);
  };

  useEffect(() => {
    filterUsers();
  }, [searchTerm, registeredUsers, scanInList]);

  useEffect(() => {
    // Set default datetime to current time
    const now = new Date();
    const localDateTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);
    setCheckinDateTime(localDateTime);
  }, []);

  const loadData = async () => {
    try {
      const [users, scanIn] = await Promise.all([
        storage.get(STORAGE_KEYS.REGISTERED_USERS, []),
        storage.get(STORAGE_KEYS.SCAN_IN_LIST, []),
      ]);
      setRegisteredUsers(users);
      setScanInList(scanIn);
    } catch {
      setMessage({
        type: "error",
        text: "Failed to load data. Please refresh the page.",
      });
    }
  };

  const getUserStatus = (user) => {
    const isCheckedIn = scanInList.some((entry) => entry.userId === user.id);
    return isCheckedIn ? "checked-in" : "checked-out";
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setMessage({ type: "", text: "" });
  };

  const handleMissedCheckin = async () => {
    if (!selectedUser) {
      setMessage({ type: "error", text: "Please select a user first." });
      return;
    }

    if (!checkinDateTime) {
      setMessage({
        type: "error",
        text: "Please select a check-in date and time.",
      });
      return;
    }

    // Check if the selected time is in the future
    const selectedTime = new Date(checkinDateTime);
    const now = new Date();
    if (selectedTime > now) {
      setMessage({
        type: "error",
        text: "Check-in time cannot be in the future.",
      });
      return;
    }

    // Check if user is already checked in
    const isAlreadyCheckedIn = scanInList.some(
      (entry) => entry.userId === selectedUser.id
    );
    if (isAlreadyCheckedIn) {
      setMessage({
        type: "warning",
        text: `${selectedUser.name} is already checked in. Please check them out first.`,
      });
      return;
    }

    setIsLoading(true);

    try {
      const scanInEntry = {
        id: generateId("MISSED"),
        userId: selectedUser.id,
        name: selectedUser.name,
        email: selectedUser.email,
        timestamp: selectedTime.toISOString(),
        type: "missed-checkin",
        entryMethod: "manual-recovery",
        note: "Recovered missed check-in",
      };

      // Add to scan-in list
      await storage.addScanIn(scanInEntry);

      // Add to recent entries for display
      const newRecentEntry = {
        id: Date.now(),
        user: selectedUser.name,
        checkinTime: selectedTime.toISOString(),
        timestamp: new Date().toISOString(),
      };

      setRecentEntries([newRecentEntry, ...recentEntries.slice(0, 9)]);

      // Refresh data
      await loadData();

      setMessage({
        type: "success",
        text: `Successfully added missed check-in for ${
          selectedUser.name
        } at ${formatDateTime(selectedTime.toISOString())}`,
      });

      // Reset form
      setSelectedUser(null);
      setSearchTerm("");
      const now = new Date();
      const localDateTime = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      setCheckinDateTime(localDateTime);
    } catch (error) {
      console.error("Error adding missed check-in:", error);
      setMessage({
        type: "error",
        text: "Failed to add missed check-in. Please try again.",
      });
    }

    setIsLoading(false);
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const clearMessage = () => {
    setMessage({ type: "", text: "" });
  };

  const clearSelection = () => {
    setSelectedUser(null);
    setSearchTerm("");
    setMessage({ type: "", text: "" });
  };

  return (
    <div className="missed-checkin fade-in">
      <div className="missed-checkin-header">
        <FaUserClock className="missed-checkin-icon" />
        <div>
          <h1 className="missed-checkin-title">Missed Check-in Recovery</h1>
          <p className="missed-checkin-subtitle">
            Add missed check-ins with custom timestamps for users whose data was
            lost
          </p>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
          <button className="clear-btn" onClick={clearMessage}>
            ×
          </button>
        </div>
      )}

      <div className="missed-checkin-content">
        {/* User Selection */}
        <div className="user-selection-section">
          <h2>
            <FaUser /> Select User
          </h2>

          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {selectedUser && (
            <div className="selected-user">
              <div className="selected-user-info">
                <h3>{selectedUser.name}</h3>
                <p>{selectedUser.email}</p>
                <p>ID: {selectedUser.id}</p>
                <span className={`status-badge ${getUserStatus(selectedUser)}`}>
                  {getUserStatus(selectedUser) === "checked-in"
                    ? "Currently Checked In"
                    : "Currently Checked Out"}
                </span>
              </div>
              <button className="clear-selection-btn" onClick={clearSelection}>
                <FaUndo /> Clear Selection
              </button>
            </div>
          )}

          {!selectedUser && (
            <div className="user-list">
              {filteredUsers.length > 0 ? (
                filteredUsers.slice(0, 10).map((user) => (
                  <div
                    key={user.id}
                    className="user-item"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="user-info">
                      <h4>{user.name}</h4>
                      <p>{user.email}</p>
                      <small>ID: {user.id}</small>
                    </div>
                    <div className="user-status">
                      <span className={`status-badge ${getUserStatus(user)}`}>
                        {getUserStatus(user) === "checked-in" ? "In" : "Out"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-results">
                  {searchTerm
                    ? "No users found matching your search."
                    : "Start typing to search for users."}
                </div>
              )}
              {filteredUsers.length > 10 && (
                <div className="more-results">
                  Showing first 10 results. Refine your search to see more.
                </div>
              )}
            </div>
          )}
        </div>

        {/* DateTime Selection */}
        <div className="datetime-section">
          <h2>
            <FaClock /> Check-in Date & Time
          </h2>

          <div className="datetime-input-group">
            <label htmlFor="checkinDateTime">
              <FaCalendarAlt /> Select the actual check-in time:
            </label>
            <input
              type="datetime-local"
              id="checkinDateTime"
              value={checkinDateTime}
              onChange={(e) => setCheckinDateTime(e.target.value)}
              max={new Date().toISOString().slice(0, 16)}
              className="datetime-input"
            />
            <small className="datetime-help">
              Cannot be set to a future time. Time zone:{" "}
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </small>
          </div>

          {checkinDateTime && (
            <div className="datetime-preview">
              <strong>Selected Time:</strong>{" "}
              {formatDateTime(new Date(checkinDateTime).toISOString())}
            </div>
          )}
        </div>

        {/* Submit Section */}
        <div className="submit-section">
          <button
            className="btn btn-primary submit-btn"
            onClick={handleMissedCheckin}
            disabled={!selectedUser || !checkinDateTime || isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading"></div>
                Processing...
              </>
            ) : (
              <>
                <FaCheckCircle />
                Add Missed Check-in
              </>
            )}
          </button>

          {selectedUser && checkinDateTime && (
            <div className="submit-preview">
              <FaExclamationTriangle />
              <strong>Confirm:</strong> Adding check-in for {selectedUser.name}{" "}
              at {formatDateTime(new Date(checkinDateTime).toISOString())}
            </div>
          )}
        </div>

        {/* Recent Entries */}
        {recentEntries.length > 0 && (
          <div className="recent-entries-section">
            <h2>Recent Missed Check-ins</h2>
            <div className="recent-entries">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="recent-entry">
                  <div className="recent-entry-info">
                    <strong>{entry.user}</strong>
                    <div>Check-in: {formatDateTime(entry.checkinTime)}</div>
                    <small>Added: {formatDateTime(entry.timestamp)}</small>
                  </div>
                  <FaCheckCircle className="recent-entry-icon" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissedCheckin;
