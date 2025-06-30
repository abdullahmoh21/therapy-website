import React, { useState } from "react";
import {
  FaSearch,
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaUsers,
} from "react-icons/fa";
import { BiPlus } from "react-icons/bi";

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
    <div className="bg-gradient-to-br from-white to-primaryColor/30 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col space-y-4 mb-6">
        <h2 className="text-xl font-bold text-headingColor">{title}</h2>
        <p className="text-sm text-textColor mt-1">{subtitle}</p>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-textColor" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={onSearchChange}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primaryColor focus:ring-1 focus:ring-primaryColor bg-white text-headingColor"
            />
          </div>

          {/* View Invited Users button */}
          <button
            onClick={onSwitchToInvitedUsers}
            className="flex items-center px-4 py-2 bg-white text-[#c45e3e] border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            <FaUsers className="mr-2" /> View Invited Users
          </button>

          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center px-4 py-2 bg-white text-primaryColor rounded-lg border border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              <FaFilter className="mr-2" />
              Filters
              {showFilterDropdown ? (
                <FaChevronUp className="ml-2" />
              ) : (
                <FaChevronDown className="ml-2" />
              )}
            </button>
            {showFilterDropdown && (
              <div className="absolute mt-2 right-0 w-72 bg-white rounded-lg shadow-lg border border-gray-300 z-10 p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-textColor mb-1">
                      Role
                    </label>
                    <select
                      value={filters.role}
                      onChange={(e) => onFilterChange("role", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 bg-white text-headingColor"
                    >
                      <option value="">All Roles</option>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {(filters.role !== "" || searchTerm !== "") && (
                    <button
                      onClick={clearFilters}
                      className="w-full mt-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Invite User Button - ensure this calls onInviteUser */}
          <button
            onClick={onInviteUser}
            className="flex items-center px-4 py-2 bg-[#DF9E7A] text-white rounded-lg hover:bg-[#c45e3e] transition-colors"
          >
            <BiPlus className="mr-2" /> Invite User
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserFilters;
