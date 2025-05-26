import React, { useState, useCallback } from "react";
import {
  FaExclamationCircle,
  FaTimes,
  FaSearch,
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaTrash,
  FaSpinner,
  FaUsers,
  FaSync,
  FaExclamationTriangle,
  FaEnvelope,
} from "react-icons/fa";
import Pagination from "../../../../components/pagination";
import ConfirmationModal from "../../../../components/confirmationModal";
import { toast } from "react-toastify";
import { debounce } from "lodash/debounce";

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

const InvitedUsers = ({ onSwitchToUsers }) => {
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

      // Close the modal after a delay
      setTimeout(() => {
        setShowDeleteModal(false);
        setInvitationToDelete(null);
      }, 500);

      refetch();
    } catch (err) {
      console.error("Error deleting invitation:", err);

      // Special case: If it's a parsing error but status is 200, it was actually successful
      if (err?.status === "PARSING_ERROR" && err?.originalStatus === 200) {
        showSuccessToast("Invitation deleted successfully");
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Error handling */}
      {isError && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm mb-4"
          role="alert"
        >
          <div className="flex items-center">
            <FaExclamationCircle className="mr-2" />
            <strong className="font-bold">Error!</strong>
            <span className="ml-2">
              {error?.data?.message || "Failed to fetch invitations"}
            </span>
          </div>
        </div>
      )}

      {/* Controls and Table Container */}
      <div className="bg-gradient-to-br from-white to-primaryColor/30 rounded-lg shadow-sm p-6 mb-6">
        {/* Header and Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-headingColor">
              Invited Users
            </h2>
            <p className="text-sm text-textColor mt-1">
              Manage pending invitations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-textColor" />
              </div>
              <input
                type="text"
                placeholder="Search invitations..."
                value={filters.search}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primaryColor focus:ring-1 focus:ring-primaryColor bg-white text-headingColor"
              />
            </div>

            {/* Switch to Users button */}
            <button
              onClick={onSwitchToUsers}
              className="flex items-center px-4 py-2 bg-white text-primaryColor border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200"
            >
              <FaUsers className="mr-2" /> Active Users
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
                        onChange={handleRoleChange}
                        className="w-full rounded-lg border border-gray-300 py-2 px-3 bg-white text-headingColor"
                      >
                        <option value="">All Roles</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {filters.role !== "" || filters.search !== "" ? (
                      <button
                        onClick={clearFilters}
                        className="w-full mt-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                      >
                        Clear all filters
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invitations Table */}
        <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryColor mx-auto"></div>
              <p className="mt-4 text-textColor">Loading invitations...</p>
            </div>
          ) : data?.invitations && data.invitations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textColor uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textColor uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textColor uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textColor uppercase tracking-wider">
                      Invited On
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textColor uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textColor uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.invitations.map((invitation) => {
                    const expiryStatus = getExpiryStatus(invitation.expiresAt);
                    return (
                      <tr
                        key={invitation._id}
                        onClick={() => handleRowClick(invitation)}
                        className="group hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-headingColor group-hover:text-primaryColor">
                            {invitation.name || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-textColor">
                            {invitation.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              invitation.role === "admin"
                                ? "bg-purpleColor/20 text-purpleColor"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {invitation.role || "user"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-textColor">
                            {new Date(
                              invitation.createdAt
                            ).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${expiryStatus.class}`}
                          >
                            {expiryStatus.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={(e) =>
                                handleResendConfirmation(invitation._id, e)
                              }
                              disabled={isResendLoading}
                              className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
                            >
                              {isResendLoading &&
                              invitationToResend === invitation._id ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaSync title="Resend invitation" />
                              )}
                            </button>
                            <button
                              onClick={(e) =>
                                handleDeleteConfirmation(invitation._id, e)
                              }
                              disabled={isDeleteLoading}
                              className="text-red-500 hover:text-red-700 disabled:opacity-50"
                            >
                              {isDeleteLoading &&
                              invitationToDelete === invitation._id ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaTrash title="Delete invitation" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-textColor">
                No pending invitations match the selected filters.
              </p>
              {(filters.role !== "" || filters.search !== "") && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-primaryColor hover:text-primaryColor/80"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-8 border shadow-xl rounded-xl bg-white animate-scale-in w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-headingColor">
                <span className="bg-gradient-to-r from-primaryColor to-irisBlueColor bg-clip-text text-transparent">
                  Invitation Details
                </span>
              </h3>
              <button
                onClick={() => {
                  setShowExpandedView(false);
                  setSelectedInvitation(null);
                }}
                className="p-2 rounded-full hover:bg-gray-100 text-textColor transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              {/* Invitation information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Name
                  </label>
                  <p className="text-headingColor font-medium">
                    {selectedInvitation.name || "Not provided"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Role
                  </label>
                  <span
                    className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedInvitation.role === "admin"
                        ? "bg-purpleColor/20 text-purpleColor"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {selectedInvitation.role || "user"}
                  </span>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Email
                  </label>
                  <p className="text-headingColor break-all">
                    {selectedInvitation.email}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Invitation Sent
                  </label>
                  <p className="text-headingColor">
                    {formatDate(selectedInvitation.createdAt)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Expires
                  </label>
                  <p className="text-headingColor">
                    {formatDate(selectedInvitation.expiresAt)}
                  </p>
                </div>

                {selectedInvitation.token && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Invitation Token
                    </label>
                    <p className="text-xs bg-gray-50 p-2 rounded border border-gray-200 font-mono overflow-x-auto whitespace-nowrap">
                      {selectedInvitation.token}
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={() => {
                    setShowExpandedView(false);
                    handleResendConfirmation(selectedInvitation._id);
                  }}
                  disabled={isResendLoading}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isResendLoading ? (
                    <FaSpinner className="animate-spin mr-2" />
                  ) : (
                    <FaEnvelope className="mr-2" />
                  )}
                  Resend Invitation
                </button>
                <button
                  onClick={() => {
                    setShowExpandedView(false);
                    handleDeleteConfirmation(selectedInvitation._id);
                  }}
                  disabled={isDeleteLoading}
                  className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {isDeleteLoading ? (
                    <FaSpinner className="animate-spin mr-2" />
                  ) : (
                    <FaTrash className="mr-2" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitedUsers;
