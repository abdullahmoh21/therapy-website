import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { ROLES } from "../config/roles";
import { useNavigate } from "react-router-dom";
import {
  selectCurrentToken,
  selectCurrentUserRole,
} from "../features/auth/authSlice";

function AdminProtectedRoute({ children }) {
  const token = useSelector(selectCurrentToken);
  const role = useSelector(selectCurrentUserRole);
  const location = useLocation();
  const navigate = useNavigate();

  return token && role === ROLES.Admin ? (
    children
  ) : (
    <Navigate to="/signin" state={{ from: location }} />
  );
}

export default AdminProtectedRoute;
