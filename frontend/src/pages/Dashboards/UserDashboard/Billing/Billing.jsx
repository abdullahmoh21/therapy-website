import React, { useState, useEffect, useCallback } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import {
  useGetMyPaymentsQuery,
  useGetPaymentLinkMutation,
} from "../../../../features/payments/paymentApiSlice";
import { ProgressSpinner } from "primereact/progressspinner";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { debounce } from "lodash";
import Pagination from "../../../../components/pagination";
import {
  BiInfoCircle,
  BiCheckCircle,
  BiLoaderAlt,
  BiXCircle,
  BiErrorCircle,
  BiSearch,
  BiFilterAlt,
  BiRefresh,
  BiChevronDown,
  BiChevronUp,
  BiDollarCircle,
} from "react-icons/bi";

const Billing = () => {
  // State for payments data and UI controls
  const [payments, setPayments] = useState([]);
  const [expandedRows, setExpandedRows] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [payingBookingId, setPayingBookingId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [paymentsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Get payments data from API
  const {
    data: paymentResponse,
    isLoading,
    isError,
    error: paymentFetchError,
    refetch,
  } = useGetMyPaymentsQuery();

  // Get payment link mutation
  const [triggerGetPaymentLink, { isLoading: gettingPaymentLink }] =
    useGetPaymentLinkMutation();

  // Format date and time string
  const formatDateTime = (dateString, includeTime = false) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const optionsDate = { year: "numeric", month: "short", day: "numeric" };
    const optionsTime = { hour: "2-digit", minute: "2-digit", hour12: true };
    let formatted = date.toLocaleDateString("en-US", optionsDate);
    if (includeTime) {
      formatted += ", " + date.toLocaleTimeString("en-US", optionsTime);
    }
    return formatted;
  };

  // Get status display with icon and styling
  const getStatusDisplay = (status) => {
    switch (status) {
      case "Completed":
        return {
          icon: <BiCheckCircle className="text-green-500 mr-1" />,
          text: "Completed",
          color: "text-green-600 bg-green-100",
        };
      case "Pending":
        return {
          icon: <BiLoaderAlt className="text-yellow-500 mr-1 animate-spin" />,
          text: "Pending",
          color: "text-yellow-600 bg-yellow-100",
        };
      case "Failed":
        return {
          icon: <BiXCircle className="text-red-500 mr-1" />,
          text: "Failed",
          color: "text-red-600 bg-red-100",
        };
      case "Refunded":
        return {
          icon: <BiInfoCircle className="text-blue-500 mr-1" />,
          text: "Refunded",
          color: "text-blue-600 bg-blue-100",
        };
      case "Partially Refunded":
        return {
          icon: <BiInfoCircle className="text-indigo-500 mr-1" />,
          text: "Partially Refunded",
          color: "text-indigo-600 bg-indigo-100",
        };
      case "Not Initiated":
        return {
          icon: <BiInfoCircle className="text-gray-500 mr-1" />,
          text: "Not Initiated",
          color: "text-gray-600 bg-gray-100",
        };
      case "Cancelled":
        return {
          icon: <BiXCircle className="text-red-500 mr-1" />,
          text: "Cancelled",
          color: "text-red-600 bg-red-100",
        };
      case "Refund Requested":
        return {
          icon: <BiInfoCircle className="text-purple-500 mr-1" />,
          text: "Refund Requested",
          color: "text-purple-600 bg-purple-100",
        };
      default:
        return {
          icon: <BiInfoCircle className="text-gray-500 mr-1" />,
          text: status || "N/A",
          color: "text-gray-600 bg-gray-100",
        };
    }
  };

  useEffect(() => {
    if (paymentResponse && Array.isArray(paymentResponse.ids)) {
      const formattedPayments = Object.values(paymentResponse.entities)
        .map((payment) => ({
          ...payment,
          formattedEventStartTime: formatDateTime(payment.eventStartTime, true),
          formattedPaymentCompletedDate: payment.paymentCompletedDate
            ? formatDateTime(payment.paymentCompletedDate, true)
            : "-",
          transactionStatusDisplay: getStatusDisplay(payment.transactionStatus),
          // Adding placeholders for booking data that will be populated later
          eventName: payment.eventName || "--",
          location: payment.location || "--",
          bookingStatus: payment.bookingStatus || "--",
          sessionDuration: payment.sessionDuration || "--",
          sessionNotes: payment.sessionNotes || "--",
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPayments(formattedPayments);
      setFilteredPayments(formattedPayments);
      setTotalPages(Math.ceil(formattedPayments.length / paymentsPerPage));
    }
  }, [paymentResponse, paymentsPerPage]);

  // Create a debounced search function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      applyFilters(searchValue, filters.status);
    }, 300),
    [filters.status, payments]
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, search: value }));
    debouncedSearch(value);
  };

  // Handle status filter change
  const handleStatusChange = (e) => {
    const value = e.value;
    setFilters((prev) => ({ ...prev, status: value }));
    applyFilters(filters.search, value);
  };

  // Apply filters to the payments data
  const applyFilters = (search, status) => {
    let filtered = [...payments];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          (payment.transactionReferenceNumber &&
            payment.transactionReferenceNumber
              .toLowerCase()
              .includes(searchLower)) ||
          (payment.customerBookingId &&
            payment.customerBookingId.toString().includes(searchLower)) ||
          (payment.eventName &&
            payment.eventName.toLowerCase().includes(searchLower)) ||
          (payment.formattedEventStartTime &&
            payment.formattedEventStartTime.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    if (status) {
      filtered = filtered.filter(
        (payment) => payment.transactionStatus === status
      );
    }

    setFilteredPayments(filtered);
    setTotalPages(Math.ceil(filtered.length / paymentsPerPage));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ search: "", status: "" });
    setFilteredPayments(payments);
    setTotalPages(Math.ceil(payments.length / paymentsPerPage));
    setCurrentPage(1);
  };

  // Calculate the current page's data
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * paymentsPerPage;
    const endIndex = startIndex + paymentsPerPage;
    return filteredPayments.slice(startIndex, endIndex);
  };

  // Handle page change from pagination component
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Status column body template
  const statusBodyTemplate = (rowData) => {
    const { icon, text, color } = rowData.transactionStatusDisplay;
    return (
      <span
        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}
      >
        {icon}
        <span className="ml-1">{text}</span>
      </span>
    );
  };

  // Amount column body template
  const amountBodyTemplate = (rowData) => {
    return (
      <span className="text-gray-900 font-medium">
        {Number(rowData.amount).toLocaleString("en-PK", {
          style: "currency",
          currency: "PKR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}
      </span>
    );
  };

  // Handle payment initiation
  const redirectToPayment = async (bookingId) => {
    setPayingBookingId(bookingId);
    try {
      const response = await triggerGetPaymentLink({ bookingId }).unwrap();
      if (response.url) {
        window.location.href = response.url;
      } else {
        console.error("Failed to fetch payment link: No URL found");
      }
    } catch (error) {
      console.error("Failed to fetch payment link:", error);
    } finally {
      setPayingBookingId(null);
    }
  };

  // Payment button component
  const PaymentButton = ({ bookingId, status }) => {
    const isPayable = status === "Not Initiated" || status === "Cancelled";

    if (!isPayable) return null;

    const isLoading = payingBookingId === bookingId;

    return (
      <button
        className={`inline-flex justify-center items-center bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
          isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-green-600"
        }`}
        onClick={() => redirectToPayment(bookingId)}
        disabled={isLoading}
      >
        {isLoading ? (
          <BiLoaderAlt className="animate-spin mr-2" />
        ) : (
          <BiDollarCircle className="mr-1" />
        )}{" "}
        Pay Now
      </button>
    );
  };

  // Expanded row template
  const rowExpansionTemplate = (data) => {
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
                      {data.transactionReferenceNumber || "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-medium">{amountBodyTemplate(data)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Status</p>
                    <div>{statusBodyTemplate(data)}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Payment Date</p>
                    <p className="font-medium">
                      {data.formattedPaymentCompletedDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium">
                      {data.paymentMethod || "Credit Card"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Currency</p>
                    <p className="font-medium">{data.currency || "PKR"}</p>
                  </div>
                </div>
              </div>
              {/* Payment Action Button */}
              {(data.transactionStatus === "Not Initiated" ||
                data.transactionStatus === "Cancelled") &&
                data.bookingId && (
                  <div className="mt-4 flex justify-end">
                    <PaymentButton
                      bookingId={data.bookingId}
                      status={data.transactionStatus}
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
                    <p className="font-medium">{data.eventName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Booking ID</p>
                    <p className="font-medium">
                      {data.customerBookingId || "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Session Status</p>
                    <p className="font-medium">{data.bookingStatus || "--"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Session Date & Time</p>
                    <p className="font-medium">
                      {data.formattedEventStartTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{data.location || "--"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-medium">
                      {data.sessionDuration || "--"}
                    </p>
                  </div>
                </div>
              </div>
              {data.sessionNotes && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Session Notes</p>
                  <p className="text-sm bg-gray-50 p-2 rounded mt-1">
                    {data.sessionNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
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
          {paymentFetchError?.data?.message ||
            "Failed to load payment history."}
        </span>
      </div>
    );
  }

  // Empty state
  if (!isLoading && payments.length === 0) {
    return (
      <div className="text-center p-10 bg-white rounded-lg shadow-md">
        <BiInfoCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700">
          No Payment History
        </h3>
        <p className="text-gray-500">You haven't made any payments yet.</p>
      </div>
    );
  }

  // Status filter options
  const statusOptions = [
    { label: "All Statuses", value: "" },
    { label: "Completed", value: "Completed" },
    { label: "Pending", value: "Pending" },
    { label: "Failed", value: "Failed" },
    { label: "Refunded", value: "Refunded" },
    { label: "Cancelled", value: "Cancelled" },
    { label: "Not Initiated", value: "Not Initiated" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Billing & Payments</h1>
        <p className="mt-1 text-gray-600">
          View and manage your payment history and session details
        </p>
      </header>

      {/* Filters Section */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-grow">
            <div className="relative">
              <span className="p-input-icon-left w-full flex items-center">
                <BiSearch className="pi pi-search absolute left-3 text-gray-400 z-10" />
                <InputText
                  value={filters.search}
                  onChange={handleSearchChange}
                  placeholder="Search by payment ID, booking ID or event name"
                  className="w-full pl-10"
                />
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Dropdown
                value={filters.status}
                options={statusOptions}
                onChange={handleStatusChange}
                placeholder="Filter by Status"
                className="w-full md:w-auto bg-white border shadow-sm"
                panelClassName="bg-white shadow-lg border"
              />
            </div>

            <div className="ml-auto flex space-x-2">
              <Button
                icon={<BiFilterAlt />}
                onClick={clearFilters}
                className="p-button-outlined p-button-secondary"
                tooltip="Reset Filters"
                disabled={!filters.search && !filters.status}
              />

              <Button
                icon={<BiRefresh />}
                onClick={() => refetch()}
                className="p-button-outlined p-button-secondary"
                tooltip="Refresh Data"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4">
        <span className="text-gray-600">
          Showing{" "}
          <span className="font-medium">{getCurrentPageData().length}</span> of{" "}
          <span className="font-medium">{filteredPayments.length}</span>{" "}
          payments
        </span>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
        <DataTable
          value={getCurrentPageData()}
          expandedRows={expandedRows}
          onRowToggle={(e) => setExpandedRows(e.data)}
          rowExpansionTemplate={rowExpansionTemplate}
          dataKey="_id"
          stripedRows
          responsiveLayout="scroll"
          emptyMessage="No payment records found."
          className="p-datatable-sm"
        >
          <Column
            expander
            style={{ width: "3em" }}
            body={(data) => (
              <button className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none">
                {expandedRows && expandedRows[data._id] ? (
                  <BiChevronUp size={18} />
                ) : (
                  <BiChevronDown size={18} />
                )}
              </button>
            )}
          />
          <Column
            field="transactionReferenceNumber"
            header="Payment ID"
            sortable
            style={{ minWidth: "12rem" }}
            headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
            bodyClassName="px-4 py-3 text-sm text-gray-700"
          />
          <Column
            field="customerBookingId"
            header="Booking ID"
            sortable
            style={{ minWidth: "10rem" }}
            headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
            bodyClassName="px-4 py-3 text-sm text-gray-700"
          />
          <Column
            field="eventName"
            header="Event Name"
            sortable
            style={{ minWidth: "14rem" }}
            headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
            bodyClassName="px-4 py-3 text-sm text-gray-700"
          />
          <Column
            field="formattedEventStartTime"
            header="Booking Date/Time"
            sortable
            style={{ minWidth: "14rem" }}
            headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
            bodyClassName="px-4 py-3 text-sm text-gray-700"
          />
          <Column
            field="transactionStatusDisplay"
            header="Payment Status"
            body={statusBodyTemplate}
            sortable
            sortField="transactionStatus"
            style={{ minWidth: "12rem" }}
            headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
            bodyClassName="px-4 py-3 text-sm text-gray-700"
          />
          <Column
            field="amount"
            header="Amount (PKR)"
            body={amountBodyTemplate}
            sortable
            style={{ minWidth: "10rem" }}
            headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
            bodyClassName="px-4 py-3 text-sm text-gray-700"
          />
          <Column
            field="formattedPaymentCompletedDate"
            header="Paid On"
            sortable
            style={{ minWidth: "12rem" }}
            headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
            bodyClassName="px-4 py-3 text-sm text-gray-700"
          />
        </DataTable>
      </div>

      {/* Pagination */}
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
