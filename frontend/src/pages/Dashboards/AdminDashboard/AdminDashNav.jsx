import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLogoutMutation } from "../../../features/auth/authApiSlice";
import { BiMenu } from "react-icons/bi";
import { Divider } from "primereact/divider";
import logo from "../../../assets/images/logo.png"; // Assuming your logo is in this path

import Statistics from "./Statistics";
// import CurrentBookings from "./CurrentBookings/CurrentBookings";
// import Resources from "./Resources/Resources";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("statistics"); // Set Statistics as the default tab
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out: ", error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const renderTab = () => {
    // if (isLoading) {
    //   return <div className="pt-5">Loading...</div>;
    // }
    switch (activeTab) {
      case "statistics":
        return (
          <div>
            <Statistics />
          </div>
        );
      case "currentBookings":
        return (
          <div>
            <CurrentBookings />
          </div>
        );
      case "resources":
        return (
          <div>
            <Resources />
          </div>
        );
      default:
        return (
          <div>
            <Statistics />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col main-bg">
      <header className="border-b border-dashed border-[#222222]">
        {/* Desktop view */}
        <div className="hidden md:flex justify-center my-4 space-x-4">
          <button
            className="w-full md:w-auto py-2 px-4 bg-[#DF9E7A] text-[#313131] font-semibold rounded-full"
            onClick={() => setActiveTab("statistics")}
          >
            Statistics
          </button>
          <button
            className="w-full md:w-auto py-2 px-4 bg-[#DF9E7A] text-[#313131] font-semibold rounded-full"
            onClick={() => setActiveTab("currentBookings")}
          >
            Current Bookings
          </button>
          <button
            className="w-full md:w-auto py-2 px-4 bg-[#DF9E7A] text-[#313131] font-semibold rounded-full"
            onClick={() => setActiveTab("resources")}
          >
            Resources
          </button>
        </div>

        <div className="absolute top-0 right-0 mt-2 mr-4 space-x-3 hidden md:block">
          <button
            className="px-4 py-2 bg-[#DF9E7A] text-[#313131] font-semibold rounded-full"
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            Logout
          </button>
        </div>

        {/* Mobile view */}
        <div className="flex items-center justify-between w-full md:hidden relative">
          <span className="absolute left-4 top-2">
            <button
              className="px-4 py-2 bg-[#DF9E7A] text-[#313131] font-semibold rounded-full"
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              style={{ marginBottom: "8px" }} // Added margin-bottom for spacing
            >
              Logout
            </button>
          </span>
          <div className="flex justify-center w-full">
            <img
              src={logo}
              alt="logo"
              className="h-auto max-h-14 w-auto object-contain"
            />{" "}
            {/* Adjusted logo size */}
          </div>
          <span onClick={toggleMenu} className="absolute right-4 top-2 z-50">
            <BiMenu className="w-6 h-6 cursor-pointer" />
          </span>
        </div>

        {/* Mobile Dropdown menu */}
        {isMenuOpen && (
          <div
            className="fixed top-0 left-0 w-full h-full bg-white shadow-lg border-gray-200 md:hidden transform transition-transform duration-1000 ease-in-out"
            ref={menuRef}
            style={{
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              zIndex: 49,
            }}
          >
            <ul className="flex flex-col items-start p-4">
              <li className="w-full">
                <button
                  className="block w-full text-gray-800 py-2 px-4 hover:bg-[#e2e2e2] bg-transparent"
                  onClick={() => {
                    setActiveTab("statistics");
                    toggleMenu();
                  }}
                >
                  Statistics
                </button>
              </li>
              <li className="w-full">
                <button
                  className="block w-full text-gray-800 py-2 px-4 hover:bg-[#e2e2e2] bg-transparent"
                  onClick={() => {
                    setActiveTab("currentBookings");
                    toggleMenu();
                  }}
                >
                  Current Bookings
                </button>
              </li>
              <li className="w-full">
                <button
                  className="block w-full text-gray-800 py-2 px-4 hover:bg-[#e2e2e2] bg-transparent"
                  onClick={() => {
                    setActiveTab("resources");
                    toggleMenu();
                  }}
                >
                  Resources
                </button>
              </li>
            </ul>
          </div>
        )}
      </header>
      <Divider type="solid" />

      <main className="flex-grow w-full p-4 h-min-h-screen main-bg">
        {renderTab()}
      </main>
    </div>
  );
};

export default AdminDashboard;
