import React from "react";
import fatima_hero from "../../assets/images/hero.webp"; // 7, 9(no pipe+filter = 0 / np pipe= 0f)
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const Home = () => {
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // Shared classes so the skeleton and the image are always the same size
  const heroFrameClasses =
    "rounded-lg border-4 border-lightPink shadow-lg " +
    // width scales up with screen size
    "w-[300px] sm:w-[320px] lg:w-[360px] xl:w-[400px] 2xl:w-[440px] " +
    // height slightly reduced on xl/2xl (fix)
    "h-[420px] sm:h-[460px] lg:h-[520px] xl:h-[540px] 2xl:h-[560px]";

  return (
    <>
      <section
        id="home"
        className="bg-whiteBg py-6 md:py-3 px-4 md:px-0 shadow-md"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="container mx-auto text-center"
        >
          <h1 className="orelega-one text-3xl md:text-5xl xl:text-5xl 2xl:text-6xl text-lightPink leading-tight">
            Empowering Your Journey
            <br />
            <span className="text-orangeHeader">To Wellness and Healing</span>
          </h1>
        </motion.div>
      </section>

      {/* Orange hero band – slightly shorter on xl/2xl (fix) */}
      <section
        className="bg-orangeBg h-auto px-4 md:px-0 py-6 lg:py-6
                   flex items-center
                   lg:min-h-[calc(100vh-220px)]
                   xl:min-h-[calc(100vh-250px)]
                   2xl:min-h-[calc(100vh-260px)]"
      >
        <div className="container mx-auto flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8">
          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:w-1/2 w-full flex justify-center items-center"
          >
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-lightPink opacity-20 -z-10 rounded-lg" />

              {!imageLoaded && (
                <div
                  className={"animate-pulse bg-lightPink " + heroFrameClasses}
                />
              )}

              <img
                src={fatima_hero}
                alt="Fatima Mohsin Picture"
                className={`${heroFrameClasses} object-cover object-top transition-opacity duration-300 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
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
            className="lg:w-1/2 w-full flex items-center text-textOnOrange"
          >
            <div
              className="text-base xl:text-lg 2xl:text-lg text-justify
                bg-whiteBg backdrop
                border-4 border-lightPink
                p-6 lg:p-7 xl:p-7 2xl:p-8 rounded-lg shadow-md
                w-full 
                lg:min-h-[520px] 
                xl:min-h-[540px] 
                2xl:min-h-[560px]
                flex flex-col"
            >
              <div className="mb-6">
                <p className="mb-4">
                  Fatima Mohsin Naqvi is an internationally qualified
                  psychotherapist with a Master’s degree in Counseling for
                  Mental Health and Wellness from NYU. She has worked across New
                  York and California in private practices, hospitals, schools,
                  and mental health organizations, with a focus on supporting
                  adolescents and young adults. In California, she received
                  training in suicide and crisis assessment, coordinated care
                  with police and mental health teams, and is trained to operate
                  the 988 suicide hotline.
                </p>

                <p className="mb-0">
                  Fatima takes a relational, person-centered approach to
                  therapy. With experience in CBT and psychodynamic modalities,
                  she works collaboratively with each client to find the
                  approach that best supports their needs. She offers therapy to
                  both domestic and international clients. If you’re interested
                  in working with her, please schedule a consultation below.
                </p>
              </div>

              <div className="mt-auto flex justify-center items-center flex-grow">
                <NavLink
                  to="/consultation"
                  className="inline-block py-2.5 px-8 bg-orangeButton text-buttonTextBlack border-2 border-black font-semibold rounded-full hover:bg-lightPink transition-all duration-300 transform hover:scale-105 shadow-md"
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
