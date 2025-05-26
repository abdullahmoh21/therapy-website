import React from "react";
import { BiLoaderAlt, BiErrorCircle, BiCalendar } from "react-icons/bi";
import { toast } from "react-toastify";
import { useGetNoticePeriodQuery } from "../../features/bookings/bookingApiSlice";

const DashboardHeader = ({
  userData,
  showBookButton = true,
  bookingLink,
  gettingBookingLink,
  maxReached,
  newBookingLinkError,
  refetchBookingLink,
}) => {
  // Fetch the notice period for cancellations
  const { data: noticePeriodData, isSuccess: noticePeriodSuccess } =
    useGetNoticePeriodQuery();

  const handleBookingClick = () => {
    if (maxReached) {
      const maxNum = newBookingLinkError?.data?.maxAllowedBookings ?? null;
      toast.error(
        maxNum
          ? `Only ${maxNum} active bookings allowed.`
          : newBookingLinkError?.data?.message || "Booking limit reached."
      );
    } else if (bookingLink) {
      window.location.href = bookingLink;
    } else {
      refetchBookingLink();
    }
  };

  // Only show the notice period if the query was successful and returned data
  const showNoticePeriod =
    noticePeriodSuccess && noticePeriodData?.noticePeriod;

  return (
    <div className="bg-white border-l-4 border-lightPink rounded-xl shadow-md mb-8 overflow-hidden">
      <div className="p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div className="mb-4 sm:mb-0">
          {userData && (
            <h1 className="orelega-one text-3xl text-lightPink mb-2">
              Welcome, {userData.name}
            </h1>
          )}
          <p className="text-textColor text-xl mt-1">
            Here's your upcoming schedule
          </p>
          <p className="text-textColor mt-1">
            Online payment is optional; you can also pay in cash during your
            session
          </p>
          {showNoticePeriod && (
            <p className="text-textColor">
              Note: Cancellations must be made at least{" "}
              {noticePeriodData.noticePeriod} days before your appointment for a
              full refund.
            </p>
          )}
        </div>

        {showBookButton && (
          <button
            disabled={gettingBookingLink || maxReached}
            onClick={handleBookingClick}
            className={`flex items-center space-x-2 bg-lightPink text-white font-semibold px-5 py-3 rounded-lg shadow transition duration-300 ${
              gettingBookingLink || maxReached
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {gettingBookingLink ? (
              <BiLoaderAlt className="animate-spin text-xl" />
            ) : maxReached ? (
              <BiErrorCircle className="text-xl" />
            ) : (
              <BiCalendar className="text-xl" />
            )}
            <span>
              {gettingBookingLink
                ? "Loading..."
                : maxReached
                ? "Limit Reached"
                : "Book New Session"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;
