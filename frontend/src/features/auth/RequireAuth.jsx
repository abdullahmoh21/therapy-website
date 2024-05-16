import { useLocation, Navigate, Outlet } from "react-router-dom"
import useAuth from "../../hooks/useAuth"

const RequireAuth = ({ allowedRole }) => {
    const location = useLocation()
    const { role } = useAuth()

    const content = (
        (allowedRole === role || allowedRole === 2121 )   //admin can access all routes
            ? <Outlet />
            : <Navigate to="/signin" state={{ from: location }} replace />
    )

    return content
}

export default RequireAuth