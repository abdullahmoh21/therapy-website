import React, { useState, useEffect, useMemo } from "react";
import {
  BiLoaderAlt,
  BiCalendarEvent,
  BiCheck,
  BiX,
  BiUser,
  BiTime,
  BiCalendar,
  BiMap,
} from "react-icons/bi";
import { FiClock, FiMapPin, FiUsers } from "react-icons/fi";
import { useDebounce } from "../../../../hooks/useDebounce";

const SetRecurringPopup = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  selectedUser,
}) => {
  // Form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [interval, setInterval] = useState("weekly");
  const [day, setDay] = useState("0"); // Sunday = 0
  const [hour, setHour] = useState("");
  const [minutes, setMinutes] = useState("");
  const [ampm, setAmpm] = useState("PM");
  const [sessionLength, setSessionLength] = useState(50);
  const [locationType, setLocationType] = useState("online");
  const [inPersonLocation, setInPersonLocation] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Inline validation visibility
  const [touched, setTouched] = useState({
    user: false,
    hour: false,
    minutes: false,
    sessionLength: false,
    inPersonLocation: false,
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Days of the week for dropdown
  const dayOptions = [
    { label: "Sunday", value: "0" },
    { label: "Monday", value: "1" },
    { label: "Tuesday", value: "2" },
    { label: "Wednesday", value: "3" },
    { label: "Thursday", value: "4" },
    { label: "Friday", value: "5" },
    { label: "Saturday", value: "6" },
  ];

  // Interval options
  const intervalOptions = [
    { label: "Weekly", value: "weekly" },
    { label: "Biweekly", value: "biweekly" },
    { label: "Monthly", value: "monthly" },
  ];

  // AM/PM options
  const ampmOptions = [
    { label: "AM", value: "AM" },
    { label: "PM", value: "PM" },
  ];

  // Helper: safe parse minutes string to number (NaN if empty/invalid)
  const parseMinutes = () => {
    if (minutes === "") return NaN;
    const n = Number(minutes);
    return Number.isFinite(n) ? n : NaN;
  };

  // Calculate 24-hour time from hour, minutes and AM/PM
  const get24HourTime = () => {
    const hourNum = parseInt(hour) || 0;
    let hourIn24 = hourNum;
    if (hourNum === 12) {
      hourIn24 = ampm === "AM" ? 0 : 12;
    } else if (ampm === "PM") {
      hourIn24 = hourNum + 12;
    }
    const mins = parseMinutes();
    const safeMinutes = Number.isNaN(mins) ? 0 : mins; // guarded; validation prevents this path on submit
    return `${hourIn24.toString().padStart(2, "0")}:${safeMinutes
      .toString()
      .padStart(2, "0")}`;
  };

  // Reset form when dialog is closed or opened with new user
  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId("");
      setSelectedUserName("");
      setInterval("weekly");
      setDay("0");
      setHour("");
      setMinutes("");
      setAmpm("PM");
      setSessionLength(50);
      setLocationType("online");
      setInPersonLocation("");
      setSearchQuery("");
      setUserResults([]);
      setTouched({
        user: false,
        hour: false,
        minutes: false,
        sessionLength: false,
        inPersonLocation: false,
      });
      setHasSubmitted(false);
    } else if (selectedUser) {
      // Pre-populate with selected user
      setSelectedUserId(selectedUser._id);
      setSelectedUserName(selectedUser.name);
      setSearchQuery(`${selectedUser.name} (${selectedUser.email})`);
      setUserResults([]);
    }
  }, [isOpen, selectedUser]);

  // Handle user search with debounce
  useEffect(() => {
    const searchUsers = async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setUserResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Call your API to search for users
        const response = await fetch(
          `/api/admin/users?search=${encodeURIComponent(
            debouncedSearch
          )}&limit=5`
        );
        const data = await response.json();

        // Filter out users who are already recurring
        const nonRecurringUsers = (data?.users || []).filter(
          (user) => !user.recurring?.state
        );
        setUserResults(
          nonRecurringUsers.map((user) => ({
            id: user._id,
            name: user.name,
            email: user.email,
          }))
        );
      } catch (error) {
        console.error("Error searching for users:", error);
        setUserResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    if (debouncedSearch) {
      searchUsers();
    }
  }, [debouncedSearch]);

  // Validation functions (matching CreateBookingPopup)
  const validateHour = () => {
    if (hour === "") return false;
    const h = parseInt(hour);
    return h && h >= 1 && h <= 12;
  };

  const validateMinutes = () => {
    // must be non-empty and within 0-59
    if (minutes === "") return false;
    if (!/^\d{1,2}$/.test(minutes)) return false;
    const n = Number(minutes);
    return n >= 0 && n <= 59;
  };

  // Compute errors without mutating state (for live disable state)
  const computeErrors = useMemo(() => {
    const newErrors = {};
    if (!selectedUserId) newErrors.user = "Please select a user";
    if (!validateHour()) newErrors.hour = "Please enter a valid hour (1-12)";
    if (!validateMinutes())
      newErrors.minutes = "Please enter valid minutes (0-59)";
    if (sessionLength < 1)
      newErrors.sessionLength = "Session length must be at least 1 minute";
    else if (sessionLength > 240)
      newErrors.sessionLength = "Session length cannot exceed 240 minutes";
    if (locationType === "in-person" && !inPersonLocation.trim())
      newErrors.inPersonLocation = "Please enter a location";
    return newErrors;
  }, [
    selectedUserId,
    hour,
    minutes,
    sessionLength,
    locationType,
    inPersonLocation,
  ]);

  const visibleErrors = useMemo(() => {
    const v = {};
    for (const [k, msg] of Object.entries(computeErrors)) {
      if (hasSubmitted || touched[k]) v[k] = msg;
    }
    return v;
  }, [computeErrors, touched, hasSubmitted]);

  const isFormValid = Object.keys(computeErrors).length === 0;

  // Handle form submission
  const handleSubmit = () => {
    setHasSubmitted(true);
    if (!isFormValid) return;

    onConfirm({
      userId: selectedUserId,
      interval: interval,
      day: day,
      time: get24HourTime(),
      sessionLengthMinutes: sessionLength,
      location: locationType,
      inPersonLocation:
        locationType === "in-person" ? inPersonLocation : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={!isProcessing ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md lg:max-w-2xl max-h-[95vh] sm:max-h-[90vh] m-2 sm:m-4 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-[#DF9E7A] rounded-xl flex items-center justify-center mr-2 sm:mr-3">
              <BiCalendarEvent className="text-white text-lg sm:text-xl" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Set Up Recurring Sessions
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Configure automated session scheduling
              </p>
            </div>
            {!isProcessing && (
              <button
                onClick={onClose}
                className="ml-auto p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <BiX className="text-xl text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 max-h-[calc(95vh-200px)] sm:max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* User Information */}
          <div className="mb-3 sm:mb-4 bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-200">
            <p className="text-sm sm:text-base font-semibold text-gray-800">
              {selectedUser?.name || selectedUserName}
            </p>
            <p className="text-xs sm:text-sm text-gray-600">
              {selectedUser?.email}
            </p>
          </div>

          {/* Schedule Configuration Card */}
          <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border border-gray-200">
            <h3 className="flex items-center text-base font-semibold text-gray-800 mb-3">
              <BiCalendar className="mr-2 text-[#DF9E7A]" />
              Schedule Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Interval Selection */}
              <div>
                <label
                  htmlFor="interval"
                  className="flex items-center text-sm font-semibold text-gray-800 mb-2"
                >
                  <FiClock className="mr-2 text-[#DF9E7A]" />
                  Session Frequency
                </label>
                <select
                  id="interval"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-full h-10 sm:h-12 bg-white text-gray-700 border border-gray-300 rounded-lg pl-3 sm:pl-4 pr-8 sm:pr-10 outline-none focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200 appearance-none text-sm sm:text-base"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: "right 12px center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "16px 16px",
                  }}
                >
                  {intervalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day of Week Selection */}
              <div>
                <label
                  htmlFor="day"
                  className="flex items-center text-sm font-semibold text-gray-800 mb-2"
                >
                  <BiCalendar className="mr-2 text-[#DF9E7A]" />
                  Day of Week
                </label>
                <select
                  id="day"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full h-10 sm:h-12 bg-white text-gray-700 border border-gray-300 rounded-lg pl-3 sm:pl-4 pr-8 sm:pr-10 outline-none focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200 appearance-none text-sm sm:text-base"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: "right 12px center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "16px 16px",
                  }}
                >
                  {dayOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Time & Duration Card */}
          <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border border-gray-200">
            <h3 className="flex items-center text-base font-semibold text-gray-800 mb-3">
              <BiTime className="mr-2 text-[#DF9E7A]" />
              Time & Duration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Time Selection */}
              <div>
                <label className="flex items-center text-sm font-semibold text-gray-800 mb-2">
                  <FiClock className="mr-2 text-[#DF9E7A]" />
                  Session Time
                </label>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      id="hour"
                      type="text"
                      inputMode="numeric"
                      pattern="[1-9]|1[0-2]"
                      value={hour}
                      onChange={(e) => {
                        const raw = e.target.value;
                        // Allow empty, or up to 2 digits while typing (similar to minutes)
                        if (raw === "") {
                          setHour("");
                        } else if (/^\d{1,2}$/.test(raw)) {
                          setHour(raw);
                        }
                        setTouched((t) => ({ ...t, hour: true }));
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, hour: true }))}
                      placeholder="Hour"
                      className={
                        "w-full h-12 bg-white text-gray-700 placeholder:text-gray-400 " +
                        "border border-gray-300 rounded-lg px-4 " +
                        "outline-none focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200 " +
                        (visibleErrors.hour
                          ? " border-red-400 focus:border-red-500"
                          : "")
                      }
                      style={{
                        MozAppearance: "textfield",
                      }}
                      aria-invalid={!!visibleErrors.hour}
                      aria-describedby={
                        visibleErrors.hour ? "hour-error" : undefined
                      }
                    />
                  </div>

                  <div className="flex-1">
                    <input
                      id="minutes"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-5]?[0-9]"
                      value={minutes}
                      onChange={(e) => {
                        const raw = e.target.value;
                        // Allow empty, or up to 2 digits 0-59 while typing
                        if (raw === "") {
                          setMinutes("");
                        } else if (/^\d{1,2}$/.test(raw)) {
                          setMinutes(raw);
                        }
                        setTouched((t) => ({ ...t, minutes: true }));
                      }}
                      onBlur={() => {
                        // Pad to two digits on blur so it reads like a clock (e.g., 03)
                        if (/^\d$/.test(minutes)) {
                          setMinutes(minutes.padStart(2, "0"));
                        }
                        setTouched((t) => ({ ...t, minutes: true }));
                      }}
                      placeholder="Min"
                      className={
                        "w-full h-12 bg-white text-gray-700 placeholder:text-gray-400 " +
                        "border border-gray-300 rounded-lg px-4 " +
                        "outline-none focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200 " +
                        (visibleErrors.minutes
                          ? " border-red-400 focus:border-red-500"
                          : "")
                      }
                      aria-invalid={!!visibleErrors.minutes}
                      aria-describedby={
                        visibleErrors.minutes ? "minutes-error" : undefined
                      }
                    />
                  </div>

                  <div className="w-24">
                    <select
                      id="ampm"
                      value={ampm}
                      onChange={(e) => setAmpm(e.target.value)}
                      className="w-full h-12 bg-white text-gray-700 border border-gray-300 rounded-lg pl-4 pr-10 outline-none focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: "right 12px center",
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "16px 16px",
                      }}
                    >
                      {ampmOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {visibleErrors.hour && (
                  <div className="mt-2 flex items-center text-red-600">
                    <BiX className="mr-1 text-lg" />
                    <small id="hour-error" className="text-sm">
                      {visibleErrors.hour}
                    </small>
                  </div>
                )}

                {visibleErrors.minutes && (
                  <div className="mt-2 flex items-center text-red-600">
                    <BiX className="mr-1 text-lg" />
                    <small id="minutes-error" className="text-sm">
                      {visibleErrors.minutes}
                    </small>
                  </div>
                )}

                <small className="text-textColor font-medium">
                  All bookings are scheduled in pakistani time
                </small>
              </div>

              {/* Session Length */}
              <div>
                <label
                  htmlFor="sessionLength"
                  className="flex items-center text-sm font-semibold text-gray-800 mb-2"
                >
                  <BiTime className="mr-2 text-[#DF9E7A]" />
                  Session Length (minutes)
                </label>
                <input
                  id="sessionLength"
                  type="number"
                  value={sessionLength}
                  onChange={(e) => {
                    setSessionLength(parseInt(e.target.value) || "");
                    setTouched((t) => ({ ...t, sessionLength: true }));
                  }}
                  onBlur={() =>
                    setTouched((t) => ({ ...t, sessionLength: true }))
                  }
                  min={1}
                  max={240}
                  placeholder="50"
                  className={
                    "w-full h-12 bg-white text-gray-700 placeholder:text-gray-400 " +
                    "border border-gray-300 rounded-lg px-4 " +
                    "outline-none focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200 " +
                    (visibleErrors.sessionLength
                      ? " border-red-400 focus:border-red-500"
                      : "")
                  }
                  aria-invalid={!!visibleErrors.sessionLength}
                  aria-describedby={
                    visibleErrors.sessionLength
                      ? "sessionLength-error"
                      : undefined
                  }
                />
                {visibleErrors.sessionLength && (
                  <div className="mt-2 flex items-center text-red-600">
                    <BiX className="mr-1 text-lg" />
                    <small id="sessionLength-error" className="text-sm">
                      {visibleErrors.sessionLength}
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location Card */}
          <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <h3 className="flex items-center text-base font-semibold text-gray-800 mb-3">
              <FiMapPin className="mr-2 text-[#DF9E7A]" />
              Session Location
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-[#DF9E7A] transition-colors duration-200 hover:bg-orange-50">
                  <input
                    id="locationOnline"
                    name="locationType"
                    type="radio"
                    value="online"
                    onChange={(e) => setLocationType(e.target.value)}
                    checked={locationType === "online"}
                    className="mr-3 text-[#DF9E7A] focus:ring-[#DF9E7A]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Online Session
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      Video call with meeting link
                    </p>
                  </div>
                </label>
                <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-[#DF9E7A] transition-colors duration-200 hover:bg-orange-50">
                  <input
                    id="locationInPerson"
                    name="locationType"
                    type="radio"
                    value="in-person"
                    onChange={(e) => setLocationType(e.target.value)}
                    checked={locationType === "in-person"}
                    className="mr-3 text-[#DF9E7A] focus:ring-[#DF9E7A]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      In-Person Session
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      Physical location meeting
                    </p>
                  </div>
                </label>
              </div>

              {/* In-Person Location (conditionally shown) */}
              {locationType === "in-person" && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <label
                    htmlFor="inPersonLocation"
                    className="flex items-center text-sm font-semibold text-gray-800 mb-3"
                  >
                    <BiMap className="mr-2 text-[#DF9E7A]" />
                    Location Address
                  </label>
                  <input
                    id="inPersonLocation"
                    type="text"
                    value={inPersonLocation}
                    onChange={(e) => {
                      setInPersonLocation(e.target.value);
                      setTouched((t) => ({ ...t, inPersonLocation: true }));
                    }}
                    onBlur={() =>
                      setTouched((t) => ({ ...t, inPersonLocation: true }))
                    }
                    placeholder="123 Main Street, Karachi, Pakistan"
                    className={
                      "w-full h-12 bg-white text-gray-700 placeholder:text-gray-400 " +
                      "border border-gray-300 rounded-lg px-4 " +
                      "outline-none focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200 " +
                      (visibleErrors.inPersonLocation
                        ? " border-red-400 focus:border-red-500"
                        : "")
                    }
                    aria-invalid={!!visibleErrors.inPersonLocation}
                    aria-describedby={
                      visibleErrors.inPersonLocation
                        ? "inPersonLocation-error"
                        : undefined
                    }
                  />
                  {visibleErrors.inPersonLocation && (
                    <div className="mt-2 flex items-center text-red-600">
                      <BiX className="mr-1 text-lg" />
                      <small id="inPersonLocation-error" className="text-sm">
                        {visibleErrors.inPersonLocation}
                      </small>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-3 sm:p-4 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 disabled:opacity-60 flex items-center justify-center text-sm sm:text-base"
            disabled={isProcessing}
          >
            <BiX className="mr-1 sm:mr-2 text-sm sm:text-base" />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-lg disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base ${
              isProcessing || !isFormValid
                ? "bg-gray-400"
                : "bg-[#DF9E7A] hover:bg-[#d89269]"
            }`}
            disabled={isProcessing || !isFormValid}
          >
            {isProcessing ? (
              <>
                <BiLoaderAlt className="animate-spin mr-1 sm:mr-2 text-sm sm:text-lg" />
                <span className="hidden sm:inline">Setting up sessions...</span>
                <span className="sm:hidden">Setting up...</span>
              </>
            ) : (
              <>
                <BiCalendarEvent className="mr-1 sm:mr-2 text-sm sm:text-lg" />
                <span className="hidden sm:inline">
                  Set Up Recurring Sessions
                </span>
                <span className="sm:hidden">Set Up Sessions</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetRecurringPopup;
