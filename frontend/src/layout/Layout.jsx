import React from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import Routers from "../routes/Routers.jsx";

const Layout = () => {
  const location = useLocation();
  return (
    <>
      {/* Renders the header&footer on all pages but the signin page and dasborad */}
      {location.pathname !== "/signin" &&
        location.pathname !== "/dash" &&
        location.pathname !== "/register" &&
        location.pathname !== "/admin" && <Header />}
      <main>
        <Routers />
      </main>
      {location.pathname !== "/signin" &&
        location.pathname !== "/dash" &&
        location.pathname !== "/register" &&
        location.pathname !== "/admin" && <Footer />}
    </>
  );
};

export default Layout;
