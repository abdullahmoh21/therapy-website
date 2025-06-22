import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentToken } from "../features/auth/authSlice";
import RefreshToken from "../features/auth/RefreshToken";

function ProtectedRoute({ children }) {
  const token = useSelector(selectCurrentToken);
  const location = useLocation();

  // If we have a token in Redux state, render children
  if (token) {
    return children;
  }

  // If no token in Redux state, try to refresh token
  // This happens when the page is refreshed and Redux state is cleared
  return <RefreshToken>{children}</RefreshToken>;
}

export default ProtectedRoute;
