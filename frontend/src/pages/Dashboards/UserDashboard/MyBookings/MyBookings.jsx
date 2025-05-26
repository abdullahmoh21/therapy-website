import React, { useEffect, useState } from "react";
import { ProgressSpinner } from "primereact/progressspinner";
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
  useGetNewBookingLinkQuery,
} from "../../../../features/bookings/bookingApiSlice";
import {
  useGetPaymentLinkMutation,
  useSendRefundRequestMutation,
} from "../../../../features/payments/paymentApiSlice";
import { useGetMyUserQuery } from "../../../../features/users/usersApiSlice";
import NoBooking from "./NoBooking";
import DashboardHeader from "../../../../components/Dashboard/DashboardHeader";
import { toast } from "react-toastify";

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [showNoCancelPopup, setShowNoCancelPopup] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refundError, setRefundError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [processingPaymentId, setProcessingPaymentId] = useState(null);

  const {
    data: bookingData,
    isLoading: isLoadingBookings,
    isSuccess: bookingsLoaded,
    isError: isBookingError,
    error: bookingFetchError,
  } = useGetMyActiveBookingsQuery();

  const {
    data: bookingLink,
    isLoading: gettingBookingLink,
    refetch: refetchBookingLink,
    error: newBookingLinkError,
    isError: isNewBookingLinkError,
  } = useGetNewBookingLinkQuery();

  const { data: userDataResult } = useGetMyUserQuery();

  const [triggerGetPaymentLink, { isLoading: gettingPaymentLink }] =
    useGetPaymentLinkMutation();

  const [sendRefundRequest, { isLoading: sendingRefundRequest }] =
    useSendRefundRequestMutation();

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

  const handleRefundRequest = async (bid, pid, url) => {
    setLoading(true);
    setRefundError(null);
    try {
      await sendRefundRequest({ bookingId: bid, paymentId: pid }).unwrap();
      window.location.href = url;
    } catch (e) {
      setRefundError(e?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancellation = (url) => {
    if (url) {
      window.location.href = url;
    } else {
      setShowNoCancelPopup(true);
    }
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

  const maxReached =
    isNewBookingLinkError && newBookingLinkError?.status === 403;

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
        Bookinglink={bookingLink}
        gettingBookingLink={gettingBookingLink}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader
        userData={userData}
        showBookButton={true}
        bookingLink={bookingLink}
        gettingBookingLink={gettingBookingLink}
        maxReached={maxReached}
        newBookingLinkError={newBookingLinkError}
        refetchBookingLink={refetchBookingLink}
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
                      disabled={processingPaymentId !== null}
                      onClick={() => redirectToPayment(b._id)}
                      className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition ${
                        processingPaymentId !== null
                          ? processingPaymentId === b._id
                            ? "bg-green-500 text-white cursor-not-allowed"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-green-500 hover:bg-green-600 text-white"
                      }`}
                    >
                      {processingPaymentId === b._id ? (
                        <BiLoaderAlt className="animate-spin" />
                      ) : (
                        <BiDollarCircle />
                      )}
                      <span>
                        {processingPaymentId === b._id
                          ? "Processing..."
                          : "Pay"}
                      </span>
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
      {showCancelPopup && selectedBooking && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCancelPopup(false);
            document.body.style.overflow = "auto";
          }}
        >
          <div
            className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
              onClick={() => {
                setShowCancelPopup(false);
                document.body.style.overflow = "auto";
              }}
            >
              &times;
            </button>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Cancel Confirmation
            </h2>
            <p className="text-gray-600 mb-6">
              You’re cancelling your{" "}
              <span className="font-medium">
                {selectedBooking.eventName === "15 Minute Consultation"
                  ? "Free Consultation"
                  : "Therapy Session"}
              </span>{" "}
              on{" "}
              <span className="font-medium">
                {formatDateTime(selectedBooking.eventStartTime).date} at{" "}
                {formatDateTime(selectedBooking.eventStartTime).time}
              </span>
              .
            </p>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
              {selectedBooking.transactionStatus === "Completed" ? (
                checkRefundEligibility(selectedBooking) ? (
                  <p className="flex items-center text-green-700">
                    <BiCheckCircle className="mr-2" /> Eligible for full refund.
                  </p>
                ) : (
                  <p className="flex items-center text-orange-600">
                    <BiInfoCircle className="mr-2" /> Too late for refund.
                  </p>
                )
              ) : selectedBooking.transactionStatus === "Not Initiated" ? (
                <p className="flex items-center">
                  <BiInfoCircle className="mr-2" /> Unpaid bookings cancel
                  immediately.
                </p>
              ) : (
                <p className="flex items-center">
                  <BiInfoCircle className="mr-2" /> This is a free consult.
                </p>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center mb-4 text-gray-600">
                <BiLoaderAlt className="animate-spin mr-2" /> Processing...
              </div>
            )}
            {refundError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
                <BiErrorCircle className="mr-2" />
                {refundError}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancelPopup(false);
                  document.body.style.overflow = "auto";
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
              >
                Keep It
              </button>
              <button
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
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-medium transition ${
                  loading
                    ? "bg-red-300 cursor-not-allowed"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {loading ? (
                  <BiLoaderAlt className="animate-spin" />
                ) : (
                  <BiXCircle />
                )}
                <span>Proceed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showNoCancelPopup && selectedBooking && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowNoCancelPopup(false);
            document.body.style.overflow = "auto";
          }}
        >
          <div
            className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
              onClick={() => {
                setShowNoCancelPopup(false);
                document.body.style.overflow = "auto";
              }}
            >
              &times;
            </button>
            <div className="mb-4 text-red-500 flex justify-center">
              <BiErrorCircle className="text-5xl" />
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 text-center">
              Cancellation Not Available
            </h2>
            <div className="text-gray-600 mb-6 space-y-3">
              <p>
                You can no longer cancel this booking as it's too close to the
                appointment time.
              </p>
              <p>
                If this is an emergency, please contact your therapist directly.
              </p>
              <p className="font-medium">
                You are still expected to pay for this session. If you have
                already paid, thank you for your understanding.
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowNoCancelPopup(false);
                  document.body.style.overflow = "auto";
                }}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition font-medium"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
