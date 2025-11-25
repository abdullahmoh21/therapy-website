import React, { useRef, useEffect } from "react";
import { BiX, BiCalendar, BiRefresh, BiCheckCircle } from "react-icons/bi";

const RecurringInfoPopup = ({ show, onClose }) => {
  const modalRef = useRef(null);

  // Handle click outside modal to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target) &&
        show
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-[#DF9E7A]/10 p-2.5 rounded-lg">
              <BiRefresh className="text-[#DF9E7A] text-xl" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Recurring Sessions
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <BiX className="text-2xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-gradient-to-br from-[#DF9E7A]/10 to-[#E27A82]/10 rounded-lg p-5 border border-[#DF9E7A]/20">
            <div className="flex items-start space-x-3">
              <BiCalendar className="text-[#E27A82] text-2xl flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">
                  Say goodbye to weekly scheduling!
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  We can set up a recurring schedule that works for you. Choose
                  a day and time, and we'll automatically book your sessions
                  every week or every other week.
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  No more remembering to book each session - just show up and
                  focus on your therapy journey.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Benefits:
            </h4>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <BiCheckCircle className="text-green-500 text-lg flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">
                  Consistent schedule every week
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <BiCheckCircle className="text-green-500 text-lg flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">
                  No need to manually book sessions
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <BiCheckCircle className="text-green-500 text-lg flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">
                  Better therapy continuity and progress
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <BiCheckCircle className="text-green-500 text-lg flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">
                  Flexible - you can still cancel or reschedule individual
                  sessions
                </p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Interested?</span> Reach out to us
              and we'll help you set up a recurring schedule that fits your
              needs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-[#DF9E7A] hover:bg-[#C88761] text-white font-semibold rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurringInfoPopup;
