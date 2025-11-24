/**
 * Unified Date/Time Formatting Utilities
 * Centralizes all date and time formatting logic across the application
 */

/**
 * Format a date string into separate date and time components
 * @param {string|Date} dateString - The date to format
 * @returns {Object} Object with 'date' and 'time' properties
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return { date: "-", time: "-" };

  const date = new Date(dateString);

  return {
    date: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
};

/**
 * Format a 24-hour time string to 12-hour format
 * @param {string} time24 - Time in 24-hour format (e.g., "14:30")
 * @returns {string} Time in 12-hour format (e.g., "2:30 PM")
 */
export const formatTime12Hour = (time24) => {
  if (!time24) return "";

  const [hours, minutes] = time24.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minutes} ${ampm}`;
};

/**
 * Format an amount with proper locale string formatting
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted amount or original value if not a number
 */
export const formatAmount = (amount) => {
  return typeof amount === "number" ? amount.toLocaleString("en-US") : amount;
};

/**
 * Get the day name from a day number
 * @param {number} dayNum - Day number (0 = Sunday, 6 = Saturday)
 * @returns {string} Day name or "Unknown" if invalid
 */
export const getDayName = (dayNum) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayNum] || "Unknown";
};

/**
 * Get display text for booking interval
 * @param {string} interval - Interval type (weekly, biweekly, monthly)
 * @returns {string} Human-readable interval text
 */
export const getIntervalDisplay = (interval) => {
  const intervals = {
    weekly: "Every week",
    biweekly: "Every 2 weeks",
    monthly: "Every month",
  };
  return intervals[interval] || interval;
};
