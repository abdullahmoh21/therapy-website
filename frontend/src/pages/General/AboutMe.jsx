import React from "react";

const About = () => {
  return (
    <>
      {/* About Me */}
      <section>
        {/* Heading and separator */}
        <div className="flex justify-center items-center pb-[10px]">
          <h1 className="orelega-one text-[50px] leading-[46px] text-[#E27A82] text-center w-full">
            About Me
          </h1>
        </div>
        <div className="flex justify-center pb-[20px]">
          <hr className="w-[900px] border-t-[6px] border-[#E27A82]" />
        </div>
        {/* About Me content */}
        <div className="h-auto bg-[#E09E7A] border rounded-3xl lg:mx-[80px] p-[20px]">
          <p className="text-[18px] leading-[28px] text-[#3d3b38]">
            Welcome! I’m Fatima Mohsin Naqvi, an internationally qualified
            psychotherapist with a Master’s degree in Counseling for Mental
            Health and Wellness from New York University (NYU). My journey in
            the field of mental health has been both diverse and rewarding,
            allowing me to work with a wide range of clients across various
            settings, including private practice, hospitals, schools, and mental
            health organizations.
          </p>
          <p className="text-[18px] leading-[28px] text-[#3d3b38] pt-[10px]">
            Choosing to begin therapy is a significant step, and finding the
            right therapist is crucial. I am dedicated to providing
            compassionate, professional, and individualized care to each of my
            clients. Whether you are dealing with anxiety, depression, substance
            abuse, or other life challenges, I am here to support you on your
            journey towards mental wellness and personal growth.
          </p>
        </div>
      </section>

      {/* Therapeutic Approach */}
      <section>
        {/* Heading and separator */}
        <div className="flex justify-center items-center pt-[80px] pb-[10px]">
          <h1 className="orelega-one text-[50px] leading-[46px] text-[#E27A82] text-center w-full">
            Therapeutic Approach
          </h1>
        </div>
        <div className="flex justify-center pb-[20px]">
          <hr className="w-[900px] border-t-[6px] border-[#E27A82]" />
        </div>
        {/* Therapeutic Approach content */}
        <div className="h-auto bg-[#E09E7A] border rounded-3xl lg:mx-[80px] p-[20px]">
          <p className="text-[18px] leading-[28px] text-[#3d3b38]">
            I believe that effective therapy is a collaborative process, one
            where the client and therapist work together to achieve the best
            outcomes. My approach is rooted in the following principles:
          </p>
          <ul className="list-disc pl-[20px] mt-[10px] text-[#3d3b38]">
            <li className="mb-[10px]">
              <strong>Person-Centered Therapy:</strong> At the heart of my
              practice is a person-centered approach, which emphasizes empathy,
              unconditional positive regard, and genuine support. I strive to
              create a safe and non-judgmental space where clients feel heard
              and understood.
            </li>
            <li className="mb-[10px]">
              <strong>Tailored Interventions:</strong> While I am proficient in
              Cognitive Behavioral Therapy (CBT) and Psychodynamic Therapy, I
              prioritize tailoring my therapeutic methods to fit the unique
              needs of each client. This flexibility allows for a more
              personalized and effective treatment plan.
            </li>
            <li className="mb-[10px]">
              <strong>Relational Work:</strong> I am passionate about relational
              work, which involves understanding and improving the dynamics
              within personal relationships. This approach is particularly
              beneficial for adolescents and young adults as they navigate
              complex social and emotional landscapes.
            </li>
          </ul>
        </div>
      </section>
    </>
  );
};

export default About;
