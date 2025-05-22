import React, { useState, useEffect } from "react";
import {
  useGetBookingQuery,
  useGetPaymentQuery,
} from "../../../../features/users/usersApiSlice";
import PaymentButton from "./PaymentButton";
import ExpandedContentSkeleton from "./ExpandedContentSkeleton";
import { BiErrorCircle, BiVideo } from "react-icons/bi"; // Import BiVideo
import ExpandedStatusDisplay from "./ExpandedStatusDisplay";
import { getStatusDisplay } from "./billingUtils";

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
  const bookingIdForQuery = initialData._id; // MongoDB _id of the booking
  const paymentIdForQuery = initialData.payment?._id; // MongoDB _id of the payment, if payment object exists

  const {
    data: bookingDetails,
    isLoading: bookingLoading,
    isError: bookingError,
  } = useGetBookingQuery(bookingIdForQuery, { skip: !bookingIdForQuery });

  const {
    data: paymentDetails,
    isLoading: paymentLoading,
    isError: paymentError,
  } = useGetPaymentQuery(paymentIdForQuery, { skip: !paymentIdForQuery });

  const [combinedData, setCombinedData] = useState({
    ...initialData, // initialData already contains the payment object from the list
  });

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "--";
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end - start) / (60 * 1000));
    return `${durationMinutes} minutes`;
  };

  useEffect(() => {
    // Start with a fresh copy of initialData, ensuring payment sub-object is present
    const newData = { ...initialData, payment: initialData.payment || {} };

    if (bookingDetails && !bookingLoading && !bookingError) {
      Object.assign(newData, { ...bookingDetails, payment: newData.payment }); // Preserve payment from initialData or paymentDetails
      if (bookingDetails.eventStartTime && bookingDetails.eventEndTime) {
        newData.sessionDuration = calculateDuration(
          bookingDetails.eventStartTime,
          bookingDetails.eventEndTime
        );
      }
    }

    if (paymentDetails && !paymentLoading && !paymentError) {
      newData.payment = { ...newData.payment, ...paymentDetails };
      if (paymentDetails.transactionStatus) {
        newData.transactionStatusDisplay = getStatusDisplay(
          paymentDetails.transactionStatus
        );
        newData.transactionStatus = paymentDetails.transactionStatus; // also update raw status
      }
    } else if (
      initialData.payment?.transactionStatus &&
      !newData.transactionStatusDisplay
    ) {
      // Fallback to initialData's payment status if paymentDetails didn't load or update it
      newData.transactionStatusDisplay = getStatusDisplay(
        initialData.payment.transactionStatus
      );
      newData.transactionStatus = initialData.payment.transactionStatus;
    }

    setCombinedData(newData);
  }, [
    initialData,
    bookingDetails,
    paymentDetails,
    bookingLoading,
    paymentLoading,
    bookingError,
    paymentError,
  ]);

  if (bookingLoading || (paymentLoading && paymentIdForQuery)) {
    return <ExpandedContentSkeleton />;
  }

  if (bookingError || (paymentError && paymentIdForQuery)) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        <BiErrorCircle className="inline-block mr-2" />
        Error loading details. Please try again.
      </div>
    );
  }

  const getDateInfoForStatus = (payment, formattedFallbackDate) => {
    if (!payment) {
      return { title: "Payment Date", dateValue: "--" };
    }

    const {
      transactionStatus,
      paymentCompletedDate,
      paymentRefundedDate,
      refundRequestedDate,
    } = payment;

    let title = "Payment Date";
    let dateValue =
      paymentCompletedDate && formattedFallbackDate !== "--"
        ? formatReadableDate(paymentCompletedDate)
        : formattedFallbackDate || "--";

    switch (transactionStatus) {
      case "Completed":
        title = "Payment Date";
        dateValue = paymentCompletedDate
          ? formatReadableDate(paymentCompletedDate)
          : formattedFallbackDate || "--";
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
      combinedData.payment,
      combinedData.formattedPaymentCompletedDate
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
                    {combinedData.payment?.transactionReferenceNumber || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium">
                    {combinedData.payment?.amount ?? "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <div>
                    <ExpandedStatusDisplay
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
              combinedData._id && (
                <div className="mt-4 flex justify-end">
                  <PaymentButton
                    bookingId={combinedData._id}
                    status={combinedData.payment?.transactionStatus}
                    onClick={onRedirectToPayment}
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
                    {combinedData.customerBookingId || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Session Status</p>
                  <p className="font-medium">{combinedData.status || "--"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Session Date & Time</p>
                  <p className="font-medium">
                    {combinedData.formattedEventStartTime
                      ? formatReadableDate(combinedData.formattedEventStartTime)
                      : combinedData.eventStartTime
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
              combinedData.status === "Active" &&
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
