import React, { useState, useEffect, useRef } from "react";
import { useNavigate, NavLink, Outlet } from "react-router-dom";
import { useLogoutMutation } from "../../../features/auth/authApiSlice";
import { BiMenu, BiX, BiLoaderAlt } from "react-icons/bi";
import logo from "../../../assets/images/logo.webp";

const AdminDashboard = () => {
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
    { path: "/admin/system", label: "System Health" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-40 bg-white shadow-md flex items-center justify-between p-4">
        <img src={logo} alt="logo" className="h-16 w-auto" />

        <nav className="hidden lg:flex items-center space-x-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
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
            className="flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors duration-150 disabled:opacity-50"
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
          className="text-textColor hover:text-gray-900 lg:hidden"
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
            className="text-textColor hover:text-gray-700"
          >
            <BiX className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block w-full px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-[#FDF0E9] text-[#c45e3e]"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
              onClick={toggleMenu}
            >
              {item.label}
            </NavLink>
          ))}
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
              "Logout"
            )}
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleMenu}
        ></div>
      )}

      <main className="flex-grow p-4 lg:p-8 overflow-y-auto bg-white">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminDashboard;
