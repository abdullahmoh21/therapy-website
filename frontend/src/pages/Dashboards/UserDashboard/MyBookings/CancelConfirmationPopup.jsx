import React, { useRef, useState, useEffect } from "react";
import {
  BiCheckCircle,
  BiErrorCircle,
  BiInfoCircle,
  BiLoaderAlt,
  BiXCircle,
} from "react-icons/bi";

const CancelConfirmationPopup = ({
  show,
  onClose,
  booking,
  loading,
  refundError,
  formatDateTime,
  checkRefundEligibility,
  handleRefundRequest,
  handleCancellation,
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const modalRef = useRef(null);

  // Check for screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle click outside modal to close on desktop
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isDesktop &&
        modalRef.current &&
        !modalRef.current.contains(event.target) &&
        show
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show, isDesktop, onClose]);

  if (!show || !booking) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          onClick={onClose}
          aria-label="Close popup"
        >
          &times;
        </button>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          Cancel Confirmation
        </h2>
        <p className="text-gray-600 mb-6">
          You're cancelling your{" "}
          <span className="font-medium">
            {booking.eventName === "15 Minute Consultation"
              ? "Free Consultation"
              : "Therapy Session"}
          </span>{" "}
          on{" "}
          <span className="font-medium">
            {formatDateTime(booking.eventStartTime).date} at{" "}
            {formatDateTime(booking.eventStartTime).time}
          </span>
          .
        </p>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
          {booking.transactionStatus === "Completed" ? (
            checkRefundEligibility(booking) ? (
              <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded">
                <div className="flex items-start">
                  <BiCheckCircle className="text-green-500 mt-0.5 mr-2 text-lg flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-700">
                      Eligible for full refund
                    </p>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      <li>• Admin will be notified once you cancel</li>
                      <li>
                        • Your refund will be initiated within 1–2 business days
                      </li>
                      <li>
                        • You'll receive a confirmation email when processed
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <p className="flex items-center text-orange-600">
                <BiInfoCircle className="mr-2" /> Too late for refund.
              </p>
            )
          ) : booking.transactionStatus === "Not Initiated" ? (
            <p className="flex items-center">
              <BiInfoCircle className="mr-2" /> Unpaid bookings cancel
              immediately.
            </p>
          ) : (
            <p className="flex items-center">
              <BiInfoCircle className="mr-2" /> This is a free consultation.
            </p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center mb-4 text-gray-600">
            <BiLoaderAlt className="animate-spin mr-2" /> Processing...
          </div>
        )}
        {refundError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
            <BiErrorCircle className="mr-2" />
            {refundError}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
          >
            Keep It
          </button>
          <button
            onClick={() => {
              if (
                booking.transactionStatus === "Completed" &&
                checkRefundEligibility(booking)
              ) {
                handleRefundRequest(booking.cancelURL);
              } else {
                handleCancellation(booking.cancelURL);
              }
            }}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-medium transition ${
              loading
                ? "bg-red-300 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {loading ? <BiLoaderAlt className="animate-spin" /> : <BiXCircle />}
            <span>Proceed</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelConfirmationPopup;
