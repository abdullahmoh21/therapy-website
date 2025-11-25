import React, { useState, useEffect } from "react";
import { useGetBookingQuery } from "../../../../features/bookings/bookingApiSlice";
import { useGetPaymentQuery } from "../../../../features/payments/paymentApiSlice";
import PaymentButton from "./PaymentButton";
import ExpandedContentSkeleton from "./ExpandedContentSkeleton";
import {
  BiErrorCircle,
  BiVideo,
  BiLoaderAlt,
  BiDollarCircle,
} from "react-icons/bi";
import { FaInfoCircle } from "react-icons/fa";
import ExpandedStatusDisplay from "./ExpandedStatusDisplay";
import { getStatusDisplay } from "./billingUtils"; // Make sure this util is robust

const formatReadableDate = (dateInput) => {
  if (!dateInput) return "--";
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "--"; // Invalid date
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "--";
  }
};

const formatLocation = (locationData) => {
  if (!locationData) return "--";
  if (typeof locationData === "string") return locationData; // Fallback for old string data

  if (typeof locationData === "object" && locationData.type) {
    if (locationData.type === "in-person") {
      return locationData.inPersonLocation || "In-Person (Details N/A)";
    } else if (locationData.type === "online") {
      return "Online"; // Simply return "Online", button will be handled in JSX
    }
    return `${locationData.type} (Details N/A)`;
  }
  return "Invalid location data";
};

