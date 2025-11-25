import { useState, useEffect } from "react";
import logo from "../../assets/images/logo.webp";
import { Link, useNavigate } from "react-router-dom";
import { BiMenu } from "react-icons/bi";
import { IoMdClose } from "react-icons/io";
import { useSelector, useDispatch } from "react-redux";
import {
  selectCurrentToken,
  selectCurrentUserRole,
} from "../../features/auth/authSlice";
import ContactMe from "../../pages/General/ContactMe/ContactMe.jsx";
import Sticky from "react-stickynode";
import { motion, AnimatePresence } from "framer-motion";

const NavLinks = [
  { path: "#services", display: "Services" },
  { path: "#about", display: "About Me" },
  { path: "#faq", display: "FAQs" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const token = useSelector(selectCurrentToken);
  const userRole = useSelector(selectCurrentUserRole);
  const navigate = useNavigate();

  // Handle navigation to the correct dashboard based on role
  const handleDashboardClick = (e) => {
    e.preventDefault();
    if (userRole === "admin") {
      navigate("/admin");
    } else {
      navigate("/dash");
    }
  };

  // Effect to manage body scroll behavior when popup or mobile menu is open
  useEffect(() => {
    document.body.style.overflow =
      isMenuOpen || isPopupOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto"; // Ensure overflow is reset on component unmount
    };
  }, [isMenuOpen, isPopupOpen]);

  // Effect to detect scroll for header styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  // Expose togglePopup function globally so it can be used by other components
  useEffect(() => {
    window.openContactPopup = () => {
      setIsPopupOpen(true);
    };

    return () => {
      // Clean up the global function when component unmounts
      delete window.openContactPopup;
    };
  }, []);

  return (
    <>
      <div className="header-container">
        <Sticky enabled={true} top={0} innerZ={100} activeClass="sticky_header">
          <header
            className={`py-3 transition-all duration-300 ${
              scrolled
                ? "bg-white shadow-md"
                : "bg-whiteBg border-b border-lightOrange"
            }`}
          >
            <div className="container mx-auto px-4 flex justify-between items-center relative">
              {/* Logo */}
              <div className="flex-shrink-0">
                <Link to="/#home" className="flex items-center">
                  <motion.img
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    src={logo}
                    alt="logo"
                    className="h-16 md:h-20 w-auto object-contain"
                  />
                </Link>
              </div>

              {/* Desktop navigation */}
              <nav className="hidden md:flex items-center justify-center flex-1 ml-10">
                <ul className="flex items-center gap-6">
                  {NavLinks.map((link, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <a
                        href={link.path}
                        className="text-textColor text-[16px] font-medium py-2 px-4 rounded-full transition-colors duration-200 hover:text-lightPink hover:bg-white/70"
                      >
                        {link.display}
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              {/* Right side buttons container */}
              <div className="flex-shrink-0 hidden md:flex items-center gap-3">
                {/* Contact Me button (primary) */}
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  onClick={togglePopup}
                  className="h-10 text-white text-[16px] py-0 px-6 rounded-full bg-lightPink border border-lightPink shadow-sm hover:bg-[#D16B73] hover:shadow-md transition-all duration-200 flex items-center justify-center"
                >
                  Contact Me
                </motion.button>

                {/* Sign in / Dashboard button (secondary outline) */}
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  {token ? (
                    <a
                      href="#"
                      onClick={handleDashboardClick}
                      className="
                        h-10 text-[16px] font-medium py-0 px-6 rounded-full
                        border border-lightPink text-lightPink bg-white
                        hover:bg-lightPink hover:text-white hover:shadow-md
                        transition-all duration-200 flex items-center justify-center
                      "
                    >
                      Dashboard
                    </a>
                  ) : (
                    <Link
                      to="/signin"
                      className="
                          h-10 text-[16px] font-medium py-0 px-6 rounded-full
                          border border-lightPink text-lightPink bg-white
                          hover:bg-lightPink hover:text-white hover:shadow-md
                          transition-all duration-200 flex items-center justify-center
                        "
                    >
                      Sign In
                    </Link>
                  )}
                </motion.div>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button
                  onClick={toggleMenu}
                  className="p-2 rounded-full transition-colors duration-300"
                  aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                >
                  {isMenuOpen ? (
                    <IoMdClose className="w-6 h-6" />
                  ) : (
                    <BiMenu className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          </header>
        </Sticky>
      </div>

      {/* Mobile Menu Overlay with adjusted z-index */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[500] md:hidden"
            onClick={toggleMenu}
          />
        )}
      </AnimatePresence>

      {/* Mobile Dropdown menu with highest z-index */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed top-0 right-0 w-[80%] h-full bg-whiteBg shadow-lg md:hidden z-[600]"
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
                  {NavLinks.map((link, index) => (
                    <motion.div
                      key={index}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <a
                        href={link.path}
                        className="block w-full py-3 px-4 text-textColor font-medium rounded-lg bg-white bg-opacity-50 hover:bg-opacity-80 text-center transition-all"
                        onClick={toggleMenu}
                      >
                        {link.display}
                      </a>
                    </motion.div>
                  ))}
                </nav>
              </div>

              {/* Footer actions */}
              <div className="p-6 space-y-4">
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <button
                    onClick={() => {
                      togglePopup();
                      toggleMenu();
                    }}
                    className="block w-full h-12 text-white font-medium rounded-lg bg-lightPink text-center transition-colors duration-300 shadow-sm flex items-center justify-center"
                  >
                    Contact Me
                  </button>
                </motion.div>
                {token ? (
                  <a
                    href="#"
                    onClick={(e) => {
                      handleDashboardClick(e);
                      toggleMenu();
                    }}
                    className="block w-full h-12 text-white font-medium rounded-lg bg-orangeHeader text-center transition-colors duration-300 shadow-sm flex items-center justify-center"
                  >
                    Dashboard
                  </a>
                ) : (
                  <Link
                    to="/signin"
                    className="block w-full h-12 text-white font-medium rounded-lg bg-orangeHeader text-center transition-colors duration-300 shadow-sm flex items-center justify-center"
                    onClick={toggleMenu}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup for Contact Me */}
      <AnimatePresence>
        {isPopupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 md:p-4 z-[700]"
            onClick={(e) => {
              // Only close when clicking outside
              if (e.target === e.currentTarget) {
                togglePopup();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-whiteBg md:rounded-xl md:shadow-xl relative w-full h-full md:max-w-lg md:h-auto md:mt-0"
              style={{
                maxHeight: "100vh",
                md: { maxHeight: "calc(100vh - 80px)" },
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Add close button that's always visible */}
              <button
                onClick={togglePopup}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors duration-300 text-textColor"
                aria-label="Close"
              >
                <IoMdClose className="w-6 h-6" />
              </button>
              {/* Adjusted padding for mobile full screen */}
              <div className="p-6 pt-16 md:pt-10 md:p-6 h-full overflow-y-auto">
                <ContactMe closePopup={togglePopup} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
