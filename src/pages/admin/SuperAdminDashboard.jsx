import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Users, DollarSign, Activity, ShieldAlert,
    Search, UserX, UserCheck, RefreshCw
} from 'lucide-react';
import apiClient from '@/lib/apiClient';

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userSearch, setUserSearch] = useState('');
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const statsRes = await apiClient.get('/admin/dashboard-stats');
            setStats(statsRes.data);

            const usersRes = await apiClient.get('/admin/users?limit=10');
            setUsers(usersRes.data.data);

            setLoading(false);
        } catch (error) {
            console.error("Dashboard fetch error:", error);
            toast.error("Failed to load dashboard data");
        }
    };

    const handleUserSearch = async (e) => {
        e.preventDefault();
        try {
            const res = await apiClient.get(`/admin/users?search=${userSearch}`);
            setUsers(res.data.data);
        } catch (error) {
            toast.error("Search failed");
        }
    };

    const handleBanUser = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
        if (!confirm(`Are you sure you want to ${newStatus} this user?`)) return;

        try {
            await apiClient.put(`/admin/users/${userId}`, { status: newStatus });
            toast.success(`User ${newStatus} successfully`);
            fetchDashboardData(); // Refresh
        } catch (error) {
            toast.error("Action failed");
        }
    };

    if (loading) return <div className="p-8 flex justify-center text-white">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Super Admin Command Center
                    </h1>
                    <p className="text-gray-400">System Overview & Control</p>
                </div>
                <Button onClick={fetchDashboardData} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-gray-800 border-gray-700 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.users?.total || 0}</div>
                        <p className="text-xs text-gray-400">
                            {stats?.users?.active || 0} active now
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats?.revenue?.total || 0}</div>
                        <p className="text-xs text-gray-400">
                            Across all streams
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Health</CardTitle>
                        <Activity className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">99.9%</div>
                        <p className="text-xs text-gray-400">
                            All services operational
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="users" className="space-y-4">
                <TabsList className="bg-gray-800 border-gray-700">
                    <TabsTrigger value="users">User Management</TabsTrigger>
                    <TabsTrigger value="content">Content Moderation</TabsTrigger>
                    <TabsTrigger value="settings">System Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4">
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <div>
                                <CardTitle>Users Directory</CardTitle>
                                <CardDescription>Manage user roles and access</CardDescription>
                            </div>
                            <form onSubmit={handleUserSearch} className="flex gap-2">
                                <Input
                                    placeholder="Search email..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="bg-gray-700 border-gray-600 w-64"
                                />
                                <Button type="submit" size="icon"><Search className="h-4 w-4" /></Button>
                            </form>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-gray-700">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-700 text-gray-300 uppercase">
                                        <tr>
                                            <th className="px-4 py-3">User</th>
                                            <th className="px-4 py-3">Role</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Joined</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700 text-gray-300">
                                        {users.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-750">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <div className="font-bold text-white">{user.name}</div>
                                                        <div className="text-gray-500 text-xs">{user.email}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="capitalize">{user.role}</Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-800' :
                                                            user.status === 'banned' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-400">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={user.status === 'banned' ? "text-green-500 hover:text-green-400" : "text-red-500 hover:text-red-400"}
                                                        onClick={() => handleBanUser(user.id, user.status)}
                                                    >
                                                        {user.status === 'banned' ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="content">
                    <Card className="bg-gray-800 border-gray-700 text-white">
                        <CardHeader><CardTitle>Content Moderation</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                                <ShieldAlert className="h-12 w-12 mb-4" />
                                <p>Moderation Queue is currently empty.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SuperAdminDashboard;
