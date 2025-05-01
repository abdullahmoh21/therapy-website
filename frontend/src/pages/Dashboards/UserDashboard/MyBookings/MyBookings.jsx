import { ProgressSpinner } from "primereact/progressspinner";
import React, { useEffect, useState } from "react";
import {
  BiCalendar,
  BiCheckCircle,
  BiDollarCircle,
  BiErrorCircle,
  BiInfoCircle,
  BiLoaderAlt,
  BiMinusCircle,
  BiTime,
  BiXCircle,
} from "react-icons/bi";
import {
  useGetMyBookingsQuery,
  useNewBookingLinkQuery,
} from "../../../../features/bookings/bookingApiSlice";
import {
  useGetPaymentLinkMutation,
  useSendRefundRequestMutation,
} from "../../../../features/payments/paymentApiSlice";
import { useGetMyUserQuery } from "../../../../features/users/usersApiSlice";
import NoBooking from "./NoBooking";

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refundError, setRefundError] = useState(null);
  const [userData, setUserData] = useState(null);

  const {
    data: bookingData,
    isLoading: isLoadingBookings,
    isSuccess: bookingsLoaded,
    isError: isBookingError,
    error: bookingFetchError,
  } = useGetMyBookingsQuery();

  const {
    data: bookingLink,
    isLoading: gettingBookingLink,
    refetch: refetchBookingLink,
  } = useNewBookingLinkQuery();

  const { data: userDataResult } = useGetMyUserQuery();

  const [
    triggerGetPaymentLink,
    { isLoading: gettingPaymentLink, error: getPaymentLinkError },
  ] = useGetPaymentLinkMutation();

  const [
    sendRefundRequest,
    { isLoading: sendingRefundRequest, error: sendRefundRequestError },
  ] = useSendRefundRequestMutation();

  useEffect(() => {
    if (bookingData && Array.isArray(bookingData.ids)) {
      const sortedBookings = Object.values(bookingData.entities).sort(
        (a, b) => new Date(a.eventStartTime) - new Date(b.eventStartTime)
      );
      setBookings(sortedBookings);
    }
  }, [bookingData]);

  useEffect(() => {
    if (userDataResult) {
      const entities = userDataResult.entities;
      const fetchedUser = entities && entities[Object.keys(entities)[0]];
      if (fetchedUser) {
        setUserData(fetchedUser);
      }
    }
  }, [userDataResult]);

  const redirectToPayment = async (bookingId) => {
    try {
      const response = await triggerGetPaymentLink({ bookingId }).unwrap();
      if (response.url) {
        window.location.href = response.url;
      } else {
        console.error("Failed to fetch payment link: No URL found");
      }
    } catch (error) {
      console.error("Failed to fetch payment link:", error);
    }
  };

  const checkRefundEligibility = (booking) => {
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
    const eventStartTime = new Date(booking.eventStartTime).getTime();
    const currentTime = Date.now();
    return eventStartTime - currentTime > threeDaysInMs;
  };

  const handleRefundRequest = async (bookingId, paymentId, cancelURL) => {
    setLoading(true);
    setRefundError(null);
    try {
      await sendRefundRequest({ bookingId, paymentId }).unwrap();
      setShowCancelPopup(false);
      window.location.href = cancelURL;
    } catch (error) {
      console.error("Failed to send refund request:", error);
      setRefundError(
        error?.data?.message ||
          "An unexpected error occurred during refund request."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancellation = (cancelURL) => {
    window.location.href = cancelURL;
    setShowCancelPopup(false);
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const optionsDate = { year: "numeric", month: "long", day: "numeric" };
    const optionsTime = { hour: "2-digit", minute: "2-digit", hour12: true };
    return {
      date: date.toLocaleDateString("en-US", optionsDate),
      time: date.toLocaleTimeString("en-US", optionsTime),
    };
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "Completed":
        return {
          icon: <BiCheckCircle className="text-primaryColor" />,
          text: "Paid",
          color: "text-textColor",
        };
      case "Not Initiated":
        return {
          icon: <BiMinusCircle className="text-primaryColor" />,
          text: "Not Initiated",
          color: "text-textColor",
        };
      case "Failed":
        return {
          icon: <BiXCircle className="text-primaryColor" />,
          text: "Payment Failed",
          color: "text-textColor",
        };
      case "NA":
        return {
          icon: <BiCheckCircle className="text-primaryColor" />,
          text: "Confirmed (Free)",
          color: "text-textColor",
        };
      default:
        return {
          icon: <BiInfoCircle className="text-primaryColor" />,
          text: status,
          color: "text-textColor",
        };
    }
  };

  if (isLoadingBookings) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <ProgressSpinner
          style={{ width: "50px", height: "50px" }}
          strokeWidth="8"
          fill="var(--surface-ground)"
          animationDuration=".5s"
        />
      </div>
    );
  }

  if (isBookingError) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">
          {bookingFetchError?.data?.message || "Failed to load bookings."}
        </span>
      </div>
    );
  }

  if (bookingsLoaded && bookings.length === 0) {
    return (
      <NoBooking
        Bookinglink={bookingLink}
        gettingBookingLink={gettingBookingLink}
      />
    );
  }

  return (
    <>
      {userData && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-3 sm:mb-0">
            Welcome back, {userData.name}!
          </h1>
          <button
            className={`inline-flex items-center bg-[#DF9E7A] text-white font-bold px-4 py-2 rounded-lg transition-colors duration-300 ${
              gettingBookingLink
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[#c45e3e]"
            }`}
            disabled={gettingBookingLink}
            onClick={() => {
              if (bookingLink) {
                window.location.href = bookingLink;
              } else {
                refetchBookingLink();
              }
            }}
          >
            {gettingBookingLink ? (
              <>
                <BiLoaderAlt className="animate-spin mr-2" /> Loading Link...
              </>
            ) : (
              <>
                <BiCalendar className="mr-2" /> Book a New Session
              </>
            )}
          </button>
        </div>
      )}

      <div className="space-y-6">
        {bookings.map((booking) => {
          const { date: startDate, time: startTime } = formatDateTime(
            booking.eventStartTime
          );
          const { time: endTime } = formatDateTime(booking.eventEndTime);
          const duration =
            (new Date(booking.eventEndTime) -
              new Date(booking.eventStartTime)) /
            60000;
          const paymentStatus = getStatusStyles(booking.transactionStatus);
          const isConsultation = booking.eventName === "15 Minute Consultation";

          return (
            <div
              key={booking._id}
              className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-6"
            >
              <div className="flex-grow space-y-2">
                <h2 className="text-xl font-semibold text-headingColor flex items-center">
                  {isConsultation ? "Consultation" : "Therapy Session"}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (ID: {booking.bookingId})
                  </span>
                </h2>
                <div className="flex items-center text-gray-600">
                  <BiCalendar className="mr-2 text-[#DF9E7A]" />
                  <span>{startDate}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <BiTime className="mr-2 text-[#DF9E7A]" />
                  <span>{`${startTime} - ${endTime} (${duration} mins)`}</span>
                </div>
                <div
                  className={`flex items-center font-medium ${paymentStatus.color}`}
                >
                  {paymentStatus.icon}
                  <span className="ml-2">{paymentStatus.text}</span>
                </div>
                {!isConsultation && (
                  <div className="flex items-center text-gray-600">
                    <BiDollarCircle className="mr-2 text-[#DF9E7A]" />
                    <span>{`${booking.amount} ${booking.currency}`}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
                {booking.transactionStatus === "Not Initiated" && (
                  <button
                    className={`inline-flex justify-center items-center bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      gettingPaymentLink
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-green-600"
                    }`}
                    onClick={() => redirectToPayment(booking._id)}
                    disabled={gettingPaymentLink}
                  >
                    {gettingPaymentLink ? (
                      <BiLoaderAlt className="animate-spin mr-2" />
                    ) : (
                      <BiDollarCircle className="mr-1" />
                    )}{" "}
                    Pay Online
                  </button>
                )}

                {booking.cancelURL && (
                  <button
                    className="inline-flex justify-center items-center bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600 transition-colors duration-200"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setRefundError(null);
                      setShowCancelPopup(true);
                      document.body.style.overflow = "hidden";
                    }}
                  >
                    <BiXCircle className="mr-1" /> Cancel Booking
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showCancelPopup && selectedBooking && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-4"
          onClick={() => {
            setShowCancelPopup(false);
            document.body.style.overflow = "auto";
          }}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-xl relative w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl"
              onClick={() => {
                setShowCancelPopup(false);
                document.body.style.overflow = "auto";
              }}
              aria-label="Close"
            >
              &times;
            </button>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Cancel Booking Confirmation
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              You are attempting to cancel your{" "}
              <span className="font-medium">
                {selectedBooking.eventName === "15 Minute Consultation"
                  ? "Free Consultation"
                  : "therapy session"}
              </span>{" "}
              scheduled on{" "}
              <span className="font-medium">
                {formatDateTime(selectedBooking.eventStartTime).date}
              </span>{" "}
              at{" "}
              <span className="font-medium">
                {formatDateTime(selectedBooking.eventStartTime).time}
              </span>{" "}
              (ID: {selectedBooking.bookingId}).
            </p>

            <div className="mb-5 p-3 bg-gray-100 rounded-md border border-gray-200 text-sm">
              {selectedBooking.transactionStatus === "Completed" ? (
                checkRefundEligibility(selectedBooking) ? (
                  <p className="text-green-700 flex items-center">
                    <BiCheckCircle className="mr-2 flex-shrink-0" /> Eligible
                    for a full refund according to our policy.
                  </p>
                ) : (
                  <p className="text-orange-700 flex items-center">
                    <BiInfoCircle className="mr-2 flex-shrink-0" /> Not eligible
                    for a refund due to late cancellation (less than 3 days
                    prior).
                  </p>
                )
              ) : selectedBooking.transactionStatus === "Not Initiated" ? (
                checkRefundEligibility(selectedBooking) ? (
                  <p className="text-gray-700 flex items-center">
                    <BiInfoCircle className="mr-2 flex-shrink-0" /> This booking
                    is not paid yet. You can cancel it directly.
                  </p>
                ) : (
                  <p className="text-orange-700 flex items-center">
                    <BiInfoCircle className="mr-2 flex-shrink-0" /> Cancelling
                    less than 3 days prior. While unpaid, please note our policy
                    requires payment for late cancellations.
                  </p>
                )
              ) : (
                <p className="text-gray-700 flex items-center">
                  <BiInfoCircle className="mr-2 flex-shrink-0" /> This is a free
                  consultation booking.
                </p>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center mb-4 text-gray-600">
                <BiLoaderAlt className="animate-spin mr-2" /> Processing...
              </div>
            )}
            {refundError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm flex items-center">
                <BiErrorCircle className="mr-2 flex-shrink-0" /> {refundError}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors duration-200"
                onClick={() => {
                  setShowCancelPopup(false);
                  document.body.style.overflow = "auto";
                }}
                disabled={loading}
              >
                Keep Booking
              </button>
              <button
                className={`inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium transition-colors duration-200 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => {
                  if (
                    selectedBooking.transactionStatus === "Completed" &&
                    checkRefundEligibility(selectedBooking)
                  ) {
                    handleRefundRequest(
                      selectedBooking._id,
                      selectedBooking.paymentId,
                      selectedBooking.cancelURL
                    );
                  } else {
                    handleCancellation(selectedBooking.cancelURL);
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <BiLoaderAlt className="animate-spin mr-2" />
                ) : (
                  <BiXCircle className="mr-1" />
                )}{" "}
                Proceed to Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MyBookings;
