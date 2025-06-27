import React from "react";
import fatima_hero from "../../assets/images/hero.webp"; // 7, 9(no pipe+filter = 0 / np pipe= 0f)
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const Home = () => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
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
        <div className="container mx-auto flex flex-col lg:flex-row lg:items-stretch items-center justify-between h-full relative">
          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:w-1/2 w-full flex justify-center items-center mb-8 md:mb-0 lg:h-full"
          >
            <div className="relative inline-block w-auto lg:h-full lg:flex lg:items-center">
              <div className="absolute inset-0 bg-lightPink opacity-20 -z-10 rounded-lg"></div>

              {/* Skeleton Loader */}
              {!imageLoaded && (
                <div
                  className="animate-pulse max-h-[450px] lg:max-h-none lg:h-[550px] w-[300px] lg:w-auto 
                  bg-lightPink rounded-lg shadow-inner border-2 border-lightPink"
                  style={{
                    aspectRatio: "2/3",
                    minWidth: "300px",
                  }}
                />
              )}

              <img
                src={fatima_hero}
                alt="Fatima Mohsin Picture"
                className={`max-h-[450px] lg:max-h-none lg:h-full w-auto object-contain object-bottom lg:object-cover border-4 border-lightPink shadow-lg rounded-lg relative z-10 transition-opacity duration-300 ${
                  imageLoaded ? "opacity-100" : "opacity-0 absolute"
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </div>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="lg:w-1/2 w-full flex items-center text-textOnOrange  h-full"
          >
            <div
              className="text-base text-justify
                bg-whiteBg backdrop
                border-4 border-lightPink
                p-6 lg:p-10 rounded-lg shadow-md
                w-full h-full flex flex-col justify-between"
            >
              <div>
                <p className="mb-4">
                  Fatima Mohsin Naqvi is an internationally qualified
                  psychotherapist who has a Master's degree in Counseling for
                  Mental Health and Wellness from NYU. After her master’s Fatima
                  worked in New York and California in various different
                  settings such as private practice, hospitals, schools, and
                  mental health organizations. Fatima's sub specialty is
                  adolescents and young adults. In California Fatima was trained
                  in suicide and crisis assessments coordinating care with
                  police, mental health professionals to provide for emergency
                  mental health care. She is trained in operating the 988
                  suicide hotline.
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
                <p>
                  Fatima provides therapy for both domestic and international
                  clients. If scheduling for an international time zone is
                  proving to be difficult on the website, please drop us a
                  message and our team will coordinate a time that works for
                  you.
                </p>
              </div>
              <div className="flex justify-center pt-4">
                <NavLink
                  to="/consultation"
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
