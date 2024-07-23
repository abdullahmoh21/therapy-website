import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGetMyUserQuery } from "../../../features/users/usersApiSlice";
import { useLogoutMutation } from "../../../features/auth/authApiSlice";
import { BiMenu } from "react-icons/bi";
import { Divider } from "primereact/divider";
import logo from "../../../assets/images/logo.png"; // Assuming your logo is in this path

import EditProfile from "./EditProfile";
import MyBookings from "./MyBookings/MyBookings";
import Billing from "./Billing/Billing";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("myBookings"); // Set MyBookings as the default tab
  const { data, isLoading, refetch } = useGetMyUserQuery();
  const [userData, setUserData] = useState(null);
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (data) {
      const entities = data.entities;
      const fetchedUser = entities && entities[Object.keys(entities)[0]];

      const dob = new Date(fetchedUser.DOB); //create a new date object from the fetched timestamp
      const formattedDob = `${dob.getFullYear()}-${(dob.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${dob.getDate().toString().padStart(2, "0")}`;
      setUserData({ ...fetchedUser, DOB: formattedDob });
    }
  }, [data]);

  const handleUserUpdate = () => {
    refetch();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out: ", error);
    }
  };

  useEffect(() => {
    if (showEditProfileModal) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [showEditProfileModal]);

  const handleClickOutside = (event) => {
    if (event.target.id === "edit-profile-modal-overlay") {
      toggleEditProfileModal();
    }
  };

  const toggleEditProfileModal = () => {
    setShowEditProfileModal(!showEditProfileModal);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const renderTab = () => {
    if (isLoading) {
      return <div className="pt-5">Loading...</div>;
    }
    switch (activeTab) {
      case "editProfile":
        return (
          <div>
            <EditProfile onUserUpdate={handleUserUpdate} />
          </div>
        );
      case "myBookings":
        return (
          <div>
            <MyBookings />
          </div>
        );
      case "Billing":
        return (
          <div>
            <Billing />
          </div>
        );
      default:
        return (
          <div>
            <MyBookings />
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
            onClick={() => setActiveTab("myBookings")}
          >
            My Bookings
          </button>
          <button
            className="w-full md:w-auto py-2 px-4 bg-[#DF9E7A] text-[#313131] font-semibold rounded-full"
            onClick={() => setActiveTab("Billing")}
          >
            Billing
          </button>
          <button
            className="w-full md:w-auto py-2 px-4 bg-[#DF9E7A] text-[#313131] font-semibold rounded-full"
            type="button"
            onClick={toggleEditProfileModal}
          >
            Edit Profile
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
                    setActiveTab("myBookings");
                    toggleMenu();
                  }}
                >
                  My Bookings
                </button>
              </li>
              <li className="w-full">
                <button
                  className="block w-full text-gray-800 py-2 px-4 hover:bg-[#e2e2e2] bg-transparent"
                  onClick={() => {
                    setActiveTab("Billing");
                    toggleMenu();
                  }}
                >
                  Billing
                </button>
              </li>
              <li className="w-full">
                <button
                  className="block w-full text-gray-800 py-2 px-4 hover:bg-[#e2e2e2] bg-transparent"
                  onClick={() => {
                    toggleEditProfileModal();
                    toggleMenu();
                  }}
                >
                  Edit Profile
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

      {/* Edit Profile Popup */}
      {showEditProfileModal && (
        <div
          id="edit-profile-modal-overlay"
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={handleClickOutside}
        >
          <div className="bg-white p-6 rounded-lg w-full max-w-lg relative">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl"
              onClick={toggleEditProfileModal}
              aria-label="Close"
            >
              &times;
            </button>
            <EditProfile onUserUpdate={handleUserUpdate} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
