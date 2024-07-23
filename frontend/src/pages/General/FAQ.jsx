import React from "react";
import Faq from "react-faq-component";

// FAQ Data
const data = {
  title: "",
  rows: [
    {
      title: "    How do I book an appointment?",
      content: `If you are a new client, simply navigate to our booking page and select your preferred date, and time slot. Follow the prompts to complete the booking process. For existing clients, log in to your account to book a new appointment. `,
    },
    {
      title: "    What payment methods do you accept for appointment bookings?",
      content: `We accept all major credit and debit cards for appointment bookings. You can securely enter your payment information during the booking process. Payment by Cash and Bank transfer are also available. A 10% discount is available for Online payments.`,
    },
    {
      title:
        "    Do I need to pay for my appointment upfront or after the session?",
      content: `We require payment upfront to confirm your appointment. This helps us ensure that our therapists' time is respected and allows for seamless scheduling.`,
    },
    {
      title: "    What happens if I miss my appointment?",
      content: `If you miss your appointment without canceling in advance, you may be subject to our cancellation policy, which could include a fee. Please contact us directly for more information.`,
    },
    {
      title: "    Can I get a refund if I need to cancel my appointment?",
      content: `Our refund policy depends on the timing of your cancellation. If you cancel within 24 hours of your appointment, you may be eligible for a refund.`,
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
  arrowColor: "#68554f",
};
// FAQ Config
const config = {
  animate: true,
  // tabFocus: true
};
const FAQ = () => {
  return (
    <>
      {/* FAQ Section */}
      <section className="main-bg min-h-[663px] pb-[40px]">
        <h1 className="text-[32px] leading-[46px] font-bold text-center text-[#c45e3e]">
          Frequently Asked Questions
        </h1>

        <div>
          <Faq data={data} styles={styles} config={config} />
        </div>
      </section>
    </>
  );
};

export default FAQ;