import Home from '../pages/Home';
import Login from '../pages/SignIn';
import About from '../pages/About';
import NotFound from '../pages/NotFound';
import BookNow from '../pages/BookNow';
import Services from '../pages/Services';
import { Routes, Route } from 'react-router-dom';
import {Dashboard} from '../pages/Dashboard';
import PersistLogin from '../features/auth/PersisitLogin';
import RequireAuth from "../features/auth/RequireAuth";
import { ROLES } from '../config/roles';

const Routers = () => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/signin" element={<Login />} />
            <Route path='/services' element={<Services />} />
            <Route path="/bookasession" element={<BookNow />} />
            <Route path="/about" element={<About />} />

            {/*Dashboard Start*/}
            <Route element={<PersistLogin />}>
                <Route element={<RequireAuth allowedRole={ROLES.User} />}>
                    <Route path="dash" element={<Dashboard />} />  
                </Route>
                <Route element={<RequireAuth allowedRole={ROLES.Admin} />}>
                    <Route path="dash/admin" element={<Dashboard />} />  
                </Route>

            </Route>
            {/*Dashboard End*/}

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default Routers;
