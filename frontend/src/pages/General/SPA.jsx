import React from "react";
import Home from "./Hero";
import AboutMe from ".//AboutMe";
import Services from ".//Services";
import HowToBook from "./HowToBook";

const MainPage = () => {
  return (
    <div>
      <Home />
      <AboutMe />
      <Services />
      <HowToBook />
    </div>
  );
};

export default MainPage;
