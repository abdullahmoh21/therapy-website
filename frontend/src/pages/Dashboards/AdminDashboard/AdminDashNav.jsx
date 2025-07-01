import React, { useState, useEffect, useRef } from "react";
import { useNavigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useLogoutMutation } from "../../../features/auth/authApiSlice";
import { BiMenu, BiX, BiLoaderAlt } from "react-icons/bi";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../../../assets/images/logo.webp";

const AdminDashboard = () => {
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  /* ------------------------- helpers ------------------------- */

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out: ", error);
      navigate("/");
    }
  };

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  /* ------------------- side-effects & listeners ------------------- */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [isMenuOpen]);

  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  /* ------------------------ navigation ------------------------ */

  const navItems = [
    { path: "/admin/upcoming", label: "Upcoming Bookings" },
    { path: "/admin/bookings", label: "Bookings" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/metrics", label: "Metrics" },
    { path: "/admin/config", label: "Configuration" },
    { path: "/admin/system", label: "System Health" },
  ];

  /* --------------------------- ui --------------------------- */

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ---------- top bar ---------- */}
      <header className="sticky top-0 z-40 bg-white shadow-md flex items-center justify-between p-4">
        <motion.img
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          src={logo}
          alt="logo"
          className="h-16 w-auto"
        />

        {/* desktop nav */}
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

        {/* hamburger */}
        <button
          onClick={toggleMenu}
          className="text-textColor hover:text-gray-900 lg:hidden p-2"
        >
          <BiMenu className="w-6 h-6" />
        </button>
      </header>

      {/* ---------- mobile overlay ---------- */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: { duration: 0.2, delay: 0.1 }, // ⬅ exit delay
            }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={closeMenu}
          />
        )}
      </AnimatePresence>

      {/* ---------- mobile sidebar ---------- */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{
              x: "100%",
              opacity: 0,
              transition: { type: "tween", duration: 0.3, delay: 0.1 }, // ⬅ exit delay
            }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed inset-y-0 right-0 z-50 w-[80%] bg-white shadow-xl lg:hidden"
          >
            <div className="flex flex-col h-full overflow-y-auto">
              {/* sidebar header */}
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <img src={logo} alt="logo" className="h-16 w-auto" />
                <motion.button
                  whileTap={{ rotate: 90, scale: 0.85 }} // ⬅ tap animation
                  transition={{ type: "spring", stiffness: 300 }}
                  onClick={closeMenu}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <BiX className="w-6 h-6" />
                </motion.button>
              </div>

              {/* links */}
              <nav className="flex-grow p-6 space-y-4">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.path}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `block w-full py-3 px-4 text-[16px] font-medium rounded-lg transition-all text-center ${
                          isActive
                            ? "bg-[#FDF0E9] text-[#c45e3e]"
                            : "bg-white bg-opacity-50 text-textColor hover:bg-opacity-80"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </motion.div>
                ))}
              </nav>

              {/* logout */}
              <div className="p-6 border-t border-gray-200">
                <motion.button
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="w-full h-12 flex items-center justify-center rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <BiLoaderAlt className="animate-spin mr-2" />
                  ) : (
                    "Logout"
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- page outlet ---------- */}
      <main className="flex-grow p-4 lg:p-8 overflow-y-auto bg-white">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminDashboard;
