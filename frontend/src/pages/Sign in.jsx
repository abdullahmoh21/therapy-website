import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.png';

const Login = () => {
  return (
    <>
      <div className="flex h-screen">
        {/* LEFT SECTION */}
        <section className="w-1/2  bg-[#c45e3e]">
          {/* TODO */}
        </section>

        {/* RIGHT SECTION */}
        <section className="home-bg w-1/2 relative">

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
                <input type="email" placeholder="Email" className="py-2 px-3 border-b-2 border-[#D9D9D9]" />
                <div> 
                  <div>
                    <input type="password" placeholder="Password" className="py-2 px-3 border-b-2 border-[#D9D9D9] w-full" />
                  </div>
                  <div className='w-full'>
                  <Link to='/' className='w-full'>
                    <p className="text-right text-[#c45e3e] text-sm">Forgot Password?</p>
                  </Link>
                  </div>
                </div>
                <div className='pt-[25px] mx-auto'>
                  <button className="py- px-3 bg-black text-white h-[40px] w-[130px] border-white rounded-[20px] hover:bg-[#2c2c2c]  flex justify-center items-center">Sign In</button>
                </div>
              </form>

              {/* SEPERATOR */}
              {/* <div className="flex items-center justify-center my-4 ">
                <hr className="border-gray-400 border-[1px] w-1/2" />
                <span className="mx-4 text-gray-400">or</span>
                <hr className="border-gray-400 border-[1px] w-1/2" />
              </div> */}

              {/* GOOGLE SIGN IN */}
              





            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Login;