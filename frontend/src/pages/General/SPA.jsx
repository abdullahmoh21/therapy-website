import React, { useEffect } from "react";
import Home from "./Home";
import AboutMe from "./AboutMe";
import Services from "./Services";
import ContactMe from "./ContactMe";
import TestimonialSlider from "./TestimonialCarousel/Testimonials";
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
    }
  }, [hash]);

  return (
    <div>
      <section id="home">
        <Home />
      </section>
      <section className="pb-[80px]" id="services">
        <Services />
      </section>
      <section id="about">
        <AboutMe />
      </section>
      <section id="testimonials">
        <TestimonialSlider />
      </section>
      <section id="faq">
        <FAQ />
      </section>
    </div>
  );
};

export default MainPage;
