import React, { useEffect, useState } from "react";
import { ProgressSpinner } from "primereact/progressspinner";
import { useDispatch } from "react-redux";
import { BiRefresh } from "react-icons/bi";
import {
  useGetMyActiveBookingsQuery,
  bookingsApiSlice,
  useCancelMyBookingMutation,
  useGetNoticePeriodQuery,
} from "../../../../features/bookings/bookingApiSlice";
import { useGetPaymentLinkMutation } from "../../../../features/payments/paymentApiSlice";
import {
  useGetMyUserQuery,
  useGetRecurringBookingQuery,
} from "../../../../features/users/usersApiSlice";
import NoBooking from "./NoBooking";
import DashboardHeader from "./MyBookingHeader";
import RecurringScheduleCard from "./RecurringScheduleCard";
import OneOffBookingCard from "./OneOffBookingCard";
import { toast } from "react-toastify";
import CancelConfirmationPopup from "./CancelConfirmationPopup";
import NoCancellationPopup from "./NoCancellationPopup";
import PaymentInfoPopup from "./PaymentInfoPopup";
import ChangeSchedulePopup from "./ChangeSchedulePopup";
import RecurringInfoPopup from "./RecurringInfoPopup";
import { formatDateTime, formatAmount } from "../../../../utils/dateTimeUtils";
import HelpButton from "../../../../components/HelpButton";

