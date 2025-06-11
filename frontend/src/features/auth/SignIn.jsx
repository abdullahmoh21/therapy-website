import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.webp";
import wave from "../../assets/images/wave.webp";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "./authSlice";
import { toast } from "react-toastify";
import Joi from "joi";
import { useLoginMutation } from "./authApiSlice";
import { useResendEmailVerificationMutation } from "../users/usersApiSlice";
import usePersist from "../../hooks/usePersist";
import { ROLES } from "../../config/roles";
import { selectCurrentUserRole } from "./authSlice";

// Login validation
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

const Login = () => {
  const role = useSelector(selectCurrentUserRole);
  const userRef = useRef();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [persist, setPersist] = usePersist();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [resendEmailVerification, { isLoading: sendingEV }] =
    useResendEmailVerificationMutation();

  useEffect(() => {
    if (userRef.current) userRef.current.focus();
  }, []);

  /* redirect after role set */
  useEffect(() => {
    if (role === ROLES.Admin) navigate("/admin");
    else if (role) navigate("/dash");
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = schema.validate({ email, password });
      if (error) return toast.error(error.details[0].message);

      const { accessToken } = await login({ email, password }).unwrap();
      dispatch(setCredentials({ accessToken }));
      setEmail("");
      setPassword("");
      setPersist(true);
    } catch (err) {
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
      await resendEmailVerification({ email });
      toast.success("Verification email sent successfully!");
    } catch (err) {
      if (err.status === 400) toast.error("No user found with this email.");
      else if (err.status === 500)
        toast.error("Failed to send verification email.");
      else toast.error("Could not connect.");
    }
  };

  /* ----------  SHARED HEADER  ---------- */
  const Header = () => (
    <div className="flex flex-col items-center text-center">
      <Link to="/" className="mb-2">
        <img src={logo} alt="logo" width={135} height={60} />
      </Link>
      <h1 className="text-[26px] leading-[36px] sm:leading-[46px] font-bold text-[#c45e3e] pb-3">
        Welcome to Fatima's Clinic
      </h1>
    </div>
  );

  /* wave height break-points — we reuse them for padding-bottom */
  const wavePadding = "pb-[100px] sm:pb-[150px] md:pb-[225px] lg:pb-[300px]";

  /* ----------  VERIFICATION PAGE  ---------- */
  const verificationPage = (
    <section
      className={`main-bg min-h-screen flex flex-col items-center overflow-hidden relative ${wavePadding}`}
    >
      <div className="pt-10 sm:pt-12 md:pt-16 lg:pt-20">
        <Header />
      </div>

      <div className="flex-grow flex items-center justify-center w-full px-6">
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

      {/* Decorative wave at the very bottom */}
      <div className="absolute bottom-0 left-0 w-full bg-cover bg-no-repeat h-[100px] sm:h-[150px] md:h-[225px] lg:h-[300px] pointer-events-none hidden md:block">
        <img src={wave} alt="wave pattern" className="w-full h-full" />
      </div>
    </section>
  );

  /* ----------  SIGN-IN PAGE  ---------- */
  const signinPage = (
    <section
      className={`main-bg min-h-screen flex flex-col items-center overflow-hidden relative ${wavePadding}`}
    >
      <div className="pt-10 sm:pt-12 md:pt-16 lg:pt-20">
        <Header />
      </div>

      <div className="flex-grow flex items-center justify-center w-full px-6">
        <div className="w-full max-w-[400px]">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <input
              className="py-2 px-3 border-b-2 border-[#262424] outline-none focus:border-[#c45e3e] bg-transparent"
              placeholder="Email"
              type="text"
              id="email"
              ref={userRef}
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="py-2 px-3 border-b-2 border-[#262424] outline-none focus:border-[#c45e3e] bg-transparent"
              placeholder="Password"
              type="password"
              id="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex justify-end">
              <Link to="/forgotPassword">
                <p className="text-[#262424] underline text-sm">
                  Forgot Password?
                </p>
              </Link>
            </div>

            <div className="flex justify-center">
              <button
                className="py-2 px-3 bg-[#262424] text-white h-[40px] w-[130px] rounded-[20px] hover:bg-[#2c2c2c]"
                disabled={loginLoading}
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

      {/* Decorative wave at the very bottom */}
      <div className="absolute bottom-0 left-0 w-full bg-cover bg-no-repeat h-[100px] sm:h-[150px] md:h-[225px] lg:h-[300px] pointer-events-none hidden md:block">
        <img src={wave} alt="wave pattern" className="w-full h-full" />
      </div>
    </section>
  );

  return <>{showResendVerification ? verificationPage : signinPage}</>;
};

export default Login;
