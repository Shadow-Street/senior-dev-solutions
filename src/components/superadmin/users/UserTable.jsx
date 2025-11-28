
import React, { useState, useEffect, useCallback } from 'react';
import { User, TrustScoreLog, RoleTemplate, Subscription } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  MoreVertical,
  Edit,
  Ban,
  UserCheck,
  Trophy,
  Trash,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TrustScoreBadge from '@/components/ui/TrustScoreBadge';
import UserRoleBadges from './UserRoleBadges';

// A placeholder for a generic UserEditModal, as the outline implies one
// but doesn't provide its full implementation.
const UserEditModal = ({ isOpen, onClose, user, onSave, isLoading }) => {
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobileNumber, setMobileNumber] = useState(user?.mobile_number || '');

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setEmail(user.email || '');
      setMobileNumber(user.mobile_number || '');
    }
  }, [user]);

  const handleSave = () => {
    onSave(user.id, { display_name: displayName, email, mobile_number: mobileNumber });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User: {user?.display_name}</DialogTitle>
          <DialogDescription>
            Update basic information for {user?.display_name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-2">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="User's display name"
            />
          </div>
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="User's email address"
            />
          </div>
          <div>
            <Label htmlFor="mobileNumber" className="block text-sm font-medium text-slate-700 mb-2">
              Mobile Number
            </Label>
            <Input
              id="mobileNumber"
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="User's mobile number (optional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function UserTable({ users, currentAdmin, onUsersUpdate }) {
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false); // New state for general user edit
  const [selectedUser, setSelectedUser] = useState(null);
  const [scoreChange, setScoreChange] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [roleTemplates, setRoleTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginatedUsers, setPaginatedUsers] = useState([]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await RoleTemplate.list();
        setRoleTemplates(templates.filter(t => t.is_active));
      } catch (error) {
        console.error('Error loading role templates:', error);
      }
    };
    loadTemplates();
  }, []);

  useEffect(() => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.app_role === roleFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => !user.is_deactivated);
      } else if (statusFilter === 'suspended') {
        filtered = filtered.filter(user => user.is_deactivated);
      }
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page on filter/search change
  }, [users, searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedUsers(filteredUsers.slice(startIndex, endIndex));
  }, [filteredUsers, currentPage, itemsPerPage]);


  const canDeleteUser = (targetUser) => {
    if (!currentAdmin || !targetUser) return false;
    if (targetUser.id === currentAdmin.id) return false;
    return currentAdmin.app_role === 'super_admin';
  };

  const canEditUser = (targetUser) => {
    if (!currentAdmin || !targetUser) return false;
    if (targetUser.id === currentAdmin.id) return false;
    return ['super_admin', 'admin'].includes(currentAdmin.app_role);
  };

  const handleTrustScoreChange = (change) => {
    if (!selectedUser) return;

    const currentScore = selectedUser.trust_score || 50;
    const proposedNewScore = currentScore + change;
    
    const clampedNewScore = Math.max(0, Math.min(100, proposedNewScore));
    
    const actualChange = clampedNewScore - currentScore;
    
    setScoreChange(actualChange);
  };

  const handleSaveTrustScore = async () => {
    if (!selectedUser || !adjustmentReason.trim()) {
      toast.error('Please provide a reason for the trust score change');
      return;
    }
    if (scoreChange === 0) {
      toast.info('No change in trust score to save.');
      return;
    }

    try {
      setIsLoading(true);
      const currentScore = selectedUser.trust_score || 50;
      const newScore = Math.max(0, Math.min(100, currentScore + scoreChange));

      await User.update(selectedUser.id, { trust_score: newScore });
      await TrustScoreLog.create({
        user_id: selectedUser.id,
        change_amount: scoreChange,
        reason: adjustmentReason,
        new_score: newScore,
        moderator_id: currentAdmin.id
      });

      // AuditLog was removed from imports as per outline, so commented out for now.
      // await AuditLog.create({
      //   admin_id: currentAdmin.id,
      //   admin_name: currentAdmin.display_name,
      //   action: 'TRUST_SCORE_CHANGED',
      //   entity_type: 'User',
      //   entity_id: selectedUser.id,
      //   details: `Changed trust score of user "${selectedUser.display_name}" from ${currentScore.toFixed(2)} to ${newScore.toFixed(2)}. Reason: "${adjustmentReason}"`
      // });

      onUsersUpdate();
      toast.success(`Trust score updated to ${newScore.toFixed(2)}`);
      setShowTrustModal(false);
      setScoreChange(0);
      setAdjustmentReason('');
    } catch (error) {
      console.error('Error updating trust score:', error);
      toast.error('Failed to update trust score');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || (!selectedRole && !selectedTemplate)) {
      toast.error('No user selected or no role/template chosen.');
      return;
    }
    
    setIsLoading(true);
    try {
      const updateData = {};
      const originalRole = selectedUser.app_role;
      const originalTemplateName = selectedUser.role_template_name;

      if (selectedRole) {
        updateData.app_role = selectedRole;
        updateData.role_template_id = null;
        updateData.role_template_name = null;
        
        // AuditLog commented out as per outline
        // await AuditLog.create({
        //   admin_id: currentAdmin.id,
        //   admin_name: currentAdmin.display_name,
        //   action: 'USER_ROLE_UPDATED',
        //   entity_type: 'User',
        //   entity_id: selectedUser.id,
        //   details: `Changed role from ${originalRole} to ${selectedRole} for user ${selectedUser.display_name}`
        // });
      } else if (selectedTemplate) {
        const template = roleTemplates.find(t => t.id === selectedTemplate);
        updateData.role_template_id = selectedTemplate;
        updateData.role_template_name = template?.name;
        updateData.app_role = 'custom';
        
        // AuditLog commented out as per outline
        // await AuditLog.create({
        //   admin_id: currentAdmin.id,
        //   admin_name: currentAdmin.display_name,
        //   action: 'USER_TEMPLATE_ASSIGNED',
        //   entity_type: 'User',
        //   entity_id: selectedUser.id,
        //   details: `Assigned template "${template?.name}" to user ${selectedUser.display_name} (Previous role: ${originalRole}, Previous template: ${originalTemplateName || 'None'})`
        // });
      }
      
      await User.update(selectedUser.id, updateData);
      
      toast.success('User role updated successfully');
      setShowRoleModal(false);
      setSelectedUser(null);
      setSelectedRole('');
      setSelectedTemplate('');
      
      if (onUsersUpdate) {
        onUsersUpdate();
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspendUser = async () => { // Generic suspend/unsuspend based on current state
    if (!selectedUser) return;
    try {
      setIsLoading(true);
      const newStatus = !selectedUser.is_deactivated;
      await User.update(selectedUser.id, { is_deactivated: newStatus });

      // AuditLog commented out as per outline
      // await AuditLog.create({
      //   admin_id: currentAdmin.id,
      //   admin_name: currentAdmin.display_name,
      //   action: newStatus ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
      //   entity_type: 'User',
      //   entity_id: selectedUser.id,
      //   details: `${newStatus ? 'Suspended' : 'Un-suspended'} user "${selectedUser.display_name}"`
      // });

      onUsersUpdate();
      toast.success(newStatus ? 'User suspended successfully' : 'User un-suspended successfully');
      setShowSuspendDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error suspending/un-suspending user:', error);
      toast.error('Failed to update user status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUserConfirmed = async () => { // Renamed to avoid confusion with new handler
    if (!selectedUser) return;
    try {
      setIsLoading(true);
      await User.delete(selectedUser.id);

      // AuditLog commented out as per outline
      // await AuditLog.create({
      //   admin_id: currentAdmin.id,
      //   admin_name: currentAdmin.display_name,
      //   action: 'USER_DELETED',
      //   entity_type: 'User',
      //   entity_id: selectedUser.id,
      //   details: `Deleted user "${selectedUser.display_name}" (ID: ${selectedUser.id})`
      // });

      onUsersUpdate();
      toast.success('User deleted successfully');
      setShowDeleteDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeneralUserInfo = async (userId, formData) => {
    if (!currentAdmin || !userId) {
      toast.error('Admin context or user ID missing.');
      return;
    }
    setIsLoading(true);
    try {
      await User.update(userId, formData);
      // AuditLog could be added here if it was kept
      toast.success('User information updated successfully.');
      onUsersUpdate();
      setShowEditUserModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user general info:', error);
      toast.error('Failed to update user information.');
    } finally {
      setIsLoading(false);
    }
  };


  // --- New action handlers triggered by DropdownMenu ---
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditUserModal(true); // Open the new general edit modal
  };

  const handleAdjustTrustScore = (user) => {
    setSelectedUser(user);
    setScoreChange(0); // Reset score change
    setAdjustmentReason(''); // Reset reason
    setShowTrustModal(true);
  };

  const handleEditUserRole = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.app_role || '');
    setSelectedTemplate(user.role_template_id || '');
    setShowRoleModal(true);
  };

  const handleDeactivateUser = (user) => {
    setSelectedUser(user);
    setShowSuspendDialog(true);
  };

  const handleReactivateUser = (user) => {
    setSelectedUser(user);
    setShowSuspendDialog(true);
  };

  const handleDeleteUser = (user) => { // This is the handler that opens the dialog
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };


  const canManageUsers = ['super_admin', 'admin'].includes(currentAdmin?.app_role);
  const canSuspendUsers = ['super_admin', 'admin'].includes(currentAdmin?.app_role);
  const canModifyTrustScores = ['super_admin', 'admin', 'moderator'].includes(currentAdmin?.app_role);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const disablePrev = currentPage === 1;
  const disableNext = currentPage === totalPages || totalPages === 0;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when items per page changes
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-2xl font-bold">User Management</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mt-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="trader">Trader</SelectItem>
            <SelectItem value="finfluencer">FinFluencer</SelectItem>
            <SelectItem value="advisor">Advisor</SelectItem>
            <SelectItem value="educator">Educator</SelectItem>
            <SelectItem value="vendor">Vendor</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="custom">Custom (Template)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>
        
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trust Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.profile_image_url ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={user.profile_image_url}
                              alt=""
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                              {user.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.display_name || 'No Name'}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.mobile_number && (
                            <div className="text-xs text-gray-400">{user.mobile_number}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <UserRoleBadges user={user} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TrustScoreBadge score={user.trust_score || 50} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_deactivated ? (
                        <Badge className="bg-red-100 text-red-800">Deactivated</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canManageUsers && user.id !== currentAdmin?.id && (
                            <>
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditUserRole(user)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Role
                              </DropdownMenuItem>
                            </>
                          )}
                          {canModifyTrustScores && (
                            <DropdownMenuItem onClick={() => handleAdjustTrustScore(user)}>
                              <Trophy className="w-4 h-4 mr-2" />
                              Adjust Trust Score
                            </DropdownMenuItem>
                          )}
                          {canSuspendUsers && user.id !== currentAdmin?.id && (
                            user.is_deactivated ? (
                              <DropdownMenuItem onClick={() => handleReactivateUser(user)}>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Reactivate User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleDeactivateUser(user)}>
                                <Ban className="w-4 h-4 mr-2" />
                                Deactivate User
                              </DropdownMenuItem>
                            )
                          )}
                          {canDeleteUser(user) && (
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600"
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          )}
                          {
                            (!canModifyTrustScores && !canManageUsers && user.id !== currentAdmin?.id) ||
                            (user.id === currentAdmin?.id && !canModifyTrustScores && !canManageUsers)
                            && (
                              <DropdownMenuItem disabled className="text-xs text-slate-400">
                                No actions available
                              </DropdownMenuItem>
                            )
                          }
                          {user.id === currentAdmin?.id && (
                            <DropdownMenuItem disabled className="text-xs bg-blue-50 text-blue-700">
                              You (Cannot manage yourself)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-8">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Search className="h-10 w-10 mb-2" />
                      <p className="text-lg">No users found.</p>
                      <p className="text-sm">Try adjusting your search or filter criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Rows per page:</span>
          <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages === 0 ? 1 : totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={disablePrev}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={disableNext}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedUser && (
        <UserEditModal
          isOpen={showEditUserModal}
          onClose={() => setShowEditUserModal(false)}
          user={selectedUser}
          onSave={handleSaveGeneralUserInfo}
          isLoading={isLoading}
        />
      )}

      {selectedUser && (
        <Dialog open={showTrustModal} onOpenChange={setShowTrustModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Trust Score for {selectedUser.display_name}</DialogTitle>
              <DialogDescription>Adjust the user's score and provide a reason for the change. This will be logged.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-sm text-slate-600">Current Trust Score</p>
                <p className="text-5xl font-bold my-2">
                  {(selectedUser.trust_score || 50).toFixed(2)}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-xl font-semibold ${
                    scoreChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {scoreChange >= 0 ? `+${scoreChange}` : scoreChange}
                  </span>
                  <p className="text-gray-500">New Score: {((selectedUser.trust_score || 50) + scoreChange).toFixed(2)}</p>
                </div>
                
                <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600">
                    Valid Range: 0.00 - 100.00 | 
                    Max Increase: +{(100 - (selectedUser.trust_score || 50)).toFixed(2)} | 
                    Max Decrease: -{((selectedUser.trust_score || 50)).toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="scoreChange" className="block text-sm font-medium text-slate-700 mb-2">
                  Score Adjustment
                </Label>
                <Input
                  id="scoreChange"
                  type="number"
                  value={scoreChange}
                  onChange={(e) => handleTrustScoreChange(parseInt(e.target.value) || 0)}
                  min={-(selectedUser.trust_score || 50)}
                  max={100 - (selectedUser.trust_score || 50)}
                  step="1"
                  placeholder="Enter score change (e.g., +10 or -5)"
                  className="text-center text-lg font-semibold"
                />
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <p className="text-xs text-slate-500 w-full mb-1">Quick Actions:</p>
                  
                  {(selectedUser.trust_score || 50) >= 20 && (
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleTrustScoreChange(-20)}>-20</Button>
                  )}
                  {(selectedUser.trust_score || 50) >= 10 && (
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleTrustScoreChange(-10)}>-10</Button>
                  )}
                  {(selectedUser.trust_score || 50) >= 5 && (
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleTrustScoreChange(-5)}>-5</Button>
                  )}
                  
                  <Button variant="outline" size="sm" onClick={() => handleTrustScoreChange(0)}>Reset</Button>
                  
                  {(100 - (selectedUser.trust_score || 50)) >= 5 && (
                    <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleTrustScoreChange(5)}>+5</Button>
                  )}
                  {(100 - (selectedUser.trust_score || 50)) >= 10 && (
                    <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleTrustScoreChange(10)}>+10</Button>
                  )}
                  {(100 - (selectedUser.trust_score || 50)) >= 20 && (
                    <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleTrustScoreChange(20)}>+20</Button>
                  )}
                  {(100 - (selectedUser.trust_score || 50)) >= 50 && (
                    <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleTrustScoreChange(50)}>+50</Button>
                  )}
                  
                  {(100 - (selectedUser.trust_score || 50)) > 0 && (
                    <Button variant="outline" size="sm" className="text-blue-600 font-semibold" onClick={() => handleTrustScoreChange(100 - (selectedUser.trust_score || 50))}>
                      MAX (+{(100 - (selectedUser.trust_score || 50)).toFixed(0)})
                    </Button>
                  )}
                  {(selectedUser.trust_score || 50) > 0 && (
                    <Button variant="outline" size="sm" className="text-red-600 font-semibold" onClick={() => handleTrustScoreChange(-(selectedUser.trust_score || 50))}>
                      MIN (-{((selectedUser.trust_score || 50)).toFixed(0)})
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Change <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Explain why you're adjusting this user's trust score..."
                  className="h-24"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowTrustModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveTrustScore} 
                disabled={!adjustmentReason.trim() || scoreChange === 0 || isLoading}
                className={scoreChange > 0 ? 'bg-green-600 hover:bg-green-700' : (scoreChange < 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400')}
              >
                {isLoading ? 'Saving...' : (scoreChange > 0 ? 'Increase' : (scoreChange < 0 ? 'Decrease' : 'Update'))} Trust Score
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Role - {selectedUser?.display_name}</DialogTitle>
            <DialogDescription>
              Assign a role or role template to {selectedUser?.display_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="direct-role" className="text-sm font-medium mb-2 block">
                Direct Role Assignment
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="direct-role">
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trader">Trader</SelectItem>
                  <SelectItem value="advisor">Advisor</SelectItem>
                  <SelectItem value="finfluencer">Finfluencer</SelectItem>
                  <SelectItem value="educator">Educator</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {currentAdmin?.app_role === 'super_admin' && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="text-center text-sm text-slate-500">— OR —</div>

            <div>
              <Label htmlFor="role-template" className="text-sm font-medium mb-2 block">
                Role Template Assignment
              </Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger id="role-template">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {roleTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                  {roleTemplates.length === 0 && (
                    <SelectItem value="none" disabled>
                      No templates available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-600">
                  {roleTemplates.find(t => t.id === selectedTemplate)?.description}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateRole}
              disabled={isLoading || (!selectedRole && !selectedTemplate)}
            >
              {isLoading ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to {selectedUser?.is_deactivated ? 're-activate' : 'deactivate'} {selectedUser?.display_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will {selectedUser?.is_deactivated ? 're-activate' : 'deactivate'} the user account for
              <span className="font-bold"> {selectedUser?.display_name}</span>.
              They will {selectedUser?.is_deactivated ? 'regain' : 'lose'} access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendUser}
              className={selectedUser?.is_deactivated ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : (selectedUser?.is_deactivated ? 'Re-activate User' : 'Deactivate User')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for
              <span className="font-bold"> {selectedUser?.display_name} </span>
              and remove all associated data from the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUserConfirmed} className="bg-red-600 hover:bg-red-700" disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
