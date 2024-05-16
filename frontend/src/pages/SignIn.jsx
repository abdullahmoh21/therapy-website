import { Link } from "react-router-dom";
import logo from "../assets/images/logo.png";

import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../features/auth/authSlice";
import { useLoginMutation } from "../features/auth/authApiSlice";
import usePersist from "../hooks/usePersist";
import useAuth from "../hooks/useAuth";

// TODO: Add loading spinner on button
//TODO: Add error message for wrong credentials... etc
//TODO: Add forgot password link

const Login = () => {
  const userRef = useRef();
  const errRef = useRef();
  const isAdmin = useAuth().isAdmin;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [persist, setPersist] = usePersist();

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [login, { isLoading, data }] = useLoginMutation();
  useEffect(() => {
    if (userRef.current) {
      userRef.current.focus();
    }
  }, []);

  useEffect(() => {
    setErrMsg("");
  }, [username, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log(`Attempting login with username: ${username}`);
      const { accessToken } = await login({
        email: username,
        password,
      }).unwrap();
      dispatch(setCredentials({ accessToken }));
      setUsername("");
      setPassword("");
      console.log(
        `Login successful. Redirecting to ${
          (await isAdmin) ? "/dash/admin" : "/dash"
        }`
      );

      if (isAdmin) {
        navigate("/dash/admin");
      } else navigate("/dash");
    } catch (err) {
      let Msg = "An error occurred. Please try again later.";
      if (!err.status && !err.data) {
        Msg =
          "Could not connect to server. Please check your internet connection and try again.";
      } else if (!err.status) {
        Msg = "No Server Response";
      } else if (err.status === 400) {
        // Bad Request
        Msg = "Invalid Username or Password";
      } else if (err.status === 401) {
        // Unauthorized
        Msg = "Unauthorized";
      } else {
        // Check if err.data is a string, and if so, set it as the error message
        if (err.data && typeof err.data === "string") {
          Msg = err.data;
        } else if (err?.data?.message) {
          Msg = err.data?.message;
        }
      }
      setErrMsg(Msg);
    }
  };

  const handleUserInput = (e) => setUsername(e.target.value);
  const handlePwdInput = (e) => setPassword(e.target.value);
  const handleToggle = () => setPersist((prev) => !prev);

  {
    /* TODO:
    - FIX PAGE OVERFLOWING
    - forgot password link
  */
  }

  const content = (
    <>
      {errMsg && (
        <div className="error-modal">
          <div className="error-modal-content">
            <h2>Error</h2>
            <p>{errMsg}</p>
            <button onClick={() => setErrMsg("")}>Close</button>
          </div>
        </div>
      )}

      <div className="flex h-screen">
        {/* LEFT SECTION */}
        <section className="w-1/2 h-screen bg-[#c45e3e]">
          <h1 className="text-center pt-[100px]">ART HERE</h1>
        </section>

        {/* RIGHT SECTION */}
        <section className="home-bg w-1/2 h-screen relative">
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
                  id="username"
                  ref={userRef}
                  value={username}
                  onChange={handleUserInput}
                  required
                />
                <div>
                  <div>
                    <input
                      className="py-2 px-3 border-b-2 border-[#262424] outline-none focus:border-[#c45e3e] w-full bg-transparent"
                      placeholder="Password"
                      type="password"
                      id="password"
                      onChange={handlePwdInput}
                      autoComplete="off"
                      value={password}
                      required
                    />
                  </div>
                  <div className="w-full">
                    <Link to="/" className="w-full">
                      <p className="text-right text-[#c45e3e] text-sm">
                        Forgot Password?
                      </p>
                    </Link>
                  </div>
                  {/* <label htmlFor="persist" className="form__persist">
                        <input
                            type="checkbox"
                            className="form__checkbox"
                            id="persist"
                            onChange={handleToggle}
                            checked={persist}
                        />
                        Trust This Device
                  </label> */}
                </div>
                {/* SIGN IN BUTTON */}
                <div className="  flex justify-center items-center">
                  <button
                    className="py- px-3 bg-[#262424] text-white h-[40px] w-[130px] border-white rounded-[20px]
                    hover:bg-[#2c2c2c]"
                  >
                    {isLoading ? (
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
  return content;
};

export default Login;
