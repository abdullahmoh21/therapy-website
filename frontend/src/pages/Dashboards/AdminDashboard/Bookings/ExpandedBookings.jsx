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
  BiGlobe,
  BiMapPin,
  BiLinkExternal,
} from "react-icons/bi";
import { formatInTimeZone } from "date-fns-tz";
import BookingStatusBadge from "./BookingStatusBadge";
import BookingSourceBadge from "./BookingSourceBadge";
import ConfirmationModal from "../../../../components/confirmationModal";
import { toast } from "react-toastify";

// Skeleton loader component for expanded row
const BookingExpandedRowSkeleton = () => {
  return (
    <div className="p-4 md:p-6 md:pl-[120px] animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Client Information Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="h-3 bg-gray-200 rounded w-12 mr-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
            <div className="flex items-start">
              <div className="h-3 bg-gray-200 rounded w-12 mr-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
            <div className="flex items-start">
              <div className="h-3 bg-gray-200 rounded w-12 mr-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>

        {/* Session Details Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start">
                <div className="h-3 bg-gray-200 rounded w-16 mr-2"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Information Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start">
                <div className="h-3 bg-gray-200 rounded w-20 mr-2"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
              </div>
            ))}
          </div>
        </div>

        {/* System Information Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start">
                <div className="h-3 bg-gray-200 rounded w-20 mr-2"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
              </div>
            ))}
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
      <div className="p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <BiErrorCircle className="h-5 w-5 text-red-600" />
          </div>
        </div>
        <p className="text-sm text-red-700 font-medium">
          Failed to load detailed booking information
        </p>
        <p className="text-xs text-red-500 mt-1">
          Please try refreshing or contact support if the issue persists.
        </p>
      </div>
    );
  }

  const formatReadableDate = (dateInput) => {
    if (!dateInput) return "--";
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return "--"; // Invalid date
      return formatInTimeZone(
        date,
        "Asia/Karachi",
        "MMMM do, yyyy 'at' h:mm a"
      );
    } catch (error) {
      console.error("Error formatting date:", error);
      return "--";
    }
  };

  const formatLocation = (locationData) => {
    if (!locationData) return { text: "Not specified", type: "unknown" };
    if (typeof locationData === "string")
      return { text: locationData, type: "unknown" };

    if (typeof locationData === "object" && locationData.type) {
      if (locationData.type === "in-person") {
        return {
          text: locationData.inPersonLocation || "In-Person (Details N/A)",
          type: "in-person",
        };
      } else if (locationData.type === "online") {
        return {
          text: "Online Meeting",
          type: "online",
          meetingLink: locationData.meetingLink,
        };
      }
      return {
        text: `${locationData.type} (Details N/A)`,
        type: locationData.type,
      };
    }
    return { text: "Not specified", type: "unknown" };
  };

  const getPaymentStatusDisplay = () => {
    if (!booking.paymentId) {
      // Check for free session in various fields
      const isFreeSession =
        booking.eventName?.includes("15 Minute") ||
        booking.calendly?.eventName?.includes("15 Minute");
      return isFreeSession
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
    // Get current time in Asia/Karachi timezone
    const now = new Date();
    const bookingTime = new Date(startTime);
    return bookingTime > now;
  };

  const isFutureEvent = isBookingInFuture(booking.eventStartTime);

  return (
    <div className="p-4 md:p-6 md:pl-[120px]">
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
                  {(() => {
                    if (
                      booking.source === "calendly" &&
                      booking.calendly?.eventName
                    ) {
                      return booking.calendly.eventName;
                    } else if (
                      booking.source === "system" &&
                      booking.recurring?.state
                    ) {
                      return "Recurring Session";
                    } else if (booking.source === "admin") {
                      return "One-off Booking";
                    } else {
                      return booking.eventName || "Unknown";
                    }
                  })()}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Client Information Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            Client Information
          </h4>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-500">Name: </span>
              <span className="text-gray-900 font-medium">
                {booking.userId?.name || "Unknown User"}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Email: </span>
              {booking.userId?.email ? (
                <a
                  href={`mailto:${booking.userId.email}`}
                  className="text-[#DF9E7A] hover:text-[#DF9E7A]/80 transition-colors duration-200 hover:underline"
                >
                  {booking.userId.email}
                </a>
              ) : (
                <span className="text-gray-400">Not provided</span>
              )}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Phone: </span>
              {booking.userId?.phone ? (
                <a
                  href={`tel:${booking.userId.phone}`}
                  className="text-[#DF9E7A] hover:text-[#DF9E7A]/80 transition-colors duration-200 hover:underline"
                >
                  {booking.userId.phone}
                </a>
              ) : (
                <span className="text-gray-400">Not provided</span>
              )}
            </div>
          </div>
        </div>

        {/* Session Details Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            Session Details
          </h4>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-500">Event: </span>
              <div className="inline-flex items-center gap-2">
                <span className="text-gray-900 font-medium">
                  {(() => {
                    if (
                      booking.source === "calendly" &&
                      booking.calendly?.eventName
                    ) {
                      return booking.calendly.eventName;
                    } else if (booking.source === "system") {
                      return "Recurring Session";
                    } else if (booking.source === "admin") {
                      return "One-off Booking";
                    } else {
                      return booking.eventName || "Unnamed Event";
                    }
                  })()}
                </span>
                <div className="inline-flex items-center gap-1">
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-200 cursor-help ${
                      booking.googleHtmlLink
                        ? "bg-green-500 hover:bg-green-600 shadow-sm"
                        : "bg-red-500 hover:bg-red-600 shadow-sm"
                    }`}
                    title={
                      booking.googleHtmlLink
                        ? "Event is synced with Google Calendar"
                        : "Event is not synced with Google Calendar"
                    }
                  ></div>
                  {booking.googleHtmlLink && (
                    <a
                      href={booking.googleHtmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 transition-colors hover:scale-110 transform duration-200"
                      title="View in Google Calendar"
                    >
                      <BiLinkExternal className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">ID: </span>
              <span className="text-gray-900 font-mono">
                {booking.bookingId ? String(booking.bookingId) : "N/A"}
              </span>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-gray-500">Status: </span>
              <div className="ml-2">
                <BookingStatusBadge status={booking.status} />
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-gray-500">Source: </span>
              <div className="ml-2">
                <BookingSourceBadge
                  source={booking.source}
                  recurring={booking.recurring}
                />
              </div>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Date & Time: </span>
              <span className="text-gray-900">
                {booking.eventStartTime
                  ? formatReadableDate(booking.eventStartTime)
                  : "N/A"}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Duration: </span>
              <span className="text-gray-900">
                {booking.eventStartTime && booking.eventEndTime
                  ? `${Math.round(
                      (new Date(booking.eventEndTime) -
                        new Date(booking.eventStartTime)) /
                        (60 * 1000)
                    )} minutes`
                  : "Unknown"}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Location: </span>
              <div className="inline-flex items-center gap-2">
                {(() => {
                  const location = formatLocation(booking.location);
                  return (
                    <>
                      {location.type === "online" ? (
                        <BiGlobe className="h-4 w-4 text-blue-500" />
                      ) : location.type === "in-person" ? (
                        <BiMapPin className="h-4 w-4 text-green-500" />
                      ) : null}
                      <span className="text-gray-900">{location.text}</span>
                      {location.meetingLink && (
                        <a
                          href={location.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-all duration-200 hover:scale-110 transform"
                          title="Join Meeting"
                        >
                          <BiLinkExternal className="h-3.5 w-3.5 ml-1" />
                        </a>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            Payment Information
          </h4>
          <div className="space-y-3">
            {booking.paymentId ? (
              <>
                <div className="text-sm">
                  <span className="text-gray-500">Amount: </span>
                  <span className="text-gray-900 font-medium">
                    {booking.paymentId.amount?.toLocaleString()}{" "}
                    {booking.paymentId.currency || "PKR"}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-gray-500">Status: </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ml-2 transition-all duration-200 cursor-help ${
                      paymentStatus.color
                    } ${
                      paymentStatus.text === "Paid" ||
                      paymentStatus.text === "Free Session"
                        ? "hover:bg-green-200 hover:shadow-sm"
                        : paymentStatus.text === "Pending"
                        ? "hover:bg-yellow-200 hover:shadow-sm"
                        : paymentStatus.text === "Cancelled" ||
                          paymentStatus.text === "Failed"
                        ? "hover:bg-red-200 hover:shadow-sm"
                        : paymentStatus.text === "Refunded"
                        ? "hover:bg-blue-200 hover:shadow-sm"
                        : "hover:bg-gray-200 hover:shadow-sm"
                    }`}
                    title={`Payment status: ${paymentStatus.text}`}
                  >
                    {renderStatusIcon(paymentStatus.icon)}
                    <span className="ml-1">{paymentStatus.text}</span>
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Reference ID: </span>
                  <span className="text-gray-900 font-mono text-xs break-all">
                    {booking.paymentId.transactionReferenceNumber || "--"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Payment Date: </span>
                  <span className="text-gray-900">
                    {booking.paymentId.paymentCompletedDate
                      ? formatReadableDate(
                          booking.paymentId.paymentCompletedDate
                        )
                      : "Not completed"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Method: </span>
                  <span className="text-gray-900">
                    {booking.paymentId.paymentMethod || "Not specified"}
                  </span>
                </div>

                {/* Mark as Paid button */}
                {booking.paymentId.transactionStatus !== "Completed" &&
                  booking.paymentId.transactionStatus !== "Refunded" &&
                  !booking.eventName?.includes("15 Minute") &&
                  !booking.calendly?.eventName?.includes("15 Minute") && (
                    <div className="pt-2">
                      <button
                        onClick={() => setShowMarkPaidModal(true)}
                        disabled={isMarkingAsPaid}
                        className="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-lg text-green-700 bg-white hover:bg-green-50 hover:border-green-400 hover:shadow-sm disabled:opacity-50 transition-all duration-200"
                      >
                        <BiMoney className="mr-2 h-4 w-4" />
                        {isMarkingAsPaid
                          ? "Processing..."
                          : "Mark as Paid (Cash)"}
                      </button>
                    </div>
                  )}
              </>
            ) : (
              <div className="text-sm text-gray-500">
                {booking.eventName?.includes("15 Minute") ||
                booking.calendly?.eventName?.includes("15 Minute")
                  ? "Free Consultation - No payment required"
                  : "No payment information available"}
              </div>
            )}
          </div>
        </div>

        {/* System Information Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            System Information
          </h4>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-500">Created: </span>
              <span className="text-gray-900">
                {booking.createdAt
                  ? formatReadableDate(booking.createdAt)
                  : "N/A"}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Last Updated: </span>
              <span className="text-gray-900">
                {booking.updatedAt
                  ? formatReadableDate(booking.updatedAt)
                  : "N/A"}
              </span>
            </div>
            {booking.invitationSent !== undefined && (
              <div className="text-sm">
                <span className="text-gray-500">Invitation Sent: </span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-help ${
                    booking.invitationSent
                      ? "bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-sm"
                      : "bg-red-100 text-red-800 hover:bg-red-200 hover:shadow-sm"
                  }`}
                  title={
                    booking.invitationSent
                      ? "Calendar invitation has been sent to the client (sent 2 days before event)"
                      : "Calendar invitation has not been sent yet (will be sent 2 days before event)"
                  }
                >
                  {booking.invitationSent ? (
                    <BiCheck className="mr-1 h-3 w-3" />
                  ) : (
                    <BiX className="mr-1 h-3 w-3" />
                  )}
                  {booking.invitationSent ? "Yes" : "No"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Calendly Details Card - Only show for calendly bookings */}
        {booking.source === "calendly" && booking.calendly && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
            <h4 className="text-base font-semibold text-gray-800 mb-4">
              Calendly Details
            </h4>
            <div className="space-y-3">
              {booking.calendly.eventName && (
                <div className="text-sm">
                  <span className="text-gray-500">Event Name: </span>
                  <span className="text-gray-900">
                    {booking.calendly.eventName}
                  </span>
                </div>
              )}
              {booking.calendly.scheduledEventURI && (
                <div className="text-sm">
                  <span className="text-gray-500">Event URI: </span>
                  <span className="text-gray-600 font-mono text-xs break-all hover:text-gray-800 transition-colors">
                    {booking.calendly.scheduledEventURI}
                  </span>
                </div>
              )}
              {booking.calendly.eventTypeURI && (
                <div className="text-sm">
                  <span className="text-gray-500">Type URI: </span>
                  <span className="text-gray-600 font-mono text-xs break-all hover:text-gray-800 transition-colors">
                    {booking.calendly.eventTypeURI}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Information Card - Show when notes or cancellation exist */}
        {(booking.notes || booking.cancellation) && (
          <div className="col-span-1 lg:col-span-2 mt-4 lg:mt-0">
            <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
              <h4 className="text-base font-semibold text-gray-800 mb-4">
                Additional Information
              </h4>
              <div className="space-y-4">
                {booking.notes && (
                  <div className="text-sm">
                    <span className="text-gray-500">Notes: </span>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-gray-900">{booking.notes}</span>
                    </div>
                  </div>
                )}

                {booking.cancellation && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-red-800 mb-3 flex items-center">
                      <BiXIcon className="mr-2 text-red-600" />
                      Cancellation Details
                    </h5>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-red-600">Reason: </span>
                        <span className="text-red-700">
                          {booking.cancellation.reason}
                        </span>
                      </div>
                      {booking.cancellation.date && (
                        <div className="text-sm">
                          <span className="text-red-600">Date: </span>
                          <span className="text-red-700">
                            {formatReadableDate(booking.cancellation.date)}
                          </span>
                        </div>
                      )}
                      {booking.cancellation.cancelledBy && (
                        <div className="text-sm">
                          <span className="text-red-600">Cancelled By: </span>
                          <span className="text-red-700">
                            {booking.cancellation.cancelledBy}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Card - Only show for Calendly bookings with URLs */}
        {isFutureEvent &&
          booking.status !== "Cancelled" &&
          booking.source === "calendly" &&
          (booking.calendly?.cancelURL || booking.calendly?.rescheduleURL) && (
            <div className="col-span-1 lg:col-span-2 mt-4 lg:mt-0">
              <div className="bg-[#DF9E7A]/5 border border-[#DF9E7A]/20 rounded-lg p-5">
                <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                  <BiCalendarAlt className="mr-2 text-[#DF9E7A]" />
                  Quick Actions
                </h4>
                <div className="flex flex-wrap gap-3">
                  {booking.calendly?.cancelURL && (
                    <a
                      href={booking.calendly.cancelURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-red-200 text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <BiXIcon className="mr-2 h-4 w-4" />
                      Cancel Booking
                    </a>
                  )}
                  {booking.calendly?.rescheduleURL && (
                    <a
                      href={booking.calendly.rescheduleURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-blue-200 text-sm font-medium rounded-lg text-blue-700 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <BiCalendarAlt className="mr-2 h-4 w-4" />
                      Reschedule
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default ExpandedBookings;
