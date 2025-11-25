import React from "react";
import {
  BiCalendar,
  BiTime,
  BiVideo,
  BiMapPin,
  BiRefresh,
  BiCheckCircle,
  BiDollarCircle,
  BiXCircle,
  BiEdit,
  BiLoaderAlt,
} from "react-icons/bi";
import {
  getDayName,
  getIntervalDisplay,
  formatTime12Hour,
} from "../../../../utils/dateTimeUtils";

const RecurringScheduleCard = ({
  schedule,
  nextBooking,
  formatDateTime,
  formatAmount,
  onCancelClick,
  onChangeScheduleClick,
  noticePeriodData,
  noticePeriodSuccess,
  storedCutoffDays,
  cancellingBookingId,
}) => {
  if (!schedule) return null;

  const { date: nextDate, time: nextTime } = nextBooking
    ? formatDateTime(nextBooking.eventStartTime)
    : { date: "", time: "" };

  const isCancelling =
    cancellingBookingId && nextBooking?._id === cancellingBookingId;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#DF9E7A] to-[#C88761] px-5 py-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <BiRefresh className="text-white text-lg" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-white">
            Recurring Schedule
          </h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {/* Left Side - Schedule Details (second on mobile) */}
          <div className="order-2 lg:order-1 space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Schedule Details
            </h3>

            <div className="space-y-3">
              {/* Combined Frequency + Day */}
              <div className="flex items-center space-x-2.5">
                <div className="bg-[#DF9E7A]/10 p-2 rounded-lg">
                  <BiRefresh className="text-[#DF9E7A] text-lg" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs text-gray-500 mb-0.5">
                    Schedule
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {getIntervalDisplay(schedule.interval)} on{" "}
                    {getDayName(schedule.day)}
                  </p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center space-x-2.5">
                <div className="bg-[#DF9E7A]/10 p-2 rounded-lg">
                  <BiTime className="text-[#DF9E7A] text-lg" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs text-gray-500 mb-0.5">
                    Session Time
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {formatTime12Hour(schedule.time)}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center space-x-2.5">
                <div className="bg-[#DF9E7A]/10 p-2 rounded-lg">
                  {schedule.location?.type === "online" ? (
                    <BiVideo className="text-[#DF9E7A] text-lg" />
                  ) : (
                    <BiMapPin className="text-[#DF9E7A] text-lg" />
                  )}
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs text-gray-500 mb-0.5">
                    Location
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {schedule.location?.type === "online"
                      ? "Online Meeting"
                      : schedule.location?.inPersonLocation || "In-Person"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Next Session (first on mobile) */}
          <div className="order-1 lg:order-2 lg:border-l lg:border-gray-200 lg:pl-6">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Next Session
            </h3>

            {nextBooking ? (
              <div className="space-y-3">
                {/* Date & Time */}
                <div className="rounded-lg p-4 bg-gray-50 border border-gray-200 border-l-4 border-l-[#E27A82]">
                  <div className="space-y-2.5">
                    <div className="flex items-center space-x-2">
                      <BiCalendar className="text-[#E27A82] text-base flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900">
                        {nextDate}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <BiTime className="text-[#E27A82] text-base flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900">
                        {nextTime}
                      </span>
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="mt-3 pt-3 border-t border-[#E27A82]/20">
                    <p className="text-[11px] sm:text-xs text-gray-700 flex items-start">
                      <BiRefresh className="mr-2 mt-0.5 flex-shrink-0 text-sm text-[#E27A82]" />
                      <span>
                        Repeats{" "}
                        {getIntervalDisplay(schedule.interval).toLowerCase()} on{" "}
                        {getDayName(schedule.day)} at{" "}
                        {formatTime12Hour(schedule.time)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Payment Status */}
                {nextBooking.amount && (
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <BiDollarCircle className="text-green-600 text-base" />
                      <span className="text-sm font-medium text-gray-900">
                        {formatAmount(nextBooking.amount)}{" "}
                        {nextBooking.currency}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                        nextBooking.transactionStatus === "Completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {nextBooking.transactionStatus === "Completed"
                        ? "Paid"
                        : "Pending"}
                    </span>
                  </div>
                )}

                {/* Actions Label */}
                {nextBooking && (
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">
                    Actions
                  </p>
                )}

                {/* Action Buttons - Side by side on desktop, stacked on mobile */}
                {nextBooking && (
                  <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                    {/* Join Meeting Button */}
                    {nextBooking.location?.type === "online" &&
                      nextBooking.location?.meetingLink && (
                        <button
                          onClick={() =>
                            window.open(
                              nextBooking.location.meetingLink,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-lightPink text-white text-sm sm:text-base font-medium transition-colors hover:bg-lightPink/90 shadow-sm hover:shadow-md"
                        >
                          <BiVideo className="text-lg" />
                          <span>Join Meeting</span>
                        </button>
                      )}

                    {/* Cancel Button - Always show, parent handles eligibility */}
                    {onCancelClick && (
                      <button
                        onClick={() => onCancelClick(nextBooking)}
                        disabled={isCancelling}
                        className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg border font-medium transition-colors shadow-sm ${
                          isCancelling
                            ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "border-red-500 bg-white text-red-500 hover:bg-red-50 hover:shadow-md"
                        }`}
                      >
                        {isCancelling ? (
                          <>
                            <BiLoaderAlt className="text-lg animate-spin" />
                            <span className="text-sm sm:text-base">
                              Cancelling...
                            </span>
                          </>
                        ) : (
                          <>
                            <BiXCircle className="text-lg" />
                            <span className="text-sm sm:text-base">
                              Cancel Session
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-5 text-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BiCalendar className="text-gray-400 text-lg" />
                </div>
                <p className="text-sm text-gray-600">
                  Your next session will be scheduled automatically based on
                  your recurring schedule.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Schedule Link */}
      {onChangeScheduleClick && (
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onChangeScheduleClick}
            className="flex items-center justify-center space-x-2 text-sm text-[#DF9E7A] hover:text-[#C88761] font-medium transition-colors group w-full"
          >
            <BiEdit className="text-base group-hover:scale-110 transition-transform" />
            <span>Want to change this schedule?</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default RecurringScheduleCard;
