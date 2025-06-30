import React, { useRef, useState, useEffect } from "react";
import { BiErrorCircle } from "react-icons/bi";
import { useGetNoticePeriodQuery } from "../../../../features/bookings/bookingApiSlice";

const NoCancellationPopup = ({ show, onClose, booking }) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const modalRef = useRef(null);

  // Fetch notice period data
  const { data, isLoading, isError } = useGetNoticePeriodQuery();

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

  // Render appropriate message based on API response status
  const renderCancellationMessage = () => {
    if (isLoading) {
      return (
        <p className="text-textColor leading-relaxed">
          Cancellations must be made at least{" "}
          <span className="inline-block relative">
            <span className="invisible">XX</span>
            <span className="absolute inset-0 bg-gray-200 rounded animate-pulse"></span>
          </span>{" "}
          before your appointment. You're no longer within that window.
        </p>
      );
    }

    if (isError || !data) {
      return (
        <p className="text-textColor leading-relaxed">
          This booking can no longer be canceled, as it's too close to the
          appointment time based on our cancellation policy.
        </p>
      );
    }

    return (
      <p className="text-textColor leading-relaxed">
        Cancellations must be made at least {data.noticePeriod} days before your
        appointment. You're no longer within that window.
      </p>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
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
        <div className="mb-4 text-red-500 flex justify-center">
          <BiErrorCircle className="text-5xl" />
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-textColor text-center">
          Cancellation Closed
        </h2>
        <div className="mb-6 space-y-4">
          {renderCancellationMessage()}
          <p className="text-textColor leading-relaxed">
            If this is an emergency, please contact your therapist directly.
          </p>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="font-semibold text-gray-800">
              You are still responsible to pay for this booking. Thank you for
              your understanding
            </p>
          </div>
        </div>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-textColor rounded-lg transition font-medium"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoCancellationPopup;
