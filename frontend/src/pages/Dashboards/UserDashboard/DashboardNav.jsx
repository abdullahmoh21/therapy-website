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
  BiLoaderAlt,
} from "react-icons/bi";
import { IoMdClose } from "react-icons/io";
import logo from "../../../assets/images/logo.webp";
import { motion, AnimatePresence } from "framer-motion";

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
  const editProfileRef = useRef(null);
  const navigate = useNavigate();

  const fetchedUser = useMemo(() => {
    if (!data) return null;
    const entities = data.entities;
    const user = entities && entities[Object.keys(entities)[0]];
    if (!user) return null;

    // Format the DOB properly
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
      setTimeout(() => {
        navigate("/");
      }, 100);
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
      closeEditProfileModal();
    }
  };

  const toggleEditProfileModal = () => {
    setShowEditProfileModal(!showEditProfileModal);
  };

  const closeEditProfileModal = () => {
    if (editProfileRef.current) {
      editProfileRef.current.resetForm();
    }
    setShowEditProfileModal(false);
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
      <header className="sticky top-0 z-40 bg-white shadow-md flex items-center justify-between p-3">
        <img src={logo} alt="logo" className="h-16 md:h-20 w-auto" />

        <nav className="hidden lg:flex items-center space-x-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`flex items-center px-4 py-2 rounded-md text-base transition-colors duration-150 ${
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
            className="flex items-center px-4 py-2 rounded-md text-base transition-colors duration-150 hover:bg-gray-100"
            onClick={toggleEditProfileModal}
          >
            <BiUser className="mr-2" />
            Edit Profile
          </button>
          <button
            className="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md text-base font-medium hover:bg-red-600 transition-colors duration-150 disabled:opacity-50"
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

        <button onClick={toggleMenu} className="text-textColor lg:hidden">
          <BiMenu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[500] lg:hidden"
            onClick={toggleMenu}
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu - Now appears from right side with animation */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed top-0 right-0 w-[80%] h-full bg-white shadow-lg lg:hidden z-[600]"
          >
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Close button and logo */}
              <div className="flex justify-between items-center p-4">
                <img
                  src={logo}
                  alt="logo"
                  className="h-16 w-auto object-contain"
                />
                <button
                  onClick={toggleMenu}
                  className="p-2 rounded-full transition-colors duration-300"
                >
                  <IoMdClose className="w-6 h-6" />
                </button>
              </div>

              {/* Menu items */}
              <div className="flex-grow p-6">
                <nav className="space-y-4">
                  {navItems.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <button
                        className={`w-full py-3 px-4 text-textColor font-medium rounded-lg ${
                          activeTab === item.id
                            ? "bg-[#FDF0E9] text-[#c45e3e]"
                            : "text-textColor hover:bg-gray-100"
                        } text-center transition-all flex items-center justify-center`}
                        onClick={() => {
                          setActiveTab(item.id);
                          toggleMenu();
                        }}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <button
                      onClick={() => {
                        toggleEditProfileModal();
                        toggleMenu();
                      }}
                      className="w-full py-3 px-4 text-textColor font-medium rounded-lg bg-white bg-opacity-50 hover:bg-opacity-80 text-center transition-all flex items-center justify-center"
                    >
                      <BiUser className="mr-2" />
                      Edit Profile
                    </button>
                  </motion.div>
                </nav>
              </div>

              {/* Logout button at bottom */}
              <div className="p-6">
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <button
                    className="w-full h-12 text-white font-medium rounded-lg bg-red-500 hover:bg-red-600 text-center transition-colors duration-300 shadow-sm flex items-center justify-center disabled:opacity-50"
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
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow p-4 lg:p-8 overflow-y-auto">
        {renderTab()}
      </main>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div
          id="edit-profile-modal-overlay"
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-4"
          onClick={handleClickOutsideModal}
        >
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-textColor text-2xl"
              onClick={closeEditProfileModal}
              aria-label="Close"
            >
              &times;
            </button>
            {isLoadingUser ? (
              <div className="text-center p-4">Loading profile...</div>
            ) : isError ? (
              <div className="text-center p-4 text-red-600">
                Error loading profile data. Please try again.
              </div>
            ) : fetchedUser ? (
              <EditProfile
                ref={editProfileRef}
                user={fetchedUser}
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
