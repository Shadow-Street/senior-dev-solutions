import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/context/AuthContext';
import { Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RequirePremium({ children, fallback }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="p-10 text-center">Loading...</div>;
    }

    // Check if user is logged in
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check for premium status
    // Supporting both 'is_premium' boolean and 'app_role' string for flexibility
    const isPremium = user.is_premium || user.app_role === 'premium' || user.role === 'admin' || user.role === 'super_admin';

    if (!isPremium) {
        if (fallback) {
            return fallback;
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                <div className="w-16 h-16 bg-hold-muted rounded-full flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-hold-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Premium Feature Locked</h2>
                <p className="text-subtle mb-8 max-w-md">
                    This feature is available exclusively to Premium subscribers. Upgrade your plan to unlock unlimited access.
                </p>
                <Button
                    className="bg-hold text-hold-foreground hover:from-hold hover:to-hold"
                    onClick={() => window.location.href = '/subscription'}
                >
                    <Shield className="w-4 h-4 mr-2" />
                    Upgrade to Premium
                </Button>
            </div>
        );
    }

    return children;
}
