import React, { useState, useCallback } from "react";
import { BiInfoCircle, BiRefresh } from "react-icons/bi";
import { toast } from "react-toastify";
import { ConfirmDialog } from "primereact/confirmdialog";
import Pagination from "../../../../components/pagination";
import debounce from "lodash/debounce";
import LoadingPage from "../../../../pages/LoadingPage";
import EditUserWarningModal from "./EditUserWarningModal";

// Import custom components
import UserFilters from "./UserFilters";
import UserTable from "./UserTable";
import InvitedUsers from "./InvitedUsers";
import InviteUserPopup from "./InviteUserPopup";
import EditUserPopup from "./EditUserPopup"; // Import the EditUserPopup component
import SetRecurringPopup from "./SetRecurringPopup"; // Import the SetRecurringPopup component

// Import the user RTK Query hooks
import {
  useGetAdminUsersQuery,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useSetUserRecurringMutation,
  useStopUserRecurringMutation,
} from "../../../../features/admin";

// Pagination: users/page
const USERS_PER_PAGE = 10;

// Main AdminUsers component
const AdminUsers = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    role: "",
  });
  const [expandedRows, setExpandedRows] = useState({});
  const [showInviteUserPopup, setShowInviteUserPopup] = useState(false);
  const [showInvitedUsers, setShowInvitedUsers] = useState(false);

  // State for user editing and recurring
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [showRecurringPopup, setShowRecurringPopup] = useState(false);
  const [userForRecurring, setUserForRecurring] = useState(null);
  const [isProcessingRecurring, setIsProcessingRecurring] = useState(false);

  // Add the mutation hooks
  const [deleteUser] = useDeleteUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [setUserRecurring] = useSetUserRecurringMutation();
  const [stopUserRecurring] = useStopUserRecurringMutation();

  // Additional state for edit warning modal
  const [showEditWarning, setShowEditWarning] = useState(false);

  // Create a debounced search function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      setSearchTerm(searchValue);
      setCurrentPage(1); // Reset to first page when searching
    }, 500),
    []
  );

  // Handle search input change with debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value); // Update UI immediately
    debouncedSearch(value); // Debounce the actual API call
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      role: "",
    });
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Create query params object for API
  const queryParams = {
    page: currentPage,
    limit: USERS_PER_PAGE,
    search: searchTerm,
    role: filters.role,
  };

  // Use the RTK Query hook to fetch users
  const {
    data = {
      users: [],
      pagination: { totalUsers: 0, currentPage: 1, totalPages: 1 },
    },
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAdminUsersQuery(queryParams);

  // Extract users & pagination from the response
  const users = data?.users || [];
  const pagination = data?.pagination || {
    totalUsers: 0,
    currentPage: 1,
    totalPages: 1,
  };

  // Pagination handler
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Handle delete user
  const handleDeleteClick = async (user) => {
    try {
      const result = await deleteUser(user._id).unwrap();
      toast.success(result?.message || "User deleted successfully");
      refetch();
    } catch (err) {
      console.error("Error deleting user:", err);
      if (err?.status === "PARSING_ERROR" && err?.originalStatus === 200) {
        toast.success("User deleted successfully");
        refetch();
      } else {
        toast.error(err?.data?.message || "Failed to delete user");
      }
    }
  };

  // Handle edit user - Open the warning modal first
  const handleEditClick = (user) => {
    setUserToEdit(user);
    setShowEditWarning(true);
  };

  // Handle edit confirmation - After warning modal
  const handleEditConfirm = () => {
    setShowEditWarning(false);
    // Now open the actual edit popup with the user data
    setShowEditPopup(true);
  };

  // Handle creating/inviting a new user
  const handleCreateUser = () => {
    setShowInviteUserPopup(true);
  };

  // Handle user update success
  const handleUpdateSuccess = () => {
    refetch();
    setShowEditPopup(false);
    setUserToEdit(null);
  };

  // Handle setting user as recurring
  const handleSetRecurringClick = (user) => {
    setUserForRecurring(user);
    setShowRecurringPopup(true);
  };

  // Function to check if recurring option should be shown (hide for admins)
  const shouldShowRecurringOption = (user) => {
    return user.role !== "admin";
  };

  // Handle setting up recurring sessions
  const handleSetRecurringConfirm = async (recurringData) => {
    setIsProcessingRecurring(true);
    try {
      const result = await setUserRecurring({
        userId: recurringData.userId,
        ...recurringData,
      }).unwrap();

      toast.success("Recurring sessions scheduled successfully");
      refetch();
      setShowRecurringPopup(false);
    } catch (err) {
      console.error("Error setting up recurring sessions:", err);
      toast.error(
        err?.data?.error ||
          err?.data?.message ||
          "Failed to set up recurring sessions"
      );
    } finally {
      setIsProcessingRecurring(false);
    }
  };

  // Handle stopping recurring sessions
  const handleStopRecurring = async (user) => {
    try {
      // Extract userId from user object
      const userId = user._id;
      const result = await stopUserRecurring(userId).unwrap();

      toast.success("Recurring sessions stopped successfully");
      refetch();
    } catch (err) {
      console.error("Error stopping recurring sessions:", err);
      toast.error(
        err?.data?.error ||
          err?.data?.message ||
          "Failed to stop recurring sessions"
      );
    }
  };

  // Check if any filters are active
  const anyFiltersActive = filters.role || searchTerm;

  // Replace simple loading indicators with custom skeleton
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        {/* User Filters Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          {/* Header Section Skeleton */}
          <div className="mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded-lg mb-2 animate-pulse"></div>
            <div className="h-5 w-96 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>

          {/* Controls Section Skeleton */}
          <div className="space-y-4 lg:space-y-0 lg:flex lg:gap-4 lg:items-center">
            {/* Search Bar Skeleton */}
            <div className="flex-1">
              <div className="h-12 lg:h-10 w-full bg-gray-100 rounded-lg animate-pulse"></div>
            </div>

            {/* Filters and Buttons Skeleton */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center lg:flex-row">
              {/* Role Filter Skeleton */}
              <div className="h-12 lg:h-10 w-full sm:w-32 bg-gray-100 rounded-lg animate-pulse"></div>

              {/* Action Buttons Skeleton */}
              <div className="flex gap-3 flex-1 sm:flex-initial">
                <div className="h-12 lg:h-10 w-full sm:w-40 bg-gray-100 rounded-lg animate-pulse"></div>
                <div className="h-12 lg:h-10 w-full sm:w-32 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Information Skeleton */}
        <div className="mb-4">
          <div className="h-5 w-64 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>

        {/* Users Table Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header Skeleton - Desktop only */}
          <div className="hidden lg:block bg-gray-50 border-b border-gray-200 px-6 py-4">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-1">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="col-span-4">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="col-span-3">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="col-span-2">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="col-span-2 flex justify-center">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Table Body Skeleton */}
          <div className="divide-y divide-gray-200">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
              <div key={row}>
                {/* Desktop Row Skeleton */}
                <div className="hidden lg:grid grid-cols-12 gap-4 items-center px-6 py-4">
                  <div className="col-span-1 flex justify-center">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="col-span-4">
                    <div className="flex items-center py-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full mr-3 animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        {row % 3 === 0 && (
                          <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="py-3">
                      <div className="h-4 w-48 bg-gray-200 rounded mb-2 animate-pulse"></div>
                      <div className="h-3 w-32 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="py-3">
                      <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                      {row % 2 === 0 && (
                        <div className="h-3 w-24 bg-gray-100 rounded mt-2 animate-pulse"></div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-center gap-2 py-3">
                      <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
                      {row % 4 !== 0 && (
                        <div className="h-8 w-8 bg-gray-100 rounded-lg animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile Row Skeleton */}
                <div className="lg:hidden px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center flex-1">
                      <div className="h-10 w-10 bg-gray-200 rounded-full mr-3 animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="h-3 w-48 bg-gray-100 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                      {row % 3 === 0 && (
                        <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
                      {row % 4 !== 0 && (
                        <div className="h-8 w-8 bg-gray-100 rounded-lg animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Skeleton */}
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-10 bg-gray-100 rounded-lg animate-pulse"></div>
            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Render the InvitedUsers component when showInvitedUsers is true
  if (showInvitedUsers) {
    return (
      <>
        <InvitedUsers
          onSwitchToUsers={() => setShowInvitedUsers(false)}
          onInviteUser={handleCreateUser}
        />

        {/* Render InviteUserPopup */}
        <InviteUserPopup
          isOpen={showInviteUserPopup}
          onClose={() => setShowInviteUserPopup(false)}
          onSuccess={() => {
            refetch();
            setShowInviteUserPopup(false);
          }}
        />
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Error handling */}
      {isError && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <BiInfoCircle className="mr-2 flex-shrink-0" />
          <span>
            {error?.data?.message || error?.error || "Failed to fetch users"}
          </span>
          <button
            onClick={() => refetch()}
            className="ml-auto px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
          >
            <BiRefresh className="inline-block mr-1" /> Retry
          </button>
        </div>
      )}

      {/* User Filters */}
      <UserFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        clearFilters={clearFilters}
        onSwitchToInvitedUsers={() => setShowInvitedUsers(true)}
        onInviteUser={handleCreateUser}
        title="Active Users"
        subtitle="Manage and monitor all system users"
      />

      {/* Table Information */}
      <div className="mb-4">
        <span className="text-gray-600">
          Showing <span className="font-medium">{users.length}</span> of{" "}
          <span className="font-medium">{pagination.totalUsers}</span> users
        </span>
      </div>

      {/* Users Table */}
      <UserTable
        users={users}
        pagination={pagination}
        expandedRows={expandedRows}
        setExpandedRows={setExpandedRows}
        onDeleteClick={handleDeleteClick}
        onEditClick={handleEditClick}
        onSetRecurringClick={handleSetRecurringClick}
        shouldShowRecurringOption={shouldShowRecurringOption}
        onStopRecurring={handleStopRecurring}
        clearFilters={clearFilters}
        anyFiltersActive={anyFiltersActive}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && users.length > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Invite User Popup */}
      <InviteUserPopup
        isOpen={showInviteUserPopup}
        onClose={() => setShowInviteUserPopup(false)}
        onSuccess={() => {
          refetch();
          setShowInviteUserPopup(false);
        }}
      />

      {/* Edit User Popup */}
      <EditUserPopup
        isOpen={showEditPopup}
        onClose={() => setShowEditPopup(false)}
        editingUser={userToEdit}
        onSuccess={handleUpdateSuccess}
        updateUser={updateUser}
      />

      {/* Edit User Warning Modal */}
      <EditUserWarningModal
        isOpen={showEditWarning}
        onClose={() => setShowEditWarning(false)}
        onConfirm={handleEditConfirm}
      />

      {/* Set Recurring Popup */}
      <SetRecurringPopup
        isOpen={showRecurringPopup}
        onClose={() => {
          setShowRecurringPopup(false);
          setUserForRecurring(null);
        }}
        onConfirm={handleSetRecurringConfirm}
        isProcessing={isProcessingRecurring}
        selectedUser={userForRecurring}
      />

      <ConfirmDialog />
    </div>
  );
};

export default AdminUsers;
