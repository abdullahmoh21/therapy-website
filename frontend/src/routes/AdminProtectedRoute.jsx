import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  selectCurrentToken,
  selectCurrentUserRole,
} from "../features/auth/authSlice";

function AdminProtectedRoute({ children }) {
  const token = useSelector(selectCurrentToken);
  const role = useSelector(selectCurrentUserRole);
  const location = useLocation();

  return token && role === "admin" ? (
    children
  ) : (
    <Navigate to="/signin" state={{ from: location }} />
  );
}

export default AdminProtectedRoute;
