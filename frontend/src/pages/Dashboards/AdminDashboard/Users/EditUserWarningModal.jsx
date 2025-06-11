import React from "react";
import { BiErrorCircle } from "react-icons/bi"; // Use BiErrorCircle instead of BiExclamationTriangle
import ConfirmationModal from "../../../../components/confirmationModal";

const EditUserWarningModal = ({ isOpen, onClose, onConfirm }) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Are you sure this is necessary?"
      message={
        <>
          <p className="mb-3">
            <strong>Important:</strong> Please do not edit any information of
            the client unless absolutely necessary. Any changes made here will
            be reflected in their account and are not just for display purposes.
          </p>
          <p>
            There is rarely ever any need to change a client's email unless they
            have specifically requested this change.
          </p>
        </>
      }
      confirmText="I Understand"
      cancelText="Cancel"
      variant="warning"
    />
  );
};

export default EditUserWarningModal;
