import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/components/context/AuthContext';
import { authAPI } from '@/lib/apiClient';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, googleLogin } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    // Get the page user was trying to access, or default to Dashboard
    const from = location.state?.from?.pathname || '/Dashboard';

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await login(formData.email, formData.password);
            toast.success('Login successful');
            navigate(from, { replace: true }); // Redirect to intended page
        } catch (error) {
            console.error('Login error:', error);
            toast.error(error.response?.data?.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
                    <CardDescription>
                        Enter your email and password to access your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={async (credentialResponse) => {
                                    try {
                                        await googleLogin(credentialResponse.credential); // Use googleLogin from AuthContext
                                        toast.success('Login successful');
                                        navigate(from, { replace: true }); // Redirect to intended page
                                    } catch (error) {
                                        console.error('Google login error:', error);
                                        toast.error('Failed to login with Google');
                                    }
                                }}
                                onError={() => {
                                    toast.error('Google Login Failed');
                                }}
                                useOneTap
                                width="100%"
                            />
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <div className="text-sm text-gray-500">
                        Don&apos;t have an account?{' '}
                        <Link to="/register" className="text-blue-600 hover:underline">
                            Sign up
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;
