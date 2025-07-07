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

  return <RefreshToken>{children}</RefreshToken>;
}

export default ProtectedRoute;
