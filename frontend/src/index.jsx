import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { store } from "./app/store.js";
import { ToastContainer } from "react-toastify";
import { Provider } from "react-redux";

const isMobile = window.innerWidth < 768;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ToastContainer
          position={isMobile ? "top-center" : "top-right"}
          autoClose={6000}
          style={
            isMobile
              ? {
                  zIndex: 9999,
                  top: "env(safe-area-inset-top, 0px)",
                  marginTop: "0px",
                }
              : {}
          }
        />
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
