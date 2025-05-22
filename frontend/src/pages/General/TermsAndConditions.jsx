import React from "react";
import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import logo from "../../assets/images/logo.png";

const TermsAndConditions = () => {
  return (
    <>
      <section
        id="terms-title"
        className="bg-whiteBg py-4 px-4 md:px-0 shadow-md"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="container mx-auto text-center"
        >
          <NavLink to="/" className="inline-block mb-4">
            <img src={logo} alt="Logo" className="h-[90px] mx-auto" />
          </NavLink>
          <h1 className="orelega-one text-4xl md:text-5xl text-lightPink leading-tight">
            Terms and Conditions
          </h1>
        </motion.div>
      </section>

      <section id="terms-content" className="bg-whiteBg px-4 md:px-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="container mx-auto"
        >
          <div className="bg-whiteBg p-6 md:p-8 rounded-lg shadow-lg text-textOnWhite">
            <p className="mb-4 text-lg">
              Welcome to Fatima Mohsin Naqvi’s website (the “Site”). These Terms
              and Conditions govern your access to and use of:
            </p>
            <ul>
              <li>
                The public-facing pages describing Fatima’s therapy services,
                qualifications, photo, and current rates; and
              </li>
              <li>
                The private client dashboard (the “Dashboard”), accessible only
                by invitation, where clients can schedule sessions and make
                payments.
              </li>
            </ul>
            <p>
              By using any part of this Site or Dashboard, you agree to these
              Terms. If you do not agree, please do not access or use our
              services.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              1. Definitions
            </h2>
            <p>
              <strong>“Client”</strong> means you, the individual using the Site
              or Dashboard. <strong>“We”</strong>, <strong>“Us”</strong> or{" "}
              <strong>“Fatima”</strong> refers to Fatima Mohsin Naqvi.{" "}
              <strong>“SafePay”</strong> and{" "}
              <strong>“State Bank Standards”</strong> refer to the payment
              processing requirements set by SafePay and the State Bank of
              Pakistan.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              2. Public Site Use
            </h2>
            <p>
              You may browse our public-facing pages for personal,
              non-commercial information about Fatima’s therapy services,
              qualifications and rates. You agree not to:
            </p>
            <ul>
              <li>Transmit malicious code or spam;</li>
              <li>Attempt to hack or disrupt any part of the Site;</li>
              <li>Infringe on any intellectual property rights;</li>
              <li>
                Or otherwise misuse the Site in violation of applicable law.
              </li>
            </ul>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              3. Dashboard Access & Booking
            </h2>
            <p>
              Access to the private Dashboard is by invitation only. In the
              Dashboard you can:
            </p>
            <ul>
              <li>View your profile and past session history;</li>
              <li>
                Schedule new therapy sessions via Calendly. By booking you agree
                that your name, email, appointment date/time, and any notes you
                provide will be stored by Calendly in accordance with their
                privacy policy.
              </li>
            </ul>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              4. Payments & Refunds
            </h2>
            <p>
              Clients may pay for sessions either:
              <ol type="a">
                <li>Online using SafePay (credit/debit card); or</li>
                <li>In person, by cash.</li>
              </ol>
            </p>
            <p>
              <strong>No-Show Policy:</strong> If you do not attend your
              scheduled session (a “no-show”), you will not be eligible for a
              refund.
            </p>
            <p>
              <strong>Cancellation & Refunds:</strong> To receive a refund, you
              must cancel at least <strong>[X] days</strong> before your
              session. The required notice period may be adjusted by us at any
              time; any change will be communicated to you via email or in your
              Dashboard.
            </p>
            <p>
              By paying through SafePay, you agree that we may share your
              payment information with the SafePay service provider, and we
              comply with State Bank Standards for secure payment processing.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              5. Intellectual Property
            </h2>
            <p>
              All content on the Site and Dashboard—text, images, logos,
              downloads—are owned by Fatima or licensed to her and protected by
              copyright. You may view and print copies for personal use only;
              any other reproduction or distribution is prohibited.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              6. Disclaimer & Limitation of Liability
            </h2>
            <p>
              THIS SITE AND ALL SERVICES ARE PROVIDED “AS IS” WITHOUT WARRANTY
              OF ANY KIND. Fatima will not be liable for any indirect,
              incidental, or consequential damages arising out of your use of
              the Site, Dashboard, or the therapy services.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              7. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of Pakistan. Any dispute will
              be resolved exclusively in the courts of Lahore, Pakistan.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              8. Changes to These Terms
            </h2>
            <p>
              We may update these Terms at any time by posting the revised
              version here. It is your responsibility to review this page
              periodically. By continuing to use the Site or Dashboard after
              changes are posted, you accept the new Terms.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              9. Contact Information
            </h2>
            <p>
              For questions about these Terms, please email us at{" "}
              <a href="mailto:fatimamohsin40@gmail.com">
                fatimamohsin40@gmail.com
              </a>{" "}
              or call +92 333 4245151. Full contact details are on our Contact
              Us page.
            </p>
          </div>
        </motion.div>
      </section>
    </>
  );
};

export default TermsAndConditions;
