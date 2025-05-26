import React from "react";
import fatima_hero from "../../assets/images/hero_5.png";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const Home = () => {
  return (
    <>
      <section id="home" className="bg-whiteBg py-4 px-4 md:px-0 shadow-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="container mx-auto text-center"
        >
          <h1 className="orelega-one text-4xl md:text-5xl text-lightPink leading-tight">
            Empowering Your Journey to <br className="hidden md:block" />
            <span className="text-orangeHeader">Wellness and Healing</span>
          </h1>
        </motion.div>
      </section>

      <section className="bg-orangeBg lg:h-[650px] h-auto relative overflow-hidden px-4 md:px-0 py-8">
        <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between h-full relative">
          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:w-1/2 w-full flex justify-end items-end mb-8 md:mb-0 h-full"
          >
            <div className="relative w-full h-full lg:px-7 lg:py-7 ">
              <div className="absolute inset-0 bg-lightPink opacity-20 transform translate-x-4 translate-y-4 -z-10 rounded-lg"></div>
              <img
                src={fatima_hero}
                alt="Fatima Mohsin Picture"
                className="h-full w-auto object-contain object-bottom border-4 border-lightPink shadow-lg rounded-lg relative z-10"
              />
            </div>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="lg:w-1/2 w-full flex items-center text-textOnOrange lg:px-5 lg:pl-10 lg:py-6 h-full"
          >
            <div className="text-base md:text-lg text-justify bg-white bg-opacity-30 p-6 rounded-lg shadow-sm w-full h-full flex flex-col justify-between">
              <div>
                <p className="mb-4">
                  Fatima Mohsin Naqvi is an internationally qualified
                  psychotherapist who has a Master's degree in Counseling for
                  Mental Health and Wellness from NYU. Fatima has experience in
                  substance abuse, crisis counseling, anxiety, depression, and
                  adolescent care. After her Masters she has worked in various
                  different settings such as private practice, hospitals,
                  schools, and mental health organizations. Fatima's sub
                  specialty is adolescents and young adults.
                </p>
                <p className="mb-4">
                  She is passionate about relational work and uses a person
                  centered approach to working with her clients. Fatima has
                  experience in CBT, Psycho-dynamic modalities but prefers to
                  work with the client to assess which works better for them.
                  Over the past years, she has practiced with the belief that
                  therapy facilitates the growth of clients when it is
                  collaborative rather than instructive.
                </p>
              </div>
              <div className="flex justify-center pt-4">
                <NavLink
                  to="https://calendly.com/fatimamohsintherapy/consultation"
                  className="inline-block py-3 px-10 bg-orangeButton text-buttonTextBlack border-2 border-black font-semibold rounded-full hover:bg-lightPink transition-all duration-300 transform hover:scale-105 shadow-md"
                >
                  Schedule a consultation
                </NavLink>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default Home;
