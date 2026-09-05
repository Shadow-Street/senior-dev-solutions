import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '@/lib/apiClient';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Register = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user'
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleRoleChange = (value) => {
        setFormData({
            ...formData,
            role: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await authAPI.register(formData.email, formData.password, formData.name, formData.role);
            toast.success('Registration successful');
            navigate('/Dashboard'); // Use React Router navigation
        } catch (error) {
            console.error('Registration error:', error);
            toast.error(error.response?.data?.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
                    <CardDescription>
                        Enter your details below to create your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="John Doe"
                                required
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>
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
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">I am a...</Label>
                            <Select onValueChange={handleRoleChange} defaultValue={formData.role}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">Investor / User</SelectItem>
                                    <SelectItem value="advisor">Advisor</SelectItem>
                                    <SelectItem value="fund_manager">Fund Manager</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create account
                        </Button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-gray-500">Or sign up with</span>
                            </div>
                        </div>

                        <div className="flex justify-center w-full">
                            <GoogleLogin
                                onSuccess={async (credentialResponse) => {
                                    try {
                                        setLoading(true);
                                        // Google login works for registration too (auto-creates account)
                                        await authAPI.googleLogin(credentialResponse.credential, formData.role);
                                        toast.success('Registration successful');
                                        navigate('/Dashboard'); // Use React Router navigation
                                    } catch (error) {
                                        console.error('Google Sign-up Error:', error);
                                        toast.error('Google Sign-up Failed');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                onError={() => {
                                    toast.error('Google Sign-up Failed');
                                }}
                                useOneTap
                                width="100%"
                            />
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <div className="text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 hover:underline">
                            Sign in
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Register;
