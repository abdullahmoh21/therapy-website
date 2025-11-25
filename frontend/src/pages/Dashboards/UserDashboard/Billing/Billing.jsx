import React, { useState, useEffect, useCallback } from "react";
import { ProgressSpinner } from "primereact/progressspinner";
import debounce from "lodash/debounce";
import Pagination from "../../../../components/pagination";
import { BiInfoCircle, BiErrorCircle, BiRefresh } from "react-icons/bi";

// Import custom components
import UserBookingFilters from "./UserBookingFilters";
import UserBookingTable from "./UserBookingTable";
import ExpandedRowContent from "./ExpandedRowContent";
import HelpButton from "../../../../components/HelpButton";
import PaymentInfoPopup from "../MyBookings/PaymentInfoPopup";

// Import RTK Query hooks
import { useGetPaymentLinkMutation } from "../../../../features/payments/paymentApiSlice";
import { useGetPastBookingsQuery } from "../../../../features/bookings/bookingApiSlice";

const Billing = () => {
  const [bookingsData, setBookingsData] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [payingBookingId, setPayingBookingId] = useState(null);
  const [showPaymentInfoPopup, setShowPaymentInfoPopup] = useState(false);

  // Filters state - simplified
  const [searchInput, setSearchInput] = useState(""); // Local input state
  const [searchTerm, setSearchTerm] = useState(""); // Debounced search term for API
  const [searchError, setSearchError] = useState(""); // Error message for invalid input
  const [filters, setFilters] = useState({
    status: "",
    datePreset: "",
    location: "",
    paymentStatus: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  // Construct query params for the API call
  const queryParams = {
    page: currentPage,
    limit,
  };

  // Only add non-empty params
  if (searchTerm) queryParams.search = searchTerm;
  if (filters.status) queryParams.status = filters.status;
  if (filters.location) queryParams.location = filters.location;
  if (filters.paymentStatus) queryParams.paymentStatus = filters.paymentStatus;
  if (filters.datePreset) queryParams.datePreset = filters.datePreset;

  const {
    data: pastBookingsResponseData,
    isLoading,
    isError,
    isSuccess,
    isFetching,
    error: bookingFetchError,
    refetch,
  } = useGetPastBookingsQuery(queryParams, {});

  const [triggerGetPaymentLink] = useGetPaymentLinkMutation();

  // Effect to update bookings state from server response
  useEffect(() => {
    try {
      if (isSuccess && pastBookingsResponseData) {
        // Extract bookings from normalized state
        // pastBookingsResponseData.bookings is an entity adapter state { ids: [], entities: {} }
        const bookingsState = pastBookingsResponseData.bookings;
        const bookingsArray =
          bookingsState?.ids?.map((id) => bookingsState.entities[id]) || [];

        setBookingsData(bookingsArray);
        setTotalPages(pastBookingsResponseData.pagination?.totalPages || 1);
      } else if (isError) {
        setBookingsData([]);
      }
    } catch (error) {
      console.error("Error processing bookings data:", error);
      setBookingsData([]);
    }
  }, [isSuccess, isError, pastBookingsResponseData]);

  // Debounced search handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((value) => {
      // Validate: only numeric input allowed for booking ID search
      if (value && isNaN(value)) {
        setSearchError("Please enter a valid numeric Booking ID");
        setSearchTerm(""); // Don't send invalid search to API
      } else {
        setSearchError("");
        setSearchTerm(value);
      }
      setCurrentPage(1);
    }, 500),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value); // Update local input immediately
    debouncedSearch(value); // Debounce the API call
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setSearchError("");
    setFilters({
      status: "",
      datePreset: "",
      location: "",
      paymentStatus: "",
    });
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  };

  // Pagination handler
  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedRows({});
  };

  // Handle row toggle for expanding/collapsing
  const onRowToggle = (data) => {
    setExpandedRows((prev) => {
      const newState = { ...prev };
      if (newState[data._id]) {
        delete newState[data._id];
      } else {
        newState[data._id] = true;
      }
      return newState;
    });
  };

  // Payment redirect handler (button hidden for now)
  const redirectToPayment = async (bookingId) => {
    if (!bookingId) {
      console.error("No booking ID provided");
      return;
    }
    // Show the payment info popup instead of redirecting
    setShowPaymentInfoPopup(true);
  };

  // Check if any filters are active
  const anyFiltersActive =
    filters.status ||
    filters.datePreset ||
    filters.location ||
    filters.paymentStatus ||
    searchTerm ||
    searchInput;

  // Loading state
  if (isLoading || isFetching) {
    return (
      <div className="flex justify-center items-center p-10">
        <ProgressSpinner
          style={{ width: "50px", height: "50px" }}
          strokeWidth="8"
        />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4"
        role="alert"
      >
        <strong className="font-bold mr-2">
          <BiErrorCircle className="inline-block mb-1" /> Error:
        </strong>
        <span className="block sm:inline">
          {bookingFetchError?.data?.message ||
            bookingFetchError?.error ||
            "Failed to load booking history."}
        </span>
        <div className="mt-3">
          <button
            onClick={refetch}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            <BiRefresh className="inline-block mr-1" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state - no bookings at all
  if (
    isSuccess &&
    !isFetching &&
    bookingsData.length === 0 &&
    !anyFiltersActive &&
    pastBookingsResponseData?.pagination?.totalBookings === 0
  ) {
    return (
      <div className="max-w-7xl mx-auto">
        {/* Help Button */}
        <HelpButton />

        <header className="mb-6">
          <h1 className="text-2xl font-bold text-textColor">Past Bookings</h1>
          <p className="mt-1 text-textColor">
            View and manage your Past Bookings
          </p>
        </header>

        <div className="text-center p-10 bg-white rounded-lg shadow-md">
          <BiInfoCircle className="w-12 h-12 text-textColor mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-textColor">
            No Booking History
          </h3>
          <p className="text-textColor">
            Only bookings in the past will show up here.
          </p>
        </div>
      </div>
    );
  }

  // Render expanded row content
  const expandedRowTemplate = (booking) => {
    return (
      <ExpandedRowContent
        data={booking}
        onRedirectToPayment={redirectToPayment}
        payingBookingId={payingBookingId}
      />
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Help Button */}
      <HelpButton />

      {/* Payment Info Popup */}
      <PaymentInfoPopup
        show={showPaymentInfoPopup}
        onClose={() => {
          setShowPaymentInfoPopup(false);
          setPayingBookingId(null);
        }}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-textColor">Past Bookings</h1>
        <p className="mt-1 text-textColor">
          View and manage your Past Bookings
        </p>
      </header>

      {/* Filters Section */}
      <UserBookingFilters
        searchInput={searchInput}
        searchError={searchError}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        clearFilters={clearFilters}
      />

      {/* Results count */}
      <div className="mb-4">
        <span className="text-gray-600">
          Showing <span className="font-medium">{bookingsData.length}</span> of{" "}
          <span className="font-medium">
            {pastBookingsResponseData?.pagination?.totalBookings || 0}
          </span>{" "}
          bookings
        </span>
      </div>

      {/* Bookings Table */}
      <UserBookingTable
        bookings={bookingsData}
        expandedRows={expandedRows}
        setExpandedRows={setExpandedRows}
        clearFilters={clearFilters}
        anyFiltersActive={anyFiltersActive}
        expandedRowTemplate={expandedRowTemplate}
      />

      {/* Pagination */}
      {totalPages > 1 && bookingsData.length > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default Billing;
