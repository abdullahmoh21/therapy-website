import { Routes, Route } from "react-router-dom";
import PersistLogin from "../features/auth/PersisitLogin";
import ProtectedRoute from "./ProtectedRoute";
import AdminProtectedRoute from "./AdminProtectedRoute";
import { useSelector } from "react-redux";
import { selectCurrentUserEmail } from "../features/auth/authSlice";
// Pages
import SPA from "../pages/General/SPA";
import Login from "../features/auth/SignIn";
import ForgotPassword from "../features/users/ForgotPassword";
import ResetPassword from "../features/users/ResetPassword";
import EmailVerification from "../features/users/EmailVerification";
import Register from "../features/auth/Register";
import Dashboard from "../pages/Dashboards/UserDashboard/Dashboard";
import AdminDashboard from "../pages/Dashboards/AdminDashboard/Dashboard";
import NotFound from "../pages/404";

const Routers = () => {
  const email = useSelector(selectCurrentUserEmail);

  return (
    <Routes>
      <Route path="/" element={<SPA />} />
      <Route path="/signin" element={<Login />} />
      <Route path="/signup" element={<Register />} />
      <Route path="/verifyEmail" element={<EmailVerification />} />
      <Route path="/forgotPassword" element={<ForgotPassword />} />
      <Route path="/resetPassword" element={<ResetPassword />} />
      <Route element={<PersistLogin />}>
        <Route
          path="/dash"
          element={
            <ProtectedRoute>
              <Dashboard email={email} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminDashboard email={email} />
            </AdminProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default Routers;
