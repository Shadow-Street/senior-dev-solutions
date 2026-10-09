import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from 'lucide-react';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Use the centralized login function
            const { user } = await login(email, password);

            // Strict role check
            if (user.app_role !== 'super_admin' && user.app_role !== 'admin') {
                toast.error("Access Denied. Insufficient privileges.");
                setLoading(false);
                return;
            }

            toast.success(`Welcome back, ${user.display_name || 'Admin'}`);

            // Redirect based on role
            if (user.app_role === 'super_admin') {
                navigate('/SuperAdmin');
            } else {
                navigate('/AdminPanel');
            }

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || "Login Failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-protocall-sidebar-bg text-white p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]"></div>
            </div>

            <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/10 text-white z-10 shadow-2xl">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-gradient-to-br from-protocall-deep to-protocall-blue rounded-2xl shadow-lg ring-1 ring-white/20">
                            <ShieldCheck className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl text-center font-bold bg-clip-text text-transparent bg-gradient-to-r from-protocall-blue to-protocall-grape">
                        Super Admin
                    </CardTitle>
                    <CardDescription className="text-center text-muted-foreground text-base">
                        Authenticate to access system controls
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-protocall-ink/50 border-protocall-ink/50 focus:border-primary/50 focus:ring-ring/20 text-white placeholder:text-subtle h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" classname="text-muted-foreground">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-protocall-ink/50 border-protocall-ink/50 focus:border-primary/50 focus:ring-ring/20 text-white h-10"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white font-semibold h-11 shadow-lg shadow-protocall-deep/30/20 border border-white/10"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    Verifying Access...
                                </span>
                            ) : "Enter Command Center"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="text-center text-xs text-muted-foreground justify-center">
                    Authorized Personnel Only • Secure Connection
                </CardFooter>
            </Card>
        </div>
    );
};

export default AdminLogin;
