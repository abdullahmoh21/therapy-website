// frontend/src/features/auth/SignIn.jsx
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.webp";
import wave from "../../assets/images/wave.webp";
import { useRef, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import Joi from "joi";

import { setCredentials, selectCurrentUserRole } from "./authSlice";
import { useLoginMutation } from "./authApiSlice";
import { useResendEmailVerificationMutation } from "../users/usersApiSlice";
import usePersist from "../../hooks/usePersist";
import { ROLES } from "../../config/roles";

import VerificationPrompt from "./VerificationPrompt";

// ---------- shared header ----------
const Header = () => (
  <div className="flex flex-col items-center text-center">
    <Link to="/" className="mb-2">
      <img
        src={logo}
        alt="logo"
        className="w-[150px] sm:w-[160px] md:w-[180px] h-auto"
      />
    </Link>
    <h1 className="text-[26px] leading-[36px] sm:leading-[46px] font-bold text-[#c45e3e] pb-3">
      Welcome to Fatima's Clinic
    </h1>
  </div>
);

// ----- validation schema -----
const schema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Invalid Email. Please enter a valid email address",
      "string.empty": "Email is required",
    }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

const SignIn = () => {
  const role = useSelector(selectCurrentUserRole);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showResendVerification, setShowResendVerification] = useState(false);

  const [persist, setPersist] = usePersist();

  const userRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // RTK Query hooks
  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [resendEmailVerification, { isLoading: sendingEV }] =
    useResendEmailVerificationMutation();

  // focus email field on mount
  useEffect(() => {
    userRef.current?.focus();
  }, []);

  // redirect once role is set
  useEffect(() => {
    if (role === ROLES.Admin) navigate("/admin");
    else if (role) navigate("/dash");
  }, [role, navigate]);

  // ---------- handlers ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Joi validation
    const { error } = schema.validate({ email, password });
    if (error) {
      toast.error(error.details[0].message);
      return;
    }

    try {
      const { accessToken } = await login({ email, password }).unwrap();
      dispatch(setCredentials({ accessToken }));
      setEmail("");
      setPassword("");
      setPersist(true);
    } catch (err) {
      /* friendly error handling identical to previous implementation */
      let Msg = "An error occurred. Please try again later.";

      if (!err.status && !err.data)
        Msg =
          "Could not connect to server. Please check your internet connection and try again.";
      else if (!err.status) Msg = "No Server Response";
      else if (
        err.status === 401 &&
        err.data?.message ===
          "Email not verified. Check your email for verification link"
      ) {
        setShowResendVerification(true);
        return;
      } else if (err.status === 401 || err.status === 400)
        Msg = "Invalid Email or Password";
      else if (err.status === 429)
        Msg =
          "This IP has been blocked due to too many requests. Please try again later.";
      else if (typeof err.data === "string") Msg = err.data;
      else if (err?.data?.message) Msg = err.data.message;

      toast.error(Msg);
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendEmailVerification({ email }).unwrap();
      toast.success("Verification email sent successfully!");
    } catch (err) {
      if (err.status === 400) toast.error("No user found with this email.");
      else if (err.status === 500)
        toast.error("Failed to send verification email.");
      else toast.error("Could not connect.");
    }
  };

  // ---------- sign-in markup ----------
  const signInMarkup = (
    <section className="main-bg min-h-screen flex flex-col items-center overflow-hidden relative pb-[100px] sm:pb-[150px] md:pb-[225px] lg:pb-[300px]">
      <div className="pt-24 sm:pt-12 md:pt-16 lg:pt-20">
        <Header />
      </div>

      <div className="mt-8 sm:mt-4 md:flex-grow md:flex md:items-center md:justify-center w-full px-6">
        <div className="w-full max-w-[400px]">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <input
              ref={userRef}
              id="email"
              type="text"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="py-2 px-3 border-b-2 border-[#262424] outline-none focus:border-[#c45e3e] bg-transparent"
            />

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="py-2 px-3 border-b-2 border-[#262424] outline-none focus:border-[#c45e3e] bg-transparent"
            />

            <div className="flex justify-end">
              <Link
                to="/forgotPassword"
                className="text-[#262424] underline text-sm"
              >
                Forgot Password?
              </Link>
            </div>

            <div className="flex justify-center">
              <button
                disabled={loginLoading}
                className="py-2 px-3 bg-[#262424] text-white h-[40px] w-[130px] rounded-[20px] hover:bg-[#2c2c2c]"
              >
                {loginLoading ? (
                  <div className="flex justify-center leading-8 items-center">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </form>

          <div className="flex justify-center pt-4 text-sm">
            <span className="text-[#262424] mr-1">New Client?</span>
            <Link to="/consultation" className="text-[#c45e3e] underline">
              Book a free consultation
            </Link>
          </div>
        </div>
      </div>

      {/* decorative wave */}
      <div className="absolute bottom-0 left-0 w-full bg-cover bg-no-repeat h-[100px] sm:h-[150px] md:h-[225px] lg:h-[300px] pointer-events-none hidden md:block">
        <img src={wave} alt="wave pattern" className="w-full h-full" />
      </div>
    </section>
  );

  // ---------- render ----------
  return showResendVerification ? (
    <VerificationPrompt
      sendingEV={sendingEV}
      handleResendVerification={handleResendVerification}
    />
  ) : (
    signInMarkup
  );
};

export default SignIn;
