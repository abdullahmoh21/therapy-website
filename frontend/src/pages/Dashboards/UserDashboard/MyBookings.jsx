import React, { useEffect, useState } from "react";
import {
  useGetMyBookingsQuery,
  useNewBookingLinkQuery,
} from "../../../features/bookings/bookingApiSlice";
import { useGetPaymentLinkMutation } from "../../../features/payments/paymentApiSlice";
import noBookingIcon from "../../../assets/images/noBooking.png";

const MyBookings = () => {
  console.log(`MyBookings component rendered`);
  const [bookings, setBookings] = useState([]);

  const {
    // Fetch bookings
    data: bookingData,
    isLoading,
    isSuccess: bookingsLoaded,
  } = useGetMyBookingsQuery(); // Fetch user bookings

  const {
    // Fetch new booking link
    data: Bookinglink,
    error: BookingLinkError, //handle
    isLoading: gettingBookingLink,
  } = useNewBookingLinkQuery();

  const [
    triggerGetPaymentLink,
    { isLoading: gettingPaymentLink, error: getPaymentLinkError },
  ] = useGetPaymentLinkMutation();

  useEffect(() => {
    // extract bookings from data when available
    if (bookingData && Array.isArray(bookingData.ids)) {
      setBookings(Object.values(bookingData.entities));
    }
  }, [bookingData]);

  const redirectToPayment = async (bookingId) => {
    console.log(`Fetching payment link for bookingId: ${bookingId}`);
    try {
      const response = await triggerGetPaymentLink({ bookingId }).unwrap();
      if (response.url) {
        console.log("Payment link:", response.url);
        window.location.href = response.url; // Redirect user to the payment link
      } else {
        //ADD TOAST HERE
        console.error("Failed to fetch payment link: No URL found");
      }
    } catch (error) {
      console.error("Failed to fetch payment link:", error);
      // Handle errors, e.g., network issues, server errors
    }
  };

  // No booking found page
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
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        {bookings.map((booking, index) => {
          const startTime = new Date(booking.eventStartTime);
          const endTime = new Date(booking.eventEndTime);
          const duration = (endTime - startTime) / 60000; // Duration in minutes

          const options = {
            hour: "2-digit",
            minute: "2-digit",
            year: "numeric",
            month: "long",
            day: "numeric",
          };
          const formattedStartTime = startTime.toLocaleDateString(
            undefined,
            options
          );

          return (
            <div key={index} className="border p-4 rounded shadow space-y-4">
              <div>
                <h2 className="text-xl font-bold">{`Booking number: ${booking.bookingId} `}</h2>
                <p>{`Scheduled for ${formattedStartTime} (${duration} minutes)`}</p>
                <p>{`Amount: ${
                  booking.paymentAmount === 0
                    ? "Free"
                    : `${booking.amount} ${booking.currency}`
                }`}</p>
                <p>{`Payment Status: ${
                  booking.transactionStatus === "NA"
                    ? "Paid"
                    : booking.transactionStatus
                }`}</p>
              </div>

              {booking.transactionStatus === "Pending" && (
                <div className="flex space-x-2">
                  <button
                    className={`bg-blue-500 text-white px-4 py-2 rounded ${
                      gettingPaymentLink
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-blue-700"
                    }`}
                    onClick={() => redirectToPayment(booking._id)}
                    disabled={gettingPaymentLink}
                  >
                    Pay Online
                  </button>
                </div>
              )}
              {booking.cancelURL && (
                <a
                  href={booking.cancelURL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="bg-red-500 text-white px-4 py-2 rounded">
                    Cancel
                  </button>
                </a>
              )}
            </div>
          );
        })}

        {/* NEW BOOKING HEADER */}
        <div className="text-center mt-4 mb-4">
          <h2 className="text-2xl font-semibold mb-3">
            Ready for your next session?
          </h2>
          <p className="mb-4">Book now and let us help u</p>
          <button
            className={`inline-block bg-blue-500 text-white font-bold px-6 py-3 rounded-lg transition-colors duration-300 ${
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
    </>
  );
};
export default MyBookings;
