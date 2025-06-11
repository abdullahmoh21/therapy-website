import React, { useState, useEffect } from "react";
import {
  useGetAdminBookingDetailQuery,
  useMarkPaymentAsPaidMutation,
} from "../../../../features/admin/adminApiSlice";
import {
  BiCheck,
  BiX,
  BiInfoCircle,
  BiRefresh,
  BiCalendarAlt,
  BiX as BiXIcon,
  BiErrorCircle,
  BiMoney,
} from "react-icons/bi";
import BookingStatusBadge from "./BookingStatusBadge";
import ConfirmationModal from "../../../../components/confirmationModal";
import { toast } from "react-toastify";

// Skeleton loader component for expanded row
const BookingExpandedRowSkeleton = () => {
  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-4">
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-6 bg-gray-200 rounded w-1/3 mt-6 mb-3"></div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-2/4"></div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-2/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-2/4"></div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-2/4"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="h-9 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExpandedBookings = ({ data: initialData, onDeleteClick }) => {
  // We'll use a lazy query that only runs when the component mounts (when the row is expanded)
  const {
    data: bookingDetails,
    isLoading,
    isError,
    refetch,
  } = useGetAdminBookingDetailQuery(initialData._id, {
    // Only fetch when component mounts (when row is expanded)
    skip: false,
    // Refetch when payment is marked as paid
    refetchOnMountOrArgChange: true,
  });

  const [markAsPaid, { isLoading: isMarkingAsPaid }] =
    useMarkPaymentAsPaidMutation();

  // Add effect to refetch after marking as paid
  useEffect(() => {
    if (!isMarkingAsPaid) {
      refetch();
    }
  }, [isMarkingAsPaid, refetch]);

  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);

  // Use initialData for rendering initially, then switch to fetched data when available
  const booking = bookingDetails || initialData;

  if (isLoading) {
    return <BookingExpandedRowSkeleton />;
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 rounded-lg text-red-700 shadow-md">
        <p className="flex items-center">
          <BiErrorCircle className="mr-2" /> Failed to load detailed booking
          information.
        </p>
      </div>
    );
  }

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
    if (!locationData) return "Not specified";
    if (typeof locationData === "string") return locationData;

    if (typeof locationData === "object" && locationData.type) {
      if (locationData.type === "in-person") {
        return locationData.inPersonLocation || "In-Person (Details N/A)";
      } else if (locationData.type === "online") {
        return "Online";
      }
      return `${locationData.type} (Details N/A)`;
    }
    return "Not specified";
  };

  const getPaymentStatusDisplay = () => {
    if (!booking.paymentId) {
      return booking.eventName?.includes("15 Minute")
        ? {
            icon: "check",
            text: "Free Session",
            color: "text-green-600 bg-green-100",
          }
        : {
            icon: "info",
            text: "No Payment",
            color: "text-gray-600 bg-gray-100",
          };
    }

    const status = booking.paymentId.transactionStatus;

    switch (status) {
      case "Completed":
        return {
          icon: "check",
          text: "Paid",
          color: "text-green-600 bg-green-100",
        };
      case "Not Initiated":
        return {
          icon: "warning",
          text: "Pending",
          color: "text-yellow-600 bg-yellow-100",
        };
      case "Cancelled":
        return {
          icon: "x",
          text: "Cancelled",
          color: "text-red-600 bg-red-100",
        };
      case "Failed":
        return { icon: "x", text: "Failed", color: "text-red-600 bg-red-100" };
      case "Refunded":
        return {
          icon: "refresh",
          text: "Refunded",
          color: "text-blue-600 bg-blue-100",
        };
      default:
        return {
          icon: "info",
          text: status || "Unknown",
          color: "text-gray-600 bg-gray-100",
        };
    }
  };

  const renderStatusIcon = (iconType) => {
    switch (iconType) {
      case "check":
        return <BiCheck className="mr-1" />;
      case "x":
        return <BiX className="mr-1" />;
      case "warning":
        return <BiInfoCircle className="mr-1" />;
      case "refresh":
        return <BiRefresh className="mr-1" />;
      case "info":
      default:
        return <BiInfoCircle className="mr-1" />;
    }
  };

  const handleMarkAsPaid = async () => {
    if (!booking.paymentId?._id) return;

    try {
      await markAsPaid(booking.paymentId._id).unwrap();
      toast.success("Payment marked as paid successfully");
      setShowMarkPaidModal(false);
    } catch (error) {
      console.error("Failed to mark payment as paid:", error);
      toast.error("Failed to mark payment as paid");
    }
  };

  const paymentStatus = getPaymentStatusDisplay();
  const isBookingInFuture = (startTime) => {
    if (!startTime) return false;
    const now = new Date();
    const bookingTime = new Date(startTime);
    return bookingTime > now;
  };

  const isFutureEvent = isBookingInFuture(booking.eventStartTime);

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md border border-gray-200">
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showMarkPaidModal}
        onClose={() => setShowMarkPaidModal(false)}
        onConfirm={handleMarkAsPaid}
        title="Confirm Cash Payment"
        message={
          <div>
            <p className="mb-4">
              Are you sure you want to mark this booking as paid via cash?
            </p>
            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
              <p className="font-medium text-yellow-800 mb-1">
                Booking Details:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>
                  <span className="font-medium">Client:</span>{" "}
                  {booking.userId?.name || "Unknown"}
                </li>
                <li>
                  <span className="font-medium">Event:</span>{" "}
                  {booking.eventName || "Unknown"}
                </li>
                <li>
                  <span className="font-medium">Date:</span>{" "}
                  {booking.eventStartTime
                    ? formatReadableDate(booking.eventStartTime)
                    : "N/A"}
                </li>
                <li>
                  <span className="font-medium">Amount:</span>{" "}
                  {booking.paymentId?.amount?.toLocaleString() || "0"}{" "}
                  {booking.paymentId?.currency || "PKR"}
                </li>
              </ul>
            </div>
            <p className="text-red-600 font-medium">
              Warning: This action is permanent and cannot be undone!
            </p>
            <p className="mt-2">
              The client will no longer be able to make an online payment for
              this booking.
            </p>
          </div>
        }
        confirmText={isMarkingAsPaid ? "Processing..." : "Mark as Paid"}
        cancelText="Cancel"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Client Information
          </h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">
                    {booking.userId?.name || "Unknown User"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  {booking.userId?.email ? (
                    <a
                      href={`mailto:${booking.userId.email}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {booking.userId.email}
                    </a>
                  ) : (
                    <p className="font-medium">--</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  {booking.userId?.phone ? (
                    <a
                      href={`tel:${booking.userId.phone}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {booking.userId.phone}
                    </a>
                  ) : (
                    <p className="font-medium">--</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-6">
            Payment Information
          </h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            {booking.paymentId ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-medium">
                      {booking.paymentId.amount?.toLocaleString()}{" "}
                      {booking.paymentId.currency || "PKR"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Status</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${paymentStatus.color}`}
                    >
                      {renderStatusIcon(paymentStatus.icon)}
                      <span className="ml-1">{paymentStatus.text}</span>
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="font-medium text-xs break-all">
                      {booking.paymentId.transactionReferenceNumber || "--"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Payment Date</p>
                    <p className="font-medium">
                      {booking.paymentId.paymentCompletedDate
                        ? formatReadableDate(
                            booking.paymentId.paymentCompletedDate
                          )
                        : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium">
                      {booking.paymentId.paymentMethod || "--"}
                    </p>
                  </div>
                </div>

                {/* Add Mark as Paid button */}
                {booking.paymentId.transactionStatus !== "Completed" &&
                  booking.paymentId.transactionStatus !== "Refunded" &&
                  !booking.eventName?.includes("15 Minute") && (
                    <div className="col-span-2 mt-4 flex justify-end">
                      <button
                        onClick={() => setShowMarkPaidModal(true)}
                        disabled={isMarkingAsPaid}
                        className="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 disabled:opacity-50"
                      >
                        <BiMoney className="mr-2 h-4 w-4" />
                        {isMarkingAsPaid
                          ? "Processing..."
                          : "Mark as Paid (Cash)"}
                      </button>
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">
                  {booking.eventName?.includes("15 Minute")
                    ? "Free Consultation - No payment required"
                    : "No payment information available"}
                </p>
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
                    {booking.eventName || "Unnamed Event"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Booking ID</p>
                  <p className="font-medium">
                    {booking.bookingId ? String(booking.bookingId) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <BookingStatusBadge status={booking.status} />
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="font-medium">
                    {booking.eventStartTime
                      ? formatReadableDate(booking.eventStartTime)
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">
                    {booking.eventStartTime && booking.eventEndTime
                      ? `${Math.round(
                          (new Date(booking.eventEndTime) -
                            new Date(booking.eventStartTime)) /
                            (60 * 1000)
                        )} minutes`
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">
                    {formatLocation(booking.location)}
                  </p>
                </div>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-sm bg-gray-50 p-2 rounded mt-1">
                  {booking.notes}
                </p>
              </div>
            )}

            {booking.cancellation && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm font-medium text-red-800">
                  Cancellation Details
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Reason:</span>{" "}
                    {booking.cancellation.reason}
                  </p>
                  {booking.cancellation.date && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Date:</span>{" "}
                      {formatReadableDate(booking.cancellation.date)}
                    </p>
                  )}
                  {booking.cancellation.cancelledBy && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Cancelled By:</span>{" "}
                      {booking.cancellation.cancelledBy}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Removed the Delete button from here, keep only the Calendly buttons */}
            {isFutureEvent && booking.status !== "Cancelled" && (
              <div className="mt-4 flex justify-end space-x-3">
                {booking.cancelURL && (
                  <a
                    href={booking.cancelURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BiXIcon className="mr-2 h-4 w-4" /> Cancel Booking
                  </a>
                )}
                {booking.rescheduleURL && (
                  <a
                    href={booking.rescheduleURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BiCalendarAlt className="mr-2 h-4 w-4" /> Reschedule
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandedBookings;
