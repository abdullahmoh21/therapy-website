import React, { useState } from "react";
import {
  BiSearch,
  BiFilterAlt,
  BiChevronDown,
  BiChevronUp,
  BiTime,
  BiX,
} from "react-icons/bi";

const BookingFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  showPastBookings,
  togglePastBookings,
  clearFilters,
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const datePresetOptions = [
    { label: "-", value: "" },
    { label: "Today", value: "today" },
    { label: "Tomorrow", value: "tomorrow" },
    { label: "This Week", value: "thisWeek" },
    { label: "This Month", value: "thisMonth" },
    { label: "Next Month", value: "nextMonth" },
    { label: "Last Month", value: "lastMonth" },
  ];

  const statusOptions = [
    { label: "All Statuses", value: "" },
    { label: "Active", value: "Active" },
    { label: "Completed", value: "Completed" },
    { label: "Cancelled", value: "Cancelled" },
  ];

  const locationOptions = [
    { label: "All Locations", value: "" },
    { label: "Online", value: "online" },
    { label: "In-Person", value: "in-person" },
  ];

  const handleFilterChange = (filterType, value) => {
    onFilterChange(filterType, value);
  };

  const anyFiltersActive =
    filters.status ||
    filters.datePreset ||
    filters.paymentOverdue ||
    filters.location ||
    showPastBookings ||
    searchTerm;

  return (
    <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-grow">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <BiSearch className="text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search client..."
              value={searchTerm}
              onChange={onSearchChange}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] bg-white text-gray-800"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={togglePastBookings}
            className={`flex items-center px-4 py-2 rounded-lg border transition-all duration-200 ${
              showPastBookings
                ? "bg-white border-gray-300 text-gray-600"
                : "bg-[#FDF0E9] border-[#DF9E7A]/20 text-[#c45e3e]"
            }`}
            title={
              showPastBookings ? "Hide past bookings" : "Show past bookings"
            }
          >
            <BiTime className="mr-2" />
            {showPastBookings ? "Hide Past Booking" : "Show Past Booking"}
          </button>

          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center px-4 py-2 bg-white text-[#c45e3e] rounded-lg border border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              <BiFilterAlt className="mr-2" />
              Filters
              {showFilterDropdown ? (
                <BiChevronUp className="ml-2" />
              ) : (
                <BiChevronDown className="ml-2" />
              )}
            </button>
            {showFilterDropdown && (
              <div className="absolute mt-2 right-0 w-80 bg-white rounded-lg shadow-lg border border-gray-300 z-10 p-4">
                <div className="space-y-4">
                  {/* Date Preset Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Date Range
                    </label>
                    <select
                      value={filters.datePreset}
                      onChange={(e) =>
                        handleFilterChange("datePreset", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-800"
                    >
                      {datePresetOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        handleFilterChange("status", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-800"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Location
                    </label>
                    <select
                      value={filters.location}
                      onChange={(e) =>
                        handleFilterChange("location", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-800"
                    >
                      {locationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Overdue Filter */}
                  <div className="flex items-center">
                    <input
                      id="paymentOverdue"
                      type="checkbox"
                      checked={filters.paymentOverdue}
                      onChange={(e) =>
                        handleFilterChange("paymentOverdue", e.target.checked)
                      }
                      className="mr-2"
                    />
                    <label
                      htmlFor="paymentOverdue"
                      className="text-sm font-medium text-gray-600"
                    >
                      Payment Overdue
                    </label>
                  </div>

                  {/* Clear Filters Button */}
                  {anyFiltersActive && (
                    <button
                      onClick={clearFilters}
                      className="w-full mt-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                    >
                      <BiX className="mr-2 inline-block" />
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingFilters;
