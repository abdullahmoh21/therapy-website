import React from "react";
import fatima_hero from "../../assets/images/fatima_hero1.png";
import { NavLink } from "react-router-dom";

const Home = () => {
  return (
    <>
      <section id="home" className="bg-[#FFEDE8] py-10 px-4 md:px-0">
        <div className="container mx-auto text-center">
          <h1 className="orelega-one lg:text-[50px] text-3xl text-[#BC714D]">
            Empowering Your Journey to Wellness and Healing
          </h1>
        </div>
      </section>

      <section className="bg-[#E09E7A] lg:h-[650px] h-[1200px] relative px-4 md:px-0">
        <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between relative">
          {/* Hero Image */}
          <div className="lg:w-1/2 w-full relative flex lg:items-end  justify-center mb-4 md:mb-0">
            <div className="lg:pt-[50px] lg:pl-[30px] pt-[30px]">
              <img
                src={fatima_hero}
                alt="Fatima Mohsin Picture"
                className="w-auto h-[600px] object-cover border-[#E27A82] lg:border-[0px] border-[4px] md:mb-0 mb-4"
              />
            </div>
          </div>
          {/* Description */}
          <div className="lg:w-1/2 w-full flex items-center text-[#3D3B38] lg:px-5 lg:pl-10 lg:py-6">
            <div className="text-base md:text-lg mb-4 text-justify">
              <p className="mb-4">
                Fatima Mohsin Naqvi is an internationally qualified
                psychotherapist who has a Master's degree in Counseling for
                Mental Health and Wellness from NYU. Fatima has experience in
                substance abuse, crisis counseling, anxiety, depression, and
                adolescent care. After her Masters she has worked in various
                different settings such as private practice, hospitals, schools,
                and mental health organizations. Fatima's sub specialty is
                adolescents and young adults.
              </p>
              <p className="mb-4">
                She is passionate about relational work and uses a person
                centered approach to working with her clients. Fatima has
                experience in CBT, Psycho-dynamic modalities but prefers to work
                with the client to assess which works better for them. Over the
                past years, she has practiced with the belief that therapy
                facilitates the growth of clients when it is collaborative
                rather than instructive.
              </p>
              <div className="flex justify-center lg:pt-[40px] pt-[40px]">
                {" "}
                {/* Apply vertical padding on mobile only */}
                <NavLink
                  to="https://calendly.com/fatimamohsintherapy/consultation"
                  className="inline-block py-3 px-10 bg-[#C88B6E] text-[#313131] border-[2px] border-[#000000] font-semibold rounded-full hover:bg-[#E27983] transition"
                >
                  Schedule a consultation
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
