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
      {location.pathname !== "/signin" &&
        location.pathname !== "/dash" &&
        location.pathname !== "/register" &&
        location.pathname !== "/verifyEmail" &&
        location.pathname !== "/forgotPassword" &&
        location.pathname !== "/resetPassword" &&
        location.pathname !== "/admin" && <Header />}
      <main>
        <Routers />
      </main>
      {location.pathname !== "/signin" &&
        location.pathname !== "/dash" &&
        location.pathname !== "/register" &&
        location.pathname !== "/verifyEmail" &&
        location.pathname !== "/forgotPassword" &&
        location.pathname !== "/resetPassword" &&
        location.pathname !== "/admin" && <Footer />}
    </>
  );
};

export default Layout;
