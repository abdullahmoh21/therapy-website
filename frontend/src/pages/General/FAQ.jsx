import React from "react";
import Faq from "react-faq-component";
import { motion } from "framer-motion"; // You'll need to install framer-motion

// FAQ Data
const data = {
  title: "",
  rows: [
    {
      title: "    How do I book an appointment?",
      content: `If you are a new client, simply navigate to our booking page and book a free 15 minute consultation. Follow the prompts to create a new account. For existing clients, log in to your account to book a new appointment. `,
    },
    {
      title: "    What payment methods do you accept for appointment bookings?",
      content: `We accept all major credit and debit cards for payments. You can securely enter your payment information during the booking process. Payment by Cash and Bank transfer are also available.`,
    },
    {
      title:
        "    Do I need to pay for my appointment upfront or after the session?",
      content: `We require payment upfront to confirm your appointment. This helps us ensure that our therapists' time is respected and allows for seamless scheduling.`,
    },
    {
      title: "    What happens if I miss my appointment?",
      content: `If you need to cancel your appointment, please do so 72 hours before your booking. If you cancel after this, you will not be eligible for a refund. Additionally, if you have not paid the cancellation fee, you will need to do so before booking another session. Please contact us directly for more information.`,
    },
    {
      title: "    Can I get a refund if I need to cancel my appointment?",
      content: `Our refund policy depends on the timing of your cancellation. If you cancel within 72 hours of your appointment, you are eligible to recieve a full refund.`,
    },
    {
      title: "    How long does an appointment typically last?",
      content:
        "Appointment durations may vary depending on the type of therapy session and individual needs. Generally, sessions last between 45 minutes to an hour. However, some specialized sessions or assessments may require longer durations.",
    },
  ],
};
// FAQ Styles
const styles = {
  bgColor: "transparent",
  titleTextColor: "#c45e3e",
  rowTitleColor: "#c45e3e",
  rowContentColor: "#68554f",
  rowTitleTextSize: "22px",
  rowContentTextSize: "19px",
  rowContentPaddingRight: "30px",
  rowContentPaddingLeft: "30px",
};
// FAQ Config
const config = {
  animate: true,
  tabFocus: true,
  openOnload: 0,
  expandIcon: "+",
  collapseIcon: "-",
};

const FAQ = () => {
  // Updated function to properly open the contact popup
  const openContactPopup = () => {
    if (typeof window.openContactPopup === "function") {
      window.openContactPopup();
    } else {
      console.warn(
        "Contact popup function not found. Make sure the Header component is mounted."
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="main-bg pt-16 pb-8"
    >
      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-[20px]">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h1 className="orelega-one text-4xl md:text-5xl text-center text-lightPink">
            Frequently Asked Questions
          </h1>
          <div className="w-24 h-1 bg-lightPink mx-auto mt-4"></div>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-white rounded-lg shadow-md p-8"
        >
          <Faq data={data} styles={styles} config={config} />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-textColor mb-6">
            Still have questions? Feel free to reach out.
          </p>
          <button
            onClick={openContactPopup}
            className="inline-block py-3 px-8 bg-orangeButton text-textOnOrange border-[2px] border-black font-semibold rounded-full hover:bg-lightPink transition-all duration-300 transform hover:scale-105 shadow-md"
          >
            Contact Me
          </button>
        </motion.div>
      </section>
    </motion.div>
  );
};

export default FAQ;
