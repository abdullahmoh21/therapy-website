import React, { useState } from "react";
import { BiCalendarPlus, BiRefresh } from "react-icons/bi";
import DashboardHeader from "./MyBookingHeader";
import RecurringInfoPopup from "./RecurringInfoPopup";
import HelpButton from "../../../../components/HelpButton";

/**
 * NoBooking Component
 *
 * This component is only shown to users who:
 * 1. Do NOT have a recurring schedule set up
 * 2. Have NO active one-off bookings (admin or Calendly)
 *
 * Users with recurring schedules will always see their recurring card
 * even if there are no upcoming bookings in the buffer.
 */
const NoBooking = ({
  gettingBookingLink,
  bookingLink,
  userData,
  getBookingLink,
}) => {
  const [showRecurringInfoPopup, setShowRecurringInfoPopup] = useState(false);

  const handleBookSession = () => {
    if (bookingLink) {
      window.location.href = bookingLink;
    } else if (getBookingLink && !gettingBookingLink) {
      getBookingLink();
    }
  };

  const handleRecurringInfoClick = () => {
    setShowRecurringInfoPopup(true);
    document.body.style.overflow = "hidden";
  };

  const handleCloseRecurringInfoPopup = () => {
    setShowRecurringInfoPopup(false);
    document.body.style.overflow = "auto";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-0 pb-8">
      <DashboardHeader
        userData={userData}
        showBookButton={false}
        getBookingLink={getBookingLink}
      />

      {/* Help Button */}
      <HelpButton />

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
          <BiCalendarPlus className="w-16 h-16 text-[#DF9E7A] mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            No Upcoming Bookings
          </h2>
          <p className="text-gray-600 mb-6 max-w-md">
            You don't have any sessions scheduled at the moment. Ready to book
            your next one?
          </p>
          <button
            className={`flex items-center space-x-2 bg-[#DF9E7A] text-white font-semibold px-6 py-3 rounded-lg shadow hover:bg-[#c45e3e] transition duration-300 ${
              gettingBookingLink ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={gettingBookingLink}
            onClick={handleBookSession}
          >
            {gettingBookingLink ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading Link...
              </>
            ) : (
              <>
                <BiCalendarPlus className="text-xl" />
                <span>Book a Session</span>
              </>
            )}
          </button>
        </div>

        {/* Recurring Schedule Suggestion */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={handleRecurringInfoClick}
            className="flex items-center justify-center space-x-2 text-sm text-[#DF9E7A] hover:text-[#C88761] font-medium transition-colors group w-full"
          >
            <BiRefresh className="text-base group-hover:scale-110 transition-transform" />
            <span>Dont want to schedule your own bookings?</span>
          </button>
        </div>
      </div>

      <RecurringInfoPopup
        show={showRecurringInfoPopup}
        onClose={handleCloseRecurringInfoPopup}
      />
    </div>
  );
};

export default NoBooking;
