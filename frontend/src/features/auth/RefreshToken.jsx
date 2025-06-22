import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useRefreshMutation } from "./authApiSlice";
import LoadingPage from "../../pages/LoadingPage";
import { Navigate, useLocation } from "react-router-dom";

const RefreshToken = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [refresh] = useRefreshMutation();
  const location = useLocation();

  useEffect(() => {
    const refreshToken = async () => {
      try {
        await refresh().unwrap();
        setRefreshSuccess(true);
        setIsLoading(false);
      } catch (err) {
        console.error("Token refresh failed:", err);
        setIsLoading(false);
      }
    };

    refreshToken();
  }, [refresh]);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!refreshSuccess) {
    // Redirect to signin if refresh failed
    return <Navigate to="/signin" state={{ from: location }} />;
  }

  return children;
};

export default RefreshToken;
