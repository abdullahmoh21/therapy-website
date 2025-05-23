import React from "react";
import service_hero from "../../assets/images/servicesImage.png";

const Services = () => {
  return (
    <>
      {/* ------ Heading------- */}
      <section className="w-full main-bg pt-[40px]">
        <div className="flex justify-center items-center">
          <h1 className="orelega-one text-[50px] md:text-[76.9px] leading-[57.5px] text-[#BD704C] text-center w-full">
            Services
          </h1>
        </div>
      </section>

      {/* ------ Services Break Down ------- */}
      <section className="main-bg w-full flex flex-col items-center pt-[60px] space-y-10">
        {/* INDIVIDUAL THERAPY */}
        <div className="flex flex-col md:flex-row justify-center px-[20px] md:px-[100px] space-y-[20px] md:space-y-0 md:space-x-[20px] w-full max-w-6xl">
          <div className="Service flex-1 max-w-[400px] text-center md:text-left">
            <h1 className="orelega-one text-[47.5px] md:text-[40px] leading-[40px] text-[#5C4E36] pb-[5px]">
              Individual
              <br />
              Psychotherapy
            </h1>
            <p className="hidden md:block text-[40px] md:text-[20px] text-[#5C4E36]">
              ONLINE & IN PERSON
            </p>
            <p className="lg:text-[20px] text-[17.5px] text-[#5C4E36]">
              Per Session Rate: 8000 pkr, 60 MINUTES
            </p>
          </div>

          <div className="Service-description flex-1 max-w-[600px] flex items-center">
            <p className="text-[22.5px] md:text-[20px] text-[#393224] text-justify">
              Individual psychotherapy is a one-on-one session between the
              therapist and the client, focusing on personal issues and mental
              health concerns. It aims to help clients understand their
              emotions, develop coping strategies, and work through challenges
              such as anxiety, depression, or trauma.
            </p>
          </div>
        </div>
        {/* ADOLESCENT THERAPY */}
        <div className="flex flex-col md:flex-row justify-center px-[20px] md:px-[100px] space-y-[20px] md:space-y-0 md:space-x-[20px] w-full max-w-6xl">
          <div className="Service flex-1 max-w-[400px] text-center md:text-left">
            <h1 className="orelega-one text-[40px] leading-[40px] text-[#5C4E36] pb-[5px]">
              Adolescent
              <br />
              Psychotherapy
            </h1>
            <p className="hidden md:block text-[17.5px] md:text-[20px] text-[#5C4E36]">
              ONLINE & IN PERSON
            </p>
            <p className="lg:text-[20px] text-[17.5px] text-[#5C4E36]">
              Per Session Rate: 8000 pkr, 60 MINUTES
            </p>
          </div>

          <div className="Service-description flex-1 max-w-[600px] flex items-center">
            <p className="text-[22.5px] md:text-[20px] text-[#393224] text-justify">
              Adolescent psychotherapy provides a supportive environment for
              teenagers to explore their thoughts and feelings, addressing
              issues unique to their developmental stage. This type of therapy
              helps adolescents navigate challenges like peer pressure, academic
              stress, and identity formation, fostering emotional resilience and
              healthy coping mechanisms.
            </p>
          </div>
        </div>
        {/* COUPLES THERAPY */}
        <div className="flex flex-col md:flex-row justify-center px-[20px] md:px-[100px] space-y-[20px] md:space-y-0 md:space-x-[20px] w-full max-w-6xl">
          <div className="Service flex-1 max-w-[400px] text-center md:text-left">
            <h1 className="orelega-one text-[40px] leading-[40px] text-[#5C4E36] pb-[5px]">
              Couples
              <br />
              Psychotherapy
            </h1>
            <p className="hidden md:block text-[17.5px] md:text-[20px] text-[#5C4E36]">
              ONLINE & IN PERSON
            </p>
            <p className="lg:text-[20px] text-[17.5px] text-[#5C4E36]">
              Per Session Rate: 8000 pkr, 60 MINUTES
            </p>
          </div>

          <div className="Service-description flex-1 max-w-[600px] flex items-center">
            <p className="text-[22.5px] md:text-[20px] text-[#393224] text-justify">
              Couples psychotherapy is designed to help partners improve their
              relationship dynamics and resolve conflicts. Through guided
              sessions, couples learn effective communication skills, understand
              each other's perspectives, and work towards rebuilding trust and
              intimacy.
            </p>
          </div>
        </div>
      </section>

      {/* ------ Services Image ------- */}
      <section className="relative main-bg pt-[40px] md:pt-[100px]">
        <div className="flex flex-col lg:flex-row justify-end">
          <div className="flex flex-col justify-center lg:pr-[5px] lg:w-1/2 text-center lg:text-right">
            <h1 className="orelega-one text-3xl lg:text-[50px] leading-[1.25] lg:leading-[80px] pb-4 lg:pb-[90px] text-[#BD704C]">
              Guiding you towards <br />
              a more fulfilling <br />
              future.
            </h1>
          </div>
          <img
            src={service_hero}
            alt="Service Image"
            className="w-full lg:w-1/2 object-cover z-[20] shadow-md"
          />
        </div>
        {/* Colored lines (only visible on lg screens) */}
        <div className="hidden lg:block absolute bottom-0 left-0 w-full">
          <div className="bg-[#E09E7A] h-20"></div>
          <div className="bg-[#E27A82] h-5"></div>
        </div>
      </section>
    </>
  );
};

export default Services;
