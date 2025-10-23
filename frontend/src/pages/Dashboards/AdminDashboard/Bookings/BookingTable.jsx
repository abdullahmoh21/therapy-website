import React from "react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  BiChevronUp,
  BiChevronDown,
  BiTrash,
  BiInfoCircle,
  BiX,
  BiXCircle,
} from "react-icons/bi";
import { HiOutlineMail, HiOutlinePhone } from "react-icons/hi";
import ExpandedBookings from "./ExpandedBookings";
import BookingStatusBadge from "./BookingStatusBadge";
import BookingSourceBadge from "./BookingSourceBadge";

const BookingTable = ({
  bookings,
  pagination,
  expandedRows,
  setExpandedRows,
  onDeleteClick,
  onCancelClick,
  clearFilters,
  anyFiltersActive,
  deletingBookings = new Set(),
  cancellingBookings = new Set(),
  view = "future", // Add view prop with default
}) => {
  // Handle row toggle for expanding/collapsing rows
  const onRowToggle = (data) => {
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

  // Clean client name and avatar template
  const clientBodyTemplate = (rowData) => {
    // Display appropriate event name based on source
    const getEventName = (booking) => {
      if (booking.source === "calendly" && booking.calendly?.eventName) {
        return booking.calendly.eventName;
      } else if (booking.source === "system" && booking.recurring?.state) {
        return "Recurring Session";
      } else if (booking.source === "admin") {
        return "One-off Booking";
      } else {
        return booking.eventName || "Unnamed Event";
      }
    };

    return (
      <div className="flex items-center py-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-medium text-sm mr-3">
            {rowData.userId?.name
              ? rowData.userId.name.charAt(0).toUpperCase()
              : "?"}
          </div>
        </div>
        <div>
          <div className="font-medium text-gray-900 text-sm">
            {rowData.userId?.name || "Unknown User"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {getEventName(rowData)}
          </div>
        </div>
      </div>
    );
  };

  // Clean contact info template
  const contactBodyTemplate = (rowData) => {
    return (
      <div className="py-3">
        {rowData.userId?.email && (
          <div className="flex items-center mb-1">
            <HiOutlineMail className="text-gray-400 mr-2 text-sm flex-shrink-0" />
            <span
              className="text-gray-900 text-sm truncate"
              title={rowData.userId.email}
            >
              {rowData.userId.email}
            </span>
          </div>
        )}
        {rowData.userId?.phone && (
          <div className="flex items-center">
            <HiOutlinePhone className="text-gray-400 mr-2 text-sm flex-shrink-0" />
            <span className="text-sm text-gray-600 truncate">
              {rowData.userId.phone}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Clean date and time template
  const dateTimeBodyTemplate = (rowData) => {
    const timezone = "Asia/Karachi";

    return (
      <div className="py-3">
        <div className="font-medium text-gray-900 text-sm">
          {rowData.eventStartTime
            ? formatInTimeZone(new Date(rowData.eventStartTime), timezone, "PP")
            : "N/A"}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {rowData.eventStartTime
            ? formatInTimeZone(new Date(rowData.eventStartTime), timezone, "p")
            : ""}{" "}
          -{" "}
          {rowData.eventEndTime
            ? formatInTimeZone(new Date(rowData.eventEndTime), timezone, "p")
            : ""}
        </div>
      </div>
    );
  };

  // Clean status template
  const statusBodyTemplate = (rowData) => {
    return (
      <div className="py-3">
        <BookingStatusBadge status={rowData.status} />
      </div>
    );
  };

  // Clean source template
  const sourceBodyTemplate = (rowData) => {
    return (
      <div className="py-3">
        <BookingSourceBadge
          source={rowData.source}
          recurring={rowData.recurring}
        />
      </div>
    );
  };

  // Clean actions template
  const actionsBodyTemplate = (rowData) => {
    const isDeleting = deletingBookings.has(rowData._id);
    const isCancelling = cancellingBookings.has(rowData._id);
    const canCancel =
      ["admin", "system"].includes(rowData.source) &&
      rowData.status !== "Cancelled";

    return (
      <div className="flex items-center justify-center gap-2 py-3">
        {canCancel && onCancelClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isCancelling) {
                onCancelClick(rowData);
              }
            }}
            disabled={isCancelling}
            className={`p-2 rounded-lg border transition-all duration-200 ${
              isCancelling
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
            }`}
            title={isCancelling ? "Cancelling..." : "Cancel booking"}
          >
            <BiXCircle
              className={`w-4 h-4 ${isCancelling ? "animate-pulse" : ""}`}
            />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeleting) {
              onDeleteClick(rowData);
            }
          }}
          disabled={isDeleting}
          className={`p-2 rounded-lg border transition-all duration-200 ${
            isDeleting
              ? "border-gray-200 text-gray-400 cursor-not-allowed"
              : "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          }`}
          title={isDeleting ? "Deleting..." : "Delete booking"}
        >
          <BiTrash className={`w-4 h-4 ${isDeleting ? "animate-pulse" : ""}`} />
        </button>
      </div>
    );
  };

  if (bookings.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <BiInfoCircle className="h-6 w-6 text-gray-400" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No {view === "future" ? "upcoming" : "past"} bookings found
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
          {anyFiltersActive
            ? "No bookings match your current search and filter criteria. Try adjusting your filters or search terms."
            : view === "future"
            ? "No upcoming bookings scheduled. New bookings will appear here once created."
            : "No past bookings found. Completed bookings will appear here after they occur."}
        </p>
        {anyFiltersActive && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-4 py-2 bg-[#DF9E7A] text-white font-medium rounded-lg hover:bg-[#DF9E7A]/90 transition-all duration-200"
          >
            <BiX className="mr-2" />
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
      {/* Table Header - Hidden on mobile */}
      <div className="hidden lg:block bg-gray-50 border-b border-gray-200 px-6 py-4 min-w-[1000px]">
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-1"></div>
          <div className="col-span-2">
            <span className="text-sm font-medium text-gray-700">Client</span>
          </div>
          <div className="col-span-3">
            <span className="text-sm font-medium text-gray-700">Contact</span>
          </div>
          <div className="col-span-2">
            <span className="text-sm font-medium text-gray-700">
              Date & Time
            </span>
          </div>
          <div className="col-span-1">
            <span className="text-sm font-medium text-gray-700">Status</span>
          </div>
          <div className="col-span-2">
            <span className="text-sm font-medium text-gray-700">Source</span>
          </div>
          <div className="col-span-1 text-center">
            <span className="text-sm font-medium text-gray-700">Actions</span>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {bookings.map((booking) => {
          const isDeleting = deletingBookings.has(booking._id);

          return (
            <div
              key={booking._id}
              className={`${
                isDeleting
                  ? "booking-row-deleting pointer-events-none"
                  : "transition-all duration-200 ease-out"
              }`}
            >
              {/* Desktop Row */}
              <div
                className={`hidden lg:grid grid-cols-12 gap-3 items-center px-6 hover:bg-gray-50 transition-colors duration-200 cursor-pointer min-w-[1000px] ${
                  expandedRows[booking._id] ? "bg-gray-50" : ""
                }`}
                onClick={() => {
                  if (!isDeleting) {
                    onRowToggle(booking);
                  }
                }}
              >
                <div className="col-span-1 flex justify-center">
                  <button className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    {expandedRows[booking._id] ? (
                      <BiChevronUp className="w-4 h-4" />
                    ) : (
                      <BiChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="col-span-2">{clientBodyTemplate(booking)}</div>
                <div className="col-span-3">{contactBodyTemplate(booking)}</div>
                <div className="col-span-2">
                  {dateTimeBodyTemplate(booking)}
                </div>
                <div className="col-span-1">{statusBodyTemplate(booking)}</div>
                <div className="col-span-2">{sourceBodyTemplate(booking)}</div>
                <div
                  className="col-span-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actionsBodyTemplate(booking)}
                </div>
              </div>

              {/* Mobile Row */}
              <div
                className={`lg:hidden px-4 py-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer ${
                  expandedRows[booking._id] ? "bg-gray-50" : ""
                }`}
                onClick={() => {
                  if (!isDeleting) {
                    onRowToggle(booking);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center flex-1">
                    <div className="relative mr-3">
                      <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-medium text-sm">
                        {booking.userId?.name
                          ? booking.userId.name.charAt(0).toUpperCase()
                          : "?"}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {booking.userId?.name || "Unknown User"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {booking.userId?.email || "No email"}
                      </div>
                    </div>
                  </div>
                  <button className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    {expandedRows[booking._id] ? (
                      <BiChevronUp className="w-4 h-4" />
                    ) : (
                      <BiChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Date Badge */}
                    <span className="px-2 py-1 inline-flex items-center text-xs font-medium rounded-full border bg-white text-gray-700 border-gray-200">
                      {booking.eventStartTime
                        ? formatInTimeZone(
                            new Date(booking.eventStartTime),
                            "Asia/Karachi",
                            "MMM dd"
                          )
                        : "N/A"}
                    </span>

                    {/* Time Badge */}
                    {booking.eventStartTime && (
                      <span className="px-2 py-1 inline-flex items-center text-xs font-medium rounded-full border bg-gray-100 text-gray-600 border-gray-200">
                        {formatInTimeZone(
                          new Date(booking.eventStartTime),
                          "Asia/Karachi",
                          "h:mm a"
                        )}
                      </span>
                    )}

                    {/* Status Badge */}
                    <BookingStatusBadge status={booking.status} />

                    {/* Source Badge */}
                    <BookingSourceBadge
                      source={booking.source}
                      recurring={booking.recurring}
                    />
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actionsBodyTemplate(booking)}
                  </div>
                </div>
              </div>

              {/* Expanded Row */}
              {expandedRows[booking._id] && (
                <div className="bg-gray-50 border-t border-gray-200">
                  <ExpandedBookings
                    data={booking}
                    onDeleteClick={onDeleteClick}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BookingTable;
