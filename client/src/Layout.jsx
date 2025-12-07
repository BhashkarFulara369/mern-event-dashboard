import { useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { useContext } from 'react';
import AuthContext from './context/AuthContext';

const Layout = ({ children }) => {
    const location = useLocation();
    const { isAuthenticated } = useContext(AuthContext);

    // If not authenticated, show Navbar (Home/Login/Register)
    // If authenticated, show Sidebar layout
    // Adjust logic based on design. Assuming Landing page is public.

    const isPublicRoute = ['/', '/login', '/register'].includes(location.pathname);

    if (isPublicRoute || !isAuthenticated) {
        return (
            <>
                <Navbar />
                <div className="container">
                    {children}
                </div>
            </>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                {children}
            </div>
        </div>
    );
};

export default Layout;
