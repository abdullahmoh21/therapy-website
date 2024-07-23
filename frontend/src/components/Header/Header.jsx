import { useRef, useEffect, useState } from "react";
import logo from "../../assets/images/logo.png";
import { Link } from "react-router-dom";
import { BiMenu } from "react-icons/bi";
import { useSelector } from "react-redux";
import { selectCurrentToken } from "../../features/auth/authSlice";
import ContactMe from "../../pages/General/ContactMe";
import { createPortal } from "react-dom";

const NavLinks = [
  { path: "#services", display: "Services" },
  { path: "#about", display: "About Me" },
  { path: "#faq", display: "FAQ" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const headerRef = useRef(null);
  const menuRef = useRef(null);

  const token = useSelector(selectCurrentToken);

  const handleStickyHeader = () => {
    const scrollTop =
      document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop > 80) {
      headerRef.current.classList.add("sticky_header");
    } else {
      headerRef.current.classList.remove("sticky_header");
    }
  };

  useEffect(() => {
    handleStickyHeader();
    window.addEventListener("scroll", handleStickyHeader);
    return () => {
      window.removeEventListener("scroll", handleStickyHeader);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    document.body.style.overflow = isMenuOpen ? "auto" : "hidden";
  };

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  return (
    <header
      className="flex items-center bg-[#FFEDE8] py-1 border-b-[1px] border-gray-800"
      ref={headerRef}
    >
      <div className="container mx-auto flex justify-between items-center relative">
        {/* Logo */}
        <div className="hidden flex-shrink-0 md:flex">
          <Link to="/#home" className="flex items-center">
            <img src={logo} alt="logo" className="h-20 w-auto object-contain" />
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
                className="text-[#313131] text-[16px] leading-7 bg-[#DF9E7A] font-[500] py-2 px-4 border-[#000000] rounded-full"
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

        {/* Mobile view */}
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
          <span onClick={toggleMenu} style={{ zIndex: 999 }}>
            <BiMenu className="w-6 h-6 cursor-pointer" />
          </span>
        </div>

        {/* Dropdown menu */}
        {isMenuOpen && (
          <div
            className="fixed top-0 left-0 w-full h-full bg-white shadow-lg border-gray-200 md:hidden transform transition-transform duration-1000 ease-in-out"
            ref={menuRef}
            style={{
              backdropFilter: "blur(10px)",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              zIndex: 998,
            }}
          >
            <ul className="flex flex-col items-start p-4">
              {NavLinks.map((link, index) => (
                <li key={index} className="w-full">
                  <a
                    href={link.path}
                    className="block w-full text-gray-800 py-2 px-4 hover:bg-[#e2e2e2] bg-transparent"
                    onClick={toggleMenu}
                  >
                    {link.display}
                  </a>
                </li>
              ))}
              <li className="w-full">
                <button
                  onClick={togglePopup}
                  className="block w-full text-gray-800 py-2 px-4 hover:bg-[#e2e2e2] bg-transparent"
                >
                  Contact Me
                </button>
              </li>
            </ul>
            <div className="w-full p-4">
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
                  className="block text-[#313131] py-2 px-6 border-[2px] border-[#000000] bg-[#DF9E7A] font-[600] rounded-full mb-2 w-full text-center"
                  onClick={toggleMenu}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Popup for Contact Me */}
      {isPopupOpen &&
        createPortal(
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <button
                onClick={togglePopup}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
              <ContactMe />
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};

export default Header;
