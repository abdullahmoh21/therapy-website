import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import {
  BiChevronDown,
  BiChevronUp,
  BiCheckCircle,
  BiXCircle,
  BiInfoCircle,
} from "react-icons/bi";
import ExpandedRowContent from "./ExpandedRowContent";
import { renderIcon } from "./billingUtils.jsx"; // Assuming renderIcon is for payment status

const BillingTable = ({
  paymentsData, // These are booking objects
  expandedRows,
  onRowToggle, // Function to toggle row expansion state in parent
  onRedirectToPayment, // Function to initiate payment
  payingBookingId, // ID of booking currently being paid
}) => {
  const statusBodyTemplate = (rowData) => {
    // rowData is a booking object.
    // transactionStatusDisplay is on rowData, derived from rowData.payment.transactionStatus
    if (!rowData || !rowData.transactionStatusDisplay) {
      // Fallback if payment object or status is missing
      if (rowData.payment && rowData.payment.transactionStatus) {
        // This case should be handled by transformResponse, but as a safeguard:
        const { icon, text, color } = getStatusDisplay(
          rowData.payment.transactionStatus
        ); // You'd need getStatusDisplay here
        return (
          <span
            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}
          >
            {renderIcon(icon)}{" "}
            {/* Ensure renderIcon can handle the icon component directly */}
            <span className="ml-1">{text}</span>
          </span>
        );
      }
      return <span>--</span>;
    }
    const { icon, text, color } = rowData.transactionStatusDisplay;
    return (
      <span
        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}
      >
        {renderIcon(icon)}
        <span className="ml-1">{text}</span>
      </span>
    );
  };

  const bookingStatusBodyTemplate = (rowData) => {
    // rowData.status is the booking's own status
    if (!rowData || !rowData.status) return <span>--</span>;
    let statusColor, statusIcon;
    switch (rowData.status) {
      case "Active":
      case "active": // Handle potential case variations
        statusColor = "text-green-600 bg-green-100";
        statusIcon = <BiCheckCircle className="text-green-500 mr-1" />;
        break;
      case "Completed":
      case "completed":
        statusColor = "text-blue-600 bg-blue-100";
        statusIcon = <BiCheckCircle className="text-blue-500 mr-1" />;
        break;
      case "Cancelled":
      case "cancelled":
        statusColor = "text-red-600 bg-red-100";
        statusIcon = <BiXCircle className="text-red-500 mr-1" />;
        break;
      default:
        statusColor = "text-gray-600 bg-gray-100";
        statusIcon = <BiInfoCircle className="text-gray-500 mr-1" />;
    }
    return (
      <span
        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
      >
        {statusIcon}
        <span className="ml-1">{rowData.status}</span>
      </span>
    );
  };

  const rowExpansionTemplate = (data) => {
    // data here is a single booking object
    if (!data) return null;
    return (
      <ExpandedRowContent
        data={data} // Pass the whole booking object
        onRedirectToPayment={onRedirectToPayment}
        payingBookingId={payingBookingId}
      />
    );
  };

  // Helper for amount display, can be moved to utils
  const amountBodyTemplate = (rowData) => {
    const amount = rowData.payment?.amount;
    if (typeof amount !== "number") return <span>--</span>;
    return (
      <span className="text-gray-900 font-medium">
        {Number(amount).toLocaleString("en-PK", {
          style: "currency",
          currency: rowData.payment?.currency || "PKR", // Use currency from payment if available
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
      <DataTable
        value={paymentsData}
        expandedRows={expandedRows}
        onRowToggle={(e) => onRowToggle(e.data)} // Use passed handler
        rowExpansionTemplate={rowExpansionTemplate}
        dataKey="_id" // MongoDB _id of the booking
        stripedRows
        emptyMessage="No payment records found."
        className="p-datatable-sm"
        onRowClick={(e) => {
          // Allow clicking row to expand
          if (e.originalEvent.target.closest("button, a")) return; // Don't toggle if click was on a button/link
          onRowToggle(e.data);
        }}
        rowClassName="cursor-pointer hover:bg-gray-50"
      >
        <Column
          expander={(
            rowData // rowData is the booking object
          ) => (
            <div className="ml-1 flex items-center">
              {expandedRows && expandedRows[rowData._id] ? (
                <BiChevronUp className="text-gray-600" />
              ) : (
                <BiChevronDown className="text-gray-600" />
              )}
            </div>
          )}
          headerClassName="bg-gray-50 w-12"
          bodyClassName="pl-4"
        />
        <Column
          field="customerBookingId" // This is booking.bookingId (numeric) from transformResponse
          header="Booking ID"
          sortable
          style={{ minWidth: "10rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
        <Column
          field="eventName" // Added eventName column
          header="Event Name"
          sortable
          style={{ minWidth: "14rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
          body={(rowData) => rowData.eventName || "--"}
        />
        <Column
          field="formattedEventStartTime" // This is pre-formatted
          header="Session Date/Time"
          sortable
          sortField="eventStartTime" // Sort by actual date object if possible
          style={{ minWidth: "14rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
        <Column
          field="status" // This is booking.status
          header="Booking Status"
          body={bookingStatusBodyTemplate}
          sortable
          style={{ minWidth: "12rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
        <Column
          // field="payment.transactionStatus" // Sort by actual payment transaction status
          header="Payment Status"
          body={statusBodyTemplate} // Uses rowData.transactionStatusDisplay
          sortable
          sortField="payment.transactionStatus" // Correct sort field
          style={{ minWidth: "12rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
        <Column
          field="payment.amount" // Field for sorting
          header="Amount"
          body={amountBodyTemplate} // Custom body for formatting
          sortable
          style={{ minWidth: "10rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
      </DataTable>
    </div>
  );
};

export default BillingTable;
