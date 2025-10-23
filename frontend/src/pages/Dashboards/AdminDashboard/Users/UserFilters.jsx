import React, { useState } from "react";
import { BiSearch, BiX, BiPlus, BiUser } from "react-icons/bi";
import { HiOutlineUser, HiOutlineUserGroup } from "react-icons/hi";

const UserFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  clearFilters,
  onSwitchToInvitedUsers,
  onInviteUser,
  title,
  subtitle,
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{subtitle}</p>
      </div>

      {/* Controls Section */}
      <div className="space-y-4 lg:space-y-0 lg:flex lg:gap-4 lg:items-center">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <BiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={onSearchChange}
            className="w-full pl-10 pr-4 py-3 lg:py-2 border border-gray-200 rounded-lg focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200"
          />
        </div>

        {/* Mobile: Role Filter and Action Buttons in separate row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center lg:flex-row">
          {/* Role Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={filters.role}
              onChange={(e) => onFilterChange("role", e.target.value)}
              className="w-full sm:w-auto px-4 py-3 lg:py-2 border border-gray-200 rounded-lg focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200 min-w-[120px] text-base appearance-none bg-white"
              style={{ fontSize: "16px" }} // Prevents zoom on iOS
            >
              <option value="">All Roles</option>
              <option value="user">Users Only</option>
              <option value="admin">Admins Only</option>
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-1 sm:flex-initial">
            {/* View Invited Users */}
            <button
              onClick={onSwitchToInvitedUsers}
              className="flex items-center justify-center px-4 py-3 lg:py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all duration-200 flex-1 sm:flex-initial"
            >
              <HiOutlineUserGroup className="mr-2 text-lg lg:text-base" />
              <span className="text-sm lg:text-base">Invited Users</span>
            </button>

            {/* Invite New User */}
            <button
              onClick={onInviteUser}
              className="flex items-center justify-center px-4 py-3 lg:py-2 bg-[#DF9E7A] text-white rounded-lg hover:bg-[#DF9E7A]/90 transition-all duration-200 flex-1 sm:flex-initial"
            >
              <BiPlus className="mr-2 text-lg lg:text-base" />
              <span className="text-sm lg:text-base">Invite User</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.role !== "" || searchTerm !== "") && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                Active Filters:
              </span>
              <div className="flex gap-2">
                {searchTerm && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#DF9E7A]/10 text-[#DF9E7A] border border-[#DF9E7A]/20">
                    Search: "{searchTerm}"
                  </span>
                )}
                {filters.role && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    Role: {filters.role}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-1 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200 border border-red-200"
            >
              <BiX className="mr-1" />
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserFilters;
