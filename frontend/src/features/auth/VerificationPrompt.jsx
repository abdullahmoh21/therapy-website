// frontend/src/features/auth/VerificationPrompt.jsx
import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.webp";
import wave from "../../assets/images/wave.webp";

const VerificationPrompt = ({ sendingEV, handleResendVerification }) => {
  return (
    <section className="main-bg min-h-screen flex flex-col items-center overflow-hidden relative pb-[100px] sm:pb-[150px] md:pb-[225px] lg:pb-[300px]">
      <div className="pt-24 sm:pt-12 md:pt-16 lg:pt-20">
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="mb-2">
            <img
              src={logo}
              alt="logo"
              className="w-[135px] sm:w-[160px] md:w-[180px] h-auto"
            />
          </Link>
          <h1 className="text-[26px] leading-[36px] sm:leading-[46px] font-bold text-[#c45e3e] pb-3">
            Welcome to Fatima's Clinic
          </h1>
        </div>
      </div>

      <div className="mt-8 sm:mt-4 md:flex-grow md:flex md:items-center md:justify-center w-full px-6">
        <div className="w-full max-w-[400px] text-center bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold text-[#262424] mb-2">
            Account Not Verified
          </h2>
          <p className="text-sm text-[#4b4b4b] mb-6">
            Please check your email for a verification link before continuing.
          </p>

          <button
            onClick={handleResendVerification}
            className="py-2 px-6 bg-[#262424] text-white rounded-full hover:bg-[#2c2c2c] transition duration-300"
          >
            {sendingEV ? (
              <div className="flex justify-center items-center">
                <div className="spinner h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              "Resend Verification Link"
            )}
          </button>
        </div>
      </div>

      {/* decorative wave */}
      <div className="absolute bottom-0 left-0 w-full bg-cover bg-no-repeat h-[100px] sm:h-[150px] md:h-[225px] lg:h-[300px] pointer-events-none hidden md:block">
        <img src={wave} alt="wave pattern" className="w-full h-full" />
      </div>
    </section>
  );
};

export default VerificationPrompt;
