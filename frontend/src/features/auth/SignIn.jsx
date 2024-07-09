import { Link } from "react-router-dom";
import logo from "/Users/AbdullahMohsin/Documents/Code/Personal/Fatima Website/frontend/src/assets/images/logo.png";
// import LoadingPage from "./LoadingPage";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "./authSlice";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Joi from "joi";
import { useLoginMutation } from "./authApiSlice";
import { useResendEmailVerificationMutation } from "../users/usersApiSlice";
import usePersist from "../../hooks/usePersist";
import { ROLES } from "../../config/roles";
import { selectCurrentUserRole } from "./authSlice";

{
}

const schema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Invalid Email. Please enter a valid email address",
      "string.empty": "Email is required",
    }),
  password: Joi.string()
    .min(8)
    .max(30)
    .pattern(new RegExp("[!@#$%*()_+^]"))
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password must be at most 30 characters long",
      "string.pattern.base":
        "Password must one special character like ! or @ or # or _",
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
  const handleUserInput = (e) => setEmail(e.target.value);
  const handlePwdInput = (e) => setPassword(e.target.value);

  const [login, { isLoading: loginLoading }] = useLoginMutation();

  const [
    resendEmailVerification,
    {
      //EV = Email Verification
      isLoading: sendingEV,
    },
  ] = useResendEmailVerificationMutation();

  useEffect(() => {
    if (userRef.current) {
      userRef.current.focus();
    }
  }, []);

  //will navigate to the appropriate page when users role is determined
  useEffect(() => {
    if (role === ROLES.Admin) {
      navigate("/admin");
      console.log(`Login successful. Redirecting to "/admin" `);
    } else if (role) {
      navigate("/dash");
      console.log(`Login successful. Redirecting to "/dash" `);
    }
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      //data validation
      const { error } = schema.validate({ email, password });
      if (error) {
        toast.error(error.details[0].message); //validation errors
        console.log(`in validation if block`);
        return;
      }

      console.log(`Attempting login with email: ${email}`);
      const { accessToken } = await login({ email, password }).unwrap();
      dispatch(setCredentials({ accessToken }));
      setEmail("");
      setPassword("");
      setPersist(true); //persist login always
    } catch (err) {
      //server error handling
      let Msg = "An error occurred. Please try again later.";
      if (!err.status && !err.data) {
        Msg =
          "Could not connect to server. Please check your internet connection and try again.";
      } else if (!err.status) {
        Msg = "No Server Response";
      } else if (
        err.status === 401 &&
        err.data?.message ===
          "Email not verified. Check your email for verification link"
      ) {
        setShowResendVerification(true);
      } else if (err.status === 401 || err.status === 400) {
        Msg = "Invalid Email or Password"; // Unauthorized
      } else if (err.status === 429) {
        Msg =
          "This IP has been bocked because of too many requests. Please try again later.";
      } else if (err.data && typeof err.data === "string") {
        // Check if err.data is a string, and if so, set it as the error message
        Msg = err.data;
      } else if (err?.data?.message) {
        //or JSON object with a message property
        Msg = err.data?.message;
      } else {
        Msg = "Error Connecting to Server. Please datry again later.";
      }
      toast.error(Msg);
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendEmailVerification({ email: email });
      toast.success("Verification email sent successfully!");
    } catch (err) {
      if (err.status === 400) {
        toast.error("No user found with this email.");
      } else if (err.status === 500) {
        toast.error("Failed to send verification email.");
      } else {
        toast.error("Could not connect. ");
      }
    }
  };

  const verificationPage = (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <ToastContainer />
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Account not verified
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please check your email for the verification link.
            </p>
          </div>
          <div>
            <button
              onClick={handleResendVerification}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {sendingEV ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <div className="spinner"></div>
                </div>
              ) : (
                "Resend Verification Link"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  const signinPage = (
    <>
      <div className="flex h-screen">
        {/* LEFT SECTION */}
        <section className="w-1/2 h-screen bg-[#c45e3e]">
          <h1 className="text-center pt-[100px]">ART HERE</h1>
        </section>

        {/* RIGHT SECTION */}
        <section className="home-bg w-1/2 h-screen relative">
          <ToastContainer />
          {/* LOGO AND HEADING */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 pt-20">
            <Link to="/" className="flex justify-center items-center pb-[15px]">
              <img src={logo} alt="logo" height={45} width={100} />
            </Link>
            <h1 className="text-[26px] text-center leading-[46px] font-bold text-[#c45e3e]">
              Welcome to Fatima's Clinic
            </h1>
          </div>

          <div className="flex flex-col items-center justify-center h-screen">
            <div className="w-[400px]">
              {/* INPUT FORM */}
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <input
                  className="py-2 px-3 border-b-2 border-[#262424] outline-none focus:border-[#c45e3e] bg-transparent"
                  placeholder="Email"
                  type="text"
                  id="email"
                  ref={userRef}
                  value={email}
                  autoComplete="email"
                  onChange={handleUserInput}
                />
                <div>
                  <div>
                    <input
                      className="py-2 px-3 border-b-2 border-[#262424] outline-none focus:border-[#c45e3e] w-full bg-transparent"
                      placeholder="Password"
                      type="password"
                      id="password"
                      value={password}
                      autoComplete="password"
                      onChange={handlePwdInput}
                    />
                  </div>
                  <div className="w-full">
                    <Link to="/forgotPassword" className="w-full">
                      <p className="text-right text-[#c45e3e] text-sm">
                        Forgot Password?
                      </p>
                    </Link>
                  </div>
                </div>
                {/* SIGN IN BUTTON */}
                <div className="  flex justify-center items-center">
                  <button
                    className="py- px-3 bg-[#262424] text-white h-[40px] w-[130px] border-white rounded-[20px]
                    hover:bg-[#2c2c2c]"
                  >
                    {loginLoading ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <div className="spinner"></div>
                      </div>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </div>
              </form>
              {/* NEW CLIENT */}
              <Link to="/bookasession" className="w-full ">
                <p className="text-right pt-[20px] text-sm flex justify-center items-center ">
                  <span className="text-[#262424] whitespace-pre">
                    New Client?{" "}
                  </span>
                  <span className="text-[#c45e3e]">
                    <u> Book A Session</u>
                  </span>{" "}
                </p>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );

  return (
    //sign in page or email verification page
    <>{showResendVerification ? verificationPage : signinPage}</>
  );
};
export default Login;
