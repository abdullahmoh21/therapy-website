import React from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import Routers from "../routes/Routers.jsx";

const Layout = () => {
  const location = useLocation();
  return (
    <>
      {/* Renders the header&footer on all pages but these */}
      {location.pathname === "/" && <Header />}
      <main>
        <Routers />
      </main>
      {location.pathname === "/" && <Footer />}
    </>
  );
};

export default Layout;
