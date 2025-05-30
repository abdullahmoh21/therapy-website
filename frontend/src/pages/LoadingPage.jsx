import React from "react";
import { motion } from "framer-motion";
import logo from "../assets/images/logo.webp";

const LoadingPage = () => {
  return (
    <div className="min-h-screen bg-whiteBg flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <img
          src={logo}
          alt="Fatima Mohsin Naqvi"
          className="h-24 mb-8 animate-pulse"
        />

        <div className="relative">
          <div className="w-16 h-16 border-4 border-lightPink rounded-full opacity-25"></div>
          <div className="w-16 h-16 border-4 border-transparent border-t-orangeHeader rounded-full animate-spin absolute top-0 left-0"></div>
        </div>

        <p className="mt-6 text-lg text-orangeHeader font-medium">
          Loading your experience...
        </p>
      </motion.div>
    </div>
  );
};

export default LoadingPage;
