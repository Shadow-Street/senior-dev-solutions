import React, { useState, useEffect } from 'react';
import { ChatRoom, User, Subscription, RoomSubscription } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Lock,
  Users,
  Crown,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  DollarSign
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function AccessControlPanel() {
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newUserId, setNewUserId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [roomsData, usersData, subsData] = await Promise.all([
        ChatRoom.filter({
          '$or': [
            { is_premium: true },
            { is_private: true },
            { is_paid: true }
          ]
        }).catch(() => []),
        User.list().catch(() => []),
        RoomSubscription.list().catch(() => [])
      ]);

      setRooms(roomsData);
      setUsers(usersData);
      setSubscriptions(subsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load access control data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageAccess = (room) => {
    setSelectedRoom(room);
    setShowAccessModal(true);
  };

  const handleAddUser = async () => {
    if (!newUserId || !selectedRoom) return;

    try {
      const allowedUsers = selectedRoom.allowed_user_ids || [];
      
      if (allowedUsers.includes(newUserId)) {
        toast.warning('User already has access');
        return;
      }

      await ChatRoom.update(selectedRoom.id, {
        allowed_user_ids: [...allowedUsers, newUserId]
      });

      toast.success('User access granted');
      setNewUserId('');
      loadData();
      
      // Refresh selected room
      const updatedRoom = await ChatRoom.filter({ id: selectedRoom.id });
      setSelectedRoom(updatedRoom[0]);
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to grant access');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!selectedRoom) return;

    try {
      const allowedUsers = selectedRoom.allowed_user_ids || [];
      await ChatRoom.update(selectedRoom.id, {
        allowed_user_ids: allowedUsers.filter(id => id !== userId)
      });

      toast.success('User access revoked');
      loadData();
      
      // Refresh selected room
      const updatedRoom = await ChatRoom.filter({ id: selectedRoom.id });
      setSelectedRoom(updatedRoom[0]);
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Failed to revoke access');
    }
  };

  const getAccessSummary = (room) => {
    const parts = [];
    
    if (room.is_premium) {
      parts.push(`${room.premium_tier || 'Premium'} tier`);
    }
    if (room.is_private) {
      const allowedCount = room.allowed_user_ids?.length || 0;
      parts.push(`${allowedCount} whitelisted users`);
    }
    if (room.is_paid) {
      const roomSubs = subscriptions.filter(s => s.room_id === room.id && s.status === 'active');
      parts.push(`${roomSubs.length} paid subscribers`);
    }
    
    return parts.join(' • ');
  };

  const filteredUsers = users.filter(u => {
    const name = (u.display_name || u.email || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-protocall-blue mx-auto mb-4"></div>
          <p className="text-lg text-subtle font-medium">Loading Access Control...</p>
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
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-protocall-blue" />
                Tiered Access Control
              </h3>
              <p className="text-sm text-subtle">Manage room access permissions and user whitelists</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rooms List by Type */}
      <Tabs defaultValue="premium" className="space-y-6">
        <TabsList className="grid grid-cols-3 bg-transparent rounded-lg p-1 gap-2">
          <TabsTrigger value="premium" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white">
            <Crown className="w-4 h-4 mr-1" />
            Premium ({rooms.filter(r => r.is_premium).length})
          </TabsTrigger>
          <TabsTrigger value="private" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white">
            <Lock className="w-4 h-4 mr-1" />
            Private ({rooms.filter(r => r.is_private).length})
          </TabsTrigger>
          <TabsTrigger value="paid" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-buy data-[state=active]:to-buy-soft data-[state=active]:text-white">
            <DollarSign className="w-4 h-4 mr-1" />
            Paid ({rooms.filter(r => r.is_paid).length})
          </TabsTrigger>
        </TabsList>

        {/* Premium Tier Rooms */}
        <TabsContent value="premium">
          <Card>
            <CardHeader>
              <CardTitle>Premium Tier Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rooms.filter(r => r.is_premium).map(room => (
                  <div key={room.id} className="flex items-center gap-4 p-4 bg-premium-muted rounded-lg">
                    <Crown className="w-10 h-10 text-protocall-premium-text" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{room.name}</p>
                      <p className="text-sm text-subtle">{getAccessSummary(room)}</p>
                    </div>
                    <Badge className="bg-premium-muted text-protocall-premium-text">
                      {room.premium_tier?.toUpperCase()}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => handleManageAccess(room)}>
                      Manage Access
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Private Rooms */}
        <TabsContent value="private">
          <Card>
            <CardHeader>
              <CardTitle>Private Rooms (Invite-Only)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rooms.filter(r => r.is_private).map(room => (
                  <div key={room.id} className="flex items-center gap-4 p-4 bg-premium-muted rounded-lg">
                    <Lock className="w-10 h-10 text-protocall-blue" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{room.name}</p>
                      <p className="text-sm text-subtle">{getAccessSummary(room)}</p>
                    </div>
                    <Badge className="bg-premium-muted text-protocall-blue">
                      {room.allowed_user_ids?.length || 0} users
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => handleManageAccess(room)}>
                      Manage Whitelist
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paid Rooms */}
        <TabsContent value="paid">
          <Card>
            <CardHeader>
              <CardTitle>Paid Subscription Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rooms.filter(r => r.is_paid).map(room => {
                  const roomSubs = subscriptions.filter(s => s.room_id === room.id && s.status === 'active');
                  const monthlyRevenue = roomSubs.length * (room.room_price || 0);

                  return (
                    <div key={room.id} className="flex items-center gap-4 p-4 bg-buy-muted rounded-lg">
                      <DollarSign className="w-10 h-10 text-buy-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{room.name}</p>
                        <p className="text-sm text-subtle">
                          ₹{room.room_price}/month • {roomSubs.length} subscribers • ₹{monthlyRevenue}/mo revenue
                        </p>
                      </div>
                      <Badge className="bg-buy-muted text-buy-muted-foreground">
                        ₹{room.room_price}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => handleManageAccess(room)}>
                        View Subscribers
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Access Management Modal */}
      <Dialog open={showAccessModal} onOpenChange={setShowAccessModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Access - {selectedRoom?.name}</DialogTitle>
            <DialogDescription>
              Control who can access this room
            </DialogDescription>
          </DialogHeader>

          {selectedRoom && (
            <div className="space-y-6">
              {/* Room Info */}
              <div className="flex gap-3">
                {selectedRoom.is_premium && (
                  <Badge className="bg-premium-muted text-protocall-premium-text">
                    <Crown className="w-3 h-3 mr-1" />
                    {selectedRoom.premium_tier}
                  </Badge>
                )}
                {selectedRoom.is_private && (
                  <Badge className="bg-premium-muted text-protocall-blue">
                    <Lock className="w-3 h-3 mr-1" />
                    Private
                  </Badge>
                )}
                {selectedRoom.is_paid && (
                  <Badge className="bg-buy-muted text-buy-muted-foreground">
                    <DollarSign className="w-3 h-3 mr-1" />
                    ₹{selectedRoom.room_price}/mo
                  </Badge>
                )}
              </div>

              {/* Add User (for private rooms) */}
              {selectedRoom.is_private && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Add User to Whitelist</h4>
                  
                  <div className="flex gap-3">
                    <select
                      value={newUserId}
                      onChange={(e) => setNewUserId(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-md"
                    >
                      <option value="">Select user to add</option>
                      {users.filter(u => !selectedRoom.allowed_user_ids?.includes(u.id)).map(user => (
                        <option key={user.id} value={user.id}>
                          {user.display_name || user.email} {user.app_role !== 'trader' ? `(${user.app_role})` : ''}
                        </option>
                      ))}
                    </select>
                    <Button onClick={handleAddUser} disabled={!newUserId}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {/* Whitelisted Users (for private rooms) */}
              {selectedRoom.is_private && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Whitelisted Users ({selectedRoom.allowed_user_ids?.length || 0})</h4>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedRoom.allowed_user_ids?.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-subtle">No users whitelisted yet</p>
                      </div>
                    ) : (
                      selectedRoom.allowed_user_ids?.map(userId => {
                        const user = users.find(u => u.id === userId);
                        return user ? (
                          <div key={userId} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-premium-muted flex items-center justify-center">
                                {user.profile_image_url ? (
                                  <img src={user.profile_image_url} alt={user.display_name} className="w-10 h-10 rounded-full" />
                                ) : (
                                  <Users className="w-5 h-5 text-protocall-blue" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{user.display_name || user.email}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUser(userId)}
                              className="text-sell-muted-foreground hover:text-sell-muted-foreground"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : null;
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Subscribers (for paid rooms) */}
              {selectedRoom.is_paid && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Active Subscribers</h4>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {subscriptions.filter(s => s.room_id === selectedRoom.id && s.status === 'active').map(sub => {
                      const user = users.find(u => u.id === sub.user_id);
                      return user ? (
                        <div key={sub.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-buy-muted flex items-center justify-center">
                              {user.profile_image_url ? (
                                <img src={user.profile_image_url} alt={user.display_name} className="w-10 h-10 rounded-full" />
                              ) : (
                                <Users className="w-5 h-5 text-buy-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{user.display_name || user.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Subscribed {new Date(sub.start_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${
                              sub.status === 'active' ? 'bg-buy-muted text-buy-muted-foreground' : 'bg-surface-2 text-foreground'
                            }`}>
                              {sub.status}
                            </Badge>
                            <span className="text-sm font-medium text-foreground">₹{sub.amount_paid}</span>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Tier Access Info */}
              {selectedRoom.is_premium && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Subscription Tier Access</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-xs">
                          B
                        </div>
                        <span className="font-medium">Basic Tier</span>
                      </div>
                      {selectedRoom.premium_tier === 'basic' ? (
                        <CheckCircle className="w-5 h-5 text-buy-muted-foreground" />
                      ) : (
                        <XCircle className="w-5 h-5 text-sell" />
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs text-white font-semibold">
                          P
                        </div>
                        <span className="font-medium">Premium Tier</span>
                      </div>
                      {['basic', 'premium'].includes(selectedRoom.premium_tier) ? (
                        <CheckCircle className="w-5 h-5 text-buy-muted-foreground" />
                      ) : (
                        <XCircle className="w-5 h-5 text-sell" />
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-hold flex items-center justify-center text-xs font-semibold">
                          V
                        </div>
                        <span className="font-medium">VIP Tier</span>
                      </div>
                      <CheckCircle className="w-5 h-5 text-buy-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}