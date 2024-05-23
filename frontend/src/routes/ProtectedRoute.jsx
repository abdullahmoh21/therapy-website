import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentToken } from "../features/auth/authSlice";

function ProtectedRoute({ children }) {
  const token = useSelector(selectCurrentToken);
  const location = useLocation();

  return token ? (
    children
  ) : (
    <Navigate to="/signin" replace state={{ from: location }} />
  );
}

export default ProtectedRoute;
