import React, { useState, useRef, useEffect } from "react";
import {
  BiLoaderAlt,
  BiErrorCircle,
  BiCalendar,
  BiCopy,
  BiX,
} from "react-icons/bi";
import { BsCreditCard2Back } from "react-icons/bs";
import { toast } from "react-toastify";
import { useGetNoticePeriodQuery } from "../../../../features/bookings/bookingApiSlice";
import { useGetBankDetailsQuery } from "../../../../features/payments/paymentApiSlice";

const DashboardHeader = ({
  userData,
  showBookButton = true,
  getBookingLink, // Function to get a new booking link
  maxBookingsReached = false,
  maxAllowedBookings,
}) => {
  // Local states
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const modalRef = useRef(null);

  // Handle click outside modal to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target) &&
        showPaymentModal
      ) {
        setShowPaymentModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPaymentModal]);

  // Fetch the notice period for cancellations
  const {
    data: noticePeriodData,
    isSuccess: noticePeriodSuccess,
    isLoading: noticePeriodLoading,
    isError: noticePeriodError,
  } = useGetNoticePeriodQuery();

  // Fetch bank account details
  const { data: bankDetails, isSuccess: bankDetailsSuccess } =
    useGetBankDetailsQuery();

  const handleBookingClick = async () => {
    if (maxBookingsReached) {
      toast.error(
        maxAllowedBookings
          ? `Only ${maxAllowedBookings} active bookings allowed.`
          : "Booking limit reached."
      );
      return;
    }

    if (!getBookingLink) {
      toast.error("Booking functionality is not available.");
      return;
    }

    setIsLoading(true);
    try {
      await getBookingLink();
    } catch (error) {
      // Check if it's a 403 error with maxAllowedBookings in the response
      if (error?.status === 403 && error?.data?.maxAllowedBookings) {
        toast.error(
          `Booking limit reached. You can only have ${error.data.maxAllowedBookings} active bookings at a time.`
        );
      } else {
        toast.error(
          error?.data?.message ||
            "Failed to get booking link. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to copy account number to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success("Account number copied to clipboard!");
      })
      .catch((err) => {
        toast.error("Failed to copy account number");
        console.error("Copy failed: ", err);
      });
  };

  // Only show notice period if loading or successful, hide if error
  const showNoticePeriod = noticePeriodSuccess || noticePeriodLoading;

  const NoticePeriodText = () => {
    if (noticePeriodLoading) {
      return (
        <span className="inline-block min-w-[30px] bg-gray-300 animate-pulse rounded mx-1">
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </span>
      );
    } else if (noticePeriodSuccess) {
      return <span>{noticePeriodData.noticePeriod}</span>;
    }
    return null;
  };

  return (
    <div className="bg-white border-l-4 border-lightPink rounded-xl shadow-md mb-8 overflow-hidden">
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div className="mb-3 sm:mb-0">
          {userData && (
            <h1 className="orelega-one text-2xl sm:text-3xl text-lightPink mb-1">
              Welcome, {userData.name}
            </h1>
          )}

          <p className="text-textColor text-base sm:text-lg mt-1">
            Here's your upcoming schedule
          </p>

          {/* Removed online payment text completely (per your request) */}

          {showNoticePeriod && (
            <p className="text-textColor text-sm sm:text-base mt-1">
              Note: Cancellations must be made at least <NoticePeriodText />{" "}
              days before your appointment for a full refund.
            </p>
          )}

          {/* Payment instructions – made smaller & less dominant */}
          <button
            onClick={() => setShowPaymentModal(true)}
            className="mt-1 inline-flex items-center text-sm text-lightPink hover:text-darkPink transition duration-300 font-normal"
          >
            <BsCreditCard2Back className="mr-1 text-base" />
            <span>View Payment Instructions</span>
          </button>
        </div>

        {showBookButton && (
          <button
            disabled={isLoading || maxBookingsReached}
            onClick={handleBookingClick}
            className={`flex items-center space-x-2 bg-lightPink text-white font-semibold px-5 py-2.5 rounded-lg shadow transition duration-300 ${
              isLoading || maxBookingsReached
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {isLoading ? (
              <BiLoaderAlt className="animate-spin text-xl" />
            ) : maxBookingsReached ? (
              <BiErrorCircle className="text-xl" />
            ) : (
              <BiCalendar className="text-xl" />
            )}
            <span className="text-sm sm:text-base">
              {isLoading
                ? "Loading..."
                : maxBookingsReached
                ? "Limit Reached"
                : "Book New Session"}
            </span>
          </button>
        )}
      </div>

      {/* Payment Instructions Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fadeIn"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="bg-[#DF9E7A]/10 p-2.5 rounded-lg">
                  <BsCreditCard2Back className="text-[#DF9E7A] text-xl" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Payment Instructions
                </h2>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <BiX className="text-2xl" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div className="bg-gradient-to-br from-[#DF9E7A]/10 to-[#E27A82]/10 rounded-lg p-5 border border-[#DF9E7A]/20">
                <p className="text-sm text-gray-700 leading-relaxed">
                  You can pay for your sessions using the following bank
                  accounts or mobile payment methods:
                </p>
              </div>

              {bankDetailsSuccess && bankDetails ? (
                <div className="space-y-3">
                  {bankDetails.map((option, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <h3 className="font-semibold text-[#E27A82] text-base">
                        {option.bankAccount}
                      </h3>
                      <p className="text-gray-700 text-sm mt-1">
                        Account Title: {option.accountTitle}
                      </p>
                      <div className="flex items-center mt-1">
                        <p className="text-gray-700 text-sm">
                          Account Number: {option.accountNo}
                        </p>
                        <button
                          onClick={() => copyToClipboard(option.accountNo)}
                          className="ml-2 text-[#DF9E7A] hover:text-[#C88761] transition-colors"
                          title="Copy account number"
                        >
                          <BiCopy className="text-lg" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic text-sm">
                  Loading payment information...
                </p>
              )}

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-700">
                  After making your payment, please keep your receipt for
                  verification purposes.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-3 px-4 bg-[#DF9E7A] hover:bg-[#C88761] text-white font-semibold rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;
