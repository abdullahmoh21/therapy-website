import Home from "../pages/Home";
import Login from "../pages/SignIn";
import About from "../pages/About";
import NotFound from "../pages/NotFound";
import BookNow from "../pages/BookNow";
import Services from "../pages/Services";
import Dashboard from "../pages/Dashboard";
import AdminDashboard from "../pages/AdminDashboard";
import Register from "../pages/Register";
import { Routes, Route } from "react-router-dom";
import PersistLogin from "../features/auth/PersisitLogin";
import ProtectedRoute from "./ProtectedRoute";
import AdminProtectedRoute from "./AdminProtectedRoute";
import { useSelector } from "react-redux";
import { selectCurrentUserEmail } from "../features/auth/authSlice";

const Routers = () => {
  const email = useSelector(selectCurrentUserEmail);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/signin" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/services" element={<Services />} />
      <Route path="/bookasession" element={<BookNow />} />
      <Route path="/about" element={<About />} />
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
