import React, { useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import {
  BiChevronUp,
  BiChevronDown,
  BiTrash,
  BiEdit,
  BiInfoCircle,
  BiX,
} from "react-icons/bi";
import ExpandedUserDetails from "./ExpandedUserDetails";
import { useSelector } from "react-redux";
import { selectCurrentUserId } from "../../../../features/auth/authSlice";
import DeleteUserModal from "./DeleteUserModal";

const UserTable = ({
  users,
  pagination,
  expandedRows,
  setExpandedRows,
  onDeleteClick,
  onEditClick,
  clearFilters,
  anyFiltersActive,
  onSwitchToInvitedUsers,
}) => {
  const currentUserId = useSelector(selectCurrentUserId);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // User name and avatar column template
  const nameBodyTemplate = (rowData) => {
    return (
      <div className="flex items-center">
        <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 mr-3">
          {rowData.name ? rowData.name.charAt(0).toUpperCase() : "?"}
        </div>
        <div>
          <div className="font-medium text-gray-900">{rowData.name}</div>
        </div>
      </div>
    );
  };

  // Contact info template
  const contactBodyTemplate = (rowData) => {
    return (
      <div>
        <div className="font-medium">{rowData.email}</div>
        {rowData.phone && (
          <div className="text-xs text-gray-500">{rowData.phone}</div>
        )}
      </div>
    );
  };

  // Role template
  const roleBodyTemplate = (rowData) => {
    return (
      <span
        className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
          rowData.role === "admin"
            ? "bg-purple-100 text-purple-800"
            : "bg-green-100 text-green-800"
        }`}
      >
        {rowData.role}
      </span>
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

  // Actions template - edit and delete buttons
  const actionsBodyTemplate = (rowData) => {
    return (
      <div className="flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditClick(rowData);
          }}
          className="text-blue-600 hover:text-blue-800 transition-colors p-2 rounded-full hover:bg-blue-50 mr-1"
          title="Edit user"
        >
          <BiEdit className="w-5 h-5" />
        </button>

        {rowData._id !== currentUserId && (
          <button
            onClick={(e) => handleOpenDeleteModal(rowData, e)}
            className="text-red-600 hover:text-red-700 transition-colors p-2 rounded-full hover:bg-red-50"
            title="Delete user permanently"
          >
            <BiTrash className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
        <BiInfoCircle className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-medium text-gray-800">
          No users found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No users match your current search and filter criteria.
        </p>
        {anyFiltersActive && (
          <button
            onClick={clearFilters}
            className="mt-6 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <BiX className="mr-2 inline-block" />
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <DataTable
          value={users}
          expandedRows={expandedRows}
          onRowToggle={(e) => setExpandedRows(e.data)}
          rowExpansionTemplate={rowExpansionTemplate}
          dataKey="_id"
          stripedRows
          className="p-datatable-sm"
          emptyMessage="No users found."
          onRowClick={(e) => {
            // Allow clicking row to expand or collapse
            if (e.originalEvent.target.closest("button, a")) return; // Don't toggle if click was on a button/link

            // Toggle the expanded state
            onRowToggle(e.data);
          }}
          rowClassName={(data) => {
            return `cursor-pointer ${
              expandedRows[data._id] ? "bg-gray-50" : "hover:bg-gray-50"
            }`;
          }}
        >
          <Column
            expander={(rowData) => (
              <div className="ml-1 flex items-center">
                {expandedRows && expandedRows[rowData._id] ? (
                  <BiChevronUp className="text-gray-600" />
                ) : (
                  <BiChevronDown className="text-gray-600" />
                )}
              </div>
            )}
            headerClassName="bg-gray-50 w-12"
            bodyClassName="pl-4"
          />
          <Column
            header="User"
            body={nameBodyTemplate}
            headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
            bodyClassName="px-4 py-3"
            style={{ minWidth: "250px" }}
          />
          <Column
            header="Contact Information"
            body={contactBodyTemplate}
            headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
            bodyClassName="px-4 py-3"
            style={{ minWidth: "200px" }}
          />
          <Column
            header="Role"
            body={roleBodyTemplate}
            headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
            bodyClassName="px-4 py-3"
            style={{ minWidth: "120px" }}
          />
          <Column
            header="Actions"
            body={actionsBodyTemplate}
            headerClassName="bg-gray-50 text-gray-600 text-xs uppercase font-medium px-4 py-3"
            bodyClassName="px-4 py-3"
            style={{ width: "100px" }}
          />
        </DataTable>
      </div>

      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        userName={userToDelete?.name}
      />
    </>
  );
};

export default UserTable;
