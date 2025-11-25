import React from "react";
import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import logo from "../../assets/images/logo.webp";

const PrivacyPolicy = () => {
  return (
    <>
      <section
        id="privacy-title"
        className="bg-whiteBg py-4 px-4 md:px-0 shadow-md"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="container mx-auto text-center"
        >
          <NavLink to="/" className="inline-block mb-4">
            <img
              src={logo}
              alt="Logo"
              className="w-[120px] sm:w-[160px] md:w-[180px] h-auto"
            />
          </NavLink>
          <h1 className="orelega-one text-4xl md:text-5xl text-lightPink leading-tight">
            Privacy Policy
          </h1>
        </motion.div>
      </section>

      <section id="privacy-content" className="bg-whiteBg px-4 md:px-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="container mx-auto"
        >
          <div className="bg-whiteBg p-6 md:p-8 rounded-lg shadow-lg text-textOnWhite">
            <p className="mb-4 text-lg">
              This Privacy Policy explains how we collect, use, and protect your
              personal information when you use Fatima Mohsin Naqvi&apos;s
              website (the &quot;Site&quot;) and private client dashboard (the
              &quot;Dashboard&quot;). By using the Site or Dashboard, you agree
              to the practices described here. If you do not agree, please do
              not use our services.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              1. Who We Are
            </h2>
            <p className="mb-2">
              This Site and Dashboard are operated by{" "}
              <strong>Fatima Mohsin Naqvi</strong>, a therapist providing
              counselling and related services.
            </p>
            <p>
              For questions about this Privacy Policy, you can contact us at:{" "}
              <a href="mailto:fatimamohsin40@gmail.com">
                fatimamohsin40@gmail.com
              </a>{" "}
              or call +92 333 4245151. Full contact details are available on our
              Contact page.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              2. Information We Collect
            </h2>
            <p className="mb-2">We collect information in three main ways:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Information you provide on the public Site:</strong> if
                you fill out a contact form or email us directly, we may collect
                your name, email address, and the contents of your message.
              </li>
              <li>
                <strong>Information you provide in the Dashboard:</strong> if
                you are invited to the Dashboard, we may collect your name,
                email, time zone, booking history, and limited payment-related
                information (for example, whether a session has been paid).
              </li>
              <li>
                <strong>Technical and usage data:</strong> we may collect basic
                technical information such as your IP address, browser type,
                device information, and pages you visit on the Site, for
                security and performance purposes.
              </li>
            </ul>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              3. Booking, Calendly and Third-Party Services
            </h2>
            <p className="mb-2">
              Some of our booking and payment features rely on trusted
              third-party providers:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Calendly:</strong> when you schedule a session using
                Calendly, your name, email address, appointment date and time,
                and any notes you enter are processed by Calendly in accordance
                with their own privacy policy. We receive booking information
                from Calendly so that we can confirm your session and show it in
                your Dashboard.
              </li>
              <li>
                <strong>Payment processors (e.g., SafePay):</strong> online card
                payments are processed by SafePay or a similar regulated
                processor. Your full card details are sent directly to the
                payment processor; we do not store your full card number or CVV
                on our servers. We may receive and store limited payment
                metadata (such as transaction IDs, payment status, and amount)
                for accounting and booking purposes.
              </li>
            </ul>
            <p className="mt-2">
              These third parties are responsible for how they handle your data
              under their own policies, but we only share the minimum
              information needed to provide our services (for example, to book
              sessions and process your payments securely).
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              4. Use of Google Calendar and Google User Data
            </h2>
            <p className="mb-2">
              The Dashboard includes an optional integration that allows the
              therapist (administrator) to connect their own Google Calendar so
              that therapy sessions can be automatically synced as calendar
              events.
            </p>
            <p className="mb-2">
              <strong>Who uses Google OAuth:</strong> only the therapist&apos;s
              admin account can connect a Google Calendar. Clients do{" "}
              <strong>not</strong> authenticate with Google through this Site.
            </p>

            <p className="mb-2">
              <strong>Google OAuth scopes we request:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <code>https://www.googleapis.com/auth/calendar</code>
              </li>
            </ul>

            <p className="mt-2 mb-2">
              This scope is used <strong>only</strong> to:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Create calendar events when a client books a therapy session.
              </li>
              <li>
                Update events when a session is rescheduled (for example, time
                or location changes).
              </li>
              <li>Cancel or delete events when a session is cancelled.</li>
              <li>
                Optionally attach an online meeting link (such as Google Meet)
                to the event if configured by the therapist.
              </li>
            </ul>

            <p className="mt-2 mb-2">
              <strong>What Google data we access:</strong> in practice, we work
              with:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                The therapist&apos;s calendar ID (for example, their primary
                calendar).
              </li>
              <li>
                Event details that our system creates: event title, date and
                time, duration, description/notes, and meeting link (if any).
              </li>
              <li>
                Confirmation information returned by the Google Calendar API
                (such as event IDs and links) so that we can keep the Dashboard
                in sync.
              </li>
            </ul>

            <p className="mt-2">
              We do <strong>not</strong> use Google user data for advertising,
              profiling, or analytics. We do <strong>not</strong> share Google
              Calendar data with unrelated third parties. We only access the
              minimum events needed to represent therapy sessions booked through
              the Dashboard.
            </p>

            <p className="mt-4">
              <strong>Storage of Google tokens:</strong> when the therapist
              connects Google Calendar, we store OAuth tokens (for example,
              access and refresh tokens) securely on the backend so that the
              system can keep events up to date without requiring the therapist
              to reconnect every time. These tokens are used only by the system
              to communicate with the Google Calendar API.
            </p>

            <p className="mt-4">
              <strong>How to revoke Google access:</strong> the therapist may
              disconnect Google Calendar from within the Dashboard (where this
              feature is available). They can also revoke the app&apos;s access
              at any time directly from their Google Account settings by
              visiting{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
              >
                https://myaccount.google.com/permissions
              </a>{" "}
              and removing this application&apos;s access.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              5. How We Use Your Information
            </h2>
            <p className="mb-2">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                To provide and manage therapy bookings and session history.
              </li>
              <li>To send appointment confirmations and reminders.</li>
              <li>To process payments and issue refunds where applicable.</li>
              <li>
                To maintain and improve the Site and Dashboard, including
                security and performance.
              </li>
              <li>To respond to your questions or support requests.</li>
              <li>
                To comply with legal, regulatory, or accounting requirements.
              </li>
            </ul>
            <p className="mt-2">
              We do not sell your personal information and do not use your data
              for targeted advertising.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              6. Legal Basis for Processing
            </h2>
            <p>
              Depending on your location, our legal basis for processing your
              personal information may include:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                <strong>Your consent,</strong> for example when you book a
                session, connect Google Calendar, or submit a contact form.
              </li>
              <li>
                <strong>Performance of a contract,</strong> when we use your
                data to provide therapy sessions you have requested.
              </li>
              <li>
                <strong>Legitimate interests,</strong> such as improving the
                Site, preventing abuse, and maintaining security.
              </li>
              <li>
                <strong>Legal obligations,</strong> such as maintaining certain
                records for tax or accounting purposes.
              </li>
            </ul>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              7. How We Share Your Information
            </h2>
            <p className="mb-2">
              We do not sell or rent your personal data. We may share your
              information with:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Service providers</strong> who support our operations,
                such as hosting, payment processing, or email delivery.
              </li>
              <li>
                <strong>Calendly and payment processors</strong> as described
                above, for booking and payments.
              </li>
              <li>
                <strong>Google</strong> to the limited extent required by the
                Google Calendar integration, as described in Section 4.
              </li>
              <li>
                <strong>Law enforcement or regulators</strong> when required by
                applicable law or to protect our rights, clients, or the public.
              </li>
            </ul>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              8. Data Retention
            </h2>
            <p>
              We keep your information only for as long as needed to provide our
              services and fulfill the purposes described in this Policy,
              including any legal, accounting, or reporting requirements. This
              may mean we retain certain booking or payment records for a period
              of time even after your active therapy has ended, in line with
              professional and legal obligations.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              9. Your Rights and Choices
            </h2>
            <p className="mb-2">
              Depending on your location, you may have rights over your personal
              data, such as:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Accessing the personal information we hold about you.</li>
              <li>Requesting corrections to inaccurate or incomplete data.</li>
              <li>
                Requesting deletion of your data, subject to legal and clinical
                record-keeping requirements.
              </li>
              <li>
                Withdrawing consent where our processing is based on your
                consent (for example, disconnecting Google Calendar).
              </li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:fatimamohsin40@gmail.com">
                fatimamohsin40@gmail.com
              </a>
              . We will do our best to respond within a reasonable timeframe.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              10. Security
            </h2>
            <p>
              We use reasonable technical and organizational measures to protect
              your personal information from unauthorized access, loss, or
              misuse. No system can be guaranteed to be completely secure, but
              we take data protection seriously and continuously work to protect
              your information.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              11. Children&apos;s Privacy
            </h2>
            <p>
              This Site and Dashboard are not directed at children under the age
              of 13 without the involvement of a parent or legal guardian. If
              you believe that a child has provided us with personal
              information, please contact us so we can take appropriate action.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              12. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes
              will be posted on this page with an updated &quot;last
              updated&quot; date. Your continued use of the Site or Dashboard
              after changes are posted means you accept the revised Policy.
            </p>

            <h2 className="text-3xl font-semibold mt-8 mb-4 text-orangeHeader">
              13. Contact Us
            </h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or
              how we handle your data, please contact us at{" "}
              <a href="mailto:fatimamohsin40@gmail.com">
                fatimamohsin40@gmail.com
              </a>{" "}
              or call +92 333 4245151.
            </p>
          </div>
        </motion.div>
      </section>
    </>
  );
};

export default PrivacyPolicy;
