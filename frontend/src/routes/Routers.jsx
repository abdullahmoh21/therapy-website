import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { useSelector } from "react-redux";

import PersistLogin from "../features/auth/PersisitLogin";
import ProtectedRoute from "./ProtectedRoute";
import AdminProtectedRoute from "./AdminProtectedRoute";
import { selectCurrentUserEmail } from "../features/auth/authSlice";

// Loading fallback
import LoadingPage from "../pages/LoadingPage";

// Lazy-loaded pages
const SPA = lazy(() => import("../pages/General/SPA"));
const Login = lazy(() => import("../features/auth/SignIn"));
const ForgotPassword = lazy(() => import("../features/users/ForgotPassword"));
const ResetPassword = lazy(() => import("../features/users/ResetPassword"));
const EmailVerification = lazy(() =>
  import("../features/users/EmailVerification")
);
const SignUp = lazy(() => import("../features/auth/SignUp"));
const Dashboard = lazy(() =>
  import("../pages/Dashboards/UserDashboard/DashboardNav")
);
const AdminDashboard = lazy(() =>
  import("../pages/Dashboards/AdminDashboard/AdminDashNav")
);
const NotFound = lazy(() => import("../pages/404"));
const TermsAndConditions = lazy(() =>
  import("../pages/General/TermsAndConditions")
);
const ConsultationLanding = lazy(() =>
  import("../pages/General/ConsultationLanding")
);

// Admin nested routes
const AdminMetrics = lazy(() =>
  import("../pages/Dashboards/AdminDashboard/AdminMetrics")
);
const AdminBookings = lazy(() =>
  import("../pages/Dashboards/AdminDashboard/Bookings/AdminBookings")
);
const AdminUsers = lazy(() =>
  import("../pages/Dashboards/AdminDashboard/Users/AdminUsers")
);
const SystemHealth = lazy(() =>
  import("../pages/Dashboards/AdminDashboard/SystemHealth")
);
const UpcomingBookings = lazy(() =>
  import("../pages/Dashboards/AdminDashboard/UpcomingBookings")
);

const Routers = () => {
  const email = useSelector(selectCurrentUserEmail);

  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/" element={<SPA />} />
        <Route path="/signin" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/verifyEmail" element={<EmailVerification />} />
        <Route path="/forgotPassword" element={<ForgotPassword />} />
        <Route path="/resetPassword" element={<ResetPassword />} />
        <Route path="/consultation" element={<ConsultationLanding />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />

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
          >
            <Route index element={<Navigate to="/admin/upcoming" replace />} />
            <Route path="metrics" element={<AdminMetrics />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="system" element={<SystemHealth />} />
            <Route path="upcoming" element={<UpcomingBookings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default Routers;
