import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/lib/apiClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Check for existing session on mount
        const token = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setUser(userData);

                // Verify token is still valid
                authAPI.me()
                    .then(freshUserData => {
                        setUser(freshUserData);
                        localStorage.setItem('user', JSON.stringify(freshUserData));
                    })
                    .catch((error) => {
                        // Token invalid or expired
                        console.warn('Token validation failed:', error.message);
                        // Clear invalid auth data
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('user');
                        setUser(null);
                        // Don't show error toast on mount - user might just be logged out
                    });
            } catch (error) {
                console.error('Error parsing stored user:', error);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                setUser(null);
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const data = await authAPI.login(email, password);
            setUser(data.user);
            return data;
        } catch (error) {
            // Let the calling component handle the error display
            throw error;
        }
    };

    const googleLogin = async (token, role = 'user') => {
        try {
            const data = await authAPI.googleLogin(token, role);
            setUser(data.user);
            return data;
        } catch (error) {
            throw error;
        }
    };

    const register = async (email, password, name, role = 'user') => {
        try {
            const data = await authAPI.register(email, password, name, role);
            setUser(data.user);
            return data;
        } catch (error) {
            // Let the calling component handle the error display
            throw error;
        }
    };

    const logout = () => {
        try {
            authAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            toast.success('Logged out successfully');
            navigate('/login');
        }
    };

    const value = {
        user,
        loading,
        login,
        googleLogin,
        register,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
