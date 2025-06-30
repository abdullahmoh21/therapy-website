import React, { useState, useEffect, useRef } from "react";
import { useNavigate, NavLink, Outlet } from "react-router-dom";
import { useLogoutMutation } from "../../../features/auth/authApiSlice";
import { BiMenu, BiX, BiLoaderAlt } from "react-icons/bi";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../../../assets/images/logo.webp";

const AdminDashboard = () => {
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out: ", error);
      navigate("/");
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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
    if (isMenuOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [isMenuOpen]);

  const navItems = [
    { path: "/admin/upcoming", label: "Upcoming Bookings" },
    { path: "/admin/bookings", label: "Bookings" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/metrics", label: "Metrics" },
    { path: "/admin/config", label: "Configuration" },
    { path: "/admin/system", label: "System Health" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-40 bg-white shadow-md flex items-center justify-between p-4">
        <div className="flex items-center">
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            src={logo}
            alt="logo"
            className="h-16 w-auto"
          />
        </div>

        <nav className="hidden lg:flex items-center space-x-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-[16px] font-medium transition-colors duration-300 ${
                  isActive
                    ? "bg-[#FDF0E9] text-[#c45e3e]"
                    : "text-textColor hover:bg-gray-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            className="flex items-center justify-center h-10 px-6 bg-red-500 text-white rounded-full text-[16px] font-medium hover:bg-red-600 transition-colors duration-300 disabled:opacity-50 shadow-sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <BiLoaderAlt className="animate-spin mr-2" />
            ) : (
              "Logout"
            )}
          </button>
        </nav>

        <button
          onClick={toggleMenu}
          className="text-textColor hover:text-gray-900 lg:hidden p-2"
        >
          <BiMenu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={toggleMenu}
          />
        )}
      </AnimatePresence>

      {/* Mobile menu sidebar - changed to appear from right side */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed inset-y-0 right-0 z-50 w-[80%] bg-white shadow-xl lg:hidden"
          >
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Header with logo and close button */}
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <img
                  src={logo}
                  alt="logo"
                  className="h-16 w-auto object-contain"
                />
                <button
                  onClick={toggleMenu}
                  className="p-2 rounded-full transition-colors duration-300"
                >
                  <BiX className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation items */}
              <nav className="flex-grow p-6 space-y-4">
                {navItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `block w-full py-3 px-4 text-[16px] font-medium rounded-lg ${
                          isActive
                            ? "bg-[#FDF0E9] text-[#c45e3e]"
                            : "bg-white bg-opacity-50 text-textColor hover:bg-opacity-80"
                        } text-center transition-all`
                      }
                      onClick={toggleMenu}
                    >
                      {item.label}
                    </NavLink>
                  </motion.div>
                ))}
              </nav>

              {/* Logout button at bottom */}
              <div className="p-6 border-t border-gray-200">
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <button
                    className="block w-full h-12 text-white font-medium rounded-lg bg-red-500 hover:bg-red-600 text-center transition-colors duration-300 shadow-sm flex items-center justify-center disabled:opacity-50"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <BiLoaderAlt className="animate-spin mr-2" />
                    ) : (
                      "Logout"
                    )}
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow p-4 lg:p-8 overflow-y-auto bg-white">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminDashboard;
