import React from "react";
import { BiInfoCircle } from "react-icons/bi";

const PaymentInfoPopup = ({ show, onClose }) => {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="mb-4 text-blue-500 flex justify-center">
          <BiInfoCircle className="text-5xl" />
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 text-center">
          Payment Information
        </h2>
        <div className="text-gray-600 mb-6 space-y-3">
          <p>
            Online payments are currently under construction. In the meantime,
            please make payments via cash or bank transfer.
          </p>
          <p>For any payment-related questions, please contact me directly.</p>
        </div>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition font-medium"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentInfoPopup;
