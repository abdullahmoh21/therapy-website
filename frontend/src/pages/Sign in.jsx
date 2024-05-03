import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.png';
import login_art from '../assets/images/login_art.png';

const Login = () => {
  return (
    <>

    {/* TODO:
      - FIX PAGE OVERFLOWING
      - forgot password link
      - new user link
    
    */}
      <div className="flex h-screen">
        {/* LEFT SECTION */}
        <section className="w-1/2 h-screen bg-[#c45e3e]">
          <h1 className='text-center pt-[100px]'>ART HERE</h1>
        </section>

        {/* RIGHT SECTION */}
        <section className="home-bg w-1/2 h-screen relative">

          {/* LOGO AND HEADING */}
          <div className='absolute top-0 left-1/2 transform -translate-x-1/2 pt-20'>
            <Link to='/' className='flex justify-center items-center pb-[15px]'>
              <img src={logo} alt="logo" height={45} width={100} />
            </Link>
            <h1 className="text-[26px] text-center leading-[46px] font-bold text-[#c45e3e]">Welcome to Fatima's Clinic</h1>
          </div>

          <div className="flex flex-col items-center justify-center h-screen">
            <div className="w-[400px]">
              {/* INPUT FORM */}
              <form className="flex flex-col gap-4">
                <input type="email" placeholder="Email" className="py-2 px-3 border-b-2 border-[#262424] outline-none
                 focus:border-[#c45e3e] bg-transparent" />
                <div> 
                  <div>
                    <input type="password" placeholder="Password" className="py-2 px-3 border-b-2 border-[#262424] outline-none
                     focus:border-[#c45e3e] w-full bg-transparent" />
                  </div>
                  <div className='w-full'>
                  <Link to='/' className='w-full'>
                    <p className="text-right text-[#c45e3e] text-sm">Forgot Password?</p>
                  </Link>
                  </div>
                </div>
                {/* SIGN IN BUTTON */}
                <div className='mx-auto'>
                  <button className="py- px-3 bg-[#262424] text-white h-[40px] w-[130px] border-white rounded-[20px]
                   hover:bg-[#2c2c2c]  flex justify-center items-center">Sign In</button>
                </div>
              </form>

              <Link to='/bookasession' className='w-full '>
                    <p className="text-right pt-[20px] text-sm flex justify-center items-center "><span className='text-[#262424] whitespace-pre'>New Client? </span>
                    <span className='text-[#c45e3e]'><u> Book A Session</u></span> </p> 
              </Link>

            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Login;