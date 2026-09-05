import React, { useState } from 'react';
import { Search, Shield, Crown, Filter, MoreVertical, Edit, UserX, CheckCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { User } from '@/lib/apiClient';

export default function UserManagement({ users, currentUser, onUserUpdated }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'premium', 'basic'

    const handleRoleChange = async (userId, newRole) => {
        if (!currentUser) return;

        const currentModeratorRole = currentUser.app_role || 'trader';
        const userToModify = users.find(u => u.id === userId);

        // Permission checks
        if (!['sub_admin', 'admin', 'super_admin'].includes(currentModeratorRole)) {
            toast.error("You don't have permission to change roles.");
            return;
        }

        // ... (Include logic from original AdminPanel for role validation) ...
        if (currentModeratorRole === 'admin') {
            if (['admin', 'super_admin'].includes(newRole) || ['admin', 'super_admin'].includes(userToModify?.app_role)) {
                toast.error("Admins have restricted role modification privileges.");
                return;
            }
        }

        try {
            let updatedFields = { app_role: newRole };
            updatedFields.is_admin = ['admin', 'super_admin', 'sub_admin'].includes(newRole);

            await User.update(userId, updatedFields);
            toast.success(`User role updated to ${newRole}`);
            onUserUpdated();
        } catch (error) {
            console.error("Failed to update user role:", error);
            toast.error("Failed to update user role.");
        }
    };

    const togglePremiumStatus = async (user) => {
        try {
            const newStatus = !user.is_premium;
            await User.update(user.id, { is_premium: newStatus });
            toast.success(`User marked as ${newStatus ? 'Premium' : 'Basic'}`);
            onUserUpdated();
        } catch (error) {
            console.error("Failed to toggle premium:", error);
            toast.error("Failed to update premium status");
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.display_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === 'all' || user.app_role === roleFilter;

        let matchesStatus = true;
        if (statusFilter === 'premium') matchesStatus = user.is_premium;
        if (statusFilter === 'basic') matchesStatus = !user.is_premium;

        return matchesSearch && matchesRole && matchesStatus;
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    User Management
                </CardTitle>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-slate-50">
                        {filteredUsers.length} Users Found
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {/* Filters Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-10"
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="w-[140px]">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="h-10">
                                    <Filter className="w-4 h-4 mr-2 text-slate-500" />
                                    <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="trader">Trader</SelectItem>
                                    <SelectItem value="finfluencer">Finfluencer</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[140px]">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-10">
                                    <Crown className="w-4 h-4 mr-2 text-slate-500" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                    <SelectItem value="basic">Basic</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Users Table / List */}
                <div className="space-y-4">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <UserX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">No users match your filters.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-3">User</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Trust Score</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                        {user.display_name?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{user.display_name || 'Unnamed'}</p>
                                                        <p className="text-xs text-slate-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="capitalize bg-slate-50">
                                                    {user.app_role?.replace('_', ' ') || 'User'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                {user.is_premium ? (
                                                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200">
                                                        <Crown className="w-3 h-3 mr-1" /> Premium
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-slate-500">Basic</Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500"
                                                            style={{ width: `${user.trust_score || 50}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-mono">{user.trust_score || 50}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => togglePremiumStatus(user)}>
                                                            <Crown className="w-4 h-4 mr-2 text-purple-600" />
                                                            {user.is_premium ? 'Remove Premium' : 'Grant Premium'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                            <Edit className="w-4 h-4 mr-2 text-blue-600" />
                                                            <Select onValueChange={(val) => handleRoleChange(user.id, val)}>
                                                                <SelectTrigger className="border-0 h-6 p-0 focus:ring-0">
                                                                    <SelectValue placeholder="Change Role" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="trader">Trader</SelectItem>
                                                                    <SelectItem value="finfluencer">Finfluencer</SelectItem>
                                                                    <SelectItem value="admin">Admin</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600">
                                                            <UserX className="w-4 h-4 mr-2" />
                                                            Suspend User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
