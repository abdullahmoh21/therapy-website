import React, { useState, useCallback } from "react";
import {
  BiErrorCircle,
  BiX,
  BiSearch,
  BiFilter,
  BiChevronDown,
  BiChevronUp,
  BiTrash,
  BiPlus,
  BiSync,
  BiEnvelope,
  BiUser,
  BiShield,
  BiLoaderAlt,
} from "react-icons/bi";
import { HiOutlineMail, HiOutlineUser } from "react-icons/hi";
import Pagination from "../../../../components/pagination";
import ConfirmationModal from "../../../../components/confirmationModal";
import { toast } from "react-toastify";
import debounce from "lodash/debounce";

import {
  useGetInvitedUsersQuery,
  useDeleteInvitationMutation,
  useResendInvitationMutation,
} from "../../../../features/admin/adminApiSlice";

// Toast notification helper functions
const showSuccessToast = (message) => {
  toast.success(message, {
    position: "top-right",
    autoClose: 3000,
  });
};

const showErrorToast = (message) => {
  toast.error(message, {
    position: "top-right",
    autoClose: 5000,
  });
};

const InvitedUsers = ({ onSwitchToUsers, onInviteUser }) => {
  // State for filters and pagination
  const [filters, setFilters] = useState({ search: "", role: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for resend confirmation modal
  const [showResendModal, setShowResendModal] = useState(false);
  const [invitationToResend, setInvitationToResend] = useState(null);

  // State for expanded view modal
  const [showExpandedView, setShowExpandedView] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState(null);

  const INVITATIONS_PER_PAGE = 10;

  // Create a query params object for the API
  const queryParams = {
    page: currentPage,
    limit: INVITATIONS_PER_PAGE,
    search: filters.search,
    role: filters.role,
  };

  const {
    data = {
      invitations: [],
      totalInvitations: 0,
      page: 1,
      totalPages: 1,
    },
    isLoading,
    isError,
    error,
    refetch,
  } = useGetInvitedUsersQuery(queryParams);

  const [deleteInvitation, { isLoading: isDeleteLoading }] =
    useDeleteInvitationMutation();
  const [resendInvitation, { isLoading: isResendLoading }] =
    useResendInvitationMutation();

  // Create a debounced search function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      setFilters((prev) => ({ ...prev, search: searchValue }));
      setCurrentPage(1); // Reset to first page when searching
    }, 500), // 500ms delay
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    // Update the UI immediately
    setFilters((prev) => ({ ...prev, search: value }));
    // Debounce the actual API call
    debouncedSearch(value);
  };

  // Handle role filter change
  const handleRoleChange = (e) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, role: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ search: "", role: "" });
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle row click - show expanded view
  const handleRowClick = (invitation) => {
    setSelectedInvitation(invitation);
    setShowExpandedView(true);
  };

  // Delete invitation handlers
  const handleDeleteConfirmation = (invitationId, e) => {
    e?.stopPropagation(); // Prevent row click event
    setInvitationToDelete(invitationId);
    setShowDeleteModal(true);
  };

  const handleDeleteInvitation = async () => {
    if (!invitationToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteInvitation(invitationToDelete).unwrap();
      showSuccessToast(result?.message || "Invitation deleted successfully");

      // Close the modal
      setShowDeleteModal(false);
      setInvitationToDelete(null);
      refetch();
    } catch (err) {
      console.error("Error deleting invitation:", err);

      // Special case: If it's a parsing error but status is 200, it was actually successful
      if (err?.status === "PARSING_ERROR" && err?.originalStatus === 200) {
        showSuccessToast("Invitation deleted successfully");
        setShowDeleteModal(false);
        setInvitationToDelete(null);
        refetch();
      } else {
        showErrorToast(err?.data?.message || "Failed to delete invitation");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Resend invitation handlers
  const handleResendConfirmation = (inviteId, e) => {
    e?.stopPropagation(); // Prevent row click event
    setInvitationToResend(inviteId);
    setShowResendModal(true);
  };

  const handleResendInvitation = async () => {
    if (!invitationToResend) return;

    try {
      const result = await resendInvitation(invitationToResend).unwrap();
      showSuccessToast(result?.message || "Invitation resent successfully");
      setShowResendModal(false);
      setInvitationToResend(null);
      refetch();
    } catch (err) {
      console.error("Error resending invitation:", err);
      showErrorToast(err?.data?.message || "Failed to resend invitation");
    }
  };

  // Format date to a readable string
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate expiry status
  const getExpiryStatus = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      return { text: "Expired", class: "bg-red-100 text-red-800" };
    } else if (daysLeft <= 1) {
      return { text: "Expires today", class: "bg-orange-100 text-orange-800" };
    } else if (daysLeft <= 2) {
      return {
        text: `Expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`,
        class: "bg-yellow-100 text-yellow-800",
      };
    } else {
      return {
        text: `Valid for ${daysLeft} days`,
        class: "bg-green-100 text-green-800",
      };
    }
  };

  // Handle invite user click - use the provided prop function
  const handleInviteUser = () => {
    onInviteUser();
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Error handling */}
      {isError && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4"
          role="alert"
        >
          <div className="flex items-center">
            <BiErrorCircle className="mr-2" />
            <strong className="font-medium">Error!</strong>
            <span className="ml-2">
              {error?.data?.message || "Failed to fetch invitations"}
            </span>
          </div>
        </div>
      )}

      {/* Header and Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Invited Users
            </h2>
            <p className="text-gray-600">
              Manage pending invitations and track invitation status
            </p>
          </div>

          {/* Controls */}
          <div className="space-y-4 lg:space-y-0 lg:flex lg:gap-4 lg:items-center">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search invitations by name or email..."
                value={filters.search}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-3 lg:py-2 border border-gray-200 rounded-lg focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200"
              />
            </div>

            {/* Mobile: Filter and Action Buttons in separate row */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center lg:flex-row">
              {/* Filter Button with improved mobile styling */}
              <div className="relative w-full sm:w-auto">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="w-full sm:w-auto flex items-center justify-center px-4 py-3 lg:py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all duration-200"
                >
                  <BiFilter className="mr-2 text-lg lg:text-base" />
                  <span className="text-sm lg:text-base">Filters</span>
                  {showFilterDropdown ? (
                    <BiChevronUp className="ml-2 text-lg lg:text-base" />
                  ) : (
                    <BiChevronDown className="ml-2 text-lg lg:text-base" />
                  )}
                </button>
                {showFilterDropdown && (
                  <div className="absolute mt-2 right-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10 p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Filter by Role
                        </label>
                        <select
                          value={filters.role}
                          onChange={handleRoleChange}
                          className="w-full rounded-lg border border-gray-200 py-2 px-3 text-gray-700 focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-all duration-200 text-base appearance-none bg-white"
                          style={{ fontSize: "16px" }} // Prevents zoom on iOS
                        >
                          <option value="">All Roles</option>
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
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

                      {(filters.role !== "" || filters.search !== "") && (
                        <button
                          onClick={clearFilters}
                          className="w-full px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-200"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-1 sm:flex-initial">
                {/* Switch to Users button */}
                <button
                  onClick={onSwitchToUsers}
                  className="flex items-center justify-center px-4 py-3 lg:py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all duration-200 flex-1 sm:flex-initial"
                >
                  <HiOutlineUser className="mr-2 text-lg lg:text-base" />
                  <span className="text-sm lg:text-base">Active Users</span>
                </button>

                {/* Invite User Button */}
                <button
                  onClick={handleInviteUser}
                  className="flex items-center justify-center px-4 py-3 lg:py-2 bg-[#DF9E7A] text-white rounded-lg hover:bg-[#DF9E7A]/90 transition-all duration-200 flex-1 sm:flex-initial"
                >
                  <BiPlus className="mr-2 text-lg lg:text-base" />
                  <span className="text-sm lg:text-base">Invite User</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Information */}
      <div className="mb-4">
        <span className="text-gray-600 text-sm">
          Showing{" "}
          <span className="font-medium">{data?.invitations?.length || 0}</span>{" "}
          of <span className="font-medium">{data?.totalInvitations || 0}</span>{" "}
          invitations
        </span>
      </div>

      {/* Invitations Table */}
      <div>
        {isLoading ? (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-[#DF9E7A] rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">
              Loading invitations...
            </p>
          </div>
        ) : data?.invitations && data.invitations.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header - Hidden on mobile */}
            <div className="hidden lg:block bg-gray-50 border-b border-gray-200 px-6 py-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4">
                  <span className="text-sm font-medium text-gray-700">
                    User
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-sm font-medium text-gray-700">
                    Role
                  </span>
                </div>
                <div className="col-span-3">
                  <span className="text-sm font-medium text-gray-700">
                    Invited On
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-sm font-medium text-gray-700">
                    Status
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-sm font-medium text-gray-700">
                    Actions
                  </span>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {data.invitations.map((invitation) => {
                const expiryStatus = getExpiryStatus(invitation.expiresAt);
                return (
                  <div key={invitation._id}>
                    {/* Desktop Row */}
                    <div
                      onClick={() => handleRowClick(invitation)}
                      className="hidden lg:grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                    >
                      {/* User Info */}
                      <div className="col-span-4 flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-700 font-medium text-sm">
                            {(invitation.name || invitation.email || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invitation.name || "N/A"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invitation.email}
                          </div>
                        </div>
                      </div>

                      {/* Role */}
                      <div className="col-span-2">
                        <span
                          className={`px-3 py-1 inline-flex items-center text-sm font-medium rounded-full border ${
                            invitation.role === "admin"
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {invitation.role === "admin" ? (
                            <BiShield className="mr-1 text-xs" />
                          ) : (
                            <HiOutlineUser className="mr-1 text-xs" />
                          )}
                          {invitation.role || "user"}
                        </span>
                      </div>

                      {/* Invited On */}
                      <div className="col-span-3">
                        <div className="text-sm text-gray-900">
                          {new Date(invitation.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(invitation.createdAt).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            expiryStatus.text.includes("Expired")
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : expiryStatus.text.includes("today")
                              ? "bg-orange-50 text-orange-700 border border-orange-200"
                              : expiryStatus.text.includes("2 day")
                              ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                              : "bg-green-50 text-green-700 border border-green-200"
                          }`}
                        >
                          {expiryStatus.text}
                        </span>
                      </div>

                      {/* Actions */}
                      <div
                        className="col-span-1 flex items-center justify-center space-x-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) =>
                            handleResendConfirmation(invitation._id, e)
                          }
                          disabled={isResendLoading}
                          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
                          title="Resend invitation"
                        >
                          {isResendLoading &&
                          invitationToResend === invitation._id ? (
                            <BiLoaderAlt className="animate-spin w-4 h-4" />
                          ) : (
                            <BiSync className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={(e) =>
                            handleDeleteConfirmation(invitation._id, e)
                          }
                          disabled={isDeleteLoading}
                          className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 disabled:opacity-50"
                          title="Delete invitation"
                        >
                          {isDeleteLoading &&
                          invitationToDelete === invitation._id ? (
                            <BiLoaderAlt className="animate-spin w-4 h-4" />
                          ) : (
                            <BiTrash className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Mobile Row */}
                    <div
                      onClick={() => handleRowClick(invitation)}
                      className="lg:hidden px-4 py-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center flex-1">
                          <div className="relative mr-3">
                            <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-medium text-sm">
                              {(invitation.name || invitation.email || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {invitation.name || "N/A"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {invitation.email}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(invitation.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Role Badge */}
                          <span
                            className={`px-2 py-1 inline-flex items-center text-xs font-medium rounded-full border ${
                              invitation.role === "admin"
                                ? "bg-black text-white border-black"
                                : "bg-white text-gray-700 border-gray-200"
                            }`}
                          >
                            {invitation.role === "admin" ? (
                              <BiShield className="mr-1 text-xs" />
                            ) : (
                              <HiOutlineUser className="mr-1 text-xs" />
                            )}
                            {invitation.role || "user"}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              expiryStatus.text.includes("Expired")
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : expiryStatus.text.includes("today")
                                ? "bg-orange-50 text-orange-700 border border-orange-200"
                                : expiryStatus.text.includes("2 day")
                                ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                : "bg-green-50 text-green-700 border border-green-200"
                            }`}
                          >
                            {expiryStatus.text}
                          </span>
                        </div>

                        {/* Actions */}
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) =>
                              handleResendConfirmation(invitation._id, e)
                            }
                            disabled={isResendLoading}
                            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
                            title="Resend invitation"
                          >
                            {isResendLoading &&
                            invitationToResend === invitation._id ? (
                              <BiLoaderAlt className="animate-spin w-4 h-4" />
                            ) : (
                              <BiSync className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) =>
                              handleDeleteConfirmation(invitation._id, e)
                            }
                            disabled={isDeleteLoading}
                            className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 disabled:opacity-50"
                            title="Delete invitation"
                          >
                            {isDeleteLoading &&
                            invitationToDelete === invitation._id ? (
                              <BiLoaderAlt className="animate-spin w-4 h-4" />
                            ) : (
                              <BiTrash className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <div className="max-w-md mx-auto">
              <BiEnvelope className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Invitations Found
              </h3>
              <p className="text-gray-500 mb-4 text-sm">
                {filters.role !== "" || filters.search !== ""
                  ? "No pending invitations match your current filters."
                  : "No pending invitations at the moment. Start by inviting new users to join your platform!"}
              </p>
              {(filters.role !== "" || filters.search !== "") && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 bg-[#DF9E7A] text-white rounded-lg hover:bg-[#DF9E7A]/90 transition-all duration-200"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pagination - now using server-side pagination data */}
      {data?.totalPages > 1 && (
        <Pagination
          currentPage={data?.page || 1}
          totalPages={data?.totalPages || 1}
          onPageChange={handlePageChange}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteInvitation}
        title="Delete Invitation"
        message="Are you sure you want to delete this invitation? The user will no longer be able to register with this invitation link."
        confirmText={
          isDeleting ? (
            <FaSpinner className="animate-spin mx-auto" />
          ) : (
            "Delete Invitation"
          )
        }
        variant="danger"
      />

      {/* Resend Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResendModal}
        onClose={() => setShowResendModal(false)}
        onConfirm={handleResendInvitation}
        title="Resend Invitation"
        message="Are you sure you want to resend this invitation? The user will receive another email with a new invitation link, and the expiration date will be extended."
        confirmText={
          isResendLoading ? (
            <FaSpinner className="animate-spin mx-auto" />
          ) : (
            "Resend Invitation"
          )
        }
        variant="primary"
      />

      {/* Expanded View Modal */}
      {showExpandedView && selectedInvitation && (
        <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto bg-white rounded-lg shadow-lg w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Invitation Details
              </h3>
              <button
                onClick={() => {
                  setShowExpandedView(false);
                  setSelectedInvitation(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <BiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {/* Invitation information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Name
                    </label>
                    <p className="text-gray-900 font-medium">
                      {selectedInvitation.name || "Not provided"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Role
                    </label>
                    <span
                      className={`px-3 py-1 inline-flex items-center text-sm font-medium rounded-full border ${
                        selectedInvitation.role === "admin"
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-700 border-gray-200"
                      }`}
                    >
                      {selectedInvitation.role === "admin" ? (
                        <BiShield className="mr-1 text-xs" />
                      ) : (
                        <HiOutlineUser className="mr-1 text-xs" />
                      )}
                      {selectedInvitation.role || "user"}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 break-all">
                      {selectedInvitation.email}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Invitation Sent
                    </label>
                    <p className="text-gray-900">
                      {formatDate(selectedInvitation.createdAt)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Expires
                    </label>
                    <p className="text-gray-900">
                      {formatDate(selectedInvitation.expiresAt)}
                    </p>
                  </div>

                  {selectedInvitation.token && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Invitation Token
                      </label>
                      <p className="text-xs bg-gray-50 p-3 rounded-lg border border-gray-200 font-mono overflow-x-auto whitespace-nowrap">
                        {selectedInvitation.token}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex justify-end mt-6 space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowExpandedView(false);
                      handleResendConfirmation(selectedInvitation._id);
                    }}
                    disabled={isResendLoading}
                    className="flex items-center px-4 py-2 bg-[#DF9E7A] text-white rounded-lg hover:bg-[#DF9E7A]/90 disabled:opacity-50 transition-all duration-200"
                  >
                    {isResendLoading ? (
                      <BiLoaderAlt className="animate-spin mr-2" />
                    ) : (
                      <BiEnvelope className="mr-2" />
                    )}
                    Resend Invitation
                  </button>
                  <button
                    onClick={() => {
                      setShowExpandedView(false);
                      handleDeleteConfirmation(selectedInvitation._id);
                    }}
                    disabled={isDeleteLoading}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all duration-200"
                  >
                    {isDeleteLoading ? (
                      <BiLoaderAlt className="animate-spin mr-2" />
                    ) : (
                      <BiTrash className="mr-2" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitedUsers;
