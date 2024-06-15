import React, { useEffect, useState } from "react";
import {
  useGetMyBookingsQuery,
  useNewBookingLinkQuery,
} from "../../features/bookings/bookingApiSlice";
import noBookingIcon from "../../assets/images/noBooking.png";

const MyBookings = () => {
  console.log(`MyBookings component rendered`);
  // Fetch bookings
  const {
    data,
    isLoading,
    isSuccess: bookingsLoaded,
    refetch,
  } = useGetMyBookingsQuery(); // Fetch user bookings
  const [bookings, setBookings] = useState([]);

  const {
    data: link,
    error,
    isLoading: gettingLink,
  } = useNewBookingLinkQuery();

  useEffect(() => {
    if (data && Array.isArray(data.ids)) {
      setBookings(Object.values(data.entities));
    }
  }, [data]);

  // TODO: add calendly booking linkrefetch onClick

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (bookingsLoaded && bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <img
          src={noBookingIcon}
          alt="noBookingIcon"
          className="w-[90px] mb-4"
        />
        <p className="text-xl text-gray-700">
          No booking found! Please book a session using the following link
        </p>
        <div className="text-center mt-4">
          <button
            className={`bg-blue-500 text-white px-4 py-2 rounded ${
              gettingLink
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-700"
            }`}
            disabled={gettingLink}
            onClick={() => {
              if (link) {
                window.location.href = link;
              }
            }}
          >
            Book a Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create the follwing div for each booking */}
      {bookings.map((booking, index) => {
        // Calculate duration
        const startTime = new Date(booking.eventStartTime);
        const endTime = new Date(booking.eventEndTime);
        const type = booking.eventType;
        const duration = (endTime - startTime) / 60000; // Duration in minutes

        // Format date and time
        const options = {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        };
        const formattedStartTime = startTime.toLocaleDateString(
          undefined,
          options
        );

        return (
          <div key={index} className="border p-4 rounded shadow">
            <h2 className="text-xl font-bold mb-2">{type}</h2>
            <p className="mb-1">
              <span className="font-semibold">Duration:</span> {duration}{" "}
              minutes
            </p>
            <p className="mb-1">
              <span className="font-semibold">Start Time:</span>{" "}
              {formattedStartTime}
            </p>
            <p className="mb-1">
              <span className="font-semibold">Amount:</span>
              {booking.paymentAmmount === 0
                ? " Free"
                : ` ${booking.paymentAmmount} ${booking.paymentCurrency}`}
            </p>
            <p className="mb-1">
              <span className="font-semibold">Status:</span>{" "}
              {booking.paymentStatus === "NA"
                ? "Confirmed"
                : booking.paymentStatus}
            </p>
            {booking.paymentStatus === "pending" && (
              <button className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">
                Pay Online
              </button>
            )}
          </div>
        );
      })}
      {/* Add this button inside your return statement, adjust placement as needed */}
      <div className="text-center mt-4">
        <button
          className={`bg-blue-500 text-white px-4 py-2 rounded ${
            gettingLink ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
          }`}
          disabled={gettingLink}
          onClick={() => {
            if (link) {
              window.location.href = link;
            }
          }}
        >
          Book a Session
        </button>
      </div>
    </div>
  );
};

export default MyBookings;
