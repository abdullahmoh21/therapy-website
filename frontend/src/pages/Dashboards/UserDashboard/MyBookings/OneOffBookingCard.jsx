import React from "react";
import {
  BiCalendar,
  BiTime,
  BiVideo,
  BiMapPin,
  BiDollarCircle,
  BiXCircle,
  BiCheckCircle,
  BiMinusCircle,
  BiInfoCircle,
  BiLoaderAlt,
} from "react-icons/bi";

const OneOffBookingCard = ({
  booking,
  formatDateTime,
  formatAmount,
  onCancelClick,
  onPaymentClick,
  processingPaymentId,
  cancellingBookingId,
}) => {
  const isConsultation = booking.eventName === "15 Minute Consultation";
  const { date: sd, time: st } = formatDateTime(booking.eventStartTime);
  const { time: et } = formatDateTime(booking.eventEndTime);
  const duration = Math.round(
    (new Date(booking.eventEndTime) - new Date(booking.eventStartTime)) / 60000
  );

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

  const {
    icon,
    text: statusText,
    badgeClass,
  } = getStatusStyles(booking.transactionStatus);

  const isProcessingPayment = processingPaymentId === booking._id;
  const isCancelling = cancellingBookingId === booking._id;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col hover:shadow-xl transition-shadow">
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {isConsultation ? "Consultation" : "Therapy Session"}
            </h2>
            <span className="text-sm text-gray-500">
              ID: {booking.bookingId}
            </span>
            {/* Source indicator removed - users don't need to know admin vs calendly */}
          </div>
          {!isConsultation && (
            <span
              className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${badgeClass}`}
            >
              {icon}
              <span className="ml-2">{statusText}</span>
            </span>
          )}
        </div>

        <div className="mt-2 space-y-3 text-gray-700 flex-grow">
          <div className="flex items-center">
            <BiCalendar className="mr-2 text-[#DF9E7A] flex-shrink-0" />
            <span>{sd}</span>
          </div>
          <div className="flex items-center">
            <BiTime className="mr-2 text-[#DF9E7A] flex-shrink-0" />
            <span>{`${st} – ${et} (${duration} mins)`}</span>
          </div>
          {booking.location?.type === "online" && (
            <div className="flex items-center">
              <BiVideo className="mr-2 text-[#DF9E7A] flex-shrink-0" />
              <span>Online Meeting</span>
            </div>
          )}
          {booking.location?.type === "in-person" &&
            booking.location.inPersonLocation && (
              <div className="flex items-center">
                <BiMapPin className="mr-2 text-[#DF9E7A] flex-shrink-0" />
                <span className="text-sm">
                  {booking.location.inPersonLocation}
                </span>
              </div>
            )}
          {!isConsultation && booking.amount && (
            <div className="flex items-center">
              <BiDollarCircle className="mr-2 text-green-500 flex-shrink-0" />
              <span>
                {formatAmount(booking.amount)} {booking.currency}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-50 flex flex-wrap gap-2">
        {/* Pay button - temporarily disabled */}
        {/* {!isConsultation && booking.transactionStatus === "Not Initiated" && (
          <button
            onClick={() => onPaymentClick(booking)}
            disabled={isProcessingPayment}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition ${
              isProcessingPayment
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gray-400 text-white hover:bg-gray-500"
            }`}
          >
            {isProcessingPayment ? (
              <>
                <BiLoaderAlt className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <BiDollarCircle />
                <span>Pay</span>
              </>
            )}
          </button>
        )} */}

        {/* Join Meeting Button - for online bookings */}
        {booking.location?.type === "online" &&
          booking.location?.meetingLink && (
            <button
              onClick={() =>
                window.open(
                  booking.location.meetingLink,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-lightPink text-white font-medium transition-colors hover:bg-lightPink/90 shadow-sm hover:shadow-md"
            >
              <BiVideo className="text-lg" />
              <span className="text-sm sm:text-base">Join Meeting</span>
            </button>
          )}

        {/* Cancel button - always shown, logic handled in parent */}
        <button
          onClick={() => onCancelClick(booking)}
          disabled={isCancelling}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg border font-medium transition-colors shadow-sm ${
            isCancelling
              ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
              : "border-red-500 bg-white text-red-500 hover:bg-red-50 hover:shadow-md"
          }`}
        >
          {isCancelling ? (
            <>
              <BiLoaderAlt className="text-lg animate-spin" />
              <span className="text-sm sm:text-base">Cancelling...</span>
            </>
          ) : (
            <>
              <BiXCircle className="text-lg" />
              <span className="text-sm sm:text-base">Cancel Session</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OneOffBookingCard;
