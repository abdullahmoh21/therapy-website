import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { format } from "date-fns";
import {
  BiChevronUp,
  BiChevronDown,
  BiTrash,
  BiInfoCircle,
  BiX,
} from "react-icons/bi";
import ExpandedBookings from "./ExpandedBookings";
import BookingStatusBadge from "./BookingStatusBadge";

const BookingTable = ({
  bookings,
  pagination,
  expandedRows,
  setExpandedRows,
  onDeleteClick,
  clearFilters,
  anyFiltersActive,
}) => {
  // Handle row toggle for expanding/collapsing rows
  const onRowToggle = (data) => {
    // If the row is already expanded, collapse it, otherwise expand it
    if (data && data._id) {
      setExpandedRows((prev) => {
        const newState = { ...prev };
        // Toggle the expanded state for this row
        if (newState[data._id]) {
          delete newState[data._id];
        } else {
          newState[data._id] = true;
        }
        return newState;
      });
    } else {
      // Otherwise data is the entire expanded rows object
      setExpandedRows(data);
    }
  };

  // Template for the expanded row content
  const rowExpansionTemplate = (data) => {
    return <ExpandedBookings data={data} onDeleteClick={onDeleteClick} />;
  };

  // Client name column template
  const clientBodyTemplate = (rowData) => {
    return (
      <div>
        <div className="font-medium">
          {rowData.userId?.name || "Unknown User"}
        </div>
        {rowData.userId?.email && (
          <div className="text-xs text-gray-500">{rowData.userId.email}</div>
        )}
      </div>
    );
  };

  // Status column template
  const statusBodyTemplate = (rowData) => {
    return <BookingStatusBadge status={rowData.status} />;
  };

  // Date and time template
  const dateTimeBodyTemplate = (rowData) => {
    return (
      <div>
        <div className="font-medium">
          {rowData.eventStartTime
            ? format(new Date(rowData.eventStartTime), "PP")
            : "N/A"}
        </div>
        <div className="text-xs text-gray-500">
          {rowData.eventStartTime
            ? format(new Date(rowData.eventStartTime), "p")
            : ""}{" "}
          -{" "}
          {rowData.eventEndTime
            ? format(new Date(rowData.eventEndTime), "p")
            : ""}
        </div>
      </div>
    );
  };

  // Actions template - only delete button
  const actionsBodyTemplate = (rowData) => {
    return (
      <div className="flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(rowData);
          }}
          className="text-red-600 hover:text-red-800 transition-colors p-2 rounded-full hover:bg-red-50"
          title="Delete booking"
        >
          <BiTrash className="w-5 h-5" />
        </button>
      </div>
    );
  };

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
        <BiInfoCircle className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-medium text-gray-800">
          No bookings found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No bookings match your current search and filter criteria.
        </p>
        {anyFiltersActive && (
          <button
            onClick={clearFilters}
            className="mt-6 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <BiX className="mr-2 inline-block" />
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <DataTable
        value={bookings}
        expandedRows={expandedRows}
        onRowToggle={(e) => setExpandedRows(e.data)}
        rowExpansionTemplate={rowExpansionTemplate}
        dataKey="_id"
        stripedRows
        className="p-datatable-sm"
        emptyMessage="No bookings found."
        onRowClick={(e) => {
          // Allow clicking row to expand or collapse
          if (e.originalEvent.target.closest("button, a")) return; // Don't toggle if click was on a button/link

          // Toggle the expanded state
          onRowToggle(e.data);
        }}
        rowClassName={(data) => {
          return `cursor-pointer ${
            expandedRows[data._id] ? "bg-gray-50" : "hover:bg-gray-50"
          }`;
        }}
      >
        <Column
          expander={(rowData) => (
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
          header="Client"
          body={clientBodyTemplate}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3"
          style={{ minWidth: "200px" }}
        />
        <Column
          field="status"
          header="Booking Status"
          body={statusBodyTemplate}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3"
          style={{ minWidth: "140px" }}
        />
        <Column
          header="Date & Time"
          body={dateTimeBodyTemplate}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3"
          style={{ minWidth: "200px" }}
        />
        <Column
          header="Actions"
          body={actionsBodyTemplate}
          headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
          bodyClassName="px-4 py-3"
          style={{ width: "80px" }}
        />
      </DataTable>
    </div>
  );
};

export default BookingTable;
