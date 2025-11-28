import React, { useState, useEffect } from 'react';
import { ChatRoom, RoomSubscription, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Crown,
  Lock,
  DollarSign,
  Users,
  Star,
  Settings,
  Plus,
  Edit,
  Eye,
  TrendingUp,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function PremiumRoomPanel({ adminUser }) {
  const [rooms, setRooms] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    is_premium: false,
    premium_tier: 'premium',
    is_private: false,
    is_paid: false,
    room_price: 99,
    vip_features_enabled: false,
    exclusive_content_enabled: false,
    room_color: '#6366f1',
    room_icon: '👑'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [roomsData, subsData] = await Promise.all([
        ChatRoom.filter({ 
          '$or': [
            { is_premium: true },
            { is_private: true },
            { is_paid: true }
          ]
        }).catch(() => []),
        RoomSubscription.list().catch(() => [])
      ]);

      setRooms(roomsData);
      setSubscriptions(subsData);
    } catch (error) {
      console.error('Error loading premium rooms:', error);
      toast.error('Failed to load premium rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      is_premium: room.is_premium || false,
      premium_tier: room.premium_tier || 'premium',
      is_private: room.is_private || false,
      is_paid: room.is_paid || false,
      room_price: room.room_price || 99,
      vip_features_enabled: room.vip_features_enabled || false,
      exclusive_content_enabled: room.exclusive_content_enabled || false,
      room_color: room.room_color || '#6366f1',
      room_icon: room.room_icon || '👑'
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editingRoom) return;

    try {
      await ChatRoom.update(editingRoom.id, formData);
      toast.success('Premium settings updated successfully');
      setShowEditModal(false);
      setEditingRoom(null);
      loadData();
    } catch (error) {
      console.error('Error updating room:', error);
      toast.error('Failed to update premium settings');
    }
  };

  const premiumRooms = rooms.filter(r => r.is_premium);
  const privateRooms = rooms.filter(r => r.is_private);
  const paidRooms = rooms.filter(r => r.is_paid);
  const totalRevenue = paidRooms.reduce((sum, r) => sum + (r.revenue_generated || 0), 0);
  const totalSubscribers = subscriptions.filter(s => s.status === 'active').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading Premium Rooms...</p>
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
                <Crown className="w-5 h-5 text-purple-600" />
                Premium Room Features
              </h3>
              <p className="text-sm text-slate-600">Manage tiered access, paid rooms, and VIP features</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Premium Rooms</p>
                <p className="text-3xl font-bold">{premiumRooms.length}</p>
              </div>
              <Crown className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Private Rooms</p>
                <p className="text-3xl font-bold">{privateRooms.length}</p>
              </div>
              <Lock className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Paid Rooms</p>
                <p className="text-3xl font-bold">{paidRooms.length}</p>
              </div>
              <DollarSign className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Subscribers</p>
                <p className="text-3xl font-bold">{totalSubscribers}</p>
              </div>
              <Users className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Revenue</p>
                <p className="text-3xl font-bold">₹{(totalRevenue / 1000).toFixed(1)}K</p>
              </div>
              <TrendingUp className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Premium Rooms List */}
      <Card>
        <CardHeader>
          <CardTitle>Premium Rooms Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rooms.length === 0 ? (
              <div className="text-center py-12">
                <Crown className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No premium rooms yet</p>
                <p className="text-slate-500 text-sm mt-1">Convert existing rooms to premium</p>
              </div>
            ) : (
              rooms.map(room => {
                const roomSubs = subscriptions.filter(s => s.room_id === room.id && s.status === 'active');
                const monthlyRevenue = roomSubs.length * (room.room_price || 0);

                return (
                  <div key={room.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: room.room_color || '#6366f1' }}>
                      {room.room_icon || '💬'}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900">{room.name}</p>
                        
                        {room.is_premium && (
                          <Badge className="bg-purple-100 text-purple-800">
                            <Crown className="w-3 h-3 mr-1" />
                            {room.premium_tier}
                          </Badge>
                        )}
                        
                        {room.is_private && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Lock className="w-3 h-3 mr-1" />
                            Private
                          </Badge>
                        )}
                        
                        {room.is_paid && (
                          <Badge className="bg-green-100 text-green-800">
                            <DollarSign className="w-3 h-3 mr-1" />
                            ₹{room.room_price}/mo
                          </Badge>
                        )}
                        
                        {room.vip_features_enabled && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Star className="w-3 h-3 mr-1" />
                            VIP Features
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {room.participant_count || 0} members
                        </span>
                        
                        {room.is_paid && (
                          <>
                            <span className="flex items-center gap-1">
                              <Shield className="w-4 h-4" />
                              {roomSubs.length} subscribers
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              ₹{monthlyRevenue}/mo revenue
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(room)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Premium Room Settings</DialogTitle>
            <DialogDescription>
              Configure premium features, access control, and monetization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Access Control */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Access Control
              </h4>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <Label className="font-medium">Premium Room</Label>
                  <p className="text-sm text-slate-600">Require active subscription to access</p>
                </div>
                <Switch
                  checked={formData.is_premium}
                  onCheckedChange={(checked) => setFormData({...formData, is_premium: checked})}
                />
              </div>

              {formData.is_premium && (
                <div>
                  <Label>Premium Tier</Label>
                  <Select value={formData.premium_tier} onValueChange={(value) => setFormData({...formData, premium_tier: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <Label className="font-medium">Private Room</Label>
                  <p className="text-sm text-slate-600">Invite-only access</p>
                </div>
                <Switch
                  checked={formData.is_private}
                  onCheckedChange={(checked) => setFormData({...formData, is_private: checked})}
                />
              </div>
            </div>

            {/* Monetization */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Monetization
              </h4>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <Label className="font-medium">Paid Room</Label>
                  <p className="text-sm text-slate-600">Require payment to access</p>
                </div>
                <Switch
                  checked={formData.is_paid}
                  onCheckedChange={(checked) => setFormData({...formData, is_paid: checked})}
                />
              </div>

              {formData.is_paid && (
                <div>
                  <Label>Monthly Price (₹)</Label>
                  <Input
                    type="number"
                    value={formData.room_price}
                    onChange={(e) => setFormData({...formData, room_price: Number(e.target.value)})}
                  />
                </div>
              )}
            </div>

            {/* VIP Features */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4" />
                VIP Features
              </h4>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <Label className="font-medium">Enable VIP Features</Label>
                  <p className="text-sm text-slate-600">Custom emojis, badges, and colors</p>
                </div>
                <Switch
                  checked={formData.vip_features_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, vip_features_enabled: checked})}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                <div>
                  <Label className="font-medium">Exclusive Content</Label>
                  <p className="text-sm text-slate-600">Premium-only announcements</p>
                </div>
                <Switch
                  checked={formData.exclusive_content_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, exclusive_content_enabled: checked})}
                />
              </div>
            </div>

            {/* Customization */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Customization
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Room Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={formData.room_color}
                      onChange={(e) => setFormData({...formData, room_color: e.target.value})}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.room_color}
                      onChange={(e) => setFormData({...formData, room_color: e.target.value})}
                      placeholder="#6366f1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Room Icon (Emoji)</Label>
                  <Input
                    value={formData.room_icon}
                    onChange={(e) => setFormData({...formData, room_icon: e.target.value})}
                    placeholder="👑"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                Save Premium Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}