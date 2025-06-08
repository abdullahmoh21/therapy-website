import React from "react";
import { motion } from "framer-motion"; // You'll need to install framer-motion

const About = () => {
  const credentials = [
    {
      name: "Master's in Counseling",
      institution: "New York University (NYU)",
    },
    {
      name: "Certified Psychotherapist",
      institution: "International Board of Certification",
    },
    {
      name: "Specialized Training",
      institution: "Adolescent & Young Adult Therapy",
    },
  ];

  return (
    <div className="about-page-container main-bg">
      {/* About Me */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="pt-[40px]"
      >
        {/* Heading and separator */}
        <div className="flex justify-center items-center pb-[10px]">
          <h1 className="orelega-one text-4xl md:text-5xl text-lightPink text-center w-full">
            About Me
          </h1>
        </div>
        <div className="flex justify-center pb-[20px]">
          <hr className="w-32 border-t-[4px] border-lightPink" />
        </div>

        {/* About Me content */}
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="h-auto bg-orangeBg border rounded-3xl lg:mx-[80px] p-[30px] shadow-md"
          >
            <p className="text-base md:text-lg text-textOnOrange">
              Welcome! I'm Fatima Mohsin Naqvi, an internationally qualified
              psychotherapist with a Master's degree in Counseling for Mental
              Health and Wellness from New York University (NYU). My journey in
              the field of mental health has been both diverse and rewarding,
              allowing me to work with a wide range of clients across various
              settings, including private practice, hospitals, schools, and
              mental health organizations.
            </p>
            <p className="text-base md:text-lg text-textOnOrange pt-[10px]">
              Choosing to begin therapy is a significant step, and finding the
              right therapist is crucial. I am dedicated to providing
              compassionate, professional, and individualized care to each of my
              clients. Whether you are dealing with anxiety, depression,
              substance abuse, or other life challenges, I am here to support
              you on your journey towards mental wellness and personal growth.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Credentials Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        viewport={{ once: true }}
        className="py-16 main-bg"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="orelega-one text-2xl md:text-3xl text-center text-orangeHeader mb-10">
            Credentials & Qualifications
          </h2>
          <div className="grid md:grid-cols-3 gap-6 px-6">
            {credentials.map((credential, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 + 0.2 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-lg shadow-md text-center border-t-4 border-lightPink"
              >
                <h3 className="text-orangeText text-bold text-lg mb-2">
                  {credential.name}
                </h3>
                <p className="text-textColor">{credential.institution}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Therapeutic Approach */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        viewport={{ once: true }}
      >
        {/* Heading and separator */}
        <div className="flex justify-center items-center pb-[10px]">
          <h1 className="orelega-one text-4xl md:text-5xl text-lightPink text-center w-full">
            Therapeutic Approach
          </h1>
        </div>
        <div className="flex justify-center pb-[20px]">
          <hr className="w-32 border-t-[4px] border-lightPink" />
        </div>

        {/* Therapeutic Approach content */}
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="h-auto bg-orangeBg border rounded-3xl lg:mx-[80px] p-[30px] shadow-md"
          >
            <p className="text-base md:text-lg text-textOnOrange">
              I believe that effective therapy is a collaborative process, one
              where the client and therapist work together to achieve the best
              outcomes. My approach is rooted in the following principles:
            </p>
            <ul className="list-disc pl-[20px] mt-[10px] text-textOnOrange">
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                viewport={{ once: true }}
                className="mb-[10px] text-base md:text-lg"
              >
                <strong>Person-Centered Therapy:</strong> At the heart of my
                practice is a person-centered approach, which emphasizes
                empathy, unconditional positive regard, and genuine support. I
                strive to create a safe and non-judgmental space where clients
                feel heard and understood.
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
                viewport={{ once: true }}
                className="mb-[10px] text-base md:text-lg"
              >
                <strong>Tailored Interventions:</strong> While I am proficient
                in Cognitive Behavioral Therapy (CBT) and Psychodynamic Therapy,
                I prioritize tailoring my therapeutic methods to fit the unique
                needs of each client. This flexibility allows for a more
                personalized and effective treatment plan.
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
                viewport={{ once: true }}
                className="mb-[10px] text-base md:text-lg"
              >
                <strong>Relational Work:</strong> I am passionate about
                relational work, which involves understanding and improving the
                dynamics within personal relationships. This approach is
                particularly beneficial for adolescents and young adults as they
                navigate complex social and emotional landscapes.
              </motion.li>
            </ul>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};

export default About;
