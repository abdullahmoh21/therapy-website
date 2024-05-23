import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from "../features/auth/authSlice";
import { jwtDecode } from 'jwt-decode';
import { ROLES } from '../config/roles';

const useAuth = () => {
    const token = useSelector(selectCurrentToken);
    const [loading, setLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState(1111);

    useEffect(() => {
        if (token) {
            setLoading(true); // set loading to true when the token is present
            const decoded = jwtDecode(token); // decode the token

            if(decoded?.userInfo?.email && decoded?.userInfo?.role) {
                setEmail(decoded.userInfo.email);
                setRole(decoded.userInfo.role);
                setIsAdmin(decoded.userInfo.role === ROLES.Admin);
            }
        }
        setLoading(false); // set loading to false once the token has been decoded
    }, [token]);

    return { email, role, isAdmin, loading };
}

export default useAuth;