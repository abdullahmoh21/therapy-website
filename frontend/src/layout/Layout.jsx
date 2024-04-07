import React from 'react'
import Header from '../components/Header/Header.jsx';
import Footer from '../components/Footer/Footer.jsx';
import Routers from '../routes/Routers.jsx';


const Layout = () => {
    return <>
    <Header/>
    <main>
        <Routers/>
    </main>
    <Footer/>
    </>
}

export default Layout;
 