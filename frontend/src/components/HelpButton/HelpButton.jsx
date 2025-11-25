import { useState, useEffect, useRef } from "react";
import { BiInfoCircle, BiQuestionMark, BiX, BiCopy } from "react-icons/bi";
import { FaEnvelope, FaWhatsapp } from "react-icons/fa";
import { toast } from "react-toastify";
import HelpAccordion from "./HelpAccordion";

const HelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const panelRef = useRef(null);
  const bubbleRef = useRef(null);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        bubbleRef.current &&
        !bubbleRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Slight delay to avoid closing immediately on open
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const togglePanel = () => {
    setIsOpen((prev) => !prev);
  };

  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText("fatimamohsin40@gmail.com");
    setEmailCopied(true);
    toast.success("Email copied to clipboard!");
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const helpSections = [
    {
      title: "Your session types",
      content: (
        <div className="space-y-2">
          <p>There are three ways your sessions can be booked:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Recurring session</strong> – we agree on a regular day and
              time (for example, <strong>Thursday at 11:00 AM</strong>). A new
              session is created for you automatically every week at that time.
            </li>
            <li>
              <strong>Calendly booking (one-off)</strong> – a single session
              that
              <strong> you schedule yourself</strong> using our online calendar.
              Helpful if your schedule changes from week to week.
            </li>
            <li>
              <strong>Admin-created booking (one-off)</strong> – a single
              session that <strong>we book for you</strong> on our side when you
              tell us what works. This can feel easier if booking sessions
              yourself feels stressful.
            </li>
          </ul>
          <p>
            On your dashboard, one-off sessions (Calendly + admin) usually
            appear under <strong>Additional Sessions</strong>, while your
            repeating time shows in <strong>Recurring Schedule</strong>.
          </p>
        </div>
      ),
    },
    {
      title: "How your recurring schedule works",
      content: (
        <div className="space-y-2">
          <p>If you have a recurring session, it means:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              You have a regular time reserved, e.g.{" "}
              <strong>every Thursday at 11:00 AM</strong>.
            </li>
            <li>
              New sessions at that time are generated automatically for upcoming
              weeks.
            </li>
            <li>
              You’ll always see your <strong>next recurring session</strong> at
              the top of your dashboard.
            </li>
            <li>
              Your recurring time stays the same unless we agree together to
              change it.
            </li>
          </ul>
          <p>
            If the day or time no longer works for you, just let us know and we
            can update your recurring schedule.
          </p>
        </div>
      ),
    },
    {
      title: "Skipping a week / changing a single session",
      content: (
        <div className="space-y-2">
          <p>Even with a recurring time, we know life happens:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              If one week you <strong>can’t attend your usual time</strong> (for
              example, a doctor’s appointment or travel), you can{" "}
              <strong>cancel that single recurring session</strong> from your
              dashboard, as long as it’s before the cancellation deadline.
            </li>
            <li>
              For that week, you can then either:
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>
                  <strong>Book a one-off session yourself</strong> at a
                  different time using our online calendar (Calendly), or
                </li>
                <li>
                  <strong>Ask us to book it for you</strong> – we’ll create an
                  admin booking at the new time you prefer.
                </li>
              </ul>
            </li>
          </ul>
          <p>
            This keeps your recurring schedule the same long-term, while
            individual weeks can be adjusted when you need them to be.
          </p>
        </div>
      ),
    },
    {
      title: "Changes & cancellations",
      content: (
        <div className="space-y-2">
          <p>You can make changes directly from your dashboard:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              You can <strong>cancel upcoming sessions</strong> from the
              bookings list.
            </li>
            <li>
              Cancellations must be made at least{" "}
              <strong>the notice period shown at the top of the page</strong>{" "}
              (for example, X days before your appointment) for a full refund.
            </li>
            <li>
              To <strong>permanently change</strong> your recurring day or time,
              contact us and we’ll update it with you.
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Payments & receipts",
      content: (
        <div className="space-y-2">
          <p>Here's how payments work for your sessions:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              You can pay by <strong>bank transfer</strong> or other methods
              listed under <strong>“View Payment Instructions”</strong> on your
              dashboard.
            </li>
            <li>
              After you pay, please <strong>keep your receipt</strong> so we can
              verify the payment if needed.
            </li>
            <li>
              Your dashboard will show whether an upcoming session is{" "}
              <strong>Paid</strong> or <strong>Payment Pending</strong>.
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Contact & urgent support",
      content: (
        <div className="space-y-2">
          <p>For questions about bookings or payments:</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <FaEnvelope className="text-darkPink flex-shrink-0" />
              <span>Email:</span>
              <a
                href="mailto:fatimamohsin40@gmail.com"
                className="text-darkPink hover:text-lightPink font-medium underline transition-colors"
              >
                fatimamohsin40@gmail.com
              </a>
              <button
                onClick={copyEmailToClipboard}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Copy email to clipboard"
              >
                <BiCopy
                  className={`w-4 h-4 ${
                    emailCopied ? "text-green-600" : "text-gray-500"
                  }`}
                />
              </button>
            </li>
            <li className="flex items-center gap-2">
              <FaWhatsapp className="text-darkPink flex-shrink-0" />
              <span>WhatsApp:</span>
              <a
                href="https://wa.me/+923334245151"
                target="_blank"
                rel="noopener noreferrer"
                className="text-darkPink hover:text-lightPink font-medium underline transition-colors"
              >
                +92 333 4245151
              </a>
            </li>
          </ul>
          <p className="font-semibold text-gray-800">
            If you are in crisis or need immediate help:
          </p>
          <p className="text-gray-700">
            Please contact your local emergency services or a crisis hotline in
            your area. This website and your therapist may not be able to
            respond right away, and the dashboard is{" "}
            <strong>not monitored 24/7</strong>.
          </p>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Help Bubble Button */}
      <button
        ref={bubbleRef}
        onClick={togglePanel}
        className={`
          fixed z-40
          right-4 bottom-4 md:right-6 md:bottom-6
          w-12 h-12 md:w-14 md:h-14
          bg-lightPink hover:bg-darkPink
          rounded-full
          shadow-md hover:shadow-lg
          flex items-center justify-center
          transition-all duration-200
          ${isOpen ? "scale-95" : "hover:scale-105"}
          active:scale-95
        `}
        aria-label="Help and information"
      >
        <BiInfoCircle className="w-6 h-6 md:w-7 md:h-7 text-white" />
      </button>

      {/* Help Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className={`
            fixed z-40
            right-4 bottom-20 md:right-6 md:bottom-24
            w-[90vw] max-w-sm md:max-w-none md:w-[500px]
            max-h-[60vh] md:max-h-[70vh]
            bg-white
            rounded-2xl
            border border-gray-200
            shadow-2xl
            flex flex-col
            animate-slideUpFade
          `}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <BiQuestionMark className="w-5 h-5 text-darkPink" />
              <h3 className="text-lg font-semibold text-gray-900">
                Help & Info
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close help panel"
            >
              <BiX className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Panel Content - Scrollable */}
          <div className="overflow-y-auto px-4 md:px-5 py-3 md:py-4 space-y-2 pb-5">
            {helpSections.map((section, index) => (
              <HelpAccordion
                key={index}
                title={section.title}
                content={section.content}
              />
            ))}
          </div>

          {/* Panel Footer */}
          <div className="p-4 md:p-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <p className="text-sm text-gray-600 text-center">
              Still unsure?{" "}
              <a
                href="/contact"
                className="text-darkPink hover:text-lightPink font-medium transition-colors"
              >
                Contact us
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpButton;
