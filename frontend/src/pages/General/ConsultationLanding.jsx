import React from "react";
import { useLocation, NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const ConsultationLanding = () => {
  const { search } = useLocation();
  const params = React.useMemo(() => new URLSearchParams(search), [search]);

  // Check if we have calendly parameters
  const hasCalendlyParams =
    params.has("event_start_time") || params.has("invitee_full_name");

  // Only these three are guaranteed from Calendly
  const fullName = decodeURIComponent(
    params.get("invitee_full_name") || "Valued Client"
  );

  // Get contact information
  const email = decodeURIComponent(params.get("invitee_email") || "");
  const phone = decodeURIComponent(
    params.get("text_reminder_number") || params.get("answer_1") || ""
  ).trim();

  // Fix date parsing by properly decoding URI components
  const rawStart = params.get("event_start_time")
    ? decodeURIComponent(params.get("event_start_time")).replace(" ", "+")
    : null;
  const rawEnd = params.get("event_end_time")
    ? decodeURIComponent(params.get("event_end_time")).replace(" ", "+")
    : null;

  // Add error handling for date parsing
  let startDate = null;
  let endDate = null;

  try {
    startDate = rawStart ? new Date(rawStart) : null;
    // Validate the date is valid
    if (startDate && startDate.toString() === "Invalid Date") {
      startDate = null;
    }
  } catch (error) {
    console.error("Error parsing start date:", error);
  }

  try {
    endDate = rawEnd ? new Date(rawEnd) : null;
    // Validate the date is valid
    if (endDate && endDate.toString() === "Invalid Date") {
      endDate = null;
    }
  } catch (error) {
    console.error("Error parsing end date:", error);
  }

  const formattedDate =
    startDate &&
    startDate.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formattedStart =
    startDate &&
    startDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formattedEnd =
    endDate &&
    endDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  // Decorative elements - circles for visual appeal
  const Circle = ({ className }) => (
    <div className={`absolute rounded-full ${className}`}></div>
  );

  // General Info View (when no Calendly params)
  if (!hasCalendlyParams) {
    return (
      <div className="min-h-screen bg-whiteBg overflow-hidden relative">
        {/* Enhanced background decoration with more polka dots */}
        <Circle className="bg-lightPink opacity-10 w-64 h-64 -top-20 -left-20" />
        <Circle className="bg-orangeBg opacity-20 w-96 h-96 -bottom-40 -right-40" />
        <Circle className="bg-orangeHeader opacity-10 w-48 h-48 top-1/2 -left-24" />
        <Circle className="bg-lightPink opacity-15 w-32 h-32 top-40 right-20" />
        <Circle className="bg-orangeBg opacity-10 w-20 h-20 bottom-60 left-40" />
        <Circle className="bg-orangeHeader opacity-5 w-80 h-80 -top-40 right-1/4" />
        <Circle className="bg-lightPink opacity-10 w-16 h-16 bottom-20 left-1/4" />
        <Circle className="bg-orangeBg opacity-15 w-24 h-24 top-1/3 right-60" />

        {/* Header */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative z-10 py-12 px-4"
        >
          <div className="container mx-auto">
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center max-w-3xl mx-auto"
            >
              <span className="inline-block bg-lightPink bg-opacity-20 text-lightPink px-4 py-1 rounded-full mb-4 font-medium">
                Free Initial Consultation
              </span>
              <h1 className="orelega-one text-5xl md:text-6xl text-lightPink leading-tight mb-4">
                Begin Your Healing Journey
              </h1>
              <h2 className="text-3xl md:text-4xl text-orangeHeader font-normal mb-6">
                15-Minute Consultation Session
              </h2>
              <div className="h-1 w-24 bg-lightPink mx-auto rounded-full mb-6"></div>
              <p className="text-textColor text-lg md:text-xl max-w-2xl mx-auto">
                Take the first step toward personal growth and emotional
                wellbeing with a free consultation session.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Main content */}
        <section className="px-4 pb-16 relative z-10">
          <div className="container mx-auto max-w-5xl">
            {/* Why Get a Consultation */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden mb-10"
            >
              <div className="bg-gradient-to-r from-lightPink to-orangeHeader p-6 text-white">
                <h2 className="text-2xl font-semibold">
                  Why Get a Consultation?
                </h2>
              </div>
              <div className="p-6 md:p-8">
                <p className="text-textColor mb-6">
                  Starting therapy is a significant step, and finding the right
                  therapist is crucial for your progress. The consultation
                  provides a space for us to meet, discuss your needs, and
                  determine if we're a good fit for working together.
                </p>

                <div className="grid md:grid-cols-3 gap-6 mt-4">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="bg-whiteBg rounded-lg p-5 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-lightPink opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
                    <h3 className="text-lightPink font-semibold text-xl mb-3">
                      No Commitment
                    </h3>
                    <p>
                      This is a no-obligation conversation to get to know each
                      other before committing to ongoing therapy.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="bg-whiteBg rounded-lg p-5 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orangeHeader opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
                    <h3 className="text-orangeHeader font-semibold text-xl mb-3">
                      Ask Questions
                    </h3>
                    <p>
                      You can ask about my approach, experience, and how therapy
                      might help with your specific concerns.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="bg-whiteBg rounded-lg p-5 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-lightPink opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
                    <h3 className="text-lightPink font-semibold text-xl mb-3">
                      Clarity & Direction
                    </h3>
                    <p>
                      Gain clarity on what therapy involves and how we might
                      work together toward your goals.
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* What to Expect */}
            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="bg-white rounded-xl shadow-md p-6 md:p-8 border-l-4 border-orangeHeader relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-orangeHeader opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
                <h2 className="text-2xl text-orangeHeader font-semibold mb-4 relative z-10">
                  What We'll Discuss
                </h2>
                <ul className="space-y-3">
                  {[
                    "Your current challenges and what brings you to therapy",
                    "Your goals and what you hope to achieve",
                    "My therapeutic approach and how I might help",
                    "Practical matters like session format, frequency, and fees",
                    "Any questions or concerns you might have",
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-lightPink rounded-full flex items-center justify-center text-white font-medium mt-0.5">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="bg-white rounded-xl shadow-md p-6 md:p-8 border-l-4 border-lightPink relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-lightPink opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
                <h2 className="text-2xl text-lightPink font-semibold mb-4 relative z-10">
                  My Approach
                </h2>
                <p className="mb-4">
                  As an internationally qualified psychotherapist with a
                  Master's degree in Counseling for Mental Health and Wellness
                  from NYU, I bring experience in:
                </p>
                <ul className="space-y-3">
                  {[
                    "Anxiety and depression management",
                    "Adolescent and young adult therapy (my sub-specialty)",
                    "Substance abuse and crisis counseling",
                    "Person-centered, collaborative therapy",
                    "CBT and psychodynamic modalities",
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.9 + i * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 text-lightPink">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Book Your Session */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="bg-gradient-to-r from-orangeBg to-lightOrange rounded-xl shadow-md p-6 md:p-8 mt-8 text-textOnOrange"
            >
              <h2 className="text-2xl font-semibold mb-4 text-white">
                Ready to Begin?
              </h2>
              <p className="mb-6 text-white text-lg">
                Schedule your free 15-minute consultation today. This is your
                opportunity to ask questions, learn about my approach, and see
                if we're a good fit to work together on your journey toward
                healing and growth.
              </p>

              <div className="flex justify-center mt-8">
                <NavLink
                  to="https://calendly.com/fatimamohsintherapy/consultation"
                  className="inline-flex items-center gap-2 py-3 px-8 bg-white text-orangeHeader font-semibold rounded-full hover:bg-lightPink hover:text-white transition-all duration-300 transform hover:scale-105 shadow-md"
                >
                  <span>Book Your Free Consultation</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </NavLink>
              </div>

              {/* Added Home Navigation Link */}
              <div className="flex justify-center mt-4">
                <NavLink
                  to="/"
                  className="text-white font-medium hover:text-white hover:underline transition-all duration-300 flex items-center gap-1 py-2 px-4"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Back to Home</span>
                </NavLink>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

  // Booking confirmation view (when Calendly params are present)
  return (
    <div className="min-h-screen bg-whiteBg overflow-hidden relative">
      {/* Enhanced background decoration with more polka dots */}
      <Circle className="bg-lightPink opacity-10 w-64 h-64 -top-20 -left-20" />
      <Circle className="bg-orangeBg opacity-20 w-96 h-96 -bottom-40 -right-40" />
      <Circle className="bg-orangeHeader opacity-10 w-48 h-48 top-1/2 -left-24" />
      <Circle className="bg-lightPink opacity-15 w-32 h-32 top-40 right-20" />
      <Circle className="bg-orangeBg opacity-10 w-20 h-20 bottom-60 left-40" />
      <Circle className="bg-orangeHeader opacity-5 w-80 h-80 -top-40 right-1/4" />
      <Circle className="bg-lightPink opacity-10 w-16 h-16 bottom-20 left-1/4" />
      <Circle className="bg-orangeBg opacity-15 w-24 h-24 top-1/3 right-60" />

      {/* Banner */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 py-12 px-4"
      >
        <div className="container mx-auto">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-block bg-lightPink bg-opacity-20 text-lightPink px-4 py-1 rounded-full mb-4 font-medium">
              Booked Successfully
            </span>
            <h1 className="orelega-one text-5xl md:text-6xl text-lightPink leading-tight mb-4">
              Hi {fullName.split(" ")[0]}!
            </h1>
            <h2 className="text-3xl md:text-4xl text-orangeHeader font-normal mb-6">
              Your consultation is confirmed
            </h2>
            <div className="h-1 w-24 bg-lightPink mx-auto rounded-full mb-6"></div>
            <p className="text-textColor text-lg md:text-xl max-w-2xl mx-auto">
              We're looking forward to connecting with you. Below you'll find
              all the details you need for your upcoming session.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Main content */}
      <section className="px-4 pb-16 relative z-10">
        <div className="container mx-auto max-w-5xl">
          {/* Appointment card */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden mb-10 border-t-4 border-lightPink"
          >
            <div className="bg-gradient-to-r from-lightPink to-orangeHeader p-6 text-white">
              <h2 className="text-2xl font-semibold">
                Your Appointment Details
              </h2>
            </div>
            <div className="p-6 md:p-8 flex flex-wrap gap-6">
              {formattedDate && (
                <div className="bg-whiteBg p-4 rounded-lg flex-1 min-w-[200px]">
                  <p className="text-orangeText font-medium mb-1">Date</p>
                  <p className="text-xl font-semibold">{formattedDate}</p>
                </div>
              )}

              {formattedStart && formattedEnd && (
                <div className="bg-whiteBg p-4 rounded-lg flex-1 min-w-[200px]">
                  <p className="text-orangeText font-medium mb-1">Time</p>
                  <p className="text-xl font-semibold">
                    {formattedStart} – {formattedEnd}{" "}
                    <span className="text-sm">(PKT)</span>
                  </p>
                </div>
              )}

              <div className="bg-whiteBg p-4 rounded-lg flex-1 min-w-[200px]">
                <p className="text-orangeText font-medium mb-1">Duration</p>
                <p className="text-xl font-semibold">15 minutes</p>
              </div>

              <div className="bg-whiteBg p-4 rounded-lg flex-1 min-w-[200px]">
                <p className="text-orangeText font-medium mb-1">Therapist</p>
                <p className="text-xl font-semibold text-orangeHeader">
                  Fatima Mohsin Naqvi
                </p>
              </div>

              {email && (
                <div className="bg-whiteBg p-4 rounded-lg flex-1 min-w-[200px]">
                  <p className="text-orangeText font-medium mb-1">Your Email</p>
                  <p className="text-lg font-medium break-all">{email}</p>
                </div>
              )}

              {phone && (
                <div className="bg-whiteBg p-4 rounded-lg flex-1 min-w-[200px]">
                  <p className="text-orangeText font-medium mb-1">Your Phone</p>
                  <p className="text-lg font-medium">{phone}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Content cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* What to Expect */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="bg-white rounded-xl shadow-md p-6 md:p-8 border-l-4 border-orangeHeader relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-orangeHeader opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
              <h2 className="text-2xl text-orangeHeader font-semibold mb-4 relative z-10">
                What to Expect
              </h2>
              <p className="mb-4 text-textColor">
                This is a brief, no-obligation conversation to ensure that
                Fatima is the right fit and that your needs can be met within
                her practice. Together you will:
              </p>
              <ul className="space-y-2">
                {[
                  "Discuss your goals and concerns",
                  "Clarify how therapy works and ask questions",
                  "Decide on next steps and plan ongoing sessions if it feels right",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <span className="flex-shrink-0 w-6 h-6 bg-lightPink rounded-full flex items-center justify-center text-white font-medium mt-0.5">
                      {i + 1}
                    </span>
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* How to Prepare */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="bg-white rounded-xl shadow-md p-6 md:p-8 border-l-4 border-lightPink relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-lightPink opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
              <h2 className="text-2xl text-lightPink font-semibold mb-4 relative z-10">
                How to Prepare
              </h2>
              <ul className="space-y-3">
                {[
                  "Find a quiet, private space with stable internet",
                  "Use headphones for better audio quality",
                  "Note down key points you'd like to discuss—goals, questions, concerns",
                  "Give yourself a few minutes before and after to ground yourself",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <span className="flex-shrink-0 text-lightPink">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* After the Consultation */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="bg-gradient-to-r from-orangeBg to-lightOrange rounded-xl shadow-md p-6 md:p-8 mt-8 text-textOnOrange"
          >
            <h2 className="text-2xl font-semibold mb-4 text-white">
              After the Consultation
            </h2>
            <p className="mb-6 text-white text-lg">
              If both you and Fatima agree to proceed, you'll get an invite to
              our secure client dashboard—where you can book sessions, handle
              payments, and track your progress on your therapy journey.
            </p>

            <div className="flex justify-center mt-8">
              <NavLink
                to="/"
                className="inline-flex items-center gap-2 py-3 px-8 bg-white text-orangeHeader font-semibold rounded-full hover:bg-lightPink hover:text-white transition-all duration-300 transform hover:scale-105 shadow-md"
              >
                <span>Back to Home</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </NavLink>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ConsultationLanding;
