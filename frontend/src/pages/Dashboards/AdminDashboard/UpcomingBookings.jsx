import React, { useState } from "react";
import {
  useGetBookingTimelineQuery,
  useMarkPaymentAsPaidMutation,
} from "../../../features/admin/adminApiSlice";
import {
  BiCalendar,
  BiTime,
  BiVideo,
  BiMap,
  BiCheckCircle,
  BiXCircle,
  BiInfoCircle,
  BiDollarCircle,
  BiLoaderAlt,
  BiMoney,
  BiUser,
  BiPhone,
  BiEnvelope,
  BiMapPin,
} from "react-icons/bi";
import { toast } from "react-toastify";
import LoadingPage from "../../../pages/LoadingPage";
import ConfirmationModal from "../../../components/confirmationModal";

// ---- Timezone helpers (display & grouping happen in a fixed timezone) ----
const CLINIC_TZ = "Asia/Karachi";

// Build a YYYY-MM-DD key in a specific timezone for stable grouping/sorting
const dateKeyInTZ = (dateString, timeZone = CLINIC_TZ) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateString)); // e.g., "2025-10-13"
};

// Pretty header date (e.g., Monday, October 13, 2025) in a specific timezone
const prettyDateInTZ = (dateString, timeZone = CLINIC_TZ) => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
};

// Helper to format date/time (timezone-aware; defaults to clinic time)
const formatDateTime = (dateString, timeZone = CLINIC_TZ) => {
  const date = new Date(dateString);
  return {
    date: new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date),
  };
};

// Configuration for status indicators with accent color #E27A82
const statusConfig = {
  Completed: {
    color: "#E27A82",
    bgColor: "bg-white",
    borderColor: "border-gray-300",
    icon: <BiCheckCircle className="text-[#E27A82]" />,
    label: "Payment Collected",
    badge: "bg-[#E27A82] text-white",
  },
  Pending: {
    color: "#000000",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-300",
    icon: <BiTime className="text-gray-600" />,
    label: "Pending Payment",
    badge: "bg-gray-200 text-gray-800",
  },
  Failed: {
    color: "#000000",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-300",
    icon: <BiXCircle className="text-gray-600" />,
    label: "Payment Failed",
    badge: "bg-gray-300 text-gray-800",
  },
  "Not Initiated": {
    color: "#000000",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-300",
    icon: <BiInfoCircle className="text-gray-600" />,
    label: "Awaiting Payment",
    badge: "bg-gray-200 text-gray-800",
  },
  Cancelled: {
    color: "#000000",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-300",
    icon: <BiXCircle className="text-gray-600" />,
    label: "Payment Cancelled",
    badge: "bg-gray-300 text-gray-800",
  },
  Refunded: {
    color: "#000000",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-300",
    icon: <BiInfoCircle className="text-gray-600" />,
    label: "Payment Refunded",
    badge: "bg-gray-200 text-gray-800",
  },
  NA: {
    color: "#000000",
    bgColor: "bg-white",
    borderColor: "border-gray-300",
    icon: <BiCheckCircle className="text-gray-600" />,
    label: "Free Session",
    badge: "bg-gray-100 text-gray-800",
  },
};

// Helper to get booking source display name
const getBookingSourceDisplay = (source) => {
  switch (source) {
    case "system":
      return "Recurring Session";
    case "admin":
      return "One-off Session";
    case "calendly":
      return "Calendly";
    default:
      return "Unknown";
  }
};

// Helper to get event name with fallback
const getEventName = (booking) => {
  if (booking.eventName) {
    return booking.eventName;
  }

  // Fallback based on source
  switch (booking.source) {
    case "system":
      return "Recurring Therapy Session";
    case "admin":
      return "One-off Therapy Session";
    case "calendly":
      return "Calendly Session";
    default:
      return "Therapy Session";
  }
};

