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
import { renderIcon, getStatusDisplay } from "./billingUtils.jsx";

const BillingTable = ({
  paymentsData, // These are booking objects
  expandedRows,
  onRowToggle, // Function to toggle row expansion state in parent
  onRedirectToPayment, // Function to initiate payment
  payingBookingId, // ID of booking currently being paid
}) => {
  const statusBodyTemplate = (rowData) => {
    // rowData is a booking object.
    // Payment status is in rowData.payment.transactionStatus
    if (!rowData || !rowData.payment || !rowData.payment.transactionStatus) {
      return <span>--</span>;
    }

    // Import and use getStatusDisplay directly from billingUtils
    const { icon, text, color } = getStatusDisplay(
      rowData.payment.transactionStatus
    );

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

  const sourceBodyTemplate = (rowData) => {
    if (!rowData || !rowData.source) return <span>--</span>;

    let sourceLabel, sourceColor;
    switch (rowData.source) {
      case "calendly":
        sourceLabel = "Calendly";
        sourceColor = "text-blue-700 bg-blue-100";
        break;
      case "admin":
        sourceLabel = "Admin";
        sourceColor = "text-purple-700 bg-purple-100";
        break;
      case "system":
        sourceLabel = "Recurring";
        sourceColor = "text-orange-700 bg-orange-100";
        break;
      default:
        sourceLabel = rowData.source;
        sourceColor = "text-gray-600 bg-gray-100";
    }

    return (
      <span
        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sourceColor}`}
      >
        {sourceLabel}
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
          if (e.originalEvent.target.closest("button, a")) return;
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
          style={{ minWidth: "10rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
        <Column
          field="formattedEventStartTime" // This is pre-formatted
          header="Session Date/Time"
          sortField="eventStartTime" // Sort by actual date object if possible
          style={{ minWidth: "14rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
        <Column
          field="source"
          header="Source"
          body={sourceBodyTemplate}
          style={{ minWidth: "10rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
        <Column
          field="status" // This is booking.status
          header="Booking Status"
          body={bookingStatusBodyTemplate}
          style={{ minWidth: "12rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
        <Column
          // field="payment.transactionStatus" // Sort by actual payment transaction status
          header="Payment Status"
          body={statusBodyTemplate} // Uses rowData.transactionStatusDisplay
          sortField="payment.transactionStatus" // Correct sort field
          style={{ minWidth: "12rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
        <Column
          field="payment.amount" // Field for sorting
          header="Amount"
          body={amountBodyTemplate} // Custom body for formatting
          style={{ minWidth: "10rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
      </DataTable>
    </div>
  );
};

export default BillingTable;
