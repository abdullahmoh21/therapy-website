import { useState, useEffect } from "react";
import logo from "../../assets/images/logo.webp";
import { Link } from "react-router-dom";
import { BiMenu } from "react-icons/bi";
import { IoMdClose } from "react-icons/io";
import { useSelector } from "react-redux";
import { selectCurrentToken } from "../../features/auth/authSlice";
import ContactMe from "../../pages/General/ContactMe/ContactMe.jsx";
import Sticky from "react-stickynode";
import { motion, AnimatePresence } from "framer-motion";

const NavLinks = [
  { path: "#services", display: "Services" },
  { path: "#about", display: "About Me" },
  { path: "#faq", display: "FAQ's" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const token = useSelector(selectCurrentToken);

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
      <Sticky enabled={true} top={0} innerZ={500} activeClass="sticky_header">
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
                      className={`text-textColor text-[16px] font-medium py-2 px-4 rounded-full border border-transparent hover:bg-orangeBg hover:border-orangeBg/90 transition-colors duration-300`}
                    >
                      {link.display}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </nav>

            {/* Right side buttons container */}
            <div className="flex-shrink-0 hidden md:flex items-center gap-3">
              {/* Contact Me button moved here */}
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                onClick={togglePopup}
                className="h-10 text-buttonTextBlack text-[16px] text-bold font-medium py-0 px-6 bg-orangeButton rounded-full shadow-sm hover:bg-lightPink hover:shadow-md transition-colors duration-300 flex items-center justify-center"
              >
                Contact Me
              </motion.button>

              {/* Sign in / Dashboard button */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                {token ? (
                  <Link
                    to="/dash"
                    className="h-10 text-buttonTextBlack text-[16px] font-medium py-0 px-6 bg-orangeButton rounded-full shadow-sm hover:bg-lightPink hover:shadow-md transition-colors duration-300 flex items-center justify-center"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/signin"
                    className="h-10 text-buttonTextBlack text-[16px] font-medium py-0 px-6 bg-orangeButton rounded-full shadow-sm hover:bg-lightPink hover:shadow-md transition-colors duration-300 flex items-center justify-center"
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

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={toggleMenu}
          />
        )}
      </AnimatePresence>

      {/* Mobile Dropdown menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed top-0 right-0 w-[80%] h-full bg-whiteBg shadow-lg md:hidden z-50"
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
                  <Link
                    to="/dash"
                    className="block w-full h-12 text-white font-medium rounded-lg bg-orangeHeader text-center transition-colors duration-300 shadow-sm flex items-center justify-center"
                    onClick={toggleMenu}
                  >
                    Dashboard
                  </Link>
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
            className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4"
            onClick={(e) => {
              // Only allow closing by clicking outside on desktop
              const isDesktop = window.innerWidth >= 768; // Tailwind's 'md' breakpoint
              if (isDesktop && e.target === e.currentTarget) {
                togglePopup();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-xl relative max-w-lg w-full mx-auto"
              style={{ maxHeight: "80vh", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={togglePopup}
                className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-black/20 transition-colors duration-300 text-gray-600"
                aria-label="Close"
              >
                <IoMdClose className="w-5 h-5" />
              </button>
              <div className="p-6">
                <ContactMe />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
