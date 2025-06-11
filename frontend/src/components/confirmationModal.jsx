import React from "react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this item? This action is permanent and cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
}) => {
  if (!isOpen) return null;

  const handleContainerClick = (e) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border-2 border-lightPink/20 bg-white shadow-panelShadow animate-scale-in"
        onClick={handleContainerClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 rounded-t-xl bg-whiteBg/50 px-6 py-4">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-3 h-6 w-6 text-lightPink" />
            <h3 className="text-lg font-semibold text-headingColor">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-textColor hover:bg-lightPink/10 hover:text-headingColor transition-colors"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-base text-textColor">{message}</p>

          <div className="mt-6 flex flex-row-reverse gap-3">
            <button
              onClick={onConfirm}
              className="rounded-lg bg-lightPink px-4 py-2.5 font-medium text-white transition-colors hover:bg-lightPink/90"
            >
              {confirmText}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-lightPink/20 bg-white px-4 py-2 font-medium text-buttonTextBlack transition-all hover:border-lightPink hover:text-lightPink"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
