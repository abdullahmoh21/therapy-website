import React from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import Routers from "../routes/Routers.jsx";

const Layout = () => {
  const location = useLocation();

  // Check if we're on admin dashboard or any of its subroutes
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isDashboardRoute = location.pathname === "/dash";
  const showHeaderFooter =
    !isAdminRoute && !isDashboardRoute && location.pathname === "/";

  return (
    <>
      {showHeaderFooter && <Header />}
      <main>
        <Routers />
      </main>
      {showHeaderFooter && <Footer />}
    </>
  );
};

export default Layout;
