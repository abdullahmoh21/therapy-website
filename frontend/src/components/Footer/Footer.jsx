import React from 'react'
import logo from '../../assets/images/logo.png';
import {Link} from 'react-router-dom';

const Footer = () => {
  return (


    <footer>
      <div className='bg-[#68554f] h-[100px] flex items-center justify-between'>
        <Link to='/' className='flex items-center ml-[100px]'>
            <img src={logo} alt="logo" height={45} width={100}/>
        </Link>
        <div className='text-white text-center flex flex-col justify-center mr-[100px]'>
          <h1 className='pb-[10px]'>208B, Street 5, Cavalry Ground, Lahore, Pakistan</h1>

          <div>
          <a href="tel:+923334245151">+92 333 4245151 | </a> <a href="mailto:fatimamohsin40@gmail.com">fatimamohsin40@gmail.com</a>
          </div>

        </div>
      </div>
    </footer>


  );
};

export default Footer;

