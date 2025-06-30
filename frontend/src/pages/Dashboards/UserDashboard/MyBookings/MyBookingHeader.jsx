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
        showPaymentModal
      ) {
        setShowPaymentModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPaymentModal, isDesktop]);

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
          error?.data?.message || "Failed to get booking link. Please try again."
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
            Online payment is optional; you can also pay in cash or via a bank
            transfer during your session
          </p>
          {showNoticePeriod && (
            <p className="text-textColor">
              Note: Cancellations must be made at least <NoticePeriodText />{" "}
              days before your appointment for a full refund.
            </p>
          )}
          <button
            onClick={() => setShowPaymentModal(true)}
            className="mt-2 flex items-center text-lightPink hover:text-darkPink transition duration-300"
          >
            <BsCreditCard2Back className="mr-1" />
            <span>View Payment Instructions</span>
          </button>
        </div>

        {showBookButton && (
          <button
            disabled={isLoading || maxBookingsReached}
            onClick={handleBookingClick}
            className={`flex items-center space-x-2 bg-lightPink text-white font-semibold px-5 py-3 rounded-lg shadow transition duration-300 ${
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
            <span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            ref={modalRef}
            className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              aria-label="Close payment instructions"
            >
              <BiX className="text-2xl" />
            </button>

            <h2 className="orelega-one text-2xl text-lightPink mb-4">
              Payment Instructions
            </h2>

            <p className="text-textColor mb-4">
              You can pay for your sessions using the following bank accounts or
              mobile payment methods:
            </p>

            {bankDetailsSuccess && bankDetails ? (
              <div className="space-y-4">
                {bankDetails.map((option, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-darkPink text-lg">
                      {option.bankAccount}
                    </h3>
                    <p className="text-gray-700 mt-1">
                      Account Title: {option.accountTitle}
                    </p>
                    <div className="flex items-center mt-1">
                      <p className="text-gray-700">
                        Account Number: {option.accountNo}
                      </p>
                      <button
                        onClick={() => copyToClipboard(option.accountNo)}
                        className="ml-2 text-lightPink hover:text-darkPink transition-colors"
                        title="Copy account number"
                      >
                        <BiCopy />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                Loading payment information...
              </p>
            )}

            <p className="mt-4 text-gray-600 text-sm">
              After making your payment, please keep your receipt for
              verification purposes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;
