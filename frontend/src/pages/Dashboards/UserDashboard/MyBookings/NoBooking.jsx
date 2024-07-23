import React from "react";
import "primeicons/primeicons.css";

const NoBooking = ({ gettingBookingLink, Bookinglink }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div>
        <i
          className="pi pi-calendar-times w-auto mb-4"
          style={{ fontSize: "6rem" }}
        ></i>
      </div>
      <p className="text-xl text-gray-700">
        No bookings found! Please book a session using the following link
      </p>
      <div className="text-center mt-4">
        <button
          className={`bg-blue-500 text-white px-4 py-2 rounded ${
            gettingBookingLink
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-blue-700"
          }`}
          disabled={gettingBookingLink}
          onClick={() => {
            if (Bookinglink) {
              window.location.href = Bookinglink;
            }
          }}
        >
          Book a Session
        </button>
      </div>
    </div>
  );
};

export default NoBooking;
