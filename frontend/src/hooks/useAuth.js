import { useSelector } from 'react-redux'
import { selectCurrentToken } from "../features/auth/authSlice"
import jwtDecode from 'jwt-decode'

const useAuth = () => {
    const token = useSelector(selectCurrentToken)
    let isAdmin = false
    let status = "User"
    let email = ''
    let role = 1111

    if (token) {
        const decoded = jwtDecode(token) // decode the token

        if(decoded?.userInfo?.email && decoded?.userInfo?.role) {
            email = decoded.userInfo.email
            role = decoded.userInfo.role

            isAdmin = (role === 2121)
            if (isAdmin) status = "Admin"
        }

        // console.log(`useAuth: ${email} ${role} ${status} ${isAdmin}`)
        return { email, role, status,  isAdmin }
    }else{
        return { email: '', role: 1111,  isAdmin, status }
    }
}
export default useAuth