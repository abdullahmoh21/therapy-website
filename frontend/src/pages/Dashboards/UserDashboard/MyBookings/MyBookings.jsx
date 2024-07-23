import React, { useState, useEffect } from "react";
import {
  useGetMyBookingsQuery,
  useNewBookingLinkQuery,
} from "../../../../features/bookings/bookingApiSlice";
import {
  useGetPaymentLinkMutation,
  useSendRefundRequestMutation,
} from "../../../../features/payments/paymentApiSlice";
import { ProgressSpinner } from "primereact/progressspinner";
import { Message } from "primereact/message";
import NoBooking from "./NoBooking";

const MyBookings = () => {
  console.log(`MyBookings component rendered`);
  const [bookings, setBookings] = useState([]);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refundError, setRefundError] = useState(null);

  // Fetch bookings
  const {
    data: bookingData,
    isLoading,
    isSuccess: bookingsLoaded,
  } = useGetMyBookingsQuery(); // Fetch user bookings

  // Fetch new booking link
  const {
    data: Bookinglink,
    error: BookingLinkError,
    isLoading: gettingBookingLink,
  } = useNewBookingLinkQuery();

  //Initiate payment and get payment link
  const [
    triggerGetPaymentLink,
    { isLoading: gettingPaymentLink, error: getPaymentLinkError },
  ] = useGetPaymentLinkMutation();

  // send refund request
  const [
    sendRefundRequest,
    { isLoading: sendingRefundRequest, error: sendRefundRequestError },
  ] = useSendRefundRequestMutation();

  // extract bookings from data when available
  useEffect(() => {
    if (bookingData && Array.isArray(bookingData.ids)) {
      setBookings(Object.values(bookingData.entities));
    }
  }, [bookingData]);

  // fetch papyment link and redirect
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

  // Function to check eligibility for refund request
  const checkRefundEligibility = (booking) => {
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
    const eventStartTime = new Date(booking.eventStartTime).getTime();
    const currentTime = Date.now();
    return eventStartTime - currentTime > threeDaysInMs;
  };

  // Handle refund request
  const handleRefundRequest = async (bookingId, paymentId, cancelURL) => {
    setLoading(true);
    setRefundError(null);
    try {
      console.log(
        "Sending refund request, with details:",
        bookingId,
        paymentId
      );
      await sendRefundRequest({ bookingId, paymentId });
      console.log("Refund request sent successfully");
      setShowCancelPopup(false);
      window.location.href = cancelURL;
    } catch (error) {
      console.error("Failed to send refund request:", error);
      setRefundError(error);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle cancellation
  const handleCancellation = (cancelURL) => {
    window.location.href = cancelURL;
    setShowCancelPopup(false);
  };

  // No booking found page
  if (bookingsLoaded && bookings.length === 0) {
    return (
      <NoBooking
        Bookinglink={Bookinglink}
        gettingBookingLink={gettingBookingLink}
      />
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
                <div className="flex space-x-2">
                  <button
                    className="bg-red-500 text-white px-4 py-2 rounded"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowCancelPopup(true);
                      document.body.style.overflow = "hidden";
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* NEW BOOKING HEADER */}
        <div className="text-center mt-4 mb-4">
          <h2 className="text-2xl font-semibold mb-3">
            Ready for your next session?
          </h2>
          <p className="mb-4">Book now and let us help you</p>
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

        {/* Popup for cancellation */}
        {showCancelPopup && selectedBooking && (
          <div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
            onClick={() => {
              setShowCancelPopup(false);
              document.body.style.overflow = "auto";
            }}
          >
            <div
              className="bg-white p-6 rounded shadow-lg relative w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-2 right-2 text-2xl font-bold pr-2"
                onClick={() => {
                  setShowCancelPopup(false);
                  document.body.style.overflow = "auto";
                }}
              >
                &times;
              </button>
              <h2 className="text-xl font-bold mb-4">{`Attempting to cancel booking ${selectedBooking.bookingId}`}</h2>
              {loading ? (
                <div className="flex items-center justify-center mb-4">
                  <ProgressSpinner />
                </div>
              ) : refundError ? (
                <div className="mb-4">
                  <Message
                    severity="error"
                    text="Failed to send refund request. Please proceed with the cancellation and contact your therapist directly for a refund."
                  />
                </div>
              ) : selectedBooking.transactionStatus === "Completed" ? (
                <p className="mb-4">
                  {checkRefundEligibility(selectedBooking)
                    ? "According to our cancellation policy, you are eligible for a refund. By clicking proceed, you will be refunded the amount after cancellation."
                    : "According to our cancellation policy, you will NOT receive a refund. Do you still want to proceed with cancellation?"}
                </p>
              ) : checkRefundEligibility(selectedBooking) ? (
                <p className="mb-4">Are you sure you want to cancel?</p>
              ) : (
                <p className="mb-4">
                  Since you are cancelling within three days of your booking,
                  you are still liable to pay the full amount. Do you still want
                  to proceed with cancellation?
                </p>
              )}
              <div className="flex justify-end">
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={() => {
                    if (selectedBooking.transactionStatus === "Completed") {
                      if (checkRefundEligibility(selectedBooking)) {
                        handleRefundRequest(
                          selectedBooking._id,
                          selectedBooking.paymentId,
                          selectedBooking.cancelURL
                        );
                      } else {
                        handleCancellation(selectedBooking.cancelURL);
                      }
                    } else {
                      handleCancellation(selectedBooking.cancelURL);
                    }
                  }}
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MyBookings;
