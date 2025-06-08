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
} from "react-icons/bi";
import { toast } from "react-toastify";
import LoadingPage from "../../../pages/LoadingPage";
import ConfirmationModal from "../../../components/confirmationModal";

// Helper to format date/time
const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
};

// Configuration for status indicators
const statusConfig = {
  Completed: {
    color: "#10B981",
    icon: <BiCheckCircle className="text-green-500" />,
    label: "Payment Collected",
  },
  Pending: {
    color: "#F59E0B",
    icon: <BiInfoCircle className="text-amber-500" />,
    label: "Pending Payment",
  },
  Failed: {
    color: "#EF4444",
    icon: <BiXCircle className="text-red-500" />,
    label: "Payment Failed",
  },
  "Not Initiated": {
    color: "#F59E0B",
    icon: <BiInfoCircle className="text-amber-500" />,
    label: "Awaiting Payment",
  },
  Cancelled: {
    color: "#EF4444",
    icon: <BiXCircle className="text-red-500" />,
    label: "Payment Cancelled",
  },
  Refunded: {
    color: "#3B82F6",
    icon: <BiInfoCircle className="text-blue-500" />,
    label: "Payment Refunded",
  },
  NA: {
    color: "#6B7280",
    icon: <BiCheckCircle className="text-gray-500" />,
    label: "Free Session",
  },
};

// Group bookings by date
const groupBookingsByDate = (bookings) => {
  const grouped = {};

  bookings.forEach((booking) => {
    const date = new Date(booking.eventStartTime);
    const dateKey = date.toISOString().split("T")[0];

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        dateString: new Date(dateKey).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        isToday: new Date().toISOString().split("T")[0] === dateKey,
        bookings: [],
      };
    }

    grouped[dateKey].bookings.push(booking);
  });

  return Object.values(grouped).sort((a, b) => {
    return new Date(a.dateString) - new Date(b.dateString);
  });
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
  // Group bookings by date
  const groupedBookings = groupBookingsByDate(bookings);

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
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Booking Timeline</h1>
        <p className="mt-2 text-gray-600">
          View and manage upcoming therapy sessions over the next week
        </p>
      </header>

      {bookings.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <BiInfoCircle className="mx-auto text-gray-400 text-4xl mb-3" />
          <h3 className="text-xl font-medium text-gray-700">
            No Bookings Found
          </h3>
          <p className="text-gray-500 mt-2">
            There are no upcoming sessions scheduled for the next week.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedBookings.map((dateGroup, dateIndex) => (
            <div key={dateIndex} className="mb-6">
              <h2
                className={`text-xl font-semibold mb-4 sticky top-0 z-10 bg-gray-100 p-3 rounded-md ${
                  dateGroup.isToday
                    ? "text-[#c45e3e] border-l-4 border-[#c45e3e] pl-4"
                    : ""
                }`}
              >
                {dateGroup.isToday ? "Today - " : ""}
                {dateGroup.dateString}
              </h2>

              <div className="space-y-6 relative">
                {/* Timeline connector */}
                <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gray-300 z-0">
                  <div className="absolute top-0 left-0 w-2.5 h-2.5 -ml-1 rounded-full bg-[#c45e3e]"></div>
                  <div className="absolute bottom-0 left-0 w-2.5 h-2.5 -ml-1 rounded-full bg-[#c45e3e]"></div>
                </div>

                {dateGroup.bookings.map((booking, index) => {
                  const { date: bDate, time: bTime } = formatDateTime(
                    booking.eventStartTime
                  );
                  const { time: endTime } = formatDateTime(
                    booking.eventEndTime
                  );

                  // Determine if it's an online session
                  const isOnline = booking.location?.type === "online";

                  // Check for free consultation
                  const isConsultation =
                    booking.eventName?.includes("Consultation");

                  // Get payment status
                  const paymentStatus = booking.paymentId
                    ? statusConfig[booking.paymentId.transactionStatus] ||
                      statusConfig["NA"]
                    : statusConfig["NA"];

                  // Check if payment is pending
                  const isPendingPayment =
                    booking.paymentId &&
                    (booking.paymentId.transactionStatus === "Pending" ||
                      booking.paymentId.transactionStatus === "Not Initiated");

                  return (
                    <div
                      key={booking._id}
                      className="bg-white p-5 ml-8 rounded-lg shadow-sm border-l-4 flex flex-col md:flex-row overflow-hidden relative"
                      style={{ borderColor: paymentStatus.color }}
                    >
                      {/* Timeline dot connector */}
                      <div className="absolute left-0 top-1/2 transform -translate-x-[2rem] -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#c45e3e] bg-white z-10"></div>

                      <div className="flex-grow space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="text-xl font-semibold text-gray-800">
                              {booking.userId?.name || "Unknown User"}
                            </h2>
                            <p className="text-sm text-gray-500">
                              {booking.eventName}
                              {booking.bookingId && (
                                <span> (#{booking.bookingId})</span>
                              )}
                            </p>
                          </div>
                          <span className="text-sm font-medium bg-gray-50 px-2 py-1 rounded">
                            {bTime}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center text-gray-600">
                            <BiTime className="mr-2 text-[#DF9E7A]" />
                            <span>{`${bTime} - ${endTime}`}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            {isOnline ? (
                              <>
                                <BiVideo className="mr-2 text-[#DF9E7A]" />
                                <span>Online Session</span>
                              </>
                            ) : (
                              <>
                                <BiMap className="mr-2 text-[#DF9E7A]" />
                                <span>In-person Session</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center">
                            {paymentStatus.icon}
                            <span
                              className={`ml-2 font-medium`}
                              style={{ color: paymentStatus.color }}
                            >
                              {paymentStatus.label}
                            </span>
                          </div>
                          {!isConsultation && booking.paymentId && (
                            <div className="flex items-center text-gray-600">
                              <BiDollarCircle className="mr-2 text-[#DF9E7A]" />
                              <span>
                                {booking.paymentId.amount}{" "}
                                {booking.paymentId.currency}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          {isOnline && booking.location?.join_url && (
                            <a
                              href={booking.location.join_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <BiVideo className="mr-1" />
                              Join Zoom Meeting
                            </a>
                          )}

                          {isPendingPayment && (
                            <button
                              onClick={() =>
                                openMarkAsPaidModal(booking, booking.paymentId)
                              }
                              className="inline-flex items-center text-green-600 hover:text-green-800 border border-green-300 px-3 py-1 rounded-md hover:bg-green-50"
                            >
                              <BiMoney className="mr-1" />
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

      {/* Mark as Paid Confirmation Modal */}
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
            {selectedBooking && (
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
                <p className="font-medium text-yellow-800 mb-1">
                  Booking Details:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>
                    <span className="font-medium">Client:</span>{" "}
                    {selectedBooking.userId?.name || "Unknown"}
                  </li>
                  <li>
                    <span className="font-medium">Event:</span>{" "}
                    {selectedBooking.eventName || "Unknown"}
                  </li>
                  <li>
                    <span className="font-medium">Date:</span>{" "}
                    {selectedBooking.eventStartTime
                      ? formatDateTime(selectedBooking.eventStartTime).date
                      : "N/A"}
                  </li>
                  <li>
                    <span className="font-medium">Amount:</span>{" "}
                    {selectedPayment?.amount?.toLocaleString() || "0"}{" "}
                    {selectedPayment?.currency || "PKR"}
                  </li>
                </ul>
              </div>
            )}
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
    </div>
  );
};

export default UpcomingBookings;
