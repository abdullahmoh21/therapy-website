import React, { useState, useCallback } from "react";
import {
  BiInfoCircle,
  BiRefresh,
  BiPlus,
  BiX,
  BiCopy,
  BiLoaderAlt,
  BiErrorCircle,
} from "react-icons/bi";
import { toast } from "react-toastify";
import { ConfirmDialog } from "primereact/confirmdialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import Pagination from "../../../../components/pagination";
import debounce from "lodash/debounce";
import LoadingPage from "../../../../pages/LoadingPage";
import EditUserWarningModal from "./EditUserWarningModal";

// Import custom components
import UserFilters from "./UserFilters";
import UserTable from "./UserTable";
import InvitedUsers from "./InvitedUsers";

// Import the user RTK Query hooks
import {
  useGetAdminUsersQuery,
  useInviteUserMutation,
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
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    confirmEmail: "",
    role: "user",
  });
  const [invitationLink, setInvitationLink] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showAdminWarning, setShowAdminWarning] = useState(false);
  const [showInvitedUsers, setShowInvitedUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add the mutation hooks
  const [inviteUser] = useInviteUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [updateUser] = useUpdateUserMutation();

  // Additional state for edit warning modal
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);

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

  // Handle delete user - directly delete without showing confirmDialog
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

  // Handle edit user
  const handleEditClick = (user) => {
    setUserToEdit(user);
    setShowEditWarning(true);
  };

  // Handle edit confirmation
  const handleEditConfirm = () => {
    if (!userToEdit) return;

    setEditingUser(userToEdit);
    setNewUser({
      name: userToEdit.name,
      email: userToEdit.email,
      confirmEmail: userToEdit.email,
      role: userToEdit.role,
    });
    setShowCreateUser(true);
    setShowEditWarning(false);
  };

  // Validate email confirmation - updated to use current values
  const validateEmailMatch = (email, confirmEmail) => {
    // Use provided values or fallback to state
    const currentEmail = email || newUser.email;
    const currentConfirmEmail = confirmEmail || newUser.confirmEmail;

    // Only show error if both fields have content
    if (!currentEmail || !currentConfirmEmail) {
      setEmailError("");
      return true;
    }

    if (
      currentEmail.trim().toLowerCase() !==
      currentConfirmEmail.trim().toLowerCase()
    ) {
      setEmailError("Emails do not match");
      return false;
    }

    setEmailError("");
    return true;
  };

  const handleCreateOrUpdateUser = async (e) => {
    e.preventDefault();

    // For new invitations, validate email confirmation
    if (!editingUser && !validateEmailMatch()) {
      return;
    }

    // Check if this is a new admin invite
    if (!editingUser && newUser.role === "admin") {
      setShowAdminWarning(true);
      return;
    }

    await processUserSubmission();
  };

  // Separate function to process the actual submission
  const processUserSubmission = async () => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        // Create an object with only the fields that have been changed
        const updatedFields = {};
        if (newUser.name !== editingUser.name) {
          updatedFields.name = newUser.name;
        }
        if (newUser.email !== editingUser.email) {
          updatedFields.email = newUser.email;
        }
        if (newUser.role !== editingUser.role) {
          updatedFields.role = newUser.role;
        }

        // Only send the request if there are actually changes
        if (Object.keys(updatedFields).length > 0) {
          const result = await updateUser({
            userId: editingUser._id,
            ...updatedFields,
          }).unwrap();

          // Close modal before showing success toast
          setShowCreateUser(false);
          setEditingUser(null);
          toast.success(result?.message || "User updated successfully");
        } else {
          // No changes detected
          toast.warning("No changes detected");
          setShowCreateUser(false);
          setEditingUser(null);
        }
      } else {
        const response = await inviteUser({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        }).unwrap();

        // Handle already invited case
        if (response?.alreadyInvited) {
          toast.warning(response.message || "User has already been invited");
        } else {
          // Close the modal first
          setShowCreateUser(false);
          
          // Reset form state
          setNewUser({
            name: "",
            email: "",
            confirmEmail: "",
            role: "user",
          });
          setShowAdminWarning(false);
          
          // Then show success message and set link if needed
          toast.success("Invitation sent successfully");
          
          if (response.link) {
            // Reopen modal with just the invitation link
            setInvitationLink(response.link);
            setShowCreateUser(true);
          }
        }
      }
      refetch();
    } catch (err) {
      console.error("Error processing user:", err);
      toast.error(err.data?.message || "Failed to process user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle creating/inviting a new user
  const handleCreateUser = () => {
    setEditingUser(null);
    setNewUser({ name: "", email: "", confirmEmail: "", role: "user" });
    setInvitationLink("");
    setShowCreateUser(true);
    setEmailError("");
    setShowAdminWarning(false);
  };

  // Handle admin warning confirmation
  const handleAdminConfirm = () => {
    setShowAdminWarning(false);
    processUserSubmission();
  };

  // Handle admin warning cancellation
  const handleAdminCancel = () => {
    setShowAdminWarning(false);
  };

  // Copy invitation link to clipboard
  const copyInvitationLink = () => {
    navigator.clipboard.writeText(invitationLink);
    toast.success("Invitation link copied to clipboard!");
  };

  // Check if any filters are active
  const anyFiltersActive = filters.role || searchTerm;

  // Replace simple loading indicators with LoadingPage
  if (isLoading) {
    return <LoadingPage />;
  }

  // Create the common modal that will be accessible from both views
  const createUserModal = (
    <>
      {/* Create/Edit User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  {editingUser ? "Edit User" : "Invite New User"}
                </h2>
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setShowCreateUser(false);
                    setInvitationLink("");
                  }}
                >
                  <BiX size={24} />
                </button>
              </div>

              {showAdminWarning ? (
                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                  <div className="flex items-start">
                    <BiErrorCircle className="text-yellow-500 text-xl mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-gray-800 mb-2">
                        Admin Access Warning
                      </h4>
                      <p className="text-gray-700 mb-4">
                        You're about to invite <strong>{newUser.email}</strong>{" "}
                        as an admin. Admins have full access to the system
                        including:
                      </p>
                      <ul className="list-disc pl-5 mb-6 text-gray-700 space-y-1">
                        <li>All user details and personal information</li>
                        <li>All booking data and history</li>
                        <li>All payment records and financial data</li>
                        <li>System settings and configurations</li>
                      </ul>
                      <p className="text-gray-700 mb-6">
                        Are you sure you want to proceed with this admin
                        invitation?
                      </p>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={handleAdminCancel}
                          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAdminConfirm}
                          className="px-4 py-2 text-white bg-yellow-500 rounded-md hover:bg-yellow-600"
                        >
                          Yes, Invite as Admin
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : invitationLink ? (
                <div>
                  <div className="p-4 bg-gray-50 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-medium text-gray-700">
                        Invitation Link
                      </label>
                      <button
                        type="button"
                        onClick={copyInvitationLink}
                        className="text-[#c45e3e] hover:text-[#DF9E7A] flex items-center text-sm"
                      >
                        <BiCopy className="mr-1" /> Copy
                      </button>
                    </div>
                    <div className="text-sm text-gray-600 break-all bg-white p-3 rounded border border-gray-200">
                      {invitationLink}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      The user has already been emailed with an invitation. You
                      can also share this link manually if needed.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      className="px-4 py-2 bg-[#DF9E7A] text-white rounded-md hover:bg-[#c45e3e] transition-colors"
                      onClick={() => {
                        setShowCreateUser(false);
                        setInvitationLink("");
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (isSubmitting) return; // Prevent multiple submissions
                  handleCreateOrUpdateUser(e);
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <InputText
                        value={newUser.name}
                        onChange={(e) =>
                          setNewUser({ ...newUser, name: e.target.value })
                        }
                        placeholder="Enter user's name"
                        className="w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <InputText
                        type="email"
                        value={newUser.email}
                        onChange={(e) => {
                          const newEmail = e.target.value;
                          setNewUser({ ...newUser, email: newEmail });
                          // Pass current values to validation to avoid stale state
                          validateEmailMatch(newEmail, newUser.confirmEmail);
                        }}
                        placeholder="Enter user's email"
                        className="w-full"
                        required
                      />
                    </div>

                    {!editingUser && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm Email
                        </label>
                        <InputText
                          type="email"
                          value={newUser.confirmEmail}
                          onChange={(e) => {
                            const newConfirmEmail = e.target.value;
                            setNewUser({
                              ...newUser,
                              confirmEmail: newConfirmEmail,
                            });
                            // Pass current values to validation to avoid stale state
                            validateEmailMatch(newUser.email, newConfirmEmail);
                          }}
                          placeholder="Confirm email address"
                          className={`w-full ${emailError ? "p-invalid" : ""}`}
                          required
                        />
                        {emailError && (
                          <small className="text-red-600">{emailError}</small>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <Dropdown
                        value={newUser.role}
                        options={[
                          { label: "User", value: "user" },
                          { label: "Admin", value: "admin" },
                        ]}
                        onChange={(e) =>
                          setNewUser({ ...newUser, role: e.value })
                        }
                        placeholder="Select a role"
                        className="w-full shadow-sm hover:bg-gray-50 transition-colors"
                        style={{ boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}
                      />
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                      <button
                        type="button"
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        onClick={() => {
                          setShowCreateUser(false);
                          setInvitationLink("");
                          setEmailError("");
                        }}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={`px-4 py-2 bg-[#DF9E7A] text-white rounded-md hover:bg-[#c45e3e] flex items-center ${
                          isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <BiLoaderAlt className="animate-spin mr-2" />{" "}
                            {editingUser ? "Updating..." : "Inviting..."}
                          </>
                        ) : (
                          <>{editingUser ? "Update User" : "Send Invitation"}</>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit User Warning Modal */}
      <EditUserWarningModal
        isOpen={showEditWarning}
        onClose={() => setShowEditWarning(false)}
        onConfirm={handleEditConfirm}
      />

      <ConfirmDialog />
    </>
  );

  // Render the InvitedUsers component when showInvitedUsers is true
  if (showInvitedUsers) {
    return (
      <>
        <InvitedUsers
          onSwitchToUsers={() => setShowInvitedUsers(false)}
          onInviteUser={handleCreateUser}
        />
        {createUserModal}
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

      {createUserModal}
    </div>
  );
};

export default AdminUsers;
