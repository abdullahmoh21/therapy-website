import React from "react";
import service_hero from "../../assets/images/servicesImage.webp";
import { motion } from "framer-motion";
import { useGetSessionPriceQuery } from "../../features/bookings/bookingApiSlice";

const Services = () => {
  const {
    data: sessionPrice,
    isLoading,
    isSuccess,
    isError,
  } = useGetSessionPriceQuery();

  // Function to render price based on API state
  const renderPrice = () => {
    if (isLoading) {
      return (
        <p className="text-textColor blur-sm animate-pulse">
          Per Session Rate: Loading... pkr, 60 Minutes
        </p>
      );
    } else if (isSuccess && sessionPrice) {
      return (
        <p className="text-textColor">
          Per Session Rate: {sessionPrice} pkr, 60 Minutes
        </p>
      );
    } else if (isError) {
      return <p className="text-textColor">60 Minutes</p>;
    }
  };

  return (
    <>
      {/* ------ Heading------- */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="w-full main-bg pt-[40px]"
      >
        <div className="flex justify-center items-center">
          <h1 className="orelega-one text-4xl md:text-5xl text-center text-lightPink">
            Services
          </h1>
        </div>
        <div className="flex justify-center pt-[10px]">
          <hr className="w-32 border-t-[4px] border-lightPink" />
        </div>
      </motion.section>

      {/* ------ Services Break Down ------- */}
      <section className="main-bg w-full flex flex-col items-center pt-[20px] space-y-10">
        {/* INDIVIDUAL THERAPY */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-center px-[20px] md:px-[100px] space-y-[20px] md:space-y-0 md:space-x-[20px] w-full max-w-6xl"
        >
          <div className="Service flex-1 max-w-[400px] text-center md:text-left">
            <h1 className="orelega-one text-2xl md:text-3xl leading-tight text-orangeHeader pb-[5px]">
              Individual
              <br />
              Psychotherapy
            </h1>
            <p className="hidden md:block text-textColor">Online & In Person</p>
            {renderPrice()}
            <div className="w-16 h-1 bg-lightPink mx-auto md:mx-0 my-3 hidden md:block"></div>
          </div>

          <div className="Service-description flex-1 max-w-[600px] flex items-center">
            <p className="text-[22.5px] md:text-[20px] text-textColor text-justify">
              Individual psychotherapy is a one-on-one session between the
              therapist and the client, focusing on personal issues and mental
              health concerns. It aims to help clients understand their
              emotions, develop coping strategies, and work through challenges
              such as anxiety, depression, or trauma.
            </p>
          </div>
        </motion.div>

        {/* ADOLESCENT THERAPY */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-center px-[20px] md:px-[100px] space-y-[20px] md:space-y-0 md:space-x-[20px] w-full max-w-6xl"
        >
          <div className="Service flex-1 max-w-[400px] text-center md:text-left">
            <h1 className="orelega-one text-2xl md:text-3xl leading-tight text-orangeHeader pb-[5px]">
              Adolescent
              <br />
              Psychotherapy
            </h1>
            <p className="hidden md:block text-textColor">Online & In Person</p>
            {renderPrice()}
            <div className="w-16 h-1 bg-lightPink mx-auto md:mx-0 my-3 hidden md:block"></div>
          </div>

          <div className="Service-description flex-1 max-w-[600px] flex items-center">
            <p className="text-[22.5px] md:text-[20px] text-textColor text-justify">
              Adolescent psychotherapy provides a supportive environment for
              teenagers to explore their thoughts and feelings, addressing
              issues unique to their developmental stage. This type of therapy
              helps adolescents navigate challenges like peer pressure, academic
              stress, and identity formation, fostering emotional resilience and
              healthy coping mechanisms.
            </p>
          </div>
        </motion.div>

        {/* COUPLES THERAPY */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-center px-[20px] md:px-[100px] space-y-[20px] md:space-y-0 md:space-x-[20px] w-full max-w-6xl"
        >
          <div className="Service flex-1 max-w-[400px] text-center md:text-left">
            <h1 className="orelega-one text-2xl md:text-3xl leading-tight text-orangeHeader pb-[5px]">
              Couples
              <br />
              Psychotherapy
            </h1>
            <p className="hidden md:block text-textColor">Online & In Person</p>
            {renderPrice()}
            <div className="w-16 h-1 bg-lightPink mx-auto md:mx-0 my-3 hidden md:block"></div>
          </div>

          <div className="Service-description flex-1 max-w-[600px] flex items-center">
            <p className="text-[22.5px] md:text-[20px] text-textColor text-justify">
              Couples psychotherapy is designed to help partners improve their
              relationship dynamics and resolve conflicts. Through guided
              sessions, couples learn effective communication skills, understand
              each other's perspectives, and work towards rebuilding trust and
              intimacy.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ------ Services Image ------- */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="relative main-bg pt-[20px] md:pt-[80px]"
      >
        <div className="flex flex-col lg:flex-row justify-end">
          <div className="flex flex-col justify-center lg:pr-[5px] lg:w-1/2 text-center lg:text-right px-4 lg:px-0">
            <h1 className="orelega-one text-4xl sm:text-5xl lg:text-5xl leading-tight text-orangeHeader pb-4 lg:pb-[90px] lg:mr-5 lg:leading-[50px]">
              Guiding you towards <br />
              a more fulfilling <br />
              future.
            </h1>
          </div>
          <div className="w-full lg:w-1/2">
            <img
              src={service_hero}
              alt="Service Image"
              className="w-full object-cover z-[20] shadow-md"
            />
          </div>
        </div>
        {/* Colored lines (only visible on lg screens) */}
        <div className="hidden lg:block absolute bottom-0 left-0 w-full">
          <div className="bg-orangeBg h-20"></div>
          <div className="bg-lightPink h-5"></div>
        </div>
      </motion.section>
    </>
  );
};

export default Services;
