import React from "react";
import { BiLoaderAlt } from "react-icons/bi";
import ConfirmationModal from "../../../../components/confirmationModal";

const DeleteBookingModal = ({ isOpen, onClose, onConfirm, isDeleting }) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Booking Permanently"
      message={
        <>
          <p>
            Are you sure you want to delete this booking? This action is
            permanent and <span className="font-bold">cannot be undone</span>.
          </p>
          <div className="mt-3 bg-yellow-50 border border-yellow-200 p-3 rounded-md">
            <p className="text-yellow-700 font-medium">Important Notice:</p>
            <p className="text-yellow-600 mt-1">
              This will only remove the booking from our database. The booking
              will still be active in Calendly. Please cancel the appointment in
              Calendly first if needed.
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
    />
  );
};

export default DeleteBookingModal;