const MyBookings = () => {
  const dispatch = useDispatch();
  const [recurringSchedule, setRecurringSchedule] = useState(null);
  const [nextRecurringBooking, setNextRecurringBooking] = useState(null);
  const [oneOffBookings, setOneOffBookings] = useState([]);
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
  const [showChangeSchedulePopup, setShowChangeSchedulePopup] = useState(false);
  const [showRecurringInfoPopup, setShowRecurringInfoPopup] = useState(false);
  const [storedCutoffDays, setStoredCutoffDays] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);

  // Fetch recurring booking info (empty object if not recurring)
  const {
    data: recurringData,
    isLoading: isLoadingRecurring,
    refetch: refetchRecurring,
  } = useGetRecurringBookingQuery();

  // Fetch one-off bookings (admin/Calendly only)
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

  const [cancelMyBooking, { isLoading: isCancelling }] =
    useCancelMyBookingMutation();

  // Fetch notice period for computing local cutoff
  const { data: noticePeriodData, isSuccess: noticePeriodSuccess } =
    useGetNoticePeriodQuery();

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

      // Check if there's an error in the result
      if (result.error) {
        // Check specifically for the 403 booking limit error
        if (
          result.error.status === 403 &&
          result.error.data?.maxAllowedBookings
        ) {
          setMaxBookingsReached(true);
          setMaxAllowedBookings(result.error.data.maxAllowedBookings);
          toast.error(
            `Booking limit reached. You can only have ${result.error.data.maxAllowedBookings} active bookings at a time.`
          );
        } else {
          // Handle other errors
          toast.error(
            result.error.data?.message ||
              "Could not get booking link. Please try again."
          );
        }
        return null;
      }

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

      // Refetch both bookings
      refetchBookings();
      refetchRecurring(); // In case they booked while having recurring

      // Clean the URL without reloading the page
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [refetchBookings, refetchRecurring]);

  // Process recurring data
  useEffect(() => {
    if (recurringData) {
      setRecurringSchedule(recurringData.recurringSchedule || null);
      setNextRecurringBooking(recurringData.nextRecurringBooking || null);
    }
  }, [recurringData]);

  // Process one-off bookings data
  useEffect(() => {
    if (bookingData?.ids) {
      const sorted = Object.values(bookingData.entities).sort(
        (a, b) => new Date(a.eventStartTime) - new Date(b.eventStartTime)
      );
      setOneOffBookings(sorted);
    } else {
      setOneOffBookings([]);
    }
  }, [bookingData]);

  useEffect(() => {
    if (userDataResult?.entities) {
      const usr =
        userDataResult.entities[Object.keys(userDataResult.entities)[0]];
      if (usr) setUserData(usr);
    }
  }, [userDataResult]);

  const redirectToPayment = async (id) => {
    try {
      setProcessingPaymentId(id);
      const res = await triggerGetPaymentLink({ bookingId: id }).unwrap();
      if (res.url) {
        window.location.href = res.url;
      } else {
        toast.error("Payment link not available");
        setProcessingPaymentId(null);
      }
    } catch (e) {
      console.error("Payment error:", e);
      toast.error(e?.data?.message || "Failed to get payment link");
      setProcessingPaymentId(null);
    }
  };

  const checkRefundEligibility = (b) => {
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return new Date(b.eventStartTime).getTime() - Date.now() > threeDays;
  };

  // Compute local cutoff for admin/system bookings
  const isWithinCancellationWindow = (booking) => {
    // Use stored cutoffDays if available, otherwise use noticePeriod
    const cutoffDays =
      storedCutoffDays ||
      (noticePeriodSuccess
        ? parseInt(noticePeriodData.noticePeriod, 10)
        : null);

    if (cutoffDays === null) {
      // If we don't have cutoff info, let backend decide
      return true;
    }

    const cutoffMillis = cutoffDays * 24 * 60 * 60 * 1000;
    const cutoffDeadline =
      new Date(booking.eventStartTime).getTime() - cutoffMillis;
    const currentTime = Date.now();

    return currentTime < cutoffDeadline;
  };

  const handleCancellation = async (booking, reason) => {
    if (!booking) return;

    setLoading(true);
    setRefundError(null);
    setCancellingBookingId(booking._id);

    try {
      // Determine cancellation method based on booking source
      if (booking.source === "calendly") {
        // Calendly bookings use the cancelURL
        if (booking.cancelURL) {
          // Show loading toast before redirect
          toast.info("Redirecting to Calendly to cancel your booking...", {
            autoClose: 2000,
          });

          // Small delay to let user see the toast
          setTimeout(() => {
            window.location.href = booking.cancelURL;
          }, 500);
        } else {
          // No cancelURL means outside cancellation window
          setShowCancelPopup(false);
          setShowNoCancelPopup(true);
        }
      } else if (["admin", "system"].includes(booking.source)) {
        // Admin/system bookings use the backend API
        try {
          await cancelMyBooking({
            bookingId: booking._id,
            reason: reason || "User requested cancellation",
          }).unwrap();

          toast.success("Booking cancelled successfully");
          setShowCancelPopup(false);
          setSelectedBooking(null);

          // Refetch bookings
          refetchBookings();
          refetchRecurring();
        } catch (error) {
          console.error("Cancellation error:", error);

          // Handle 403 error with cutoffDays
          if (error.status === 403 && error.data?.cutoffDays) {
            // Store the cutoffDays for future use
            setStoredCutoffDays(error.data.cutoffDays);

            // Show error toast
            toast.error(
              error.data?.message ||
                `Cancellations must be made at least ${error.data.cutoffDays} days before the session`
            );

            // Close cancel popup and show "Cancellation Closed" popup
            setShowCancelPopup(false);
            setShowNoCancelPopup(true);
          } else {
            // Other errors
            setRefundError(error.data?.message || "Failed to cancel booking");
            toast.error(error.data?.message || "Failed to cancel booking");
          }
        }
      }
    } catch (error) {
      console.error("Unexpected cancellation error:", error);
      setRefundError("An unexpected error occurred");
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
      setCancellingBookingId(null);
    }
  };

  const handleCancelClick = (booking) => {
    setSelectedBooking(booking);
    setRefundError(null);

    if (booking.source === "calendly") {
      // Calendly booking: check if cancelURL exists
      if (booking.cancelURL) {
        setShowCancelPopup(true);
      } else {
        setShowNoCancelPopup(true);
      }
    } else if (["admin", "system"].includes(booking.source)) {
      // Admin/system booking: check local cutoff if available
      if (isWithinCancellationWindow(booking)) {
        setShowCancelPopup(true);
      } else {
        setShowNoCancelPopup(true);
      }
    } else {
      // Unknown source - show no cancel popup
      setShowNoCancelPopup(true);
    }

    document.body.style.overflow = "hidden";
  };

  const handleCloseCancelPopup = () => {
    setShowCancelPopup(false);
    setSelectedBooking(null);
    setRefundError(null);
    document.body.style.overflow = "auto";
  };

  const handleCloseNoCancelPopup = () => {
    setShowNoCancelPopup(false);
    setSelectedBooking(null);
    document.body.style.overflow = "auto";
  };

  const handleClosePaymentInfoPopup = () => {
    setShowPaymentInfoPopup(false);
    document.body.style.overflow = "auto";
  };

  const handleCloseChangeSchedulePopup = () => {
    setShowChangeSchedulePopup(false);
    document.body.style.overflow = "auto";
  };

  const handleRecurringInfoClick = () => {
    setShowRecurringInfoPopup(true);
    document.body.style.overflow = "hidden";
  };

  const handleCloseRecurringInfoPopup = () => {
    setShowRecurringInfoPopup(false);
    document.body.style.overflow = "auto";
  };

  const handleChangeScheduleClick = () => {
    setShowChangeSchedulePopup(true);
    document.body.style.overflow = "hidden";
  };

  const handlePaymentButtonClick = () => {
    setShowPaymentInfoPopup(true);
    document.body.style.overflow = "hidden";
  };

  const handlePaymentClick = (booking) => {
    // Show the under construction popup
    handlePaymentButtonClick();
  };

  if (isLoadingBookings || isLoadingRecurring) {
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

  if (bookingsLoaded && !recurringSchedule && oneOffBookings.length === 0) {
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
    <div className="max-w-7xl mx-auto px-4 pt-0 pb-8">
      <DashboardHeader
        userData={userData}
        showBookButton={!recurringSchedule}
        getBookingLink={handleGetBookingLink}
        maxBookingsReached={maxBookingsReached}
        maxAllowedBookings={maxAllowedBookings}
      />

      {/* Help Button */}
      <HelpButton />

      {/* Recurring Schedule Section */}
      {recurringSchedule && (
        <RecurringScheduleCard
          schedule={recurringSchedule}
          nextBooking={nextRecurringBooking}
          formatDateTime={formatDateTime}
          formatAmount={formatAmount}
          onCancelClick={handleCancelClick}
          onChangeScheduleClick={handleChangeScheduleClick}
          noticePeriodData={noticePeriodData}
          noticePeriodSuccess={noticePeriodSuccess}
          storedCutoffDays={storedCutoffDays}
          cancellingBookingId={cancellingBookingId}
        />
      )}

      {/* One-Off Bookings Section */}
      {recurringSchedule && (
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Additional Sessions
          </h3>
          <p className="text-gray-600 mb-6">
            These are one-time sessions that supplement your recurring schedule.
          </p>
          {oneOffBookings.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {oneOffBookings.map((booking) => (
                <OneOffBookingCard
                  key={booking._id}
                  booking={booking}
                  formatDateTime={formatDateTime}
                  formatAmount={formatAmount}
                  onCancelClick={handleCancelClick}
                  onPaymentClick={handlePaymentClick}
                  processingPaymentId={processingPaymentId}
                  cancellingBookingId={cancellingBookingId}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="mb-4">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  No Additional Sessions
                </h4>
                <p className="text-gray-600 mb-6">
                  You don't have any one-time sessions scheduled. Need an extra
                  session this week? You can book a one-off session in addition
                  to your recurring schedule.
                </p>
                <button
                  onClick={handleGetBookingLink}
                  disabled={isGettingBookingLink || maxBookingsReached}
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white transition-all ${
                    maxBookingsReached
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-lightPink hover:bg-darkPink focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lightPink"
                  }`}
                >
                  {isGettingBookingLink ? (
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
                      Getting Link...
                    </>
                  ) : (
                    <>
                      <svg
                        className="-ml-1 mr-2 h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Book Additional Session
                    </>
                  )}
                </button>
                {maxBookingsReached && (
                  <p className="mt-3 text-sm text-red-600">
                    You've reached the maximum of {maxAllowedBookings} active
                    bookings
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!recurringSchedule && oneOffBookings.length > 0 && (
        <div className="mb-6">
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {oneOffBookings.map((booking) => (
              <OneOffBookingCard
                key={booking._id}
                booking={booking}
                formatDateTime={formatDateTime}
                formatAmount={formatAmount}
                onCancelClick={handleCancelClick}
                onPaymentClick={handlePaymentClick}
                processingPaymentId={processingPaymentId}
                cancellingBookingId={cancellingBookingId}
              />
            ))}
          </div>

          {/* Recurring Schedule Suggestion */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={handleRecurringInfoClick}
              className="flex items-center justify-center space-x-2 text-sm text-[#DF9E7A] hover:text-[#C88761] font-medium transition-colors group w-full"
            >
              <BiRefresh className="text-base group-hover:scale-110 transition-transform" />
              <span>Tired of scheduling your own bookings?</span>
            </button>
          </div>
        </div>
      )}

      <CancelConfirmationPopup
        show={showCancelPopup}
        onClose={handleCloseCancelPopup}
        booking={selectedBooking}
        loading={loading || isCancelling}
        refundError={refundError}
        formatDateTime={formatDateTime}
        checkRefundEligibility={checkRefundEligibility}
        handleCancellation={handleCancellation}
      />

      <NoCancellationPopup
        show={showNoCancelPopup}
        onClose={handleCloseNoCancelPopup}
        booking={selectedBooking}
        cutoffDays={storedCutoffDays}
      />

      <PaymentInfoPopup
        show={showPaymentInfoPopup}
        onClose={handleClosePaymentInfoPopup}
      />

      <ChangeSchedulePopup
        show={showChangeSchedulePopup}
        onClose={handleCloseChangeSchedulePopup}
      />

      <RecurringInfoPopup
        show={showRecurringInfoPopup}
        onClose={handleCloseRecurringInfoPopup}
      />
    </div>
  );
};

export default MyBookings;
