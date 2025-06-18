import React, { useEffect, useState } from "react";
import { ProgressSpinner } from "primereact/progressspinner";
import { useDispatch } from "react-redux";
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
  BiVideo,
  BiMapPin,
} from "react-icons/bi";
import {
  useGetMyActiveBookingsQuery,
  bookingsApiSlice,
} from "../../../../features/bookings/bookingApiSlice";
import { useGetPaymentLinkMutation } from "../../../../features/payments/paymentApiSlice";
import { useGetMyUserQuery } from "../../../../features/users/usersApiSlice";
import NoBooking from "./NoBooking";
import DashboardHeader from "./MyBookingHeader";
import { toast } from "react-toastify";
import CancelConfirmationPopup from "./CancelConfirmationPopup";
import NoCancellationPopup from "./NoCancellationPopup";
import PaymentInfoPopup from "./PaymentInfoPopup";

const MyBookings = () => {
  const dispatch = useDispatch();
  const [bookings, setBookings] = useState([]);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [showNoCancelPopup, setShowNoCancelPopup] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refundError, setRefundError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [processingPaymentId, setProcessingPaymentId] = useState(null);
  const [maxBookingsReached, setMaxBookingsReached] = useState(false);
  const [maxAllowedBookings, setMaxAllowedBookings] = useState(null);
  const [isGettingBookingLink, setIsGettingBookingLink] = useState(false);
  const [showPaymentInfoPopup, setShowPaymentInfoPopup] = useState(false);

  const {
    data: bookingData,
    isLoading: isLoadingBookings,
    isSuccess: bookingsLoaded,
    isError: isBookingError,
    error: bookingFetchError,
    refetch: refetchBookings,
  } = useGetMyActiveBookingsQuery();

  const { data: userDataResult } = useGetMyUserQuery();

  const [triggerGetPaymentLink, { isLoading: gettingPaymentLink }] =
    useGetPaymentLinkMutation();

  // Function to get a new booking link when the button is clicked
  const handleGetBookingLink = async () => {
    try {
      setIsGettingBookingLink(true);

      // Use dispatch to manually trigger the API endpoint
      const result = await dispatch(
        bookingsApiSlice.endpoints.getNewBookingLink.initiate(undefined, {
          forceRefetch: true,
        })
      );

      setIsGettingBookingLink(false);

      if (result.data?.link) {
        window.location.href = result.data.link;
        return result.data.link;
      } else {
        toast.error("No booking link available. Please try again.");
        return null;
      }
    } catch (error) {
      console.error("Error getting booking link:", error);
      setIsGettingBookingLink(false);
      toast.error("Could not get booking link. Please try again.");
      return null;
    }
  };

  // Check for Calendly redirect URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Check if this is a Calendly redirect
    if (
      urlParams.has("assigned_to") &&
      urlParams.has("event_type_uuid") &&
      urlParams.has("event_start_time")
    ) {
      // Show a toast notification
      toast.success(
        "Booking successfully created! Refreshing your bookings..."
      );

      // Refetch bookings data since a new booking might have been created
      refetchBookings();

      // Clean the URL without reloading the page
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [refetchBookings]);

  useEffect(() => {
    if (bookingData?.ids) {
      const sorted = Object.values(bookingData.entities).sort(
        (a, b) => new Date(a.eventStartTime) - new Date(b.eventStartTime)
      );
      setBookings(sorted);
    }
  }, [bookingData]);

  useEffect(() => {
    if (userDataResult?.entities) {
      const usr =
        userDataResult.entities[Object.keys(userDataResult.entities)[0]];
      if (usr) setUserData(usr);
    }
  }, [userDataResult]);

  const formatAmount = (amt) =>
    typeof amt === "number" ? amt.toLocaleString("en-US") : amt;

  const formatDateTime = (s) => {
    const d = new Date(s);
    return {
      date: d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const redirectToPayment = async (id) => {
    try {
      setProcessingPaymentId(id);
      const res = await triggerGetPaymentLink({ bookingId: id }).unwrap();
      if (res.url) window.location.href = res.url;
    } catch (e) {
      console.error(e);
      setProcessingPaymentId(null);
    }
  };

  const checkRefundEligibility = (b) => {
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return new Date(b.eventStartTime).getTime() - Date.now() > threeDays;
  };

  const handleRefundRequest = (url) => {
    if (url) {
      window.location.href = url;
    } else {
      setRefundError("No cancellation URL available");
    }
  };

  const handleCancellation = (url) => {
    if (url) {
      window.location.href = url;
    } else {
      setShowNoCancelPopup(true);
    }
  };

  const handleCloseCancelPopup = () => {
    setShowCancelPopup(false);
    document.body.style.overflow = "auto";
  };

  const handleCloseNoCancelPopup = () => {
    setShowNoCancelPopup(false);
    document.body.style.overflow = "auto";
  };

  const handleClosePaymentInfoPopup = () => {
    setShowPaymentInfoPopup(false);
    document.body.style.overflow = "auto";
  };

  const handlePaymentButtonClick = () => {
    setShowPaymentInfoPopup(true);
    document.body.style.overflow = "hidden";
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "Completed":
        return {
          icon: <BiCheckCircle className="text-green-500 text-xl" />,
          text: "Paid",
          badgeClass: "bg-green-100 text-green-800",
        };
      case "Not Initiated":
        return {
          icon: <BiMinusCircle className="text-yellow-500 text-xl" />,
          text: "Payment Pending",
          badgeClass: "bg-yellow-100 text-yellow-800",
        };
      case "Failed":
        return {
          icon: <BiXCircle className="text-red-500 text-xl" />,
          text: "Payment Failed",
          badgeClass: "bg-red-100 text-red-800",
        };
      default:
        return {
          icon: <BiInfoCircle className="text-gray-500 text-xl" />,
          text: status,
          badgeClass: "bg-gray-100 text-gray-800",
        };
    }
  };

  if (isLoadingBookings) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <ProgressSpinner
          style={{ width: "4rem", height: "4rem" }}
          strokeWidth="8"
          animationDuration=".5s"
        />
      </div>
    );
  }

  if (isBookingError) {
    return (
      <div className="bg-red-100 text-red-800 p-4 rounded-lg">
        <strong>Error:</strong>{" "}
        {bookingFetchError?.data?.message || "Unable to load bookings."}
      </div>
    );
  }

  if (bookingsLoaded && bookings.length === 0) {
    return (
      <NoBooking
        gettingBookingLink={isGettingBookingLink}
        bookingLink={null}
        userData={userData}
        getBookingLink={handleGetBookingLink}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader
        userData={userData}
        showBookButton={true}
        getBookingLink={handleGetBookingLink}
        maxBookingsReached={maxBookingsReached}
        maxAllowedBookings={maxAllowedBookings}
      />

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {bookings.map((b) => {
          const isConsultation = b.eventName === "15 Minute Consultation";
          const { date: sd, time: st } = formatDateTime(b.eventStartTime);
          const { time: et } = formatDateTime(b.eventEndTime);
          const duration = Math.round(
            (new Date(b.eventEndTime) - new Date(b.eventStartTime)) / 60000
          );
          const {
            icon,
            text: statusText,
            badgeClass,
          } = getStatusStyles(b.transactionStatus);

          const hasCancelUrl = Boolean(b.cancelURL);

          return (
            <div
              key={b._id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col"
            >
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {isConsultation ? "Consultation" : "Therapy Session"}
                    </h2>
                    <span className="text-sm text-gray-500">
                      ID: {b.bookingId}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${badgeClass}`}
                  >
                    {icon}
                    <span className="ml-2">{statusText}</span>
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-gray-700">
                  <div className="flex items-center">
                    <BiCalendar className="mr-2 text-[#DF9E7A]" />
                    <span>{sd}</span>
                  </div>
                  <div className="flex items-center">
                    <BiTime className="mr-2 text-[#DF9E7A]" />
                    <span>{`${st} – ${et} (${duration} mins)`}</span>
                  </div>
                  {b.location?.type === "online" && (
                    <div className="flex items-center">
                      <BiVideo className="mr-2 text-[#DF9E7A]" />
                      <span>Online Meeting</span>
                    </div>
                  )}
                  {b.location?.type === "in-person" &&
                    b.location.inPersonLocation && (
                      <div className="flex items-center">
                        <BiMapPin className="mr-2 text-[#DF9E7A]" />
                        <span>{b.location.inPersonLocation}</span>
                      </div>
                    )}
                  {!isConsultation && (
                    <div className="flex items-center">
                      <BiDollarCircle className="mr-2 text-green-500" />
                      <span>
                        {formatAmount(b.amount)} {b.currency}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-gray-50 flex flex-wrap gap-2">
                  {b.transactionStatus === "Not Initiated" && (
                    <button
                      onClick={handlePaymentButtonClick}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition bg-gray-400 text-white hover:bg-gray-500"
                    >
                      <BiDollarCircle />
                      <span>Pay</span>
                    </button>
                  )}

                  {hasCancelUrl && (
                    <button
                      onClick={() => {
                        setSelectedBooking(b);
                        setRefundError(null);
                        setShowCancelPopup(true);
                        document.body.style.overflow = "hidden";
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition"
                    >
                      <BiXCircle />
                      <span>Cancel</span>
                    </button>
                  )}

                  {!hasCancelUrl && (
                    <button
                      onClick={() => {
                        setSelectedBooking(b);
                        setShowNoCancelPopup(true);
                        document.body.style.overflow = "hidden";
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-red-300 text-white font-medium"
                    >
                      <BiXCircle />
                      <span>Cancel</span>
                    </button>
                  )}

                  {b.location?.type === "online" && (
                    <button
                      onClick={() =>
                        window.open(
                          b.location.join_url,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition"
                    >
                      <BiVideo />
                      <span>Join</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CancelConfirmationPopup
        show={showCancelPopup}
        onClose={handleCloseCancelPopup}
        booking={selectedBooking}
        loading={loading}
        refundError={refundError}
        formatDateTime={formatDateTime}
        checkRefundEligibility={checkRefundEligibility}
        handleRefundRequest={handleRefundRequest}
        handleCancellation={handleCancellation}
      />

      <NoCancellationPopup
        show={showNoCancelPopup}
        onClose={handleCloseNoCancelPopup}
        booking={selectedBooking}
      />

      <PaymentInfoPopup
        show={showPaymentInfoPopup}
        onClose={handleClosePaymentInfoPopup}
      />
    </div>
  );
};

export default MyBookings;
