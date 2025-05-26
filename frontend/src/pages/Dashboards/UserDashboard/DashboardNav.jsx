import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGetMyUserQuery } from "../../../features/users/usersApiSlice";
import { useLogoutMutation } from "../../../features/auth/authApiSlice";
import {
  BiMenu,
  BiUser,
  BiCalendar,
  BiHistory,
  BiLogOut,
  BiX,
  BiLoaderAlt,
} from "react-icons/bi";
import logo from "../../../assets/images/logo.webp";

import EditProfile from "./EditProfile";
import MyBookings from "./MyBookings/MyBookings";
import Billing from "./Billing/Billing";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("myBookings");
  const {
    data,
    isLoading: isLoadingUser,
    isError,
    refetch,
  } = useGetMyUserQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const fetchedUser = useMemo(() => {
    if (!data) return null;
    const entities = data.entities;
    const user = entities && entities[Object.keys(entities)[0]];
    if (!user) return null;
    const formattedDob = user.DOB
      ? new Date(user.DOB).toISOString().split("T")[0]
      : "";
    return { ...user, DOB: formattedDob };
  }, [data]);

  const handleUserUpdate = () => {
    refetch();
  };

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out: ", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (showEditProfileModal || isMenuOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [showEditProfileModal, isMenuOpen]);

  const handleClickOutsideModal = (event) => {
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
    if (isLoadingUser) {
      return <div className="pt-10 text-center">Loading user data...</div>;
    }
    switch (activeTab) {
      case "myBookings":
        return <MyBookings />;
      case "Billing":
        return <Billing />;
      default:
        return <MyBookings />;
    }
  };

  const navItems = [
    {
      id: "myBookings",
      label: "My Bookings",
      icon: <BiCalendar className="mr-2" />,
    },
    {
      id: "Billing",
      label: "Past Bookings",
      icon: <BiHistory className="mr-2" />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="sticky top-0 z-40 bg-white shadow-md flex items-center justify-between p-4">
        <img src={logo} alt="logo" className="h-16 w-auto" />

        <nav className="hidden lg:flex items-center space-x-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`flex items-center px-4 py-3 rounded-md text-lg transition-colors duration-150 ${
                activeTab === item.id
                  ? "bg-[#FDF0E9] text-[#c45e3e]"
                  : "text-textColor hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <button
            className="flex items-center px-4 py-3 rounded-md text-lg transition-colors duration-150 hover:bg-gray-100"
            onClick={toggleEditProfileModal}
          >
            <BiUser className="mr-2" />
            Edit Profile
          </button>
          <button
            className="flex items-center justify-center px-4 py-3 bg-red-500 text-white rounded-md text-lg font-medium hover:bg-red-600 transition-colors duration-150 disabled:opacity-50"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <BiLoaderAlt className="animate-spin mr-2" />
            ) : (
              <BiLogOut className="mr-2" />
            )}
            Logout
          </button>
        </nav>

        <button
          onClick={toggleMenu}
          className="text-gray-600 hover:text-gray-900 lg:hidden"
        >
          <BiMenu className="w-6 h-6" />
        </button>
      </header>

      <div
        ref={menuRef}
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:hidden`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <img src={logo} alt="logo" className="h-16 w-auto" />
          <button
            onClick={toggleMenu}
            className="text-gray-500 hover:text-gray-700"
          >
            <BiX className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`w-full flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                activeTab === item.id
                  ? "bg-[#FDF0E9] text-[#c45e3e]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              onClick={() => {
                setActiveTab(item.id);
                toggleMenu();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <button
            className="w-full flex items-center px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
            onClick={() => {
              toggleEditProfileModal();
              toggleMenu();
            }}
          >
            <BiUser className="mr-2" />
            Edit Profile
          </button>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            className="w-full flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors duration-150 disabled:opacity-50"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <BiLoaderAlt className="animate-spin mr-2" />
            ) : (
              <BiLogOut className="mr-2" />
            )}
            Logout
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleMenu}
        ></div>
      )}

      <main className="flex-grow p-4 lg:p-8 overflow-y-auto">
        {renderTab()}
      </main>

      {showEditProfileModal && (
        <div
          id="edit-profile-modal-overlay"
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-4"
          onClick={handleClickOutsideModal}
        >
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl"
              onClick={toggleEditProfileModal}
              aria-label="Close"
            >
              &times;
            </button>
            {/* Handle loading, error, and success states for rendering EditProfile */}
            {isLoadingUser ? (
              <div className="text-center p-4">Loading profile...</div>
            ) : isError ? (
              <div className="text-center p-4 text-red-600">
                Error loading profile data. Please try again.
                {/* Optionally display error details: {error?.data?.message || error.toString()} */}
              </div>
            ) : fetchedUser ? (
              <EditProfile
                user={fetchedUser} // Pass the derived user data
                onUserUpdate={handleUserUpdate}
              />
            ) : (
              <div className="text-center p-4">User data not found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
