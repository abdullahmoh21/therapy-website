import React from "react";
import Faq from "react-faq-component";
import service_hero from '../assets/images/services_hero.png';

// TODO:
//      1. Make a Contact Form underneath the FAQ section
//      2. Add a Google Maps API to show the location of the clinic



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
          content:
              `We accept all major credit and debit cards for appointment bookings. You can securely enter your payment information during the booking process. Payment by Cash and Bank transfer are also available. A 10% discount is available for Online payments.`,
      },
      {
          title: "    Do I need to pay for my appointment upfront or after the session?",
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
        "title": "    How long does an appointment typically last?",
        "content": "Appointment durations may vary depending on the type of therapy session and individual needs. Generally, sessions last between 45 minutes to an hour. However, some specialized sessions or assessments may require longer durations."
      },
  ],
};
// FAQ Styles
const styles = {
  bgColor: 'transparent',
  titleTextColor: "#c45e3e",
  rowTitleColor: "#c45e3e",
  rowContentColor: '#68554f',
  rowTitleTextSize: '22px',
  rowContentTextSize: '19px',
  rowContentPaddingRight: "30px",
  rowContentPaddingLeft: "30px",
  arrowColor: "#68554f",

};
// FAQ Config
const config = {
  animate: true,
  // tabFocus: true
};

const Services = () => {
  return (
    <>
    {/* ------ Hero Section ------- */}
    <section className='2xl:h-[800px] w-full home-bg'>
        <div className='flex justify-center items-center'>
          <div className='container flex flex-row justify-center w-full'>
            {/* ----- Hero Text ------- */}
            <div className='flex items-center'>
              <div className='flex flex-col lg:flex-row gap-[90px] items-center justify-between'>
                <div>
                  <div className='lg:w-[570px] ml-[40px]'>
                    <h1 className='text-[61.52px] leading-[46px] font-semibold text-[#c45e3e] mr-[200px] w-full'>Psychotherapy</h1>
                    <h2 className='text-[22.8px] leading-[46px] text-[#c45e3e] mr-[200px] w-full pb-3'>For Individuals, Couples, and Adolescents</h2>
                  </div>
                </div>
              </div>
            </div>
             {/* ----- Hero Image ------- */}
             <div className='flex items-center'>
              <img src={service_hero} height={808} width={520} alt="Fatima Mohsin Picture" />
            </div>
          </div>
        </div>
      </section>

      {/* ------ Service Description (Orange Section) ------- */}
      <section className='bg-[#c45e3e] h-[663px] w-full flex items-center'>
        <div className="flex flex-col items-center space-y-10 w-full">
          {/* INDIVIDUAL THERAPY */}
          <div className="flex flex-row justify-center pl-[100px] pr-[100px]">
            <div className="Service pr-[150px]">
              <h1 className='text-[32px] leading-[46px] font-bold text-white'>Individual </h1>
              <h1 className='text-[32px] leading-[46px] font-bold text-white'>Psychotherapy </h1>
              <p className="text-[14px] text-white">ONLINE & IN PERSON </p>
              <p className="text-[14px] text-white">Per Session Rate: 5000 pkr, 60 MINUTES</p>
            </div>

            <div className="Service-description w-[300px]">
              <p className="text-[16px] text-white">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.
              </p>
            </div>
          </div>
          {/* ADOLESCENT THERAPY */}
          <div className="flex flex-row justify-center pl-[100px] pr-[100px] ">
            <div className="Service pr-[150px]">
              <h1 className='text-[32px] leading-[46px] font-bold text-white'>Adolescent </h1>
              <h1 className='text-[32px] leading-[46px] font-bold text-white'>Psychotherapy </h1>
              <p className="text-[14px] text-white">ONLINE & IN PERSON </p>
              <p className="text-[14px] text-white">Per Session Rate: 5000 pkr, 60 MINUTES</p>
            </div>

            <div className="Service-description w-[300px]">
              <p className="text-[16px] text-white">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.
              </p>
            </div>
          </div>
          {/* COUPLES THERAPY */}
          <div className="flex flex-row justify-center pl-[100px] pr-[100px] ">
            <div className="Service  pr-[150px]">
              <h1 className='text-[32px] leading-[46px] font-bold text-white'>Couples </h1>
              <h1 className='text-[32px] leading-[46px] font-bold text-white'>Psychotherapy </h1>
              <p className="text-[14px] text-white">ONLINE & IN PERSON </p>
              <p className="text-[14px] text-white">Per Session Rate: 5000 pkr, 60 MINUTES</p>
            </div>

            <div className="Service-description w-[300px]">
              <p className="text-[16px] text-white">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.
              </p>
            </div>
          
          </div>

        </div>
      </section>
      {/* FAQ Section */}
      <section className='home-bg min-h-[663px]'>
      <h1 className='text-[32px] leading-[46px] font-bold text-center text-[#c45e3e]'>Frequently Asked Questions </h1>

        <div>
            <Faq
                data={data}
                styles={styles}
                config={config}
            />
        </div>
      </section>




    </>



  );
};
export default Services;
