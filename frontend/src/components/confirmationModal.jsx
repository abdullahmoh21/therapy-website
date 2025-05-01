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

  // Prevent clicks from propagating to parent elements
  const handleContainerClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full bg-white dark:bg-secondary-800 rounded-xl shadow-xl border-2 border-danger-500 dark:border-danger-600 animate-scale-in"
        onClick={handleContainerClick}
      >
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-3 h-6 w-6 text-danger-600 dark:text-danger-400" />
            <h3 className="text-xl font-bold text-secondary-900 dark:text-white">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400 transition-colors"
          >
            <FaTimes size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-secondary-700 dark:text-secondary-300">
            {message}
          </p>

          <div className="mt-6 flex flex-row-reverse gap-3">
            <button
              onClick={onConfirm}
              className="px-4 py-2.5 bg-danger-600 hover:bg-danger-700 text-white rounded-lg transition-colors font-medium shadow-sm"
            >
              {confirmText}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-secondary-700 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 hover:border-primary-400 dark:hover:border-primary-600 rounded-lg transition-all font-medium"
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
