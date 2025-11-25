import React, { useState } from "react";
import { BiXCircle, BiInfoCircle } from "react-icons/bi";
import { formatInTimeZone } from "date-fns-tz";

const CancelBookingModal = ({
  isOpen,
  onClose,
  onConfirm,
  isCancelling,
  booking,
}) => {
  const [reason, setReason] = useState("");
  const [notifyUser, setNotifyUser] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      return; // Don't submit if reason is empty
    }
    onConfirm(booking._id, reason.trim(), notifyUser);
  };

  const handleClose = () => {
    if (!isCancelling) {
      setReason("");
      setNotifyUser(false);
      onClose();
    }
  };

  const isReasonEmpty = !reason.trim();

  // Get event name based on source
  const getEventName = (booking) => {
    if (booking.source === "calendly" && booking.calendly?.eventName) {
      return booking.calendly.eventName;
    } else if (booking.source === "system" && booking.recurring?.state) {
      return "Recurring Session";
    } else if (booking.source === "admin") {
      return "One-off Booking";
    } else {
      return booking.eventName || "Unnamed Event";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-xl border-2 border-gray-200 bg-white shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 rounded-t-xl bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <BiXCircle className="mr-3 h-6 w-6 text-[#E27A82]" />
            <h3 className="text-lg font-semibold text-gray-900">
              Cancel Booking
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isCancelling}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 border border-[#E27A82] rounded-full flex items-center justify-center">
                <BiXCircle className="text-[#E27A82] text-xl" />
              </div>
              <p className="text-lg text-black font-medium mb-2">
                Cancel Booking
              </p>
              <p className="text-gray-600">
                Are you sure you want to cancel this booking?
              </p>
            </div>

            {booking && (
              <div className="bg-white p-4 border border-gray-300 rounded-lg">
                <div className="flex items-center mb-3">
                  <BiInfoCircle className="text-[#E27A82] text-lg mr-2" />
                  <p className="font-medium text-black">Booking Details</p>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Client:</span>
                    <span className="text-black">
                      {booking.userId?.name || "Unknown"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Event:</span>
                    <span className="text-black">{getEventName(booking)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Date:</span>
                    <span className="text-black">
                      {booking.eventStartTime
                        ? formatInTimeZone(
                            new Date(booking.eventStartTime),
                            "Asia/Karachi",
                            "PP"
                          )
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Time:</span>
                    <span className="text-black">
                      {booking.eventStartTime
                        ? formatInTimeZone(
                            new Date(booking.eventStartTime),
                            "Asia/Karachi",
                            "p"
                          )
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation Reason */}
            <div className="bg-white p-4 border border-gray-300 rounded-lg">
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for cancelling this booking..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E27A82] focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={3}
                required
                disabled={isCancelling}
              />
            </div>

            {/* Notify User Option */}
            <div className="bg-white p-4 border border-gray-300 rounded-lg">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={notifyUser}
                  onChange={(e) => setNotifyUser(e.target.checked)}
                  className="w-4 h-4 text-[#E27A82] border-gray-300 rounded focus:ring-[#E27A82] focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isCancelling}
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Send cancellation notification to client
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    The provided reason will also be included
                  </p>
                </div>
              </label>
            </div>

            {/* Warning */}
            <div className="bg-white p-4 border border-gray-300 rounded-lg">
              <div className="flex items-start space-x-3">
                <BiXCircle className="text-[#E27A82] text-lg mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-black font-medium mb-1">
                    Important Warning
                  </p>
                  <p className="text-gray-600 text-sm">
                    This action is permanent and cannot be undone! The booking
                    will be marked as cancelled and cannot be restored.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-row-reverse gap-3">
            <button
              onClick={handleSubmit}
              disabled={isCancelling || isReasonEmpty}
              className={`rounded-lg px-6 py-3 font-medium text-white transition-all duration-200 ${
                isCancelling || isReasonEmpty
                  ? "bg-gray-400 cursor-not-allowed opacity-60"
                  : "bg-[#E27A82] hover:bg-[#E27A82]/90 shadow-md hover:shadow-lg"
              }`}
            >
              {isCancelling
                ? "Cancelling..."
                : isReasonEmpty
                ? "Enter Reason"
                : "Cancel Booking"}
            </button>
            <button
              onClick={handleClose}
              disabled={isCancelling}
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
