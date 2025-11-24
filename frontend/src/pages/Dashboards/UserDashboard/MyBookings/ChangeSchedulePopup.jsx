import React, { useRef, useEffect } from "react";
import { BiX, BiCalendar, BiChat } from "react-icons/bi";

const ChangeSchedulePopup = ({ show, onClose }) => {
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
              <BiCalendar className="text-[#DF9E7A] text-xl" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Change Schedule
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
              <BiChat className="text-[#E27A82] text-2xl flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">
                  Need to adjust your schedule?
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  We understand that schedules change! Please reach out to us
                  and we can work together to find a new time that works better
                  for you.
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  We can also discuss this during our next session if you
                  prefer.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              How to reach us:
            </h4>
            <div className="space-y-2 text-sm text-gray-700">
              <p>• Mention it in your next session</p>
              <p>
                • Email:{" "}
                <a
                  href="mailto:fatimamohsin40@gmail.com"
                  className="text-[#DF9E7A] hover:text-[#C88761] transition-colors font-medium"
                >
                  fatimamohsin40@gmail.com
                </a>
              </p>
              <p>
                • WhatsApp:{" "}
                <a
                  href="https://wa.me/923334245151"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#DF9E7A] hover:text-[#C88761] transition-colors font-medium"
                >
                  +92 333 4245151
                </a>
              </p>
            </div>
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

export default ChangeSchedulePopup;
