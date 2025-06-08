import React from "react";
import { BiLoaderAlt } from "react-icons/bi";
import ConfirmationModal from "../../../../components/confirmationModal";

const DeleteUserModal = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  userName,
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete User Permanently"
      message={
        <>
          <p>
            Are you sure you want to delete{" "}
            {userName ? `user "${userName}"` : "this user"}? This action is
            permanent and <span className="font-bold">cannot be undone</span>.
          </p>
          <div className="mt-3 bg-yellow-50 border border-yellow-200 p-3 rounded-md">
            <p className="text-yellow-700 font-medium">Important Notice:</p>
            <p className="text-yellow-600 mt-1">
              Deleting a user will remove all their data from the system. They
              will need to be invited again if they need access in the future.
            </p>
          </div>
        </>
      }
      confirmText={
        isDeleting ? (
          <>
            <BiLoaderAlt className="animate-spin mr-2 inline-block" />{" "}
            Deleting...
          </>
        ) : (
          "Delete Permanently"
        )
      }
      cancelText="Cancel"
      variant="danger"
    />
  );
};

export default DeleteUserModal;
