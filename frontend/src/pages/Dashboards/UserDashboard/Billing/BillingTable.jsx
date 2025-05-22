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
import { renderIcon } from "./billingUtils.jsx";

const BillingTable = ({
  paymentsData,
  expandedRows,
  onRowToggle,
  onRedirectToPayment,
  payingBookingId,
}) => {
  const statusBodyTemplate = (rowData) => {
    // rowData is a processed booking object.
    // transactionStatusDisplay is now directly on rowData, derived from rowData.payment.transactionStatus
    if (!rowData || !rowData.transactionStatusDisplay) return null;
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
        statusColor = "text-green-600 bg-green-100";
        statusIcon = <BiCheckCircle className="text-green-500 mr-1" />;
        break;
      case "Completed":
        statusColor = "text-blue-600 bg-blue-100";
        statusIcon = <BiCheckCircle className="text-blue-500 mr-1" />;
        break;
      case "Cancelled":
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
    if (!data) return null;
    return (
      <ExpandedRowContent
        data={data}
        onRedirectToPayment={onRedirectToPayment}
        payingBookingId={payingBookingId}
      />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
      <DataTable
        value={paymentsData}
        expandedRows={expandedRows}
        onRowToggle={(e) => onRowToggle(e.data)}
        rowExpansionTemplate={rowExpansionTemplate}
        dataKey="_id"
        stripedRows
        emptyMessage="No payment records found."
        className="p-datatable-sm"
        onRowClick={(e) => onRowToggle(e.data)}
        rowClassName="cursor-pointer hover:bg-gray-50"
      >
        <Column
          expander={(data) => (
            <div className="ml-1 flex items-center">
              {expandedRows[data._id] ? (
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
          field="customerBookingId" // This is booking.bookingId (numeric)
          header="Booking ID"
          sortable
          style={{ minWidth: "10rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
        <Column
          field="formattedEventStartTime" // This is pre-formatted
          header="Session Date/Time"
          sortable
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
          field="payment.transactionStatus" // Sort by actual payment transaction status
          header="Payment Status"
          body={statusBodyTemplate} // Uses rowData.transactionStatusDisplay
          sortable
          style={{ minWidth: "12rem" }}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3 text-sm text-gray-700"
        />
      </DataTable>
    </div>
  );
};

export default BillingTable;
