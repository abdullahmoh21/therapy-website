import React, { useState, useCallback } from "react";
import { BiInfoCircle, BiRefresh } from "react-icons/bi";
import { toast } from "react-toastify";
import Pagination from "../../../../components/pagination";
import debounce from "lodash/debounce";
import LoadingPage from "../../../../pages/LoadingPage";

// Import custom components
import BookingFilters from "./BookingFilters";
import BookingTable from "./BookingTable";
import DeleteBookingModal from "./DeleteBookingModal";

// Import the booking RTK Query hooks
import {
  useGetAdminBookingsQuery,
  useDeleteAdminBookingMutation,
} from "../../../../features/admin/adminApiSlice";

// Pagination: bookings/page
const BOOKINGS_PER_PAGE = 10;

// Main AdminBookings component
const AdminBookings = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPastBookings, setShowPastBookings] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    datePreset: "",
    paymentOverdue: false,
    location: "",
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

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

  // Handle delete booking
  const handleDeleteClick = (booking) => {
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

  // Check if any filters are active
  const anyFiltersActive =
    filters.status ||
    filters.datePreset ||
    filters.paymentOverdue ||
    filters.location ||
    showPastBookings ||
    searchTerm;

  if (isLoading) {
    return <LoadingPage />;
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
      <BookingFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        showPastBookings={showPastBookings}
        togglePastBookings={togglePastBookings}
        clearFilters={clearFilters}
      />

      {/* Results count */}
      <div className="mb-4">
        <span className="text-gray-600">
          Showing <span className="font-medium">{bookings.length}</span> of{" "}
          <span className="font-medium">{pagination.totalBookings}</span>{" "}
          bookings
        </span>
      </div>

      {/* Bookings Table */}
      <BookingTable
        bookings={bookings}
        pagination={pagination}
        expandedRows={expandedRows}
        setExpandedRows={setExpandedRows}
        onDeleteClick={handleDeleteClick}
        clearFilters={clearFilters}
        anyFiltersActive={anyFiltersActive}
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
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default AdminBookings;
