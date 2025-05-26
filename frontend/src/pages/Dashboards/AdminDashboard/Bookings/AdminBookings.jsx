import React, { useState, useCallback, useRef } from "react";
import {
  BiCalendarAlt,
  BiTrash,
  BiSearch,
  BiFilter,
  BiFilterAlt,
  BiInfoCircle,
  BiChevronDown,
  BiChevronUp,
  BiRefresh,
  BiTime,
  BiDollar,
  BiCheck,
  BiX,
  BiVideo,
  BiMap,
  BiLoaderAlt,
} from "react-icons/bi";
import { toast } from "react-toastify";
import Pagination from "../../../../components/pagination";
import ConfirmationModal from "../../../../components/confirmationModal";
import { debounce } from "lodash/debounce";
import { format } from "date-fns";
import { ProgressSpinner } from "primereact/progressspinner";
import BookingDetailsDialog from "./BookingDetailsDialog";

// Import the booking RTK Query hooks
import {
  useGetAdminBookingsQuery,
  useUpdateAdminBookingMutation,
  useDeleteAdminBookingMutation,
} from "../../../../features/admin/adminApiSlice";

// Pagination: bookings/page
const BOOKINGS_PER_PAGE = 10;

// BookingStatusBadge component for displaying booking status
const BookingStatusBadge = ({ status }) => {
  let bgColor = "";
  let textColor = "";
  let icon = null;

  switch (status) {
    case "Active":
      bgColor = "bg-green-100";
      textColor = "text-green-800";
      icon = <BiCheck className="mr-1" />;
      break;
    case "Completed":
      bgColor = "bg-blue-100";
      textColor = "text-blue-800";
      icon = <BiCheck className="mr-1" />;
      break;
    case "Cancelled":
      bgColor = "bg-red-100";
      textColor = "text-red-800";
      icon = <BiX className="mr-1" />;
      break;
    default:
      bgColor = "bg-gray-100";
      textColor = "text-gray-800";
      icon = <BiInfoCircle className="mr-1" />;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
    >
      {icon} {status}
    </span>
  );
};

