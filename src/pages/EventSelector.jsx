/* eslint-disable react-hooks/exhaustive-deps */
import "./EventSelector.css";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MdEventSeat } from "react-icons/md";

function EventSelector() {
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState([]);
  const navigate = useNavigate();
  const apiUrl = "https://id-code-432903898833.europe-west1.run.app/api/v1/";

  const generateColorFromString = (str) => {
    if (!str) return "#4B5563";
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    const hue = Math.abs(hash) % 360;
    const saturation = 65;
    const lightness = 40;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const getEvents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}event/events/`);

      setEvent(response.data || []);
      localStorage.setItem("Events", JSON.stringify(response.data || []));
      if (!response.data || response.data.length === 0) {
        toast.success("No Events Found!, Create an Event", {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          style: {
            backgroundColor: "#4CAF50",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "16px",
            fontSize: "16px",
            fontWeight: "bold",
          },
        });
        return null;
      } else {
        toast.success("Events Fetched!", {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          style: {
            backgroundColor: "#4CAF50",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "16px",
            fontSize: "16px",
            fontWeight: "bold",
          },
        });
        return null;
      }
    } catch (error) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      const toastOptions = {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        style: {
          backgroundColor: "#D32F2F",
          color: "#ffffff",
          borderRadius: "8px",
          padding: "16px",
          fontSize: "16px",
          fontWeight: "bold",
        },
      };

      console.error(
        "Login Error Response:",
        error.response?.data || error.message
      );

      if (error.response && error.response.data) {
        const responseData = error.response.data;

        if (responseData.detail && Array.isArray(responseData.detail)) {
          const firstError = responseData.detail[0];
          const field = firstError.loc?.[1] || "Input";
          const msg = firstError.msg || "is invalid";
          errorMessage = `${
            field.charAt(0).toUpperCase() + field.slice(1)
          }: ${msg}`;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        } else {
          errorMessage = `${responseData.detail} Please try again.`;
        }
        if (
          // user?.role?.name === "CEO" &&
          responseData.detail === "User not associated with any event"
        ) {
          errorMessage = "Event not found. Please create an event first.";
          toast.error(errorMessage, toastOptions);
          navigate("/event/new");
        }
      } else if (error.request) {
        errorMessage =
          "Sorry something went wrong, our engineers are working on it! Please try again later.";
      } else {
        errorMessage = "An error occurred while preparing the request.";
      }

      toast.error(errorMessage, toastOptions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getEvents();
  }, []);

  return (
    <>
      <>
        {" "}
        {event.length === 0 ? (
          <div className="page-container">
            <div className="selector-box">
              <h2 className="selector-title">No Events Found</h2>
              <p className="selector-subtext">
                Please create an event to get started.
              </p>
            </div>
          </div>
        ) : null}
        {event.length > 0 && (
          <div className="page-container">
            <div className="selector-box">
              {/* Logo Section */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "1rem",
                  alignItems: "center",
                }}
              ></div>
              <h2 className="selector-title">Select your Event</h2>
              <p className="selector-subtext">
                Select the event you want to manage or view. If you don&apos;t
                see your event, please create one.
              </p>

              <div className="card-container">
                {event.map((org) => (
                  <div
                    key={org.id}
                    className="org-card"
                    onClick={() => {
                      localStorage.setItem("eventId", org.id);
                      navigate("/dashboard");
                    }}
                  >
                    <div
                      className="org-icon"
                      style={{
                        color: generateColorFromString(org.name),
                      }}
                    >
                      <MdEventSeat size={40} />
                    </div>
                    <p className="org-name">{org.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}{" "}
      </>
    </>
  );
}

export default EventSelector;
