import Home from '../pages/Home';
import Login from '../pages/Sign in';
import About from '../pages/About';
import NotFound from '../pages/NotFound';
import BookNow from '../pages/BookNow';
import Services from '../pages/Services';
import { Routes, Route } from 'react-router-dom';

const Routers = () => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/signin" element={<Login />} />
            <Route path='/services' element={<Services />} />
            <Route path="/bookasession" element={<BookNow />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default Routers;