// Main AdminBookings component
const AdminBookings = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPastBookings, setShowPastBookings] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    datePreset: "",
    sessionType: "",
    paymentOverdue: false,
    location: "",
  });
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  // Add the delete booking mutation hook
  const [deleteBooking, { isLoading: isDeleting }] =
    useDeleteAdminBookingMutation();

  // Create a debounced search function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      setSearchTerm(searchValue);
      setCurrentPage(1); // Reset to first page when searching
    }, 500),
    []
  );

  // Handle search input change with debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value); // Update UI immediately
    debouncedSearch(value); // Debounce the actual API call
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Toggle past bookings visibility
  const togglePastBookings = () => {
    setShowPastBookings(!showPastBookings);
    setCurrentPage(1); // Reset to first page when changing this filter
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: "",
      datePreset: "",
      sessionType: "",
      paymentOverdue: false,
      location: "",
    });
    setSearchTerm("");
    setShowPastBookings(false);
    setCurrentPage(1);
  };

  // Create query params object for API
  const queryParams = {
    page: currentPage,
    limit: BOOKINGS_PER_PAGE,
    search: searchTerm,
    status: filters.status,
    datePreset: filters.datePreset,
    showPastBookings: showPastBookings.toString(),
    sessionType: filters.sessionType,
    paymentOverdue: filters.paymentOverdue ? "true" : undefined,
    location: filters.location,
  };

  // Use the RTK Query hook to fetch bookings
  const {
    data: bookingsData = {
      bookings: [],
      pagination: { totalBookings: 0, currentPage: 1, totalPages: 1 },
    },
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAdminBookingsQuery(queryParams);

  // Extract bookings & pagination from the response
  const bookings = bookingsData.bookings || [];
  const pagination = bookingsData.pagination || {
    totalBookings: 0,
    currentPage: 1,
    totalPages: 1,
  };

  // Pagination handler
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Calculate time left until booking
  const getTimeUntilBooking = (startTime) => {
    if (!startTime) return { text: "Unknown", isUpcoming: false };

    const now = new Date();
    const bookingTime = new Date(startTime);
    const diffMs = bookingTime - now;

    if (diffMs < 0) {
      return { text: "Passed", isUpcoming: false };
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHrs = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (diffDays > 0) {
      return {
        text: `${diffDays} day${diffDays > 1 ? "s" : ""} ${diffHrs} hr${
          diffHrs > 1 ? "s" : ""
        }`,
        isUpcoming: true,
      };
    } else if (diffHrs > 0) {
      return {
        text: `${diffHrs} hour${diffHrs > 1 ? "s" : ""}`,
        isUpcoming: true,
      };
    } else {
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        text: `${diffMins} minute${diffMins > 1 ? "s" : ""}`,
        isUpcoming: true,
      };
    }
  };

  // Check if booking is in the future (for action buttons)
  const isBookingInFuture = (startTime) => {
    if (!startTime) return false;
    const now = new Date();
    const bookingTime = new Date(startTime);
    return bookingTime > now;
  };

  // Format price to display with commas
  const formatPrice = (amount) => {
    if (typeof amount !== "number") return "N/A";
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Calculate session duration in minutes
  const getSessionDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "Unknown";
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationInMinutes = Math.round((end - start) / (1000 * 60));
    return `${durationInMinutes} minutes`;
  };

  // Options for dropdowns
  const statusOptions = [
    { label: "All Statuses", value: "" },
    { label: "Active", value: "Active" },
    { label: "Completed", value: "Completed" },
    { label: "Cancelled", value: "Cancelled" },
  ];

  const datePresetOptions = [
    { label: "-", value: "" },
    { label: "Today", value: "today" },
    { label: "Tomorrow", value: "tomorrow" },
    { label: "This Week", value: "thisWeek" },
    { label: "This Month", value: "thisMonth" },
    { label: "Next Month", value: "nextMonth" },
    { label: "Last Month", value: "lastMonth" },
  ];

  const sessionTypeOptions = [
    { label: "All Types", value: "" },
    { label: "15 Minute Consultation", value: "15min" },
    { label: "1 Hour Session", value: "1hour" },
  ];

  const locationOptions = [
    { label: "All Locations", value: "" },
    { label: "Online", value: "online" },
    { label: "In-Person", value: "in-person" },
  ];

  // Handle delete booking
  const handleDeleteClick = (e, booking) => {
    e.stopPropagation();
    setBookingToDelete(booking);
    setShowDeleteConfirmation(true);
  };

  // Confirm deletion
  const confirmDelete = async () => {
    if (!bookingToDelete || !bookingToDelete._id) return;

    try {
      await deleteBooking(bookingToDelete._id).unwrap();
      toast.success("Booking deleted successfully");
      setShowDeleteConfirmation(false);
      setBookingToDelete(null);
      refetch(); // Refresh the booking list
    } catch (error) {
      toast.error(
        `Failed to delete booking: ${error?.data?.message || "Unknown error"}`
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <ProgressSpinner
          style={{ width: "50px", height: "50px" }}
          strokeWidth="8"
          fill="var(--surface-ground)"
          animationDuration=".5s"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Booking Management</h1>
        <p className="mt-2 text-gray-600">
          Manage and monitor all client bookings
        </p>
      </header>

      {/* Error handling */}
      {isError && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <BiInfoCircle className="mr-2 flex-shrink-0" />
          <span>
            {error?.data?.message || error?.error || "Failed to fetch bookings"}
          </span>
          <button
            onClick={() => refetch()}
            className="ml-auto px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
          >
            <BiRefresh className="inline-block mr-1" /> Retry
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-grow">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BiSearch className="text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search client..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] bg-white text-gray-800"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={togglePastBookings}
              className={`flex items-center px-4 py-2 rounded-lg border transition-all duration-200 ${
                showPastBookings
                  ? "bg-[#FDF0E9] border-[#DF9E7A]/20 text-[#c45e3e]"
                  : "bg-white border-gray-300 text-gray-600"
              }`}
              title={
                showPastBookings ? "Hide past bookings" : "Show past bookings"
              }
            >
              <BiTime className="mr-2" />
              {showPastBookings ? "Hide Past Booking" : "Show Past Booking"}
            </button>

            {/* Filter Button */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center px-4 py-2 bg-white text-[#c45e3e] rounded-lg border border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                <BiFilterAlt className="mr-2" />
                Filters
                {showFilterDropdown ? (
                  <BiChevronUp className="ml-2" />
                ) : (
                  <BiChevronDown className="ml-2" />
                )}
              </button>
              {showFilterDropdown && (
                <div className="absolute mt-2 right-0 w-80 bg-white rounded-lg shadow-lg border border-gray-300 z-10 p-4">
                  <div className="space-y-4">
                    {/* Date Preset Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Date Range
                      </label>
                      <select
                        value={filters.datePreset}
                        onChange={(e) =>
                          handleFilterChange("datePreset", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-800"
                      >
                        {datePresetOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) =>
                          handleFilterChange("status", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-800"
                      >
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Session Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Session Type
                      </label>
                      <select
                        value={filters.sessionType}
                        onChange={(e) =>
                          handleFilterChange("sessionType", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-800"
                      >
                        {sessionTypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Location Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Location
                      </label>
                      <select
                        value={filters.location}
                        onChange={(e) =>
                          handleFilterChange("location", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-800"
                      >
                        {locationOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Overdue Filter */}
                    <div className="flex items-center">
                      <input
                        id="paymentOverdue"
                        type="checkbox"
                        checked={filters.paymentOverdue}
                        onChange={(e) =>
                          handleFilterChange("paymentOverdue", e.target.checked)
                        }
                        className="mr-2"
                      />
                      <label
                        htmlFor="paymentOverdue"
                        className="text-sm font-medium text-gray-600"
                      >
                        Payment Overdue
                      </label>
                    </div>

                    {/* Clear Filters Button */}
                    {(filters.status ||
                      filters.datePreset ||
                      filters.sessionType ||
                      filters.paymentOverdue ||
                      filters.location ||
                      showPastBookings ||
                      searchTerm) && (
                      <button
                        onClick={clearFilters}
                        className="w-full mt-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                      >
                        <BiX className="mr-2 inline-block" />
                        Clear all filters
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4">
        <span className="text-gray-600">
          Showing <span className="font-medium">{bookings.length}</span> of{" "}
          <span className="font-medium">{pagination.totalBookings}</span>{" "}
          bookings
        </span>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {bookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Session Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Date &amp; Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => {
                  const timeUntil = getTimeUntilBooking(booking.eventStartTime);
                  return (
                    <tr
                      key={booking._id}
                      className="group hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowClientDetails(true);
                      }}
                    >
                      {/* Event Details */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <BiCalendarAlt className="mr-3 text-[#DF9E7A] flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-800 group-hover:text-[#c45e3e]">
                              {booking.eventName || "Unnamed Event"}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID:{" "}
                              {booking.bookingId
                                ? String(booking.bookingId).slice(-6)
                                : "N/A"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getSessionDuration(
                                booking.eventStartTime,
                                booking.eventEndTime
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm text-gray-800 font-medium">
                              {booking.userId?.name || "Unknown User"}
                            </div>
                            {booking.userId?.email && (
                              <div className="text-xs text-gray-500">
                                {booking.userId.email}
                              </div>
                            )}
                            {booking.userId?.phone && (
                              <div className="text-xs text-gray-500">
                                {booking.userId.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <BookingStatusBadge status={booking.status} />
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800">
                          {booking.eventStartTime
                            ? format(new Date(booking.eventStartTime), "PP")
                            : "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.eventStartTime
                            ? format(new Date(booking.eventStartTime), "p")
                            : ""}{" "}
                          -{" "}
                          {booking.eventEndTime
                            ? format(new Date(booking.eventEndTime), "p")
                            : ""}
                        </div>
                        {timeUntil.isUpcoming && (
                          <div className="text-xs mt-1 text-gray-500">
                            <BiTime className="mr-1 inline-block" />
                            {timeUntil.text}
                          </div>
                        )}
                      </td>

                      {/* Payment */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {booking.paymentId ? (
                          <div className="flex items-center">
                            <BiDollar
                              className={`mr-2 flex-shrink-0 ${
                                booking.paymentId.transactionStatus ===
                                "Completed"
                                  ? "text-green-500"
                                  : "text-yellow-500"
                              }`}
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-800">
                                {formatPrice(booking.paymentId.amount)}{" "}
                                {booking.paymentId.currency?.toUpperCase() ||
                                  "PKR"}
                              </div>
                              <div
                                className={`text-xs font-medium ${
                                  booking.paymentId.transactionStatus ===
                                  "Completed"
                                    ? "text-green-600"
                                    : "text-yellow-600"
                                }`}
                              >
                                {booking.paymentId.transactionStatus ||
                                  "Pending"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic text-sm">
                            {booking.eventName?.includes("15 Minute")
                              ? "Free"
                              : "No Payment"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-3">
                          {isBookingInFuture(booking.eventStartTime) && (
                            <>
                              {booking.status !== "Cancelled" &&
                                booking.cancelURL && (
                                  <a
                                    href={booking.cancelURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-full hover:bg-red-50"
                                    title="Cancel booking"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <BiX className="w-5 h-5" />
                                  </a>
                                )}
                              {booking.status !== "Cancelled" &&
                                booking.rescheduleURL && (
                                  <a
                                    href={booking.rescheduleURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-700 transition-colors p-2 rounded-full hover:bg-blue-50"
                                    title="Reschedule booking"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <BiCalendarAlt className="w-5 h-5" />
                                  </a>
                                )}
                            </>
                          )}
                          <button
                            onClick={(e) => handleDeleteClick(e, booking)}
                            className="text-red-600 hover:text-red-800 transition-colors p-2 rounded-full hover:bg-red-50"
                            title="Delete booking"
                          >
                            <BiTrash className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <BiInfoCircle className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-800">
              No bookings found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No bookings match your current search and filter criteria.
            </p>
            {(filters.status ||
              filters.datePreset ||
              filters.sessionType ||
              filters.paymentOverdue ||
              filters.location ||
              showPastBookings ||
              searchTerm) && (
              <button
                onClick={clearFilters}
                className="mt-6 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <BiX className="mr-2 inline-block" />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && bookings.length > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Client Details Dialog */}
      {selectedBooking && (
        <BookingDetailsDialog
          visible={showClientDetails}
          onHide={() => setShowClientDetails(false)}
          selectedBooking={selectedBooking}
          BookingStatusBadge={BookingStatusBadge}
          formatDate={(d) => format(new Date(d), "PPP p")}
          formatPrice={formatPrice}
          getSessionDuration={getSessionDuration}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setBookingToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Booking Permanently"
        message={
          <>
            <p>
              Are you sure you want to delete this booking? This action is
              permanent and <span className="font-bold">cannot be undone</span>.
            </p>
            <div className="mt-3 bg-yellow-50 border border-yellow-200 p-3 rounded-md">
              <p className="text-yellow-700 font-medium">Important Notice:</p>
              <p className="text-yellow-600 mt-1">
                This will only remove the booking from our database. The booking
                will still be active in Calendly. Please cancel the appointment
                in Calendly first if needed.
              </p>
            </div>
          </>
        }
        confirmText={
          isDeleting ? (
            <>
              <BiLoaderAlt className="animate-spin mr-2 inline-block" />{" "}
              Deleting...
            </>
          ) : (
            "Delete Permanently"
          )
        }
        cancelText="Cancel"
      />
    </div>
  );
};

export default AdminBookings;
