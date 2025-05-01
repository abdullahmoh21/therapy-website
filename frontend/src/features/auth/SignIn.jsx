import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import wave from "../../assets/images/wave.png";
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
  password: Joi.string()
    .min(8)
    .max(30)
    .pattern(new RegExp("[!@#$%*()_+^]"))
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password must be at most 30 characters long",
      "string.pattern.base":
        "Password must include one special character like ! or @ or # or _",
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
    if (userRef.current) {
      userRef.current.focus();
    }
  }, []);

  //on sign-in wait for role to be set. If role is set, redirect to appropriate page
  useEffect(() => {
    if (role === ROLES.Admin) {
      navigate("/admin");
      console.log(`Login successful. Redirecting to "/admin"`);
    } else if (role) {
      navigate("/dash");
      console.log(`Login successful. Redirecting to "/dash"`);
    }
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = schema.validate({ email, password });
      if (error) {
        toast.error(error.details[0].message);
        return;
      }

      console.log(`Attempting login with email: ${email}`);
      const { accessToken } = await login({ email, password }).unwrap();
      dispatch(setCredentials({ accessToken }));
      setEmail("");
      setPassword("");
      setPersist(true); // persist login always
    } catch (err) {
      // handling http codes
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
        Msg = "Invalid Email or Password";
      } else if (err.status === 429) {
        Msg =
          "This IP has been blocked due to too many requests. Please try again later.";
      } else if (err.data && typeof err.data === "string") {
        Msg = err.data;
      } else if (err?.data?.message) {
        Msg = err.data?.message;
      } else {
        Msg = "Error Connecting to Server. Please try again later.";
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
        toast.error("Could not connect.");
      }
    }
  };

  //Function that will scroll to the book section when the user clicks on the link
  const handleScrollToBook = (e) => {
    e.preventDefault(); // Prevent default anchor link behavior (navigating to "/")

    // Navigate to the home page first
    navigate("/");

    // Scroll to the section with id="book" after navigating
    useEffect(() => {
      const scrollOptions = {
        behavior: "smooth",
        block: "start", // Scroll to the top of the element
      };
      const bookSection = document.getElementById("book");
      if (bookSection) {
        bookSection.scrollIntoView(scrollOptions);
      }
    }, []); // Empty dependency array ensures this effect runs only once after mount
  };

  const verificationPage = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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
  );

  const signinPage = (
    <div className="flex h-screen">
      <section className="main-bg w-full flex items-center justify-center">
        <div className="w-full max-w-[600px] px-6">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 pt-20">
            <Link to="/" className="flex justify-center items-center pb-[15px]">
              <img src={logo} alt="logo" height={60} width={135} />{" "}
              {/* Increased logo size */}
            </Link>
            <h1 className="text-[26px] text-center leading-[46px] font-bold text-[#c45e3e]">
              Welcome to Fatima's Clinic
            </h1>
          </div>

          <div className="flex flex-col items-center justify-center h-screen">
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
                <div>
                  <input
                    className="py-2 px-3 border-b-2 border-[#262424] outline-none focus:border-[#c45e3e] w-full bg-transparent"
                    placeholder="Password"
                    type="password"
                    id="password"
                    value={password}
                    autoComplete="password"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="flex justify-end w-full">
                  <Link to="/forgotPassword">
                    <p className="text-right text-[#262424] text-sm">
                      Forgot Password?
                    </p>
                  </Link>
                </div>
                <div className="flex justify-center items-center">
                  <button
                    className="py- px-3 bg-[#262424] text-white h-[40px] w-[130px] border-white rounded-[20px]
                    hover:bg-[#2c2c2c]"
                    disabled={loginLoading}
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
              <div className="flex justify-center pt-[15px]">
                <span className="text-[#262424] whitespace-pre">
                  New Client?{" "}
                </span>
                <span className="text-[#c45e3e]">
                  <u>
                    <Link to="https://calendly.com/fatimamohsintherapy/consultation">
                      Book A Session
                    </Link>
                  </u>
                </span>{" "}
              </div>
            </div>
          </div>
        </div>
        {/* Wave pattern at the bottom */}
        <div className="absolute bottom-0 left-0 w-full bg-cover bg-no-repeat h-[300px] pointer-events-none hidden md:block">
          <img src={wave} alt="wave pattern" className="w-full h-full" />
        </div>
      </section>
    </div>
  );

  return (
    //sign in page or email verification page
    <>{showResendVerification ? verificationPage : signinPage}</>
  );
};
export default Login;
