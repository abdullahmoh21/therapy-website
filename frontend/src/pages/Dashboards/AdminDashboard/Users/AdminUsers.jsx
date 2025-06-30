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

// Import the user RTK Query hooks
import {
  useGetAdminUsersQuery,
  useDeleteUserMutation,
  useUpdateUserMutation,
} from "../../../../features/admin/adminApiSlice";

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

  // State for user editing
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);

  // Add the mutation hooks
  const [deleteUser] = useDeleteUserMutation();
  const [updateUser] = useUpdateUserMutation();

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

  // Check if any filters are active
  const anyFiltersActive = filters.role || searchTerm;

  // Replace simple loading indicators with LoadingPage
  if (isLoading) {
    return <LoadingPage />;
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

      <ConfirmDialog />
    </div>
  );
};

export default AdminUsers;
