import { useState, useEffect } from "react";
import logo from "../../assets/images/logo.png";
import { Link } from "react-router-dom";
import { BiMenu } from "react-icons/bi";
import { useSelector } from "react-redux";
import { selectCurrentToken } from "../../features/auth/authSlice";
import ContactMe from "../../pages/General/ContactMe/ContactMe.jsx";
import Sticky from "react-stickynode";

const NavLinks = [
  { path: "#services", display: "Services" },
  { path: "#about", display: "About Me" },
  { path: "#faq", display: "FAQ’s" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const token = useSelector(selectCurrentToken);

  // Effect to manage body scroll behavior when popup or mobile menu is open
  useEffect(() => {
    document.body.style.overflow =
      isMenuOpen || isPopupOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto"; // Ensure overflow is reset on component unmount
    };
  }, [isMenuOpen, isPopupOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  return (
    <>
      <Sticky
        enabled={true}
        top={0}
        innerZ={500} // Ensures it stays above other content
        activeClass="sticky_header"
      >
        <header className="flex items-center bg-[#FFEDE8] py-1 border-b-[1px] border-gray-800">
          <div className="container mx-auto flex justify-between items-center relative">
            {/* Logo */}
            <div className="hidden flex-shrink-0 md:flex">
              <Link to="/#home" className="flex items-center">
                <img
                  src={logo}
                  alt="logo"
                  className="h-20 w-auto object-contain"
                />
              </Link>
            </div>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center justify-center flex-1">
              <ul className="flex items-center gap-8">
                {NavLinks.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.path}
                      className="text-[#313131] text-[16px] leading-7 bg-[#DF9E7A] font-[500] py-2 px-4 border-[#000000] rounded-full"
                    >
                      {link.display}
                    </a>
                  </li>
                ))}
                <li>
                  <button
                    onClick={togglePopup}
                    className="text-[#313131] text-[16px] leading-7 bg-[#DF9E7A] font-[500] py-1 px-4 border-[#000000] rounded-full"
                  >
                    Contact Me
                  </button>
                </li>
              </ul>
            </nav>

            {/* Sign in / Dashboard button (hidden on mobile) */}
            <div className="flex-shrink-0 hidden md:block">
              {token ? (
                <Link
                  to="/dash"
                  className="text-[#313131] text-[16px] leading-7 bg-[#DF9E7A] font-[500] py-2 px-4 border-[#000000] rounded-full"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/signin"
                  className="text-[#313131] text-[16px] leading-7 bg-[#DF9E7A] font-[500] py-2 px-4 border-[#000000] rounded-full"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Header */}
            <div className="flex items-center justify-between w-full md:hidden">
              <span style={{ opacity: 0 }}></span>
              <div>
                <Link to="/" className="flex items-center">
                  <img
                    src={logo}
                    alt="logo"
                    className="h-20 w-auto object-contain"
                  />
                </Link>
              </div>
              <span onClick={toggleMenu} style={{ zIndex: 500 }}>
                <BiMenu className="w-6 h-6 cursor-pointer" />
              </span>
            </div>

            {/* Mobile Dropdown menu */}
            {isMenuOpen && (
              <div
                className="fixed top-0 left-0 w-full h-full bg-[#FFEDE8] shadow-lg border-gray-200 md:hidden transform transition-transform duration-300 ease-in-out"
                style={{ zIndex: 499 }}
              >
                <div className="flex flex-col items-center p-[16px] mt-[60px] max-h-screen bg-[#FFEDE8]">
                  {/* Center items horizontally */}
                  <ul className="flex flex-col items-center w-full gap-4">
                    {NavLinks.map((link, index) => (
                      <li key={index} className="w-full">
                        <a
                          href={link.path}
                          className="block w-full text-[#313131] py-2 px-5 bg-[#DF9E7A] border-[#000000] font-[600] rounded-full text-center"
                          onClick={toggleMenu} // Close menu on link click
                        >
                          {link.display}
                        </a>
                      </li>
                    ))}
                    <li className="w-full">
                      <button
                        onClick={() => {
                          togglePopup();
                          toggleMenu(); // Close menu when clicking Contact Me
                        }}
                        className="block w-full text-[#313131] py-2 px-6 bg-[#DF9E7A] border-[#000000] font-[600] rounded-full text-center"
                      >
                        Contact Me
                      </button>
                    </li>
                  </ul>
                  <div className="w-full p-4 pt-[60px] flex flex-col items-center">
                    {token ? (
                      <Link
                        to="/dash"
                        className="block text-[#313131] py-2 px-6 border-[2px] border-[#000000] bg-[#DF9E7A] font-[600] rounded-full mb-2 w-full text-center"
                        onClick={toggleMenu}
                      >
                        Dashboard
                      </Link>
                    ) : (
                      <Link
                        to="/signin"
                        className="block text-[#313131] py-2 px-6 border-[2px] border-[#000000] bg-[#E27A82] font-[600] rounded-full mb-2 w-full text-center"
                        onClick={toggleMenu}
                      >
                        Sign In
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>
      </Sticky>

      {/* Popup for Contact Me */}
      {isPopupOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 overflow-x-hidden">
          <div
            className="bg-white p-4 md:p-6 rounded-lg shadow-lg relative max-w-full md:max-w-lg w-full mx-4 my-auto"
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            <button
              onClick={togglePopup}
              className="absolute top-0 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              aria-label="Close"
            >
              &times;
            </button>
            <ContactMe />
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
