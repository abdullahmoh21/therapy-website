import React, { useState, useEffect, useCallback } from "react";
// DataTable and Column are removed as BillingTable handles this
import { useGetPaymentLinkMutation } from "../../../../features/payments/paymentApiSlice";
import { useGetPastBookingsQuery } from "../../../../features/users/usersApiSlice"; // Changed import
import { ProgressSpinner } from "primereact/progressspinner";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar"; // Import Calendar
import debounce from "lodash/debounce";
import Pagination from "../../../../components/pagination";
import BillingTable from "./BillingTable"; // Import BillingTable
import {
  BiInfoCircle,
  BiErrorCircle,
  BiFilterAlt,
  BiSearch,
  BiRefresh,
} from "react-icons/bi";
import { Badge } from "primereact/badge";
import "./calendar-custom.css"; // We'll create this file for custom calendar styling

const Billing = () => {
  const [bookingsData, setBookingsData] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [payingBookingId, setPayingBookingId] = useState(null);

  // Filters state
  const [bookingIdInput, setBookingIdInput] = useState(""); // Temporary input for debouncing
  const [bookingIdSearch, setBookingIdSearch] = useState(""); // Actual search term for query
  const [transactionRefInput, setTransactionRefInput] = useState(""); // New state for transaction reference input
  const [transactionRefSearch, setTransactionRefSearch] = useState(""); // Actual search term for transaction reference
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(""); // New state for location filter

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  // New state for filter visibility
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Add new state variables for validation errors
  const [bookingIdError, setBookingIdError] = useState(false);
  const [transactionRefError, setTransactionRefError] = useState(false);

  // Construct query params for the API call
  const queryParams = { page: currentPage, limit };

  // Only add bookingId search if it has 3 or more digits
  if (bookingIdSearch && bookingIdSearch.length >= 3) {
    queryParams.search = bookingIdSearch;
  }

  // Only add transaction reference if it has exactly 5 characters
  if (transactionRefSearch && transactionRefSearch.length === 5) {
    queryParams.transactionRef = transactionRefSearch;
  }

  queryParams.paymentStatus = selectedPaymentStatus;

  if (selectedDate) {
    const date = new Date(selectedDate);
    // Create start of day (00:00:00)
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    // Create end of day (23:59:59.999)
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    queryParams.startDate = startDate.toISOString();
    queryParams.endDate = endDate.toISOString();
  }
  if (selectedLocation) queryParams.location = selectedLocation;

  const {
    data: pastBookingsResponseData,
    isLoading,
    isError,
    isSuccess,
    isFetching,
    error: bookingFetchError,
    refetch,
  } = useGetPastBookingsQuery(queryParams, {
    // Prevent refetching if queryParams object reference is the same but content might be.
    // RTK Query handles this well by default if queryParams is a new object or its primitive values change.
  });

  const [triggerGetPaymentLink] = useGetPaymentLinkMutation();

  // Effect to update payments state from server response
  useEffect(() => {
    if (isSuccess && pastBookingsResponseData) {
      if (
        pastBookingsResponseData.bookings &&
        pastBookingsResponseData.bookings.entities
      ) {
        const allBookingsOnPage = Object.values(
          pastBookingsResponseData.bookings.entities
        );
        setBookingsData(allBookingsOnPage);
      } else {
        setBookingsData([]);
      }
      if (pastBookingsResponseData.pagination) {
        setTotalPages(pastBookingsResponseData.pagination.totalPages || 1);
      }
    } else if (!isLoading && !isFetching && !isSuccess && !isError) {
      setBookingsData([]);
    }
  }, [
    isSuccess,
    pastBookingsResponseData,
    isLoading,
    isFetching,
    isError,
    // Remove currentPage from dependencies to prevent effect from re-running when page changes
  ]);

  // Update the debounced function for bookingIdSearch to handle validation
  const debouncedSetBookingIdSearch = useCallback(
    debounce((value) => {
      if (value.length === 0) {
        // Clear search if empty
        setBookingIdSearch("");
        setBookingIdError(false); // Clear error when empty
        // Only reset page if there was a previous search term
        if (bookingIdSearch !== "") setCurrentPage(1);
      } else if (value.length >= 3) {
        // Only set search term if 3+ digits
        setBookingIdSearch(value);
        setBookingIdError(false); // Clear error when valid
        // Only reset page if the search term actually changed
        if (bookingIdSearch !== value) setCurrentPage(1);
      } else {
        // If input is less than 3 digits but not empty, show error
        setBookingIdSearch("");
        setBookingIdError(true); // Set error flag
        // Only reset page if there was a previous search term
        if (bookingIdSearch !== "") setCurrentPage(1);
      }
    }, 500),
    [bookingIdSearch] // Remove currentPage dependency
  );

  // Update debounce function for transactionRef to handle validation
  const debouncedSetTransactionRefSearch = useCallback(
    debounce((value) => {
      if (value.length === 0) {
        // Clear search if empty
        setTransactionRefSearch("");
        setTransactionRefError(false); // Clear error when empty
        // Only reset page if there was a previous search term
        if (transactionRefSearch !== "") setCurrentPage(1);
      } else if (value.length === 5) {
        // Only set search term if exactly 5 characters
        setTransactionRefSearch(value);
        setTransactionRefError(false); // Clear error when valid
        // Only reset page if the search term actually changed
        if (transactionRefSearch !== value) setCurrentPage(1);
      } else {
        // If not empty and not 5 chars, show error
        setTransactionRefSearch("");
        setTransactionRefError(true); // Set error flag
        // Only reset page if there was a previous search term
        if (transactionRefSearch !== "") setCurrentPage(1);
      }
    }, 500),
    [transactionRefSearch] // Remove currentPage dependency
  );

  useEffect(() => {
    debouncedSetBookingIdSearch(bookingIdInput);
    // Cleanup function for debounce
    return () => {
      debouncedSetBookingIdSearch.cancel();
    };
  }, [bookingIdInput, debouncedSetBookingIdSearch]);

  useEffect(() => {
    debouncedSetTransactionRefSearch(transactionRefInput);
    return () => {
      debouncedSetTransactionRefSearch.cancel();
    };
  }, [transactionRefInput, debouncedSetTransactionRefSearch]);

  // Generic handler to reset to page 1 when filters change
  const handleFilterChange = useCallback((newValue, currentValue) => {
    // Only reset to page 1 if the filter value actually changed
    if (newValue !== currentValue) {
      setCurrentPage(1);
    }
  }, []); // Remove currentPage dependency

  // Add an immediate validation function for Booking ID
  const handleBookingIdInputChange = (e) => {
    const value = e.target.value;
    setBookingIdInput(value); // Update temporary input immediately

    // Show error immediately if not empty and less than 3 digits
    if (value.length > 0 && value.length < 3) {
      setBookingIdError(true);
    } else {
      setBookingIdError(false);
    }
  };

  // Add an immediate validation function for Transaction Ref
  const handleTransactionRefInputChange = (e) => {
    const value = e.target.value;
    setTransactionRefInput(value);

    // Show error immediately if not empty and not 5 chars
    if (value.length > 0 && value.length !== 5) {
      setTransactionRefError(true);
    } else {
      setTransactionRefError(false);
    }
  };

  const handlePaymentStatusChange = (e) => {
    const newValue = e.value;
    // Only reset page if value actually changed
    handleFilterChange(newValue, selectedPaymentStatus);
    setSelectedPaymentStatus(newValue);
  };

  const handleDateChange = (e) => {
    const newValue = e.value;
    // Only reset page if value actually changed
    const currentDateString = selectedDate ? selectedDate.toISOString() : null;
    const newDateString = newValue ? newValue.toISOString() : null;
    handleFilterChange(newDateString, currentDateString);
    setSelectedDate(newValue);
  };

  const handleLocationChange = (e) => {
    const newValue = e.value;
    // Only reset page if value actually changed
    handleFilterChange(newValue, selectedLocation);
    setSelectedLocation(newValue);
  };

  const clearFilters = () => {
    setBookingIdInput(""); // Clear temporary input
    setBookingIdSearch(""); // Clear actual search term
    setTransactionRefInput(""); // Clear transaction reference input
    setTransactionRefSearch(""); // Clear transaction reference search
    setSelectedPaymentStatus("");
    setSelectedDate(null);
    setSelectedLocation(""); // Clear location filter
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // RTK Query will refetch due to queryParams changing.
  };

  const handlePageChange = (page) => {
    // Just set the page without any additional checks or side effects
    setCurrentPage(page);
    setExpandedRows({});
  };

  const onRowToggle = (data) => {
    const newExpandedRows = { ...expandedRows };
    if (newExpandedRows[data._id]) {
      delete newExpandedRows[data._id];
    } else {
      newExpandedRows[data._id] = true;
    }
    setExpandedRows(newExpandedRows);
  };

  const redirectToPayment = async (bookingId) => {
    if (!bookingId) {
      console.error("redirectToPayment: bookingId is undefined");
      return;
    }
    setPayingBookingId(bookingId);
    try {
      const response = await triggerGetPaymentLink({ bookingId }).unwrap();
      if (response.url) {
        window.location.href = response.url;
      } else {
        // Show error to user
        console.error("Failed to fetch payment link: No URL found");
      }
    } catch (error) {
      // Show error to user
      console.error("Failed to fetch payment link:", error);
    } finally {
      setPayingBookingId(null);
    }
  };

  if (isLoading || isFetching) {
    // Show loader if loading or fetching
    return (
      <div className="flex justify-center items-center p-10">
        <ProgressSpinner
          style={{ width: "50px", height: "50px" }}
          strokeWidth="8"
        />
      </div>
    );
  }

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
            "Failed to load booking history."}
        </span>
      </div>
    );
  }

  if (
    isSuccess &&
    !isFetching &&
    bookingsData.length === 0 &&
    !bookingIdSearch && // Check actual search term
    !selectedPaymentStatus &&
    !selectedDate &&
    !selectedLocation && // Check location filter
    pastBookingsResponseData?.pagination?.totalBookings === 0
  ) {
    return (
      <div className="text-center p-10 bg-white rounded-lg shadow-md">
        <BiInfoCircle className="w-12 h-12 text-textColor mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-textColor">
          No Booking History
        </h3>
        <p className="text-textColor">You haven't made any bookings yet.</p>
      </div>
    );
  }

  const paymentStatusOptions = [
    { label: "All Payment Statuses", value: "" },
    { label: "Completed", value: "Completed" },
    { label: "Failed", value: "Failed" },
    { label: "Refunded", value: "Refunded" },
    { label: "Not Initiated", value: "Not Initiated" },
    { label: "Refund Requested", value: "Refund Requested" },
    // Add other relevant payment statuses
  ];

  const locationOptions = [
    { label: "All Locations", value: "" },
    { label: "Online", value: "online" },
    { label: "In-Person", value: "in-person" },
  ];

  // Calculate active filters count - add transactionRefSearch
  const activeFiltersCount = [
    bookingIdSearch,
    transactionRefSearch,
    selectedPaymentStatus,
    selectedDate,
    selectedLocation,
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-textColor">
          Billing & Payments
        </h1>
        <p className="mt-1 text-textColor">
          View and manage your payment history and session details
        </p>
      </header>

      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                filtersVisible
                  ? "bg-lightPink text-white"
                  : "bg-lightPink text-white"
              }`}
              onClick={() => setFiltersVisible(!filtersVisible)}
            >
              <BiFilterAlt />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-orangeHeader rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button
              className="flex items-center gap-2 px-4 py-2 bg-lightPink text-white rounded-md transition-colors"
              onClick={() => {
                if (
                  currentPage !== 1 &&
                  !bookingIdSearch &&
                  !selectedPaymentStatus &&
                  !selectedDate &&
                  !selectedLocation
                ) {
                  setCurrentPage(1);
                } else {
                  refetch();
                }
                setExpandedRows({});
              }}
            >
              <BiRefresh />
              <span>Refresh</span>
            </button>
          </div>

          {activeFiltersCount > 0 && (
            <button
              className="text-orangeText hover:underline font-medium"
              onClick={clearFilters}
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Collapsible filter section */}
        {filtersVisible && (
          <div className="border-t border-gray-200 p-4 bg-gray-50 transition-all duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="filter-group lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="bookingIdSearch"
                    className="block text-sm font-medium text-textColor mb-2"
                  >
                    Booking ID
                  </label>
                  <InputText
                    id="bookingIdSearch"
                    value={bookingIdInput}
                    onChange={handleBookingIdInputChange}
                    placeholder="Enter ID number"
                    className={`w-full border-gray-300 shadow-sm rounded-md filter-input-height ${
                      bookingIdError ? "p-invalid" : ""
                    }`}
                    type="number"
                  />
                  {bookingIdError ? (
                    <div className="text-xs text-red-500 mt-1">
                      Booking ID must be at least 3 digits
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mt-1">
                      Exactly 3 or more digits required
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="transactionRefSearch"
                    className="block text-sm font-medium text-textColor mb-2"
                  >
                    Transaction Reference
                  </label>
                  <div className="p-inputgroup shadow-sm rounded-md overflow-hidden">
                    <span className="p-inputgroup-addon bg-gray-100 text-gray-700 font-medium border-0">
                      T-
                    </span>
                    <InputText
                      id="transactionRefSearch"
                      value={transactionRefInput}
                      onChange={handleTransactionRefInputChange}
                      placeholder="bQmGc"
                      className={`w-full border-gray-300 border-0 ${
                        transactionRefError ? "p-invalid" : ""
                      }`}
                    />
                  </div>
                  {transactionRefError ? (
                    <div className="text-xs text-red-500 mt-1">
                      Transaction reference must be exactly 5 characters
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mt-1">
                      Exactly 5 characters required
                    </div>
                  )}
                </div>
              </div>

              <div className="filter-group">
                <label
                  htmlFor="paymentStatusFilter"
                  className="block text-sm font-medium text-textColor mb-2"
                >
                  Payment Status
                </label>
                <Dropdown
                  id="paymentStatusFilter"
                  value={selectedPaymentStatus}
                  options={paymentStatusOptions}
                  onChange={handlePaymentStatusChange}
                  placeholder="Select Status"
                  className="w-full shadow-sm rounded-md dropdown-custom"
                  panelClassName="dropdown-panel-custom !bg-white border-0 shadow-lg rounded-md"
                  panelStyle={{ backgroundColor: "white" }}
                />
              </div>

              <div className="filter-group">
                <label
                  htmlFor="locationFilter"
                  className="block text-sm font-medium text-textColor mb-2"
                >
                  Location
                </label>
                <Dropdown
                  id="locationFilter"
                  value={selectedLocation}
                  options={locationOptions}
                  onChange={handleLocationChange}
                  placeholder="Select Location"
                  className="w-full shadow-sm rounded-md dropdown-custom"
                  panelClassName="dropdown-panel-custom !bg-white border-0 shadow-lg rounded-md"
                  panelStyle={{ backgroundColor: "white" }}
                />
              </div>

              <div className="filter-group">
                <label
                  htmlFor="dateFilter"
                  className="block text-sm font-medium text-textColor mb-2"
                >
                  Session Date
                </label>
                <Calendar
                  id="dateFilter"
                  value={selectedDate}
                  onChange={handleDateChange}
                  dateFormat="dd-mm-yy"
                  placeholder="Select Date (DD-MM-YYYY)"
                  showIcon
                  iconClassName="text-orangeText"
                  className="w-full shadow-sm rounded-md calendar-custom"
                  panelClassName="calendar-panel-custom !bg-white shadow-lg rounded-md overflow-hidden border-0"
                  panelStyle={{ backgroundColor: "white" }}
                  monthNavigatorClassName="month-nav-custom"
                  yearNavigatorClassName="year-nav-custom"
                  todayButtonClassName="today-btn-custom"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <span className="text-gray-600">
          Showing <span className="font-medium">{bookingsData.length}</span> of{" "}
          <span className="font-medium">
            {pastBookingsResponseData?.pagination?.totalBookings || 0}
          </span>{" "}
          bookings
        </span>
      </div>

      <BillingTable
        paymentsData={bookingsData}
        expandedRows={expandedRows}
        onRowToggle={onRowToggle}
        onRedirectToPayment={redirectToPayment}
        payingBookingId={payingBookingId}
      />

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default Billing;
