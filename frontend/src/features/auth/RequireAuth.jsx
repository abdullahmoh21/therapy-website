import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { ROLES } from "../../config/roles";

const RequireAuth = ({ allowedRole }) => {
  const location = useLocation();
  const { role } = useAuth();

  console.log("role", role);
  let content = null;

  if (Object.values(ROLES).includes(allowedRole)) {
    //if the allowedRole is in ROLES then check if the role is equal to allowedRole
    content =
      role === allowedRole ? (
        <Outlet />
      ) : (
        <Navigate to={"/signin"} state={{ from: location }} replace /> //if the role is not equal to allowedRole then navigate to /dash or /signin depending on the allowedRole
      );
  }

  return content;
};

export default RequireAuth;