// Group bookings by date (in clinic timezone; stable keys & sorting)
const groupBookingsByDate = (bookings, timeZone = CLINIC_TZ) => {
  const grouped = {};

  bookings.forEach((booking) => {
    const key = dateKeyInTZ(booking.eventStartTime, timeZone);

    if (!grouped[key]) {
      grouped[key] = {
        key, // stable sort key: "YYYY-MM-DD" in clinic TZ
        dateString: prettyDateInTZ(booking.eventStartTime, timeZone),
        isToday: dateKeyInTZ(new Date().toISOString(), timeZone) === key,
        bookings: [],
      };
    }

    grouped[key].bookings.push(booking);
  });

  // Sort by the stable key string (lexicographic sort matches chronological for YYYY-MM-DD)
  return Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key));
};

const UpcomingBookings = () => {
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Use the RTK Query hook and extract refetch function
  const {
    data: bookingsData,
    isLoading,
    isError,
    refetch,
  } = useGetBookingTimelineQuery();
  const [markAsPaid, { isLoading: isMarkingAsPaid }] =
    useMarkPaymentAsPaidMutation();

  // Extract bookings from response
  const bookings = bookingsData?.bookings || [];
  // Group bookings by date (timezone-aware)
  const groupedBookings = groupBookingsByDate(bookings, CLINIC_TZ);

  const handleMarkAsPaid = async () => {
    if (!selectedPayment?._id) return;

    try {
      await markAsPaid(selectedPayment._id).unwrap();
      // Immediately refetch the booking data to update the UI
      refetch();
      toast.success("Payment marked as paid successfully");
      setShowMarkPaidModal(false);
      setSelectedPayment(null);
      setSelectedBooking(null);
    } catch (error) {
      console.error("Failed to mark payment as paid:", error);
      toast.error("Failed to mark payment as paid");
    }
  };

  const openMarkAsPaidModal = (booking, payment) => {
    setSelectedBooking(booking);
    setSelectedPayment(payment);
    setShowMarkPaidModal(true);
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isError) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">
          Failed to load booking data. Please try again later.
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Minimalistic Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">
                Upcoming Sessions
              </h1>
              <p className="text-gray-600">
                Manage your therapy appointments and track payments
              </p>
            </div>
            <div className="hidden lg:flex items-center space-x-4">
              <div className="bg-white p-4 border border-[#E27A82] rounded-lg">
                <div className="text-sm text-gray-600">Total Sessions</div>
                <div className="text-2xl font-bold text-[#E27A82]">
                  {bookings.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white p-12 border border-gray-300 rounded-xl text-center">
            <div className="w-12 h-12 mx-auto mb-4 border border-[#E27A82] rounded-full flex items-center justify-center">
              <BiCalendar className="text-[#E27A82] text-xl" />
            </div>
            <h3 className="text-xl font-medium text-black mb-2">
              No Sessions Scheduled
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              There are no upcoming therapy sessions scheduled for the next
              week. New bookings will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedBookings.map((dateGroup, dateIndex) => (
              <div key={dateIndex} className="relative">
                {/* Date Header with accent color */}
                <div
                  className={`sticky top-4 z-20 mb-6 ${
                    dateGroup.isToday
                      ? "bg-[#E27A82] text-white"
                      : "bg-white border-gray-300"
                  } p-4 border rounded-lg`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2
                        className={`text-xl font-semibold mb-1 ${
                          dateGroup.isToday ? "text-white" : "text-black"
                        }`}
                      >
                        {dateGroup.isToday && (
                          <span className="inline-flex items-center mr-3">
                            <span className="animate-pulse w-2 h-2 bg-white rounded-full mr-2"></span>
                            Today -
                          </span>
                        )}
                        {dateGroup.dateString}
                      </h2>
                      <p
                        className={
                          dateGroup.isToday ? "text-white/80" : "text-gray-600"
                        }
                      >
                        {dateGroup.bookings.length} session
                        {dateGroup.bookings.length !== 1 ? "s" : ""} scheduled
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <BiCalendar
                        className={`text-xl ${
                          dateGroup.isToday ? "text-white" : "text-[#E27A82]"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Timeline with accent color */}
                <div className="space-y-4 relative ml-6">
                  {/* Timeline connector */}
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-[#E27A82]"></div>

                  {dateGroup.bookings.map((booking, index) => {
                    const { time: bTime } = formatDateTime(
                      booking.eventStartTime,
                      CLINIC_TZ
                    );
                    const { time: endTime } = formatDateTime(
                      booking.eventEndTime,
                      CLINIC_TZ
                    );

                    // Determine if it's an online session
                    const isOnline = booking.location?.type === "online";

                    // Check for free consultation
                    const eventName = getEventName(booking);
                    const isConsultation = eventName
                      ?.toLowerCase()
                      .includes("consultation");

                    // Get payment status
                    const paymentStatus = booking.paymentId
                      ? statusConfig[booking.paymentId.transactionStatus] ||
                        statusConfig["NA"]
                      : statusConfig["NA"];

                    // Check if payment is pending
                    const isPendingPayment =
                      booking.paymentId &&
                      (booking.paymentId.transactionStatus === "Pending" ||
                        booking.paymentId.transactionStatus ===
                          "Not Initiated");

                    return (
                      <div
                        key={booking._id}
                        className={`relative ml-6 ${paymentStatus.bgColor} border ${paymentStatus.borderColor} overflow-hidden hover:bg-gray-50 transition-all duration-200 rounded-lg`}
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-6 transform -translate-x-[1.875rem] w-3 h-3 bg-[#E27A82] border-2 border-white rounded-full z-10"></div>

                        {/* Card Content */}
                        <div className="p-6">
                          {/* Header Section */}
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <div className="w-10 h-10 border border-[#E27A82] rounded-full flex items-center justify-center">
                                  <BiUser className="text-[#E27A82] text-lg" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-black">
                                    {booking.userId?.name || "Unknown User"}
                                  </h3>
                                  <div className="flex items-center space-x-2 text-gray-600">
                                    <span className="text-sm font-medium">
                                      {getEventName(booking)}
                                    </span>
                                    {booking.bookingId && (
                                      <span className="text-xs bg-white text-gray-700 px-2 py-1 border border-gray-300 rounded-full">
                                        #{booking.bookingId}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end space-y-2">
                              {/* Time Badge */}
                              <div className="bg-white px-3 py-1.5 border border-gray-300 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <BiTime className="text-[#E27A82]" />
                                  <span className="font-medium text-black text-sm">
                                    {bTime}
                                  </span>
                                </div>
                              </div>

                              {/* Payment Status Badge */}
                              <div
                                className={`inline-flex items-center px-3 py-1 text-xs font-medium ${paymentStatus.badge} border border-gray-300 rounded-full`}
                              >
                                {paymentStatus.icon}
                                <span className="ml-1.5">
                                  {paymentStatus.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                            {/* Session Duration */}
                            <div className="bg-white p-3 border border-gray-300 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 border border-gray-300 rounded-lg flex items-center justify-center">
                                  <BiTime className="text-[#E27A82] text-sm" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 font-medium">
                                    Duration
                                  </p>
                                  <p className="font-medium text-black text-sm">{`${bTime} - ${endTime}`}</p>
                                </div>
                              </div>
                            </div>

                            {/* Session Type */}
                            <div className="bg-white p-3 border border-gray-300 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 border border-gray-300 rounded-lg flex items-center justify-center">
                                  {isOnline ? (
                                    <BiVideo className="text-[#E27A82] text-sm" />
                                  ) : (
                                    <BiMapPin className="text-[#E27A82] text-sm" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 font-medium">
                                    Session Type
                                  </p>
                                  <p className="font-medium text-black text-sm">
                                    {isOnline
                                      ? "Online Session"
                                      : "In-person Session"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Payment Amount */}
                            {!isConsultation && booking.paymentId && (
                              <div className="bg-white p-3 border border-gray-300 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 border border-gray-300 rounded-lg flex items-center justify-center">
                                    <BiDollarCircle className="text-[#E27A82] text-sm" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 font-medium">
                                      Amount
                                    </p>
                                    <p className="font-medium text-black text-sm">
                                      {booking.paymentId.amount?.toLocaleString()}{" "}
                                      {booking.paymentId.currency}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Free Session Indicator */}
                            {isConsultation && (
                              <div className="bg-white p-3 border border-gray-300 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 border border-gray-300 rounded-lg flex items-center justify-center">
                                    <BiCheckCircle className="text-[#E27A82] text-sm" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 font-medium">
                                      Session Type
                                    </p>
                                    <p className="font-medium text-black text-sm">
                                      Free Consultation
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-300">
                            {isOnline && booking.location?.meetingLink && (
                              <a
                                href={booking.location.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 bg-[#E27A82] text-white font-medium hover:bg-[#D16B73] transition-colors duration-200 rounded-lg"
                              >
                                <BiVideo className="mr-2" />
                                Join Meeting
                              </a>
                            )}

                            {isPendingPayment && (
                              <button
                                onClick={() =>
                                  openMarkAsPaidModal(
                                    booking,
                                    booking.paymentId
                                  )
                                }
                                className="inline-flex items-center px-4 py-2 bg-white text-[#E27A82] border border-[#E27A82] font-medium hover:bg-[#E27A82] hover:text-white transition-colors duration-200 rounded-lg"
                              >
                                <BiMoney className="mr-2" />
                                Mark as Paid
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Minimalistic Mark as Paid Confirmation Modal */}
        <ConfirmationModal
          isOpen={showMarkPaidModal}
          onClose={() => setShowMarkPaidModal(false)}
          onConfirm={handleMarkAsPaid}
          title="Confirm Cash Payment"
          message={
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 border border-[#E27A82] rounded-full flex items-center justify-center">
                  <BiMoney className="text-[#E27A82] text-xl" />
                </div>
                <p className="text-lg text-black font-medium mb-2">
                  Confirm Cash Payment
                </p>
                <p className="text-gray-600">
                  Are you sure you want to mark this booking as paid via cash?
                </p>
              </div>

              {selectedBooking && (
                <div className="bg-white p-4 border border-gray-300 rounded-lg">
                  <div className="flex items-center mb-3">
                    <BiInfoCircle className="text-[#E27A82] text-lg mr-2" />
                    <p className="font-medium text-black">Booking Details</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Client:</span>
                      <span className="text-black">
                        {selectedBooking.userId?.name || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Event:</span>
                      <span className="text-black">
                        {getEventName(selectedBooking)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Type:</span>
                      <span className="text-black">
                        {getBookingSourceDisplay(selectedBooking.source)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Date:</span>
                      <span className="text-black">
                        {selectedBooking.eventStartTime
                          ? formatDateTime(
                              selectedBooking.eventStartTime,
                              CLINIC_TZ
                            ).date
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Amount:</span>
                      <span className="text-black font-bold">
                        {selectedPayment?.amount?.toLocaleString() || "0"}{" "}
                        {selectedPayment?.currency || "PKR"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-4 border border-gray-300 rounded-lg">
                <div className="flex items-start space-x-3">
                  <BiXCircle className="text-[#E27A82] text-lg mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-black font-medium mb-1">
                      Important Warning
                    </p>
                    <p className="text-gray-600 text-sm">
                      This action is permanent and cannot be undone! The client
                      will no longer be able to make an online payment for this
                      booking.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          }
          confirmText={isMarkingAsPaid ? "Processing..." : "Mark as Paid"}
          cancelText="Cancel"
        />
      </div>
    </div>
  );
};

export default UpcomingBookings;
