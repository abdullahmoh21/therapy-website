import React, { useState, useEffect } from "react";
import {
  BiLoaderAlt,
  BiCalendarEvent,
  BiCheck,
  BiX,
  BiUser,
  BiTime,
  BiCalendar,
  BiMap,
  BiSearch,
} from "react-icons/bi";
import { FiClock, FiMapPin } from "react-icons/fi";
import { useDebounce } from "../../../../hooks/useDebounce";
import {
  useLazySearchUsersQuery,
  useCreateAdminBookingMutation,
} from "../../../../features/admin";
import { toast } from "react-toastify";
import { format } from "date-fns";

const CreateBookingPopup = ({ isOpen, onClose, onSuccess }) => {
  // Form state
  const [selectedUser, setSelectedUser] = useState(null);
  const [eventDate, setEventDate] = useState("");
  const [hour, setHour] = useState("");
  // Minutes stored as a string so it can be cleared and can keep leading zeros UX
  const [minutes, setMinutes] = useState(""); // (was number 0; now string for better input control)
  const [ampm, setAmpm] = useState("PM");
  const [sessionLength, setSessionLength] = useState(50);
  const [locationType, setLocationType] = useState("online");
  const [inPersonLocation, setInPersonLocation] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Validation state
  const [touched, setTouched] = useState({
    user: false,
    eventDate: false,
    hour: false,
    minutes: false,
    sessionLength: false,
    inPersonLocation: false,
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // API hooks
  const [searchUsers, { isLoading: isSearchLoading }] =
    useLazySearchUsersQuery();
  const [createBooking, { isLoading: isCreating }] =
    useCreateAdminBookingMutation();

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

  // Calculate end time from start time + duration
  const getEndTime = () => {
    const startDateTime = new Date(`${eventDate}T${get24HourTime()}`);
    const endDateTime = new Date(
      startDateTime.getTime() + sessionLength * 60000
    );
    return endDateTime.toTimeString().substring(0, 5); // Returns HH:MM format
  };

  // Only reset form when successfully submitted
  useEffect(() => {
    if (!isOpen) {
      // Only reset search-related states, not form data
      setUserResults([]);
      setShowUserDropdown(false);
    }
  }, [isOpen]);

  // Function to reset form (can be called after successful submission)
  const resetForm = () => {
    setSelectedUser(null);
    setEventDate("");
    setHour("");
    setMinutes(""); // reset to empty so it can be freely typed/deleted
    setAmpm("PM");
    setSessionLength(50);
    setLocationType("online");
    setInPersonLocation("");
    setSearchQuery("");
    setUserResults([]);
    setShowUserDropdown(false);
    setTouched({
      user: false,
      eventDate: false,
      hour: false,
      minutes: false,
      sessionLength: false,
      inPersonLocation: false,
    });
    setHasSubmitted(false);
  };

  // Handle user search
  useEffect(() => {
    const performSearch = async () => {
      // Only search if we don't have a selected user or if the search query doesn't match the selected user's name
      if (
        debouncedSearch &&
        debouncedSearch.length >= 1 &&
        (!selectedUser || debouncedSearch !== selectedUser.name)
      ) {
        setIsSearching(true);
        try {
          const result = await searchUsers(debouncedSearch);
          if (result.data) {
            setUserResults(result.data.users || []);
            setShowUserDropdown(true);
          }
        } catch (error) {
          console.error("Search failed:", error);
          setUserResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setUserResults([]);
        setShowUserDropdown(false);
      }
    };

    performSearch();
  }, [debouncedSearch, searchUsers, selectedUser]);

  // Validation functions
  const validateUser = () => {
    return selectedUser !== null;
  };

  const validateEventDate = () => {
    if (!eventDate) return false;
    const selectedDateTime = new Date(eventDate);
    const now = new Date();
    return selectedDateTime > now;
  };

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

  const validateSessionLength = () => {
    return sessionLength && sessionLength >= 1 && sessionLength <= 240;
  };

  const validateInPersonLocation = () => {
    if (locationType === "in-person") {
      return inPersonLocation.trim().length > 0;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);

    // Mark all fields as touched for validation
    setTouched({
      user: true,
      eventDate: true,
      hour: true,
      minutes: true,
      sessionLength: true,
      inPersonLocation: true,
    });

    // Validate all fields
    const isValidUser = validateUser();
    const isValidEventDate = validateEventDate();
    const isValidHour = validateHour();
    const isValidMinutes = validateMinutes();
    const isValidSessionLength = validateSessionLength();
    const isValidInPersonLocation = validateInPersonLocation();

    if (
      !isValidUser ||
      !isValidEventDate ||
      !isValidHour ||
      !isValidMinutes ||
      !isValidSessionLength ||
      !isValidInPersonLocation
    ) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    try {
      // Calculate start time in 24-hour format
      const startTime = get24HourTime(); // This returns "HH:MM" format

      console.log("Debug booking data:", {
        eventDate,
        startTime,
        sessionLength,
        durationHours: sessionLength / 60,
      });

      // Format the data for the API using the new simplified format
      const bookingData = {
        userId: selectedUser._id,
        eventDate: eventDate, // Date in YYYY-MM-DD format
        eventTime: startTime, // Time in HH:MM format
        sessionLengthMinutes: sessionLength, // Duration in minutes
        location: locationType,
        ...(locationType === "in-person" && { inPersonLocation }),
      };

      await createBooking(bookingData).unwrap();

      toast.success("Booking created successfully!");

      if (onSuccess) {
        onSuccess();
      }

      resetForm(); // Reset form after successful creation
      onClose();
    } catch (error) {
      console.error("Failed to create booking:", error);

      // Handle different error cases with user-friendly messages
      if (error?.status === 400) {
        const errorMessage = error?.data?.message || error?.data?.error || "";

        if (errorMessage.includes("Valid eventDate parameter is required")) {
          toast.error(
            "Invalid date format. Please check your date and try again."
          );
        } else if (
          errorMessage.includes("Valid eventTime parameter is required")
        ) {
          toast.error(
            "Invalid time format. Please check your time and try again."
          );
        } else if (
          errorMessage.includes(
            "Session length must be between 1 and 240 minutes"
          )
        ) {
          toast.error(
            "Session duration must be between 1 and 240 minutes. Please adjust the duration."
          );
        } else if (
          errorMessage.includes("start time must be before end time")
        ) {
          toast.error(
            "Invalid time range. Please check your start time and duration."
          );
        } else if (
          errorMessage.includes("Booking time must be in the future")
        ) {
          toast.error(
            "Booking time must be in the future. Please select a future date and time."
          );
        } else if (errorMessage.includes("Missing required fields")) {
          toast.error("Please fill in all required fields.");
        } else {
          toast.error(
            "Invalid booking details. Please check your inputs and try again."
          );
        }
      } else if (error?.status === 404) {
        toast.error(
          "Selected user not found. Please try selecting a different user."
        );
      } else if (error?.status === 409) {
        toast.error(
          "There is a scheduling conflict. Please choose a different time slot."
        );
      } else {
        toast.error(
          error?.data?.message || "Failed to create booking. Please try again."
        );
      }
    }
  };

  // Handle user selection
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSearchQuery(user.name);
    setShowUserDropdown(false);
    setTouched((prev) => ({ ...prev, user: true }));
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Only clear selected user if the value differs from the selected user's name
    if (selectedUser && value !== selectedUser.name) {
      setSelectedUser(null);
    }

    if (value.length === 0) {
      setShowUserDropdown(false);
      setSelectedUser(null);
    }
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-10 h-10 bg-[#DF9E7A] rounded-lg flex items-center justify-center">
              <BiCalendarEvent className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Booking
              </h3>
              <p className="text-sm text-gray-500">
                Schedule a new session for a client
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isCreating}
          >
            <BiX className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BiUser className="inline mr-2" />
              Select Client
            </label>
            <div className="relative">
              <div className="relative">
                <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onBlur={() => {
                    setTimeout(() => setShowUserDropdown(false), 150);
                    setTouched((prev) => ({ ...prev, user: true }));
                  }}
                  onFocus={() => {
                    if (userResults.length > 0 && !selectedUser) {
                      setShowUserDropdown(true);
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DF9E7A] focus:border-[#DF9E7A] ${
                    (touched.user || hasSubmitted) && !validateUser()
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
                />
                {isSearching && (
                  <BiLoaderAlt className="absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin text-gray-400" />
                )}
              </div>

              {/* User Results Dropdown */}
              {showUserDropdown && userResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {userResults.map((user) => (
                    <div
                      key={user._id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-[#DF9E7A] rounded-full flex items-center justify-center text-white font-medium text-sm mr-3">
                          {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected User Display */}
              {selectedUser && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <BiCheck className="text-green-600 mr-2" />
                    <div>
                      <div className="font-medium text-green-800">
                        {selectedUser.name}
                      </div>
                      <div className="text-sm text-green-600">
                        {selectedUser.email}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(touched.user || hasSubmitted) && !validateUser() && (
                <p className="text-red-600 text-sm mt-1">
                  Please select a client
                </p>
              )}
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BiCalendar className="inline mr-2" />
              Event Date
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value);
                setTouched((prev) => ({ ...prev, eventDate: true }));
              }}
              onBlur={() =>
                setTouched((prev) => ({ ...prev, eventDate: true }))
              }
              min={getMinDate()}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#DF9E7A] focus:border-[#DF9E7A] ${
                (touched.eventDate || hasSubmitted) && !validateEventDate()
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
            />
            {(touched.eventDate || hasSubmitted) && !validateEventDate() && (
              <p className="text-red-600 text-sm mt-1">
                {!eventDate
                  ? "Please select a date"
                  : "Date must be in the future"}
              </p>
            )}
          </div>

          {/* Time & Duration Selection */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiClock className="inline mr-2" />
                  Start Time
                </label>

                {/* Clock-like layout: Hour Min AM/PM */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
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
                        setTouched((prev) => ({ ...prev, hour: true }));
                      }}
                      onBlur={(e) => {
                        setTouched((prev) => ({ ...prev, hour: true }));
                      }}
                      placeholder="Hour"
                      className={`w-full px-3 py-2 bg-white text-gray-700 placeholder:text-gray-400 border rounded-lg outline-none focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200 ${
                        (touched.hour || hasSubmitted) && !validateHour()
                          ? "border-red-400 focus:border-red-500"
                          : "border-gray-300"
                      }`}
                      style={{
                        MozAppearance: "textfield",
                      }}
                    />
                  </div>

                  <div className="flex-1">
                    <input
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
                        setTouched((prev) => ({ ...prev, minutes: true }));
                      }}
                      onBlur={() => {
                        // Pad to two digits on blur so it reads like a clock (e.g., 03)
                        if (/^\d$/.test(minutes)) {
                          setMinutes(minutes.padStart(2, "0"));
                        }
                        setTouched((prev) => ({ ...prev, minutes: true }));
                      }}
                      placeholder="Min"
                      className={`w-full px-3 py-2 bg-white text-gray-700 placeholder:text-gray-400 border rounded-lg outline-none focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200 ${
                        (touched.minutes || hasSubmitted) && !validateMinutes()
                          ? "border-red-400 focus:border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                  </div>

                  <div className="w-24">
                    <select
                      value={ampm}
                      onChange={(e) => setAmpm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DF9E7A] focus:border-[#DF9E7A] appearance-none bg-white text-gray-700"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: "right 8px center",
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

                {(touched.hour || hasSubmitted) && !validateHour() && (
                  <p className="text-red-600 text-sm mt-1">
                    Please enter a valid hour (1-12)
                  </p>
                )}

                {(touched.minutes || hasSubmitted) && !validateMinutes() && (
                  <p className="text-red-600 text-sm mt-1">
                    Please enter valid minutes (0-59)
                  </p>
                )}

                <small className="text-textColor font-medium">
                  All bookings are scheduled in pakistani time
                </small>
              </div>

              {/* Session Length */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <BiTime className="inline mr-2" />
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={sessionLength}
                  onChange={(e) => {
                    setSessionLength(parseInt(e.target.value) || "");
                    setTouched((prev) => ({ ...prev, sessionLength: true }));
                  }}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, sessionLength: true }))
                  }
                  min={1}
                  max={240}
                  placeholder="50"
                  className={`w-full px-3 py-2 bg-white text-gray-700 placeholder:text-gray-400 border rounded-lg outline-none focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200 ${
                    (touched.sessionLength || hasSubmitted) &&
                    !validateSessionLength()
                      ? "border-red-400 focus:border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {(touched.sessionLength || hasSubmitted) &&
                  !validateSessionLength() && (
                    <p className="text-red-600 text-sm mt-1">
                      Please enter a valid duration (1-240 minutes)
                    </p>
                  )}

                {eventDate &&
                  validateHour() &&
                  validateMinutes() &&
                  validateSessionLength() && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg">
                      <small className="text-green-700 font-medium">
                        End time: {getEndTime()}
                      </small>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Location Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BiMap className="inline mr-2" />
              Session Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="locationType"
                  value="online"
                  checked={locationType === "online"}
                  onChange={(e) => setLocationType(e.target.value)}
                  className="mr-2 text-[#DF9E7A] focus:ring-[#DF9E7A]"
                />
                Online Session
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="locationType"
                  value="in-person"
                  checked={locationType === "in-person"}
                  onChange={(e) => setLocationType(e.target.value)}
                  className="mr-2 text-[#DF9E7A] focus:ring-[#DF9E7A]"
                />
                In-Person Session
              </label>
            </div>
          </div>

          {/* In-Person Location */}
          {locationType === "in-person" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiMapPin className="inline mr-2" />
                Location Address
              </label>
              <textarea
                value={inPersonLocation}
                onChange={(e) => {
                  setInPersonLocation(e.target.value);
                  setTouched((prev) => ({ ...prev, inPersonLocation: true }));
                }}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, inPersonLocation: true }))
                }
                placeholder="Enter the physical location for the session..."
                rows={1}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#DF9E7A] focus:border-[#DF9E7A] resize-none ${
                  (touched.inPersonLocation || hasSubmitted) &&
                  !validateInPersonLocation()
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                }`}
              />
              {(touched.inPersonLocation || hasSubmitted) &&
                !validateInPersonLocation() && (
                  <p className="text-red-600 text-sm mt-1">
                    Please enter the session location
                  </p>
                )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-6 py-2 bg-[#DF9E7A] text-white rounded-lg font-medium hover:bg-[#DF9E7A]/90 transition-colors disabled:opacity-50 flex items-center"
            >
              {isCreating ? (
                <>
                  <BiLoaderAlt className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <BiCheck className="mr-2" />
                  Create Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBookingPopup;