const ExpandedRowContent = ({
  data: initialData,
  onRedirectToPayment,
  payingBookingId,
}) => {
  const bookingIdForQuery = initialData?._id; // MongoDB _id of the booking
  const paymentIdForQuery = initialData?.payment?._id; // MongoDB _id of the payment, if payment object exists

  const {
    data: bookingDetails,
    isLoading: bookingLoading,
    isError: bookingError,
    // refetch: refetchBookingDetails // Optional: if you need to manually refetch
  } = useGetBookingQuery(bookingIdForQuery, { skip: !bookingIdForQuery });

  const {
    data: paymentDetails,
    isLoading: paymentLoading,
    isError: paymentError,
    // refetch: refetchPaymentDetails // Optional
  } = useGetPaymentQuery(paymentIdForQuery, {
    skip: !paymentIdForQuery || !initialData?.payment,
  }); // Also skip if no initial payment object

  const [combinedData, setCombinedData] = useState({
    ...initialData, // Start with data from the row
    payment: initialData.payment || {}, // Ensure payment is an object
    transactionStatusDisplay:
      initialData.transactionStatusDisplay ||
      getStatusDisplay(initialData.payment?.transactionStatus),
    // Compute event name if missing
    eventName: initialData.eventName || computeEventName(initialData),
  });

  // Helper function to compute event name based on source
  function computeEventName(booking) {
    if (!booking) return "Session";

    if (booking.source === "calendly" && booking.calendly?.eventName) {
      return booking.calendly.eventName;
    } else if (booking.source === "system" && booking.recurring?.state) {
      const intervals = {
        weekly: "Weekly",
        biweekly: "Bi-weekly",
        monthly: "Monthly",
      };
      const intervalLabel =
        intervals[booking.recurring.interval] || "Recurring";
      return `${intervalLabel} Session`;
    } else if (booking.source === "admin") {
      return "Admin Scheduled Session";
    }

    return "Session";
  }

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "--";
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end - start) / (60 * 1000));
    return `${durationMinutes} minutes`;
  };

  useEffect(() => {
    // initialData already contains basic booking and payment info
    // We are fetching more details for booking and payment separately
    const newData = {
      ...initialData,
      payment: { ...(initialData.payment || {}) }, // Ensure payment is an object
    };

    if (bookingDetails && !bookingLoading && !bookingError) {
      // Merge bookingDetails, but be careful not to overwrite essential fields from initialData
      // if bookingDetails is a more complete version of the booking.
      Object.assign(newData, bookingDetails); // bookingDetails is the full booking object
      // Ensure payment from initialData isn't lost if bookingDetails doesn't have it (it shouldn't)
      newData.payment = {
        ...(initialData.payment || {}),
        ...(bookingDetails.payment || {}),
      };

      if (bookingDetails.eventStartTime && bookingDetails.eventEndTime) {
        newData.sessionDuration = calculateDuration(
          bookingDetails.eventStartTime,
          bookingDetails.eventEndTime
        );
      }
      // If bookingDetails has a more up-to-date status or other fields, they are now in newData
      newData.status = bookingDetails.status || newData.status;
      newData.eventName =
        bookingDetails.eventName ||
        computeEventName(bookingDetails) ||
        newData.eventName;
      newData.location = bookingDetails.location || newData.location;
      newData.notes = bookingDetails.notes || newData.notes;
      newData.cancellation =
        bookingDetails.cancellation || newData.cancellation;
      newData.source = bookingDetails.source || newData.source;
      newData.recurring = bookingDetails.recurring || newData.recurring;
    }

    if (paymentDetails && !paymentLoading && !paymentError) {
      // Merge paymentDetails into the payment sub-object
      newData.payment = { ...newData.payment, ...paymentDetails };
      if (paymentDetails.transactionStatus) {
        newData.transactionStatusDisplay = getStatusDisplay(
          paymentDetails.transactionStatus
        );
        // Ensure raw transactionStatus on payment object is also updated
        newData.payment.transactionStatus = paymentDetails.transactionStatus;
      }
    } else if (
      initialData.payment?.transactionStatus &&
      !newData.transactionStatusDisplay
    ) {
      // Fallback to initialData's payment status if paymentDetails didn't load or update it
      // This should already be set in initial useState or by initialData.transactionStatusDisplay
      newData.transactionStatusDisplay = getStatusDisplay(
        initialData.payment.transactionStatus
      );
    }

    // If initialData itself was updated (e.g. parent list refetched), merge it too.
    // This helps if the row data in the parent table changes while expanded.
    setCombinedData((prevData) => ({ ...prevData, ...newData }));
  }, [
    initialData,
    bookingDetails,
    paymentDetails,
    bookingLoading,
    paymentLoading,
    bookingError,
    paymentError,
  ]);

  if (
    bookingLoading ||
    (paymentLoading && paymentIdForQuery && initialData?.payment)
  ) {
    return <ExpandedContentSkeleton />;
  }

  // Check error for payment query only if paymentIdForQuery was valid
  const effectivePaymentError =
    paymentIdForQuery && initialData?.payment && paymentError;

  if (bookingError || effectivePaymentError) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        <BiErrorCircle className="inline-block mr-2" />
        Error loading details. Please try again.
      </div>
    );
  }

  const getDateInfoForStatus = (paymentData, fallbackDateString) => {
    // Use paymentData which is combinedData.payment
    if (!paymentData) {
      return { title: "Payment Date", dateValue: "--" };
    }

    const {
      transactionStatus,
      paymentCompletedDate,
      paymentRefundedDate,
      refundRequestedDate,
    } = paymentData; // Use paymentData directly

    let title = "Payment Date";
    // Fallback date string is likely initialData.formattedPaymentCompletedDate or similar
    // For consistency, format dates freshly if available
    let dateValue = paymentCompletedDate
      ? formatReadableDate(paymentCompletedDate)
      : fallbackDateString && fallbackDateString !== "--"
      ? fallbackDateString
      : "--";

    switch (transactionStatus) {
      case "Completed":
        title = "Payment Date";
        dateValue = paymentCompletedDate
          ? formatReadableDate(paymentCompletedDate)
          : fallbackDateString && fallbackDateString !== "--"
          ? fallbackDateString
          : "--";
        break;
      case "Refunded":
        title = "Refund Date";
        dateValue = paymentRefundedDate
          ? formatReadableDate(paymentRefundedDate)
          : "--";
        break;
      case "Refund Requested":
        title = "Refund Requested Date";
        dateValue = refundRequestedDate
          ? formatReadableDate(refundRequestedDate)
          : "--";
        break;
      case "Not Initiated":
      case "Cancelled":
      case "Failed":
        title = "Payment Date";
        dateValue = "--";
        break;
      default:
        break;
    }
    return { title, dateValue };
  };

  const { title: paymentDateTitle, dateValue: paymentDateValue } =
    getDateInfoForStatus(
      combinedData.payment, // Pass the payment object from combinedData
      combinedData.payment?.paymentCompletedDate // Pass a raw date if available for fallback formatting
        ? formatReadableDate(combinedData.payment.paymentCompletedDate)
        : // or use a pre-formatted one from initialData if that's the design
          initialData.formattedPaymentCompletedDate // Example fallback
    );

  // Flag to show/hide payment button (set to false for now)
  const showPaymentButton = false;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Payment Details Section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Payment Details
        </h3>
        <dl className="space-y-3">
          <div className="flex justify-between items-start">
            <dt className="text-sm text-gray-500 font-medium">
              Transaction ID
            </dt>
            <dd className="text-sm text-gray-900 text-right">
              {combinedData.payment?.transactionReferenceNumber ||
                combinedData.payment?.reference_number ||
                "--"}
            </dd>
          </div>
          <div className="flex justify-between items-start">
            <dt className="text-sm text-gray-500 font-medium">Amount</dt>
            <dd className="text-sm text-gray-900 font-semibold text-right">
              {typeof combinedData.payment?.amount === "number"
                ? `${combinedData.payment.amount.toLocaleString()} ${
                    combinedData.payment?.currency || "PKR"
                  }`
                : "--"}
            </dd>
          </div>
          <div className="flex justify-between items-start">
            <dt className="text-sm text-gray-500 font-medium">
              Payment Status
            </dt>
            <dd className="text-sm text-gray-900 text-right">
              <ExpandedStatusDisplay
                transactionStatusDisplay={combinedData.transactionStatusDisplay}
              />
            </dd>
          </div>
          <div className="flex justify-between items-start">
            <dt className="text-sm text-gray-500 font-medium">
              {paymentDateTitle}
            </dt>
            <dd className="text-sm text-gray-900 text-right">
              {paymentDateValue}
            </dd>
          </div>
          <div className="flex justify-between items-start">
            <dt className="text-sm text-gray-500 font-medium">
              Payment Method
            </dt>
            <dd className="text-sm text-gray-900 text-right">
              {combinedData.payment?.paymentMethod || "--"}
            </dd>
          </div>
          <div className="flex justify-between items-start">
            <dt className="text-sm text-gray-500 font-medium">Currency</dt>
            <dd className="text-sm text-gray-900 text-right">
              {combinedData.payment?.currency || "PKR"}
            </dd>
          </div>
        </dl>

        {/* Refund request info */}
        {combinedData.payment?.transactionStatus === "Refund Requested" && (
          <div className="mt-4 px-3 py-2 bg-blue-50 border-l-4 border-blue-300 rounded">
            <div className="flex items-start">
              <FaInfoCircle className="text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-700">
                  Refund Request Status
                </p>
                <ul className="mt-1 text-xs text-gray-600 list-disc pl-4 space-y-1">
                  <li>Your request has been received and is being processed</li>
                  <li>
                    Please allow 2-3 business days for the refund to be
                    initiated
                  </li>
                  <li>
                    If you don't receive an email after this period, please
                    contact us with the transaction ID above
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Payment Button - Hidden for now, but logic preserved */}
        {showPaymentButton &&
          (combinedData.payment?.transactionStatus === "Not Initiated" ||
            combinedData.payment?.transactionStatus === "Cancelled" ||
            combinedData.payment?.transactionStatus === "Failed") &&
          combinedData._id && (
            <div className="mt-4">
              <button
                onClick={() => onRedirectToPayment(combinedData._id)}
                disabled={payingBookingId === combinedData._id}
                className="w-full inline-flex items-center justify-center bg-[#DF9E7A] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#DF9E7A]/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#DF9E7A] focus:ring-opacity-50 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {payingBookingId === combinedData._id ? (
                  <>
                    <BiLoaderAlt className="animate-spin mr-2 h-5 w-5" />
                    Processing...
                  </>
                ) : (
                  <>
                    <BiDollarCircle className="mr-2 h-5 w-5" />
                    Make Payment
                  </>
                )}
              </button>
            </div>
          )}
      </section>

      {/* Session Details Section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Session Details
        </h3>
        <dl className="space-y-3">
          <div className="flex justify-between items-start">
            <dt className="text-sm text-gray-500 font-medium">Event Name</dt>
            <dd className="text-sm text-gray-900 text-right">
              {combinedData.eventName || "--"}
            </dd>
          </div>
          <div className="flex justify-between items-start">
            <dt className="text-sm text-gray-500 font-medium">Booking ID</dt>
            <dd className="text-sm text-gray-900 text-right">
              {combinedData.customerBookingId || combinedData.bookingId || "--"}
            </dd>
          </div>
          <div className="flex justify-between items-start">
            <dt className="text-sm text-gray-500 font-medium">
              Session Status
            </dt>
            <dd className="text-sm text-gray-900 text-right">
              {combinedData.status || "--"}
            </dd>
          </div>
          <div className="flex justify-between items-start">
            <dt className="text-sm text-gray-500 font-medium">
              Session Date & Time
            </dt>
            <dd className="text-sm text-gray-900 text-right">
              {combinedData.eventStartTime
                ? formatReadableDate(combinedData.eventStartTime)
                : "--"}
            </dd>
          </div>
          <div className="flex justify-between items-start">
            <dt className="text-sm text-gray-500 font-medium">Location</dt>
            <dd className="text-sm text-gray-900 text-right">
              {formatLocation(combinedData.location)}
            </dd>
          </div>
          <div className="flex justify-between items-start">
            <dt className="text-sm text-gray-500 font-medium">Duration</dt>
            <dd className="text-sm text-gray-900 text-right">
              {combinedData.sessionDuration || "--"}
            </dd>
          </div>
        </dl>

        {/* Session Notes */}
        {combinedData.notes && (
          <div className="mt-4 p-3 bg-white rounded-md border border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-1">
              Session Notes
            </p>
            <p className="text-sm text-gray-600">{combinedData.notes}</p>
          </div>
        )}

        {/* Recurring Session Details */}
        {combinedData.source === "system" && combinedData.recurring?.state && (
          <div className="mt-4 p-3 bg-orange-50 rounded-md border border-orange-200">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Recurring Session Details
            </p>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">Schedule:</span>{" "}
                {combinedData.recurring.interval === "weekly" && "Weekly"}
                {combinedData.recurring.interval === "biweekly" && "Bi-weekly"}
                {combinedData.recurring.interval === "monthly" && "Monthly"}
              </p>
              {combinedData.recurring.time && (
                <p>
                  <span className="font-medium">Time:</span>{" "}
                  {combinedData.recurring.time}
                </p>
              )}
              {combinedData.recurring.day !== undefined && (
                <p>
                  <span className="font-medium">Day:</span>{" "}
                  {
                    [
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ][combinedData.recurring.day]
                  }
                </p>
              )}
            </div>
          </div>
        )}

        {/* Cancellation Details */}
        {combinedData.cancellation?.reason && (
          <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-200">
            <p className="text-xs font-medium text-gray-700 mb-1">
              Cancellation Details
            </p>
            <p className="text-sm text-red-600">
              Reason: {combinedData.cancellation.reason}
            </p>
            {combinedData.cancellation.date && (
              <p className="text-sm text-gray-600">
                Cancelled on:{" "}
                {formatReadableDate(combinedData.cancellation.date)}
              </p>
            )}
            {combinedData.cancellation.cancelledBy && (
              <p className="text-sm text-gray-600">
                Cancelled by: {combinedData.cancellation.cancelledBy}
              </p>
            )}
          </div>
        )}

        {/* Join Session Button */}
        {combinedData.location?.type === "online" &&
          (combinedData.status === "Active" ||
            combinedData.status === "active") &&
          combinedData.location?.join_url && (
            <div className="mt-4">
              <a
                href={combinedData.location.join_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                onClick={(e) => e.stopPropagation()}
              >
                <BiVideo className="mr-2 h-5 w-5" /> Join Session
              </a>
            </div>
          )}
      </section>
    </div>
  );
};

export default ExpandedRowContent;
