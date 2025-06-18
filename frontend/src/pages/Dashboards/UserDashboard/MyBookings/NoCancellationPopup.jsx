import React from "react";
import { BiErrorCircle } from "react-icons/bi";

const NoCancellationPopup = ({ show, onClose, booking }) => {
  if (!show || !booking) return null;

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
        <div className="mb-4 text-red-500 flex justify-center">
          <BiErrorCircle className="text-5xl" />
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 text-center">
          Cancellation Not Available
        </h2>
        <div className="text-gray-600 mb-6 space-y-3">
          <p>
            You can no longer cancel this booking as it's too close to the
            appointment time.
          </p>
          <p>
            If this is an emergency, please contact your therapist directly.
          </p>
          <p className="font-medium">
            You are still expected to pay for this session. If you have already
            paid, thank you for your understanding.
          </p>
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

export default NoCancellationPopup;
