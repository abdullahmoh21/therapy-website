import React, { useState, useCallback, useEffect } from "react";
import { ProgressSpinner } from "primereact/progressspinner";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectCurrentUserId } from "../../../../features/auth/authSlice";
import InvitedUsers from "./InvitedUsers";
import debounce from "lodash/debounce";

import {
  useGetAdminUsersQuery,
  useInviteUserMutation,
  useDeleteUserMutation,
  useUpdateUserMutation,
} from "../../../../features/admin/adminApiSlice";

import {
  BiSearch,
  BiFilterAlt,
  BiRefresh,
  BiUserCircle,
  BiPlus,
  BiEdit,
  BiTrash,
  BiLoaderAlt,
  BiInfoCircle,
  BiX,
  BiCheck,
  BiCopy,
  BiErrorCircle,
  BiChevronDown,
  BiChevronUp,
  BiChevronLeft,
  BiChevronRight,
} from "react-icons/bi";

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

const showWarningToast = (message) => {
  toast.warning(message, {
    position: "top-right",
    autoClose: 4000,
  });
};

const AdminUsers = () => {
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    confirmEmail: "",
    role: "user",
  });
  const [invitationLink, setInvitationLink] = useState("");
  const [filters, setFilters] = useState({ search: "", role: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showAdminWarning, setShowAdminWarning] = useState(false);
  const [showInvitedUsers, setShowInvitedUsers] = useState(false);

  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const USERS_PER_PAGE = 10;

  // Create a query params object for the API
  const queryParams = {
    page: currentPage,
    limit: USERS_PER_PAGE,
    search: filters.search,
    role: filters.role,
  };

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

  const [inviteUser] = useInviteUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [updateUser] = useUpdateUserMutation();

  const currentUserId = useSelector(selectCurrentUserId);

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

  const handleDeleteConfirmation = (user) => {
    confirmDialog({
      message: `Are you sure you want to delete the user "${user.name}"? This action cannot be undone.`,
      header: "Delete Confirmation",
      icon: <BiTrash className="text-red-500 mr-2" />,
      acceptClassName: "p-button-danger",
      accept: () => handleDeleteUser(user._id),
    });
  };

  const handleDeleteUser = async (userId) => {
    setIsDeleting(true);
    try {
      const result = await deleteUser(userId).unwrap();
      showSuccessToast(result?.message || "User deleted successfully");
      refetch();
    } catch (err) {
      console.error("Error deleting user:", err);
      // Special case: If it's a parsing error but status is 200, it was actually successful
      if (err?.status === "PARSING_ERROR" && err?.originalStatus === 200) {
        showSuccessToast("User deleted successfully");
        refetch();
      } else {
        showErrorToast(err?.data?.message || "Failed to delete user");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Validate email confirmation
  const validateEmailMatch = () => {
    // Compare trimmed values to avoid whitespace issues and make comparison case-insensitive
    if (
      newUser.email.trim().toLowerCase() !==
      newUser.confirmEmail.trim().toLowerCase()
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

          showSuccessToast(result?.message || "User updated successfully");

          // Close modal after delay
          setTimeout(() => {
            setShowCreateUser(false);
            setEditingUser(null);
          }, 1500);
        } else {
          // No changes detected
          showWarningToast("No changes detected");
          setTimeout(() => {
            setShowCreateUser(false);
            setEditingUser(null);
          }, 1500);
        }
      } else {
        const response = await inviteUser({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        }).unwrap();

        // Handle already invited case
        if (response?.alreadyInvited) {
          showWarningToast(response.message || "User has already been invited");
        } else {
          setInvitationLink(response.link);
          showSuccessToast("Invitation sent successfully");

          // Close modal automatically after 5 seconds if we have link
          if (response.link) {
            setTimeout(() => {
              setShowCreateUser(false);
              setInvitationLink("");
              setNewUser({
                name: "",
                email: "",
                confirmEmail: "",
                role: "user",
              });
              setShowAdminWarning(false);
            }, 5000);
          }
        }
      }
      refetch();
    } catch (err) {
      console.error("Error processing user:", err);
      showErrorToast(err.data?.message || "Failed to process user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInvitationLink = () => {
    navigator.clipboard.writeText(invitationLink);
    showSuccessToast("Invitation link copied to clipboard!");
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

  // Render the InvitedUsers component when showInvitedUsers is true
  if (showInvitedUsers) {
    return <InvitedUsers onSwitchToUsers={() => setShowInvitedUsers(false)} />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <ProgressSpinner
          style={{ width: "50px", height: "50px" }}
          strokeWidth="8"
          fill="var(--surface-ground)"
          animationDuration=".5s"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
        <p className="mt-2 text-gray-600">
          Manage and monitor all system users
        </p>
      </header>

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

      {/* Filters Section */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-grow">
            <div className="relative">
              <span className="p-input-icon-left w-full">
                <BiSearch className="pi pi-search" />
                <InputText
                  value={filters.search}
                  onChange={handleSearchChange}
                  placeholder="Search by name, email or phone"
                  className="w-full"
                />
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Dropdown
                value={filters.role}
                options={[
                  { label: "All Roles", value: "" },
                  { label: "User", value: "user" },
                  { label: "Admin", value: "admin" },
                ]}
                onChange={handleRoleChange}
                placeholder="Filter by Role"
                className="w-full md:w-auto"
              />
            </div>

            <button
              onClick={() => setShowInvitedUsers(true)}
              className="flex items-center px-4 py-2 bg-white text-[#c45e3e] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BiUserCircle className="mr-2" />
              Invited Users
            </button>

            <Button
              icon={<BiFilterAlt />}
              onClick={clearFilters}
              className="p-button-outlined p-button-secondary"
              tooltip="Reset Filters"
              disabled={!filters.search && !filters.role}
            />

            <Button
              icon={<BiRefresh />}
              onClick={() => refetch()}
              className="p-button-outlined p-button-secondary"
              tooltip="Refresh Data"
            />

            <Button
              label="Invite User"
              icon={<BiPlus />}
              onClick={handleCreateUser}
              className="p-button-outlined p-button-primary"
            />
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4">
        <span className="text-gray-600">
          Showing <span className="font-medium">{data.users?.length || 0}</span>{" "}
          of{" "}
          <span className="font-medium">
            {data.pagination?.totalUsers || 0}
          </span>{" "}
          users
        </span>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {data.users && data.users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Contact Information
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.users.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-gray-50 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 mr-3">
                          {user.name ? (
                            user.name.charAt(0).toUpperCase()
                          ) : (
                            <BiUserCircle />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Joined:{" "}
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                      {user.phone && (
                        <div className="text-sm text-gray-500">
                          {user.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.isActive ? (
                          <>
                            <BiCheck className="mr-1" /> Active
                          </>
                        ) : (
                          <>
                            <BiX className="mr-1" /> Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          icon={<BiEdit />}
                          className="p-button-text p-button-sm p-button-rounded p-button-info"
                          onClick={() => {
                            setEditingUser(user);
                            setNewUser({
                              name: user.name,
                              email: user.email,
                              confirmEmail: user.email,
                              role: user.role,
                            });
                            setShowCreateUser(true);
                          }}
                          disabled={isDeleting}
                        />
                        {user._id !== currentUserId && (
                          <Button
                            icon={<BiTrash />}
                            className="p-button-text p-button-sm p-button-rounded p-button-danger"
                            onClick={() => handleDeleteConfirmation(user)}
                            disabled={isDeleting}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <BiInfoCircle className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-800">
              No users found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No users match your current search and filter criteria.
            </p>
            {(filters.search || filters.role) && (
              <button
                onClick={clearFilters}
                className="mt-6 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <BiX className="mr-2 inline-block" />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data.pagination && data.pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-md ${
                currentPage === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-[#c45e3e] hover:bg-[#FDF0E9]"
              }`}
            >
              <BiChevronLeft size={20} />
            </button>

            {[...Array(data.pagination.totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => handlePageChange(i + 1)}
                className={`px-3 py-1 rounded-md ${
                  currentPage === i + 1
                    ? "bg-[#DF9E7A] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() =>
                handlePageChange(
                  Math.min(data.pagination.totalPages, currentPage + 1)
                )
              }
              disabled={currentPage === data.pagination.totalPages}
              className={`p-2 rounded-md ${
                currentPage === data.pagination.totalPages
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-[#c45e3e] hover:bg-[#FDF0E9]"
              }`}
            >
              <BiChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

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
                <form onSubmit={handleCreateOrUpdateUser}>
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
                          setNewUser({ ...newUser, email: e.target.value });
                          if (newUser.confirmEmail) validateEmailMatch();
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
                            setNewUser({
                              ...newUser,
                              confirmEmail: e.target.value,
                            });
                            if (newUser.email) validateEmailMatch();
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
                        className="w-full"
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
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#DF9E7A] text-white rounded-md hover:bg-[#c45e3e] flex items-center"
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

      <ConfirmDialog />
    </div>
  );
};

export default AdminUsers;
