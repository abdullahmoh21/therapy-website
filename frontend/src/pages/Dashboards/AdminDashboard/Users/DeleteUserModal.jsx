import React from "react";
import { BiLoaderAlt, BiX, BiErrorCircle, BiTrash } from "react-icons/bi";

const DeleteUserModal = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  userName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={!isDeleting ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-md max-h-[95vh] m-2 sm:m-4 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-xl flex items-center justify-center mr-2 sm:mr-3">
              <BiTrash className="text-white text-lg sm:text-xl" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Delete User Permanently
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Remove user from system
              </p>
            </div>
            {!isDeleting && (
              <button
                onClick={onClose}
                className="ml-auto p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <BiX className="text-xl text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <div className="text-center mb-4 sm:mb-6">
            <p className="text-base sm:text-lg text-gray-700 mb-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">{userName}</span>?
            </p>
            <p className="text-xs sm:text-sm text-gray-600">
              This action cannot be undone.
            </p>
          </div>

          {/* Warning Card */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <BiErrorCircle className="text-red-500 text-lg sm:text-xl mt-0.5" />
              </div>
              <div className="ml-3">
                <h4 className="text-xs sm:text-sm font-semibold text-red-800 mb-2">
                  Warning: This will permanently delete
                </h4>
                <ul className="space-y-1 text-xs sm:text-sm text-red-700">
                  <li className="flex items-center">
                    <BiX className="mr-2 text-red-600 flex-shrink-0" />
                    All user data from the system
                  </li>
                  <li className="flex items-center">
                    <BiX className="mr-2 text-red-600 flex-shrink-0" />
                    User's booking history
                  </li>
                  <li className="flex items-center">
                    <BiX className="mr-2 text-red-600 flex-shrink-0" />
                    Account access and permissions
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start">
              <BiErrorCircle className="text-yellow-600 text-base sm:text-lg mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-yellow-800 font-medium">
                The user will need to be invited again if they need access in
                the future
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-3 sm:px-6 py-2 sm:py-3 bg-gray-100 text-gray-700 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-200 transition-all duration-200 disabled:opacity-60 flex items-center"
            disabled={isDeleting}
          >
            <BiX className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Cancel</span>
            <span className="sm:hidden">No</span>
          </button>
          <button
            onClick={onConfirm}
            className="px-3 sm:px-6 py-2 sm:py-3 bg-red-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-red-700 transition-all duration-200 flex items-center shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <BiLoaderAlt className="animate-spin mr-2 text-lg" />
                Deleting user...
              </>
            ) : (
              <>
                <BiTrash className="mr-1 sm:mr-2 text-base sm:text-lg" />
                <span className="hidden sm:inline">Delete Permanently</span>
                <span className="sm:hidden">Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserModal;
