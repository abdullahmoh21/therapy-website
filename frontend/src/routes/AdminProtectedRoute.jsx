import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  selectCurrentToken,
  selectCurrentUserRole,
} from "../features/auth/authSlice";
import RefreshToken from "../features/auth/RefreshToken";

function AdminProtectedRoute({ children }) {
  const token = useSelector(selectCurrentToken);
  const role = useSelector(selectCurrentUserRole);
  const location = useLocation();

  // If we have a token and admin role in Redux state, render children
  if (token && role === "admin") {
    return children;
  }

  // If no token in Redux state but we might be refreshing the page
  if (!token) {
    return (
      <RefreshToken>
        {/* After refresh, we need to check role again */}
        {role === "admin" ? (
          children
        ) : (
          <Navigate to="/signin" state={{ from: location }} />
        )}
      </RefreshToken>
    );
  }

  // If we have a token but not admin role
  return <Navigate to="/signin" state={{ from: location }} />;
}

export default AdminProtectedRoute;
