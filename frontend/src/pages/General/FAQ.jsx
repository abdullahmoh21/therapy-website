import React from "react";
import Faq from "react-faq-component";
import { motion } from "framer-motion"; // You'll need to install framer-motion

// FAQ Data
export const data = {
  title: "",
  rows: [
    /* ────────────────────────────────────────────────────────────────── */
    {
      title: "How do I create an account?",
      content: `Start by booking a free 15-minute consultation with Fatima via this <a href="https://calendly.com/fatimamohsintherapy/consultation" target="_blank" rel="noopener noreferrer"><u>link</u></a>. If both you and Fatima decide to proceed, you'll receive an e-mail invitation to create your private dashboard account. Only invited clients can sign up.`,
    },
    /* ────────────────────────────────────────────────────────────────── */
    {
      title: "How do I book an appointment after I have an account?",
      content: `Log in to your dashboard and pick an available slot from the calendar. Because you're already verified, booking is instantaneous—no upfront payment is required.`,
    },
    /* ────────────────────────────────────────────────────────────────── */
    {
      title: "Do I need to pay for my appointment upfront?",
      content: `No. You may pay online any time before your session (preferred),or bring cash / arrange a bank transfer at the time of the appointment.`,
    },
    /* ────────────────────────────────────────────────────────────────── */
    {
      title: "What payment methods do you accept for sessions?",
      content: `Online payments: all major credit / debit cards processed securely via SafePay. Offline payments: cash or direct bank transfer during your visit.`,
    },
    /* ────────────────────────────────────────────────────────────────── */
    {
      title: "What is your cancellation and refund policy?",
      content: `You may cancel without penalty if you do so no later than the notice period displayed in your dashboard.  Cancellations made after that window and all no-shows are non-refundable. More info <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer"><u>here</u></a> `,
    },
    /* ────────────────────────────────────────────────────────────────── */
    {
      title: "What happens if I miss my appointment?",
      content: `A missed session (no-show) is treated the same as a late cancellation: the session fee is non-refundable. You will need to settle this fee before booking another slot.`,
    },
    /* ────────────────────────────────────────────────────────────────── */
    {
      title: "Can I reschedule my appointment instead of cancelling?",
      content: `Yes—if you reschedule before the required notice period no additional fee is charged and your existing payment (if any) simply moves to the new slot.`,
    },
    /* ────────────────────────────────────────────────────────────────── */
    {
      title: "How long does a therapy session last?",
      content: `Standard sessions run 45–60 minutes. Assessment or specialized sessions may be longer; any variance will be shown in the calendar slot before you confirm.`,
    },
    /* ────────────────────────────────────────────────────────────────── */
    {
      title: "Are my personal and payment details secure?",
      content: `Absolutely. Your dashboard is invitation-only, uses SSL encryption, and card payments are processed by SafePay in compliance with State Bank of Pakistan requirements. We never store full card numbers on our servers.`,
    },
    /* ────────────────────────────────────────────────────────────────── */
    {
      title: "Do you offer online or in-person sessions?",
      content: `Both. You can select your preference (video or in-person) while booking. If you choose in-person, the session will be held at Fatima's Lahore practice.`,
    },
  ],
};
// FAQ Styles
const styles = {
  bgColor: "transparent",
  titleTextColor: "#c45e3e",
  rowTitleColor: "#c45e3e",
  rowContentColor: "#68554f",
  rowTitleTextSize: "18px", // Reduced from 22px
  rowContentTextSize: "16px", // Reduced from 19px to match text-base
  rowContentPaddingRight: "30px",
  rowContentPaddingLeft: "0px",
};
// FAQ Config
const config = {
  animate: true,
  tabFocus: true,
  openOnload: 0,
  expandIcon: "+",
  collapseIcon: "-",
  htmlParsing: true, // Enable HTML parsing
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
          <p className="text-base md:text-lg text-textColor mb-6">
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
