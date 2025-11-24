import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ResponsiveToastContainer = () => {
  const [position, setPosition] = useState(
    window.innerWidth < 768
      ? toast.POSITION.BOTTOM_CENTER
      : toast.POSITION.TOP_RIGHT
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const handleChange = (e) => {
      setPosition(
        e.matches
          ? toast.POSITION.BOTTOM_CENTER // mobile
          : toast.POSITION.TOP_RIGHT // desktop
      );
    };

    // initial
    handleChange(mediaQuery);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <ToastContainer
      position={position}
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      style={{
        bottom: "env(safe-area-inset-bottom, 16px)",
      }}
      toastClassName="!mx-2 !my-1 !text-sm sm:!text-base !max-w-[calc(100vw-1rem)] sm:!max-w-md !rounded-lg !shadow-lg"
      bodyClassName="!text-sm sm:!text-base !p-3"
    />
  );
};

export default ResponsiveToastContainer;
