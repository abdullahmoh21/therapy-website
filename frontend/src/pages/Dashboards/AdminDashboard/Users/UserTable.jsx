import React, { useState } from "react";
import {
  BiChevronUp,
  BiChevronDown,
  BiTrash,
  BiEdit,
  BiInfoCircle,
  BiX,
  BiCalendarEvent,
  BiCalendarX,
} from "react-icons/bi";
import { HiOutlineMail, HiOutlinePhone } from "react-icons/hi";
import ExpandedUserDetails from "./ExpandedUserDetails";
import { useSelector } from "react-redux";
import { selectCurrentUserId } from "../../../../features/auth/authSlice";
import DeleteUserModal from "./DeleteUserModal";
import StopRecurringModal from "./StopRecurringModal";

const UserTable = ({
  users,
  pagination,
  expandedRows,
  setExpandedRows,
  onDeleteClick,
  onEditClick,
  onSetRecurringClick,
  onStopRecurring,
  clearFilters,
  anyFiltersActive,
  onSwitchToInvitedUsers,
  shouldShowRecurringOption,
}) => {
  const currentUserId = useSelector(selectCurrentUserId);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStopRecurringModal, setShowStopRecurringModal] = useState(false);
  const [userToStopRecurring, setUserToStopRecurring] = useState(null);
  const [isStoppingRecurring, setIsStoppingRecurring] = useState(false);

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

  // Template for the expanded row content
  const rowExpansionTemplate = (data) => {
    return <ExpandedUserDetails data={data} onEditClick={onEditClick} />;
  };

  // Clean user name and avatar template
  const nameBodyTemplate = (rowData) => {
    const isRecurring = rowData.recurring?.state === true;

    return (
      <div className="flex items-center py-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-medium text-sm mr-3">
            {rowData.name ? rowData.name.charAt(0).toUpperCase() : "?"}
          </div>
        </div>
        <div>
          <div className="font-medium text-gray-900 text-sm">
            {rowData.name}
          </div>
          {isRecurring && (
            <div className="flex items-center mt-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#DF9E7A]/10 text-[#DF9E7A] border border-[#DF9E7A]/20">
                <BiCalendarEvent className="mr-1" />
                Recurring
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Clean contact info template
  const contactBodyTemplate = (rowData) => {
    return (
      <div className="py-3">
        <div className="flex items-center mb-1">
          <HiOutlineMail className="text-gray-400 mr-2 text-sm" />
          <span className="text-gray-900 text-sm">{rowData.email}</span>
        </div>
        {rowData.phone && (
          <div className="flex items-center">
            <HiOutlinePhone className="text-gray-400 mr-2 text-sm" />
            <span className="text-sm text-gray-600">{rowData.phone}</span>
          </div>
        )}
      </div>
    );
  };

  // Clean role template
  const roleBodyTemplate = (rowData) => {
    const isAdmin = rowData.role === "admin";

    return (
      <div className="py-3">
        <span
          className={`px-3 py-1 inline-flex items-center text-sm font-medium rounded-full border ${
            isAdmin
              ? "bg-black text-white border-black"
              : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          {rowData.role}
        </span>
        {rowData.accountType && !isAdmin && (
          <div className="mt-1">
            <span className="text-xs text-gray-500">
              {rowData.accountType === "domestic"
                ? "Domestic"
                : "International"}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Handle opening the delete modal
  const handleOpenDeleteModal = (user, e) => {
    e.stopPropagation();
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  // Handle confirming deletion
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await onDeleteClick(userToDelete);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  // Handle opening the stop recurring modal
  const handleOpenStopRecurringModal = (user, e) => {
    e.stopPropagation();
    setUserToStopRecurring(user);
    setShowStopRecurringModal(true);
  };

  // Handle confirming stop recurring
  const handleConfirmStopRecurring = async () => {
    if (!userToStopRecurring) return;

    setIsStoppingRecurring(true);
    try {
      await onStopRecurring(userToStopRecurring);
    } finally {
      setIsStoppingRecurring(false);
      setShowStopRecurringModal(false);
      setUserToStopRecurring(null);
    }
  };

  // Clean actions template
  const actionsBodyTemplate = (rowData) => {
    const isRecurring = rowData.recurring?.state === true;

    return (
      <div className="flex items-center justify-center gap-2 py-3">
        {/* Edit Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditClick(rowData);
          }}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          title="Edit user"
        >
          <BiEdit className="w-4 h-4" />
        </button>

        {/* Recurring Actions */}
        {shouldShowRecurringOption(rowData) && (
          <>
            {!isRecurring ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetRecurringClick(rowData);
                }}
                className="p-2 rounded-lg border border-[#DF9E7A]/30 text-[#DF9E7A] hover:bg-[#DF9E7A]/10 hover:border-[#DF9E7A] transition-all duration-200"
                title="Set up recurring sessions"
              >
                <BiCalendarEvent className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={(e) => handleOpenStopRecurringModal(rowData, e)}
                className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                title="Stop recurring sessions"
              >
                <BiCalendarX className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {/* Delete Button - Only if not current user */}
        {rowData._id !== currentUserId && (
          <button
            onClick={(e) => handleOpenDeleteModal(rowData, e)}
            className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
            title="Delete user permanently"
          >
            <BiTrash className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <BiInfoCircle className="h-6 w-6 text-gray-400" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No users found
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
          No users match your current search and filter criteria. Try adjusting
          your filters or search terms.
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
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Table Header - Hidden on mobile */}
        <div className="hidden lg:block bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-1"></div>
            <div className="col-span-4">
              <span className="text-sm font-medium text-gray-700">User</span>
            </div>
            <div className="col-span-3">
              <span className="text-sm font-medium text-gray-700">Contact</span>
            </div>
            <div className="col-span-2">
              <span className="text-sm font-medium text-gray-700">Role</span>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-sm font-medium text-gray-700">Actions</span>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200">
          {users.map((user) => (
            <div key={user._id}>
              {/* Desktop Row */}
              <div
                className={`hidden lg:grid grid-cols-12 gap-4 items-center px-6 hover:bg-gray-50 transition-colors duration-200 cursor-pointer ${
                  expandedRows[user._id] ? "bg-gray-50" : ""
                }`}
                onClick={() => {
                  onRowToggle(user);
                }}
              >
                <div className="col-span-1 flex justify-center">
                  <button className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    {expandedRows[user._id] ? (
                      <BiChevronUp className="w-4 h-4" />
                    ) : (
                      <BiChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="col-span-4">{nameBodyTemplate(user)}</div>
                <div className="col-span-3">{contactBodyTemplate(user)}</div>
                <div className="col-span-2">{roleBodyTemplate(user)}</div>
                <div
                  className="col-span-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actionsBodyTemplate(user)}
                </div>
              </div>

              {/* Mobile Row */}
              <div
                className={`lg:hidden px-4 py-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer ${
                  expandedRows[user._id] ? "bg-gray-50" : ""
                }`}
                onClick={() => {
                  onRowToggle(user);
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center flex-1">
                    <div className="relative mr-3">
                      <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-medium text-sm">
                        {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {user.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <button className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    {expandedRows[user._id] ? (
                      <BiChevronUp className="w-4 h-4" />
                    ) : (
                      <BiChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Role Badge */}
                    <span
                      className={`px-2 py-1 inline-flex items-center text-xs font-medium rounded-full border ${
                        user.role === "admin"
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-700 border-gray-200"
                      }`}
                    >
                      {user.role}
                    </span>

                    {/* Recurring Badge */}
                    {user.recurring?.state && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#DF9E7A]/10 text-[#DF9E7A] border border-[#DF9E7A]/20">
                        <BiCalendarEvent className="mr-1" />
                        Recurring
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actionsBodyTemplate(user)}
                  </div>
                </div>
              </div>

              {/* Expanded Row */}
              {expandedRows[user._id] && (
                <div className="bg-gray-50 border-t border-gray-200">
                  <ExpandedUserDetails data={user} onEditClick={onEditClick} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        userName={userToDelete?.name}
      />

      {/* Stop Recurring Modal */}
      <StopRecurringModal
        isOpen={showStopRecurringModal}
        onClose={() => setShowStopRecurringModal(false)}
        onConfirm={handleConfirmStopRecurring}
        isProcessing={isStoppingRecurring}
        userName={userToStopRecurring?.name}
      />
    </>
  );
};

export default UserTable;
