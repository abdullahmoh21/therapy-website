import React from "react";

import aboutMe_hero from "../../assets/images/aboutMe_hero.png";

const About = () => {
  return (
    <>
      <section className=" home-bg h-[663px]">
        <h1 className="text-[51.27px] font-bold text-[#c45e3e] text-center pb-3">
          About Me
        </h1>
        <div className="w-full flex flex-row items-center justify-center">
          <img
            src={aboutMe_hero}
            height={480}
            width={456}
            alt="Fatima Mohsin's Picture"
          />
        </div>
      </section>

      {/* ------ First Orange Section ------- */}
      <section className="bg-[#c45e3e] h-[663px]">
        <div className="w-full">
          <h1 className="text-[51.27px] text-center font-bold text-white mx-auto w-full pb-[60px]">
            Why Choose me?
          </h1>

          {/* Paragraph */}
          <div className="mr-[76px] ml-[76px]">
            <p className="text-[19px] text-white text-left w-full pb-[20px]">
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry. Lorem Ipsum has been the industry's standard dummy text
              ever since the 1500s, when an unknown printer took a galley of
              type and scrambled it to make a type specimen book. It has
              survived not only five centuries, but also the leap into
              electronic typesetting, remaining essentially unchanged. It was
              popularised in the 1960s with the release of Letraset sheets
              containing Lorem Ipsum passages, and more recently with desktop
              publishing software like Aldus PageMaker including versions of
              Lorem Ipsum.
            </p>
            <p className="text-[19px] text-white text-left w-full">
              It is a long established fact that a reader will be distracted by
              the readable content of a page when looking at its layout. The
              point of using Lorem Ipsum is that it has a more-or-less normal
              distribution of letters, as opposed to using 'Content here,
              content here', making it look like readable English. Many desktop
              publishing packages and web page editors now use Lorem Ipsum as
              their default model text, and a search for 'lorem ipsum' will
              uncover many web sites still in their infancy. Various versions
              have evolved over the years, sometimes by accident, sometimes on
              purpose (injected humour and the like).
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default About;
