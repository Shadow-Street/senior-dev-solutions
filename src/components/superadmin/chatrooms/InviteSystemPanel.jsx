
import React, { useState, useEffect } from 'react';
import { ChatRoomInvite, ChatRoom } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Link2,
  Copy,
  Plus,
  Trash2,
  Eye,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

export default function InviteSystemPanel({ adminUser }) {
  const [invites, setInvites] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    chat_room_id: '',
    invite_type: 'multi_use',
    max_uses: 100,
    expires_at: '',
    assigned_role: 'member',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invitesData, roomsData] = await Promise.all([
        ChatRoomInvite.list('-created_date'),
        ChatRoom.list()
      ]);

      setInvites(invitesData);
      setChatRooms(roomsData);
    } catch (error) {
      console.error('Error loading invites:', error);
      toast.error('Failed to load invites');
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleCreateInvite = async () => {
    if (!formData.chat_room_id) {
      toast.error('Please select a chat room');
      return;
    }

    try {
      const inviteCode = generateInviteCode();
      const inviteUrl = `${window.location.origin}/join/${inviteCode}`;

      const inviteData = {
        ...formData,
        invite_code: inviteCode,
        invite_url: inviteUrl,
        created_by: adminUser?.id,
        created_by_name: adminUser?.display_name,
        current_uses: 0,
        is_active: true,
        max_uses: formData.invite_type === 'unlimited' ? null : Number(formData.max_uses)
      };

      await ChatRoomInvite.create(inviteData);
      toast.success('Invite created successfully');

      loadData();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating invite:', error);
      toast.error('Failed to create invite');
    }
  };

  const handleCopyInvite = (invite) => {
    navigator.clipboard.writeText(invite.invite_url);
    toast.success('Invite link copied to clipboard');
  };

  const handleDelete = async (inviteId) => {
    if (!window.confirm('Are you sure you want to delete this invite?')) {
      return;
    }

    try {
      await ChatRoomInvite.delete(inviteId);
      toast.success('Invite deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting invite:', error);
      toast.error('Failed to delete invite');
    }
  };

  const handleToggleActive = async (invite) => {
    try {
      await ChatRoomInvite.update(invite.id, {
        is_active: !invite.is_active
      });
      toast.success(`Invite ${!invite.is_active ? 'activated' : 'deactivated'}`);
      loadData();
    } catch (error) {
      console.error('Error toggling invite:', error);
      toast.error('Failed to toggle invite');
    }
  };

  const exportInvites = () => {
    const csvData = invites.map(invite => {
      const room = chatRooms.find(r => r.id === invite.chat_room_id);
      return {
        'Room': room?.name || 'Unknown',
        'Invite Code': invite.invite_code,
        'Invite URL': invite.invite_url,
        'Type': invite.invite_type,
        'Max Uses': invite.max_uses || 'Unlimited',
        'Current Uses': invite.current_uses,
        'Status': invite.is_active ? 'Active' : 'Inactive',
        'Expires': invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : 'Never',
        'Created By': invite.created_by_name
      };
    });

    const headers = Object.keys(csvData[0] || {});
    const csvString = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `room-invites-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Invites exported successfully');
  };

  const resetForm = () => {
    setFormData({
      chat_room_id: '',
      invite_type: 'multi_use',
      max_uses: 100,
      expires_at: '',
      assigned_role: 'member',
      notes: ''
    });
  };

  const activeInvites = invites.filter(i => i.is_active);
  const expiredInvites = invites.filter(i => i.expires_at && new Date(i.expires_at) < new Date());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading Invite System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Invite System</h3>
              <p className="text-sm text-slate-600">Manage invite links for your chat rooms</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={exportInvites}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Invite
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Invites</p>
                <p className="text-3xl font-bold">{invites.length}</p>
              </div>
              <Link2 className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Active Invites</p>
                <p className="text-3xl font-bold">{activeInvites.length}</p>
              </div>
              <CheckCircle className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Uses</p>
                <p className="text-3xl font-bold">{invites.reduce((sum, i) => sum + (i.current_uses || 0), 0)}</p>
              </div>
              <Users className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Expired</p>
                <p className="text-3xl font-bold">{expiredInvites.length}</p>
              </div>
              <XCircle className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invites List */}
      <Card>
        <CardHeader>
          <CardTitle>All Invites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invites.length === 0 ? (
              <div className="text-center py-12">
                <Link2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No invites created yet</p>
                <p className="text-slate-500 text-sm mt-1">Create your first invite link</p>
              </div>
            ) : (
              invites.map(invite => {
                const room = chatRooms.find(r => r.id === invite.chat_room_id);
                const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
                const usagePercent = invite.max_uses ? (invite.current_uses / invite.max_uses) * 100 : 0;

                return (
                  <div key={invite.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-slate-900">{room?.name || 'Unknown Room'}</p>
                        <Badge variant="outline" className="text-xs">
                          {invite.invite_code}
                        </Badge>
                        <Badge className={`text-xs ${
                          invite.invite_type === 'single_use' ? 'bg-blue-100 text-blue-800' :
                          invite.invite_type === 'multi_use' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {invite.invite_type.replace('_', ' ')}
                        </Badge>
                        {invite.is_active && !isExpired ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 text-xs">
                            {isExpired ? 'Expired' : 'Inactive'}
                          </Badge>
                        )}
                        {invite.assigned_role === 'moderator' && (
                          <Badge className="bg-indigo-100 text-indigo-800 text-xs">Moderator</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {invite.current_uses} / {invite.max_uses || '∞'} uses
                        </span>
                        {invite.expires_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Expires: {new Date(invite.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {invite.max_uses && (
                        <div className="mt-2">
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          value={invite.invite_url}
                          readOnly
                          className="text-xs bg-white"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyInvite(invite)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(invite)}
                      >
                        {invite.is_active ? (
                          <XCircle className="w-4 h-4 text-orange-600" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(invite.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Invite Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Invite Link</DialogTitle>
            <DialogDescription>
              Generate a new invite link for a chat room
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Chat Room</Label>
              <Select value={formData.chat_room_id} onValueChange={(value) => setFormData({...formData, chat_room_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {chatRooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invite Type</Label>
                <Select value={formData.invite_type} onValueChange={(value) => setFormData({...formData, invite_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_use">Single Use</SelectItem>
                    <SelectItem value="multi_use">Multi Use</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.invite_type === 'multi_use' && (
                <div>
                  <Label>Max Uses</Label>
                  <Input
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({...formData, max_uses: e.target.value})}
                  />
                </div>
              )}

              {formData.invite_type === 'single_use' && (
                <div>
                  <Label>Max Uses</Label>
                  <Input
                    type="number"
                    value="1"
                    disabled
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expires At (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                />
              </div>

              <div>
                <Label>Assigned Role</Label>
                <Select value={formData.assigned_role} onValueChange={(value) => setFormData({...formData, assigned_role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Internal notes about this invite..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvite}>
                Create Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
