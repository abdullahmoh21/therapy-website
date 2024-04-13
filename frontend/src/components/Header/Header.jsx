import { useRef, useEffect, useState } from 'react';
import logo from '../../assets/images/logo.png';
import { NavLink, Link } from 'react-router-dom';
import { BiMenu } from "react-icons/bi";

const NavLinks = [
    { path: '/services', display: 'Services' },
    { path: '/about', display: 'About Me' },
];

/** TODO:
 *  Make all child divs fit into parent divs (currently child divs are overflowing parent divs invisibly)    
 *  
 */

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const headerRef = useRef(null);
    const menuRef = useRef(null);

    const handleStickyHeader = () => {
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        if (scrollTop > 80) {
            headerRef.current.classList.add('sticky_header');
        } else {
            headerRef.current.classList.remove('sticky_header');
        }
    };

    useEffect(() => {
        handleStickyHeader();
        window.addEventListener('scroll', handleStickyHeader);
        return () => {
            window.removeEventListener('scroll', handleStickyHeader);
        };
    }, []);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <header className="header flex items-center bg-white home-bg" ref={headerRef}>
            <div className="container">

                {/* Desktop navigation */}
                <div className='hidden md:flex items-center justify-between'>
                    <div className='flex items-center h-full'>
                        <Link to='/' className='mr-8'>
                            <img src={logo} alt="logo" height={45} width={100}/>
                        </Link>
                        <div className='navigation'>
                            <ul className='flex items-center gap-[5px]'>
                                {NavLinks.map((link, index) => (
                                    <li key={index}>
                                        <NavLink
                                            to={link.path}
                                            className="text-textColor text-[16px] leading-7 font-[500] py-2 px-3 border-white rounded-md h-[35px] hover:bg-[#e2e2e2]"
                                        >
                                            {link.display}
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className='flex items-center gap-4 '>
                        {/* sign in button */}

                        <Link to='/signin' className='py-2 px-3 bg-black text-white text-[15px] h-[35px] w-[80px]
                            flex items-center justify-center border-white rounded-[20px] hover:bg-[#2c2c2c]'>Sign In</Link >

                    </div>
                </div>

                {/* Mobile view */}
                <div className='flex items-center justify-between w-full md:hidden'>
                    <span style={{ opacity: 0 }}></span>
                    <div>
                        <Link to='/' className='flex items-center' style={{ margin: 'auto' }}>
                            <img src={logo} alt="logo" className="mr-2" />
                        </Link>
                    </div>
                    <span onClick={toggleMenu} style={{ zIndex: 999 }}>
                        <BiMenu className='w-6 h-6 cursor-pointer' />
                    </span>
                </div>

                {/* Dropdown menu */}
                {isMenuOpen && (
                    <div className="absolute shadow-lg border-gray-200 w-full h-full left-0 opacity-100" ref={menuRef}>
                        <ul>
                            {NavLinks.map((link, index) => (
                                <li key={index}>
                                    <NavLink
                                        to={link.path}
                                        className="block text-gray-800 hover:text-primaryColor"
                                        onClick={toggleMenu}
                                    >
                                        {link.display}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                        <div className='bottomButtons w-full'>
                            <Link to='/login' className='py-2 px-6 text-irisBlueColor border-[2px] border-irisBlueColor font-[600] h-[35px] w-full
                            flex items-center justify-center rounded-md mb-2.5 mx-4' onClick={toggleMenu}>SIGN IN</Link >
                            
                            <Link to='/signup' className='bg-primaryColor py-2 px-6 text-white font-[600] h-[35px] w-full
                            flex items-center justify-center rounded-md mb-2.5 mx-4' onClick={toggleMenu}>SIGN UP </Link >
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
