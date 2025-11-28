import React, { useState, useCallback, useEffect } from "react";
import { BiInfoCircle, BiRefresh, BiTime } from "react-icons/bi";
import { toast } from "react-toastify";
import Pagination from "../../../../components/pagination";
import debounce from "lodash/debounce";
import LoadingPage from "../../../../pages/LoadingPage";

// Import custom components
import BookingFilters from "./BookingFilters";
import BookingTable from "./BookingTable";
import DeleteBookingModal from "./DeleteBookingModal";
import CancelBookingModal from "./CancelBookingModal";
import CreateBookingPopup from "./CreateBookingPopup";

// Import the booking RTK Query hooks
import {
  useGetAdminBookingsQuery,
  useDeleteAdminBookingMutation,
  useCancelAdminBookingMutation,
} from "../../../../features/admin";

// Pagination: bookings/page
const BOOKINGS_PER_PAGE = 10;

// Main AdminBookings component
const AdminBookings = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("future"); // Default to future bookings
  const [filters, setFilters] = useState({
    status: "",
    datePreset: "",
    paymentOverdue: false,
    location: "",
    source: "",
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [deletingBookings, setDeletingBookings] = useState(new Set());
  const [cancellingBookings, setCancellingBookings] = useState(new Set());
  const [localBookings, setLocalBookings] = useState([]);
  const [showCreateBooking, setShowCreateBooking] = useState(false);

  // Add the mutation hooks
  const [deleteBooking, { isLoading: isDeleting }] =
    useDeleteAdminBookingMutation();
  const [cancelBooking, { isLoading: isCancelling }] =
    useCancelAdminBookingMutation();

  // Create a debounced search function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      setSearchTerm(searchValue);
      setCurrentPage(1); // Reset to first page when searching
      // Clear deleting state when searching
      setDeletingBookings(new Set());
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
    // Clear deleting state when filters change
    setDeletingBookings(new Set());
  };

  // Toggle view between future and past bookings
  const toggleView = () => {
    setView(view === "future" ? "past" : "future");
    setCurrentPage(1); // Reset to first page when changing this filter
    // Clear deleting state when view changes
    setDeletingBookings(new Set());
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: "",
      datePreset: "",
      paymentOverdue: false,
      location: "",
      source: "",
    });
    setSearchTerm("");
    setView("future"); // Reset to default future view
    setCurrentPage(1);
    // Clear deleting state when filters are cleared
    setDeletingBookings(new Set());
  };

  // Handle create booking
  const handleCreateBooking = () => {
    setShowCreateBooking(true);
  };

  // Handle create booking success
  const handleCreateBookingSuccess = () => {
    // Refresh the bookings data
    refetch();
    // Reset to first page to see the new booking
    setCurrentPage(1);
  };

  // Create query params object for API
  const queryParams = {
    page: currentPage,
    limit: BOOKINGS_PER_PAGE,
    search: searchTerm,
    status: filters.status,
    datePreset: filters.datePreset,
    view: view, // Use the new view parameter
    paymentOverdue: filters.paymentOverdue ? "true" : undefined,
    location: filters.location,
    source: filters.source,
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
  const apiBookings = bookingsData.bookings || [];
  const pagination = bookingsData.pagination || {
    totalBookings: 0,
    currentPage: 1,
    totalPages: 1,
  };

  // Sync local bookings with API data, excluding deleted/cancelled ones
  useEffect(() => {
    const filteredBookings = apiBookings.filter(
      (booking) =>
        !deletingBookings.has(booking._id) &&
        !cancellingBookings.has(booking._id)
    );
    setLocalBookings(filteredBookings);
  }, [apiBookings, deletingBookings, cancellingBookings]);

  // Use local bookings for rendering
  const bookings = localBookings;

  // Pagination handler
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    // Clear deleting and cancelling state when changing pages
    setDeletingBookings(new Set());
    setCancellingBookings(new Set());
  };

  // Handle delete booking
  const handleDeleteClick = (booking) => {
    setBookingToDelete(booking);
    setShowDeleteConfirmation(true);
  };

  // Confirm deletion
  const confirmDelete = async () => {
    if (!bookingToDelete || !bookingToDelete._id) return;

    const bookingId = bookingToDelete._id;

    try {
      // Mark booking as deleting (for animation)
      setDeletingBookings((prev) => new Set(prev).add(bookingId));

      // Close modal immediately
      setShowDeleteConfirmation(false);
      setBookingToDelete(null);

      // Remove from expanded rows if expanded
      setExpandedRows((prev) => {
        const newState = { ...prev };
        delete newState[bookingId];
        return newState;
      });

      // Perform actual deletion
      const deletePromise = deleteBooking(bookingId).unwrap();

      // Wait for animation duration before removing from local state
      setTimeout(() => {
        setLocalBookings((prev) =>
          prev.filter((booking) => booking._id !== bookingId)
        );
      }, 300); // Match animation duration

      // Wait for the actual deletion to complete
      await deletePromise;

      toast.success("Booking deleted successfully");

      // Clean up deleting state after successful deletion
      setDeletingBookings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    } catch (error) {
      // If deletion fails, restore the booking
      setDeletingBookings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });

      // Restore booking to local state
      const originalBooking = apiBookings.find((b) => b._id === bookingId);
      if (originalBooking) {
        setLocalBookings((prev) =>
          [...prev, originalBooking].sort(
            (a, b) => new Date(b.eventStartTime) - new Date(a.eventStartTime)
          )
        );
      }

      toast.error(
        `Failed to delete booking: ${error?.data?.message || "Unknown error"}`
      );
    }
  };

  // Handle cancel booking
  const handleCancelClick = (booking) => {
    setBookingToCancel(booking);
    setShowCancelConfirmation(true);
  };

  // Confirm cancellation
  const confirmCancel = async (bookingId, reason, notifyUser) => {
    if (!bookingId) return;

    try {
      // Mark booking as cancelling (for animation)
      setCancellingBookings((prev) => new Set(prev).add(bookingId));

      // Close modal immediately
      setShowCancelConfirmation(false);
      setBookingToCancel(null);

      // Perform actual cancellation
      const result = await cancelBooking({
        bookingId,
        reason,
        notifyUser,
      }).unwrap();

      toast.success("Booking cancelled successfully");

      // Update the booking status in local state
      setLocalBookings((prev) =>
        prev.map((booking) =>
          booking._id === bookingId
            ? {
                ...booking,
                status: "Cancelled",
                cancellation: result.booking.cancellation,
              }
            : booking
        )
      );

      // Clean up cancelling state after successful cancellation
      setCancellingBookings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });

      // Refetch to ensure data is in sync
      refetch();
    } catch (error) {
      // If cancellation fails, remove from cancelling state
      setCancellingBookings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });

      toast.error(
        `Failed to cancel booking: ${error?.data?.message || "Unknown error"}`
      );
    }
  };

  // Check if any filters are active
  const anyFiltersActive =
    filters.status ||
    filters.datePreset ||
    filters.paymentOverdue ||
    filters.location ||
    filters.source ||
    view === "past" || // Consider past view as an active filter
    searchTerm;

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">
              Booking Management
            </h1>
            <p className="mt-2 text-gray-600">
              Manage and monitor all client bookings
            </p>
          </div>
          <div className="text-right">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                view === "future"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <BiTime className="mr-1" />
              Showing {view === "future" ? "Future" : "Past"} Bookings
            </div>
          </div>
        </div>
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
      <BookingFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        view={view}
        toggleView={toggleView}
        clearFilters={clearFilters}
        onCreateBooking={handleCreateBooking}
      />

      {/* Results count */}
      <div className="mb-4">
        <span className="text-gray-600">
          Showing <span className="font-medium">{bookings.length}</span> of{" "}
          <span className="font-medium">
            {Math.max(
              0,
              pagination.totalBookings -
                deletingBookings.size -
                cancellingBookings.size
            )}
          </span>{" "}
          {view === "future" ? "upcoming" : "past"} bookings
        </span>
      </div>

      {/* Bookings Table */}
      <BookingTable
        bookings={bookings}
        pagination={pagination}
        expandedRows={expandedRows}
        setExpandedRows={setExpandedRows}
        onDeleteClick={handleDeleteClick}
        onCancelClick={handleCancelClick}
        clearFilters={clearFilters}
        anyFiltersActive={anyFiltersActive}
        deletingBookings={deletingBookings}
        cancellingBookings={cancellingBookings}
        view={view}
      />

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

      {/* Delete Confirmation Modal */}
      <DeleteBookingModal
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setBookingToDelete(null);
        }}
        onConfirm={confirmDelete}
        isCalendlyBooking={bookingToDelete?.source === "calendly"}
        isDeleting={isDeleting}
      />

      {/* Cancel Confirmation Modal */}
      <CancelBookingModal
        isOpen={showCancelConfirmation}
        onClose={() => {
          setShowCancelConfirmation(false);
          setBookingToCancel(null);
        }}
        onConfirm={confirmCancel}
        isCancelling={isCancelling}
        booking={bookingToCancel}
      />

      {/* Create Booking Popup */}
      <CreateBookingPopup
        isOpen={showCreateBooking}
        onClose={() => setShowCreateBooking(false)}
        onSuccess={handleCreateBookingSuccess}
      />
    </div>
  );
};

export default AdminBookings;
