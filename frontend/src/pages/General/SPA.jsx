import React, { useEffect } from "react";
import Home from "./Home";
import AboutMe from "./AboutMe";
import Services from "./Services";
import FAQ from "./FAQ";
import { useLocation } from "react-router-dom";

const MainPage = () => {
  const { hash } = useLocation();
  // Scroll to the element with the id in the URL hash
  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Scroll to top when no hash is present
      window.scrollTo(0, 0);
    }
  }, [hash]);

  return (
    <div className="overflow-hidden">
      <section id="home" className="transition-all duration-300">
        <Home />
      </section>
      <section id="services" className="transition-all duration-300">
        <Services />
      </section>
      <section id="about" className="transition-all duration-300">
        <AboutMe />
      </section>
      <section id="faq" className="transition-all duration-300">
        <FAQ />
      </section>
    </div>
  );
};

export default MainPage;
