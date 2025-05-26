import React, { useState, useEffect } from "react";
import {
  useGetBookingQuery, // This should be from bookingApiSlice, ensure correct import path
} from "../../../../features/bookings/bookingApiSlice"; // Corrected path assumption
import {
  useGetPaymentQuery, // This should be from paymentApiSlice
} from "../../../../features/payments/paymentApiSlice"; // Corrected path assumption
import PaymentButton from "./PaymentButton";
import ExpandedContentSkeleton from "./ExpandedContentSkeleton";
import { BiErrorCircle, BiVideo } from "react-icons/bi";
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
  data: initialData, // initialData is a booking object from the list
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
  });

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
      newData.eventName = bookingDetails.eventName || newData.eventName;
      newData.location = bookingDetails.location || newData.location;
      newData.notes = bookingDetails.notes || newData.notes;
      newData.cancellation =
        bookingDetails.cancellation || newData.cancellation;
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
  const effectivePaymentError = paymentIdForQuery && initialData?.payment && paymentError;

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

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Payment Details
          </h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Transaction ID</p>
                  <p className="font-medium">
                    {combinedData.payment?.transactionReferenceNumber ||
                      combinedData.payment?.reference_number ||
                      "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium">
                    {typeof combinedData.payment?.amount === "number"
                      ? `${combinedData.payment.amount.toLocaleString()} ${
                          combinedData.payment?.currency || "PKR"
                        }`
                      : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <div>
                    <ExpandedStatusDisplay // This component uses transactionStatusDisplay
                      transactionStatusDisplay={
                        combinedData.transactionStatusDisplay
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">{paymentDateTitle}</p>
                  <p className="font-medium">{paymentDateValue}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-medium">
                    {combinedData.payment?.paymentMethod || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Currency</p>
                  <p className="font-medium">
                    {combinedData.payment?.currency || "PKR"}
                  </p>
                </div>
              </div>
            </div>
            {(combinedData.payment?.transactionStatus === "Not Initiated" ||
              combinedData.payment?.transactionStatus === "Cancelled" ||
              combinedData.payment?.transactionStatus === "Failed") &&
              combinedData._id && ( // Ensure booking _id is present
                <div className="mt-4 flex justify-end">
                  <PaymentButton
                    bookingId={combinedData._id} // Pass the booking's MongoDB _id
                    status={combinedData.payment?.transactionStatus}
                    onClick={() => onRedirectToPayment(combinedData._id)} // Ensure onClick calls with booking _id
                    isLoading={payingBookingId === combinedData._id}
                  />
                </div>
              )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Session Details
          </h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Event Name</p>
                  <p className="font-medium">
                    {combinedData.eventName || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Booking ID</p>
                  <p className="font-medium">
                    {combinedData.customerBookingId ||
                      combinedData.bookingId ||
                      "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Session Status</p>
                  {/* 'status' on combinedData is the booking status */}
                  <p className="font-medium">{combinedData.status || "--"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Session Date & Time</p>
                  <p className="font-medium">
                    {/* Use eventStartTime from combinedData, format it */}
                    {combinedData.eventStartTime
                      ? formatReadableDate(combinedData.eventStartTime)
                      : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">
                    {formatLocation(combinedData.location)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">
                    {combinedData.sessionDuration || "--"}
                  </p>
                </div>
              </div>
            </div>
            {combinedData.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Session Notes</p>
                <p className="text-sm bg-gray-50 p-2 rounded mt-1">
                  {combinedData.notes}
                </p>
              </div>
            )}
            {combinedData.cancellation?.reason && (
              <div className="mt-4 p-2 bg-red-50 rounded-md border border-red-200">
                <p className="text-sm text-gray-700 font-medium">
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
              </div>
            )}
            {combinedData.location?.type === "online" &&
              (combinedData.status === "Active" ||
                combinedData.status === "active") && // check for 'active' too
              combinedData.location?.join_url && (
                <div className="mt-4 flex justify-end">
                  <a
                    href={combinedData.location.join_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                    onClick={(e) => e.stopPropagation()} // Prevent row click if needed
                  >
                    <BiVideo className="mr-2 h-5 w-5" /> Join Session
                  </a>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandedRowContent;
