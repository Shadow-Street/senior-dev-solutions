import React, { useState, useEffect } from 'react';
import { VIPCustomization, User, ChatRoom } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Star,
  Crown,
  Sparkles,
  Palette,
  Smile,
  Shield,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

export default function VIPFeaturesPanel() {
  const [customizations, setCustomizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCustomization, setEditingCustomization] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    user_id: '',
    room_id: '',
    custom_badge: {
      name: 'VIP',
      icon: '👑',
      color: '#fbbf24'
    },
    custom_color: '#8b5cf6',
    message_effects: [],
    priority_support: true,
    ad_free: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [customData, userData, roomData] = await Promise.all([
        VIPCustomization.list('-created_date').catch(() => []),
        User.list().catch(() => []),
        ChatRoom.filter({ vip_features_enabled: true }).catch(() => [])
      ]);

      setCustomizations(customData);
      setUsers(userData);
      setRooms(roomData);
    } catch (error) {
      console.error('Error loading VIP features:', error);
      toast.error('Failed to load VIP features');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.user_id) {
      toast.error('Please select a user');
      return;
    }

    try {
      if (editingCustomization) {
        await VIPCustomization.update(editingCustomization.id, formData);
        toast.success('VIP customization updated successfully');
      } else {
        await VIPCustomization.create(formData);
        toast.success('VIP customization created successfully');
      }

      setShowCreateModal(false);
      setEditingCustomization(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving customization:', error);
      toast.error('Failed to save VIP customization');
    }
  };

  const handleEdit = (customization) => {
    setEditingCustomization(customization);
    setFormData({
      user_id: customization.user_id,
      room_id: customization.room_id || '',
      custom_badge: customization.custom_badge || {
        name: 'VIP',
        icon: '👑',
        color: '#fbbf24'
      },
      custom_color: customization.custom_color || '#8b5cf6',
      message_effects: customization.message_effects || [],
      priority_support: customization.priority_support !== false,
      ad_free: customization.ad_free !== false
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (customizationId) => {
    if (!window.confirm('Are you sure you want to remove this VIP customization?')) {
      return;
    }

    try {
      await VIPCustomization.delete(customizationId);
      toast.success('VIP customization removed successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting customization:', error);
      toast.error('Failed to remove VIP customization');
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      room_id: '',
      custom_badge: {
        name: 'VIP',
        icon: '👑',
        color: '#fbbf24'
      },
      custom_color: '#8b5cf6',
      message_effects: [],
      priority_support: true,
      ad_free: true
    });
  };

  const messageEffects = [
    { id: 'glow', name: 'Glow', icon: '✨' },
    { id: 'rainbow', name: 'Rainbow', icon: '🌈' },
    { id: 'sparkle', name: 'Sparkle', icon: '💫' },
    { id: 'fire', name: 'Fire', icon: '🔥' },
    { id: 'ice', name: 'Ice', icon: '❄️' },
    { id: 'shadow', name: 'Shadow', icon: '🌑' }
  ];

  const toggleEffect = (effectId) => {
    const effects = formData.message_effects || [];
    if (effects.includes(effectId)) {
      setFormData({
        ...formData,
        message_effects: effects.filter(e => e !== effectId)
      });
    } else {
      setFormData({
        ...formData,
        message_effects: [...effects, effectId]
      });
    }
  };

  const filteredCustomizations = customizations.filter(custom => {
    const user = users.find(u => u.id === custom.user_id);
    const userName = user?.display_name || user?.email || '';
    return userName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading VIP Features...</p>
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
                <Star className="w-5 h-5 text-yellow-500" />
                VIP Features Management
              </h3>
              <p className="text-sm text-slate-600">Manage custom badges, colors, emojis, and effects for VIP users</p>
            </div>
            <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add VIP User
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total VIP Users</p>
                <p className="text-3xl font-bold">{customizations.length}</p>
              </div>
              <Crown className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Custom Badges</p>
                <p className="text-3xl font-bold">{customizations.filter(c => c.custom_badge).length}</p>
              </div>
              <Shield className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Message Effects</p>
                <p className="text-3xl font-bold">{customizations.filter(c => c.message_effects?.length > 0).length}</p>
              </div>
              <Sparkles className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">VIP Rooms</p>
                <p className="text-3xl font-bold">{rooms.length}</p>
              </div>
              <Star className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search VIP users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* VIP Users List */}
      <Card>
        <CardHeader>
          <CardTitle>VIP Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredCustomizations.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No VIP users yet</p>
                <p className="text-slate-500 text-sm mt-1">Add VIP features to premium users</p>
              </div>
            ) : (
              filteredCustomizations.map(custom => {
                const user = users.find(u => u.id === custom.user_id);
                const room = rooms.find(r => r.id === custom.room_id);

                return (
                  <div key={custom.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: custom.custom_color || '#8b5cf6', color: 'white' }}>
                      {custom.custom_badge?.icon || '👑'}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900">{user?.display_name || 'Unknown User'}</p>
                        
                        {custom.custom_badge && (
                          <Badge style={{ 
                            backgroundColor: custom.custom_badge.color,
                            color: 'white',
                            border: 'none'
                          }}>
                            {custom.custom_badge.icon} {custom.custom_badge.name}
                          </Badge>
                        )}

                        {custom.priority_support && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Shield className="w-3 h-3 mr-1" />
                            Priority Support
                          </Badge>
                        )}

                        {custom.ad_free && (
                          <Badge className="bg-green-100 text-green-800">
                            Ad-Free
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        {room && (
                          <span>Room: {room.name}</span>
                        )}
                        {!room && (
                          <span>Scope: Global</span>
                        )}
                        {custom.message_effects?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-4 h-4" />
                            {custom.message_effects.length} effects
                          </span>
                        )}
                      </div>

                      {custom.message_effects?.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {custom.message_effects.map(effectId => {
                            const effect = messageEffects.find(e => e.id === effectId);
                            return effect ? (
                              <Badge key={effectId} variant="outline" className="text-xs">
                                {effect.icon} {effect.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(custom)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(custom.id)}
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

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomization ? 'Edit VIP Customization' : 'Add VIP User'}</DialogTitle>
            <DialogDescription>
              Configure custom features for VIP users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>User</Label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!!editingCustomization}
                >
                  <option value="">Select user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.display_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Room (Optional)</Label>
                <select
                  value={formData.room_id}
                  onChange={(e) => setFormData({...formData, room_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Global (All Rooms)</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Badge */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Custom Badge
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Badge Name</Label>
                  <Input
                    value={formData.custom_badge?.name || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      custom_badge: { ...formData.custom_badge, name: e.target.value }
                    })}
                    placeholder="VIP"
                  />
                </div>

                <div>
                  <Label>Badge Icon</Label>
                  <Input
                    value={formData.custom_badge?.icon || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      custom_badge: { ...formData.custom_badge, icon: e.target.value }
                    })}
                    placeholder="👑"
                    maxLength={2}
                  />
                </div>

                <div>
                  <Label>Badge Color</Label>
                  <Input
                    type="color"
                    value={formData.custom_badge?.color || '#fbbf24'}
                    onChange={(e) => setFormData({
                      ...formData,
                      custom_badge: { ...formData.custom_badge, color: e.target.value }
                    })}
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 bg-slate-100 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">Badge Preview:</p>
                <Badge style={{ 
                  backgroundColor: formData.custom_badge?.color,
                  color: 'white',
                  border: 'none'
                }}>
                  {formData.custom_badge?.icon} {formData.custom_badge?.name}
                </Badge>
              </div>
            </div>

            {/* Custom Color */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Custom Name Color
              </h4>

              <div className="flex items-center gap-4">
                <Input
                  type="color"
                  value={formData.custom_color}
                  onChange={(e) => setFormData({...formData, custom_color: e.target.value})}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.custom_color}
                  onChange={(e) => setFormData({...formData, custom_color: e.target.value})}
                  placeholder="#8b5cf6"
                />
                <div className="p-3 bg-slate-100 rounded-lg flex-1">
                  <p style={{ color: formData.custom_color }} className="font-semibold">
                    Preview Name
                  </p>
                </div>
              </div>
            </div>

            {/* Message Effects */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Message Effects
              </h4>

              <div className="grid grid-cols-3 gap-3">
                {messageEffects.map(effect => (
                  <div
                    key={effect.id}
                    onClick={() => toggleEffect(effect.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.message_effects?.includes(effect.id)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{effect.icon}</div>
                    <p className="text-sm font-medium">{effect.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Features */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4" />
                Additional Features
              </h4>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <Label className="font-medium">Priority Support</Label>
                  <p className="text-sm text-slate-600">Get priority in support queue</p>
                </div>
                <Switch
                  checked={formData.priority_support}
                  onCheckedChange={(checked) => setFormData({...formData, priority_support: checked})}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <Label className="font-medium">Ad-Free Experience</Label>
                  <p className="text-sm text-slate-600">Remove all advertisements</p>
                </div>
                <Switch
                  checked={formData.ad_free}
                  onCheckedChange={(checked) => setFormData({...formData, ad_free: checked})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
                {editingCustomization ? 'Update VIP Features' : 'Add VIP User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}