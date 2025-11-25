import React from "react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { BiChevronUp, BiChevronDown, BiInfoCircle, BiX } from "react-icons/bi";
import BookingStatusBadge from "../../AdminDashboard/Bookings/BookingStatusBadge";
import PaymentStatusBadge from "./PaymentStatusBadge";

const UserBookingTable = ({
  bookings,
  expandedRows,
  setExpandedRows,
  clearFilters,
  anyFiltersActive,
  expandedRowTemplate,
}) => {
  // Ensure bookings is an array
  const bookingsArray = Array.isArray(bookings) ? bookings : [];

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

  // Format location for display
  const formatLocation = (locationData) => {
    if (!locationData) return "--";
    if (typeof locationData === "string") return locationData;

    if (typeof locationData === "object" && locationData.type) {
      if (locationData.type === "in-person") {
        return locationData.inPersonLocation || "In-Person";
      } else if (locationData.type === "online") {
        return "Online";
      }
      return locationData.type;
    }
    return "--";
  };

  // Calculate duration
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "--";
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end - start) / (60 * 1000));
    return `${durationMinutes} min`;
  };

  // Desktop booking ID template
  const bookingIdBodyTemplate = (rowData) => {
    return (
      <div className="py-3">
        <span className="font-medium text-gray-900 text-sm">
          {rowData.customerBookingId || rowData.bookingId || "--"}
        </span>
      </div>
    );
  };

  // Desktop date and time template
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

  // Desktop location template
  const locationBodyTemplate = (rowData) => {
    return (
      <div className="py-3">
        <span className="text-sm text-gray-700">
          {formatLocation(rowData.location)}
        </span>
      </div>
    );
  };

  // Desktop duration template
  const durationBodyTemplate = (rowData) => {
    return (
      <div className="py-3">
        <span className="text-sm text-gray-700">
          {calculateDuration(rowData.eventStartTime, rowData.eventEndTime)}
        </span>
      </div>
    );
  };

  // Desktop booking status template
  const bookingStatusBodyTemplate = (rowData) => {
    return (
      <div className="py-3">
        <BookingStatusBadge status={rowData.status} />
      </div>
    );
  };

  // Desktop payment status template
  const paymentStatusBodyTemplate = (rowData) => {
    return (
      <div className="py-3">
        <PaymentStatusBadge status={rowData.payment?.transactionStatus} />
      </div>
    );
  };

  if (bookingsArray.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <BiInfoCircle className="h-6 w-6 text-gray-400" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No past bookings found
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
          {anyFiltersActive
            ? "No bookings match your current search and filter criteria. Try adjusting your filters or search terms."
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
    <>
      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        {/* Table Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 min-w-[1000px]">
          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-1"></div>
            <div className="col-span-2">
              <span className="text-sm font-medium text-gray-700">
                Booking ID
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-sm font-medium text-gray-700">
                Date & Time
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-sm font-medium text-gray-700">
                Location
              </span>
            </div>
            <div className="col-span-1">
              <span className="text-sm font-medium text-gray-700">
                Duration
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-sm font-medium text-gray-700">
                Booking Status
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-sm font-medium text-gray-700">
                Payment Status
              </span>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200">
          {bookingsArray.map((booking) => {
            return (
              <div
                key={booking._id}
                className="transition-all duration-200 ease-out"
              >
                {/* Desktop Row */}
                <div
                  className={`grid grid-cols-12 gap-3 items-center px-6 hover:bg-gray-50 transition-colors duration-200 cursor-pointer min-w-[1000px] ${
                    expandedRows[booking._id] ? "bg-gray-50" : ""
                  }`}
                  onClick={() => onRowToggle(booking)}
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
                  <div className="col-span-2">
                    {bookingIdBodyTemplate(booking)}
                  </div>
                  <div className="col-span-2">
                    {dateTimeBodyTemplate(booking)}
                  </div>
                  <div className="col-span-2">
                    {locationBodyTemplate(booking)}
                  </div>
                  <div className="col-span-1">
                    {durationBodyTemplate(booking)}
                  </div>
                  <div className="col-span-2">
                    {bookingStatusBodyTemplate(booking)}
                  </div>
                  <div className="col-span-2">
                    {paymentStatusBodyTemplate(booking)}
                  </div>
                </div>

                {/* Expanded Row - Desktop */}
                {expandedRows[booking._id] && (
                  <div className="bg-gray-50 border-t border-gray-200">
                    <div className="px-6 py-2">
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-6 py-4">
                        {expandedRowTemplate && expandedRowTemplate(booking)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Cards - Visible only on mobile */}
      <div className="md:hidden space-y-4">
        {bookingsArray.map((booking) => {
          const timezone = "Asia/Karachi";
          const isExpanded = expandedRows[booking._id];

          return (
            <div
              key={booking._id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-200"
            >
              {/* Card Header - Always Visible */}
              <div
                className="px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onRowToggle(booking)}
              >
                {/* Booking ID and Expand Button */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      Booking ID:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {booking.customerBookingId || booking.bookingId || "--"}
                    </span>
                  </div>
                  <button className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    {isExpanded ? (
                      <BiChevronUp className="w-5 h-5" />
                    ) : (
                      <BiChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Date, Time, and Location */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 font-medium">Date:</span>
                    <span className="text-gray-900">
                      {booking.eventStartTime
                        ? formatInTimeZone(
                            new Date(booking.eventStartTime),
                            timezone,
                            "PP"
                          )
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 font-medium">Time:</span>
                    <span className="text-gray-900">
                      {booking.eventStartTime
                        ? formatInTimeZone(
                            new Date(booking.eventStartTime),
                            timezone,
                            "p"
                          )
                        : ""}{" "}
                      -{" "}
                      {booking.eventEndTime
                        ? formatInTimeZone(
                            new Date(booking.eventEndTime),
                            timezone,
                            "p"
                          )
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 font-medium">Location:</span>
                    <span className="text-gray-900">
                      {formatLocation(booking.location)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 font-medium">Duration:</span>
                    <span className="text-gray-900">
                      {calculateDuration(
                        booking.eventStartTime,
                        booking.eventEndTime
                      )}
                    </span>
                  </div>
                </div>

                {/* Status Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <BookingStatusBadge status={booking.status} />
                  <PaymentStatusBadge
                    status={booking.payment?.transactionStatus}
                  />
                </div>
              </div>

              {/* Expanded Content - Mobile */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                    {expandedRowTemplate && expandedRowTemplate(booking)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default UserBookingTable;
