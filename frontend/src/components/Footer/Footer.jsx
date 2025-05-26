import React from "react";
import { motion } from "framer-motion";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaLinkedin,
  FaTwitter,
  FaWhatsapp,
} from "react-icons/fa";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer>
      <div className="bg-orangeBg pt-6 px-6 flex flex-col md:flex-row items-center justify-between text-textColor space-y-6 md:space-y-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="flex flex-col items-center md:items-start md:ml-[100px] space-y-3"
        >
          <div className="flex items-center pb-[5px] group"></div>
          <div className="flex items-center pb-[5px] group">
            <FaPhoneAlt className="text-textColor mr-3 text-xl transition-colors duration-300" />
            <a
              href="tel:+923334245151"
              className="text-textColor text-center md:text-left underline transition-colors duration-300"
            >
              +92 333 4245151
            </a>
          </div>
          <div className="flex items-center group">
            <FaEnvelope className="text-textColor mr-3 text-xl transition-colors duration-300" />
            <a
              href="mailto:fatimamohsin40@gmail.com"
              className="text-textColor text-center md:text-left underline transition-colors duration-300"
            >
              fatimamohsin40@gmail.com
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="orlega-one flex flex-col items-center md:items-end md:mr-[100px] space-y-3"
        >
          <h1 className="orelega-one text-[28px] md:text-[36px] text-textColor text-center md:text-right">
            Fatima Mohsin Naqvi
          </h1>
          <div className="flex flex-row justify-center w-full space-x-6">
            {/* Social links with enhanced styling */}
            <a
              href="https://www.linkedin.com/in/fatima-naqvi312"
              target="_blank"
              rel="noopener noreferrer"
              className="text-textColor text-xl transform hover:scale-125 transition-all duration-300 "
            >
              <FaLinkedin className="text-textColor transition-colors duration-300" />
            </a>
            <a
              href="https://x.com/fatimamohsin_1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-textColor text-xl transform hover:scale-125 transition-all duration-300 "
            >
              <FaTwitter className="text-textColor transition-colors duration-300" />
            </a>
            <a
              href="https://wa.me/+923334245151"
              target="_blank"
              rel="noopener noreferrer"
              className="text-textColor text-xl transform hover:scale-125 transition-all duration-300 "
            >
              <FaWhatsapp className="text-textColor transition-colors duration-300" />
            </a>
          </div>
        </motion.div>
      </div>
      <div className="bg-orangeBg text-center py-4 text-textColor text-sm flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <p>© {currentYear} Fatima Mohsin Naqvi. All rights reserved.</p>
        <span className="hidden sm:inline">|</span>
        <Link to="/terms-and-conditions" className="underline">
          Terms and Conditions
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
