import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
    const location = useLocation();
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');

    // If no token or user, redirect to login
    if (!token || !user) {
        // Save the location they were trying to access
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
