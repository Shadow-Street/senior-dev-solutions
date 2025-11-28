import React, { useState, useEffect } from 'react';
import { Announcement, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Eye, EyeOff, Sparkles, Calendar, Users, Palette, Zap, Gift, Server, AlertTriangle, AlertCircle, CheckCircle, Megaphone, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    gradient: 'blue-purple',
    icon: 'Sparkles',
    animation: 'sparkles',
    is_active: true,
    priority: 0,
    start_date: '',
    end_date: '',
    target_audience: 'all',
    action_url: '',
    action_label: '',
  });

  // Gradient presets with previews
  const gradientPresets = [
    { value: 'blue-purple', label: 'Blue → Purple (Info)', preview: 'bg-gradient-to-r from-blue-500 to-purple-600', use: 'General announcements' },
    { value: 'green-emerald', label: 'Green → Emerald (Success)', preview: 'bg-gradient-to-r from-green-500 to-teal-600', use: 'Success messages' },
    { value: 'orange-pink', label: 'Orange → Pink (Warning)', preview: 'bg-gradient-to-r from-orange-500 to-pink-600', use: 'Warnings' },
    { value: 'red-purple', label: 'Red → Purple (Critical)', preview: 'bg-gradient-to-r from-red-600 to-purple-700', use: 'System downtime' },
    { value: 'yellow-orange', label: 'Yellow → Orange (Alert)', preview: 'bg-gradient-to-r from-yellow-500 to-red-500', use: 'Urgent alerts' },
    { value: 'purple-indigo', label: 'Purple → Indigo (Premium)', preview: 'bg-gradient-to-r from-purple-500 to-blue-600', use: 'Premium features' },
    { value: 'pink-rose', label: 'Pink → Rose (Celebration)', preview: 'bg-gradient-to-r from-pink-500 to-red-500', use: 'Celebrations' },
    { value: 'cyan-blue', label: 'Cyan → Blue (Cool)', preview: 'bg-gradient-to-r from-cyan-400 to-indigo-600', use: 'Updates' },
  ];

  // Icon options
  const iconOptions = [
    { value: 'Sparkles', label: 'Sparkles ✨', component: Sparkles, use: 'General/Celebration' },
    { value: 'Gift', label: 'Gift 🎁', component: Gift, use: 'Promotions/Offers' },
    { value: 'Megaphone', label: 'Megaphone 📢', component: Megaphone, use: 'Announcements' },
    { value: 'CheckCircle', label: 'Check ✓', component: CheckCircle, use: 'Success' },
    { value: 'AlertTriangle', label: 'Warning ⚠️', component: AlertTriangle, use: 'Warnings' },
    { value: 'AlertCircle', label: 'Alert ⚠', component: AlertCircle, use: 'Important' },
    { value: 'Server', label: 'Server 🖥️', component: Server, use: 'System/Downtime' },
    { value: 'Zap', label: 'Lightning ⚡', component: Zap, use: 'Flash/Urgent' },
    { value: 'TrendingUp', label: 'Trending 📈', component: TrendingUp, use: 'Updates' },
  ];

  // Animation options
  const animationOptions = [
    { value: 'sparkles', label: '✨ Sparkles Animation', description: 'Animated sparkles floating' },
    { value: 'pulse', label: '💓 Pulse Animation', description: 'Gentle pulsing effect' },
    { value: 'bounce', label: '⬆️ Bounce Animation', description: 'Bouncing effect' },
    { value: 'none', label: '🚫 No Animation', description: 'Static banner' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, allAnnouncements] = await Promise.all([
        User.me(),
        Announcement.list('-priority')
      ]);

      setCurrentUser(user);
      setAnnouncements(allAnnouncements);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.message) {
      toast.error('Title and message are required');
      return;
    }

    try {
      await Announcement.create({
        ...formData,
        created_by: currentUser.id,
        created_by_name: currentUser.display_name || currentUser.email,
      });

      toast.success('🎉 Announcement created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    }
  };

  const handleUpdate = async () => {
    if (!formData.title || !formData.message) {
      toast.error('Title and message are required');
      return;
    }

    try {
      await Announcement.update(editingAnnouncement.id, formData);
      toast.success('✅ Announcement updated successfully!');
      setEditingAnnouncement(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast.error('Failed to update announcement');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await Announcement.delete(id);
      toast.success('🗑️ Announcement deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const toggleActive = async (announcement) => {
    try {
      await Announcement.update(announcement.id, {
        is_active: !announcement.is_active
      });
      toast.success(`${announcement.is_active ? '👁️‍🗨️ Deactivated' : '👁️ Activated'}`);
      loadData();
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      gradient: 'blue-purple',
      icon: 'Sparkles',
      animation: 'sparkles',
      is_active: true,
      priority: 0,
      start_date: '',
      end_date: '',
      target_audience: 'all',
      action_url: '',
      action_label: '',
    });
  };

  const startEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      gradient: announcement.gradient || 'blue-purple',
      icon: announcement.icon || 'Sparkles',
      animation: announcement.animation || 'sparkles',
      is_active: announcement.is_active,
      priority: announcement.priority || 0,
      start_date: announcement.start_date || '',
      end_date: announcement.end_date || '',
      target_audience: announcement.target_audience || 'all',
      action_url: announcement.action_url || '',
      action_label: announcement.action_label || '',
    });
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'important': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">📢 Announcement Management</h2>
          <p className="text-sm text-gray-600 mt-1">Create beautiful, animated announcements with custom styling</p>
        </div>
        <Dialog open={showCreateModal || !!editingAnnouncement} onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingAnnouncement(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
              <DialogDescription>
                Design a beautiful announcement with custom colors, icons, and animations
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Preview */}
              <div>
                <label className="text-sm font-medium mb-2 block">Preview</label>
                <div className={`${gradientPresets.find(g => g.value === formData.gradient)?.preview || 'bg-gradient-to-r from-blue-500 to-purple-600'} rounded-lg p-4 text-white relative overflow-hidden`}>
                  <div className="flex items-center gap-3">
                    {React.createElement(iconOptions.find(i => i.value === formData.icon)?.component || Sparkles, { className: "w-5 h-5" })}
                    <div>
                      <h3 className="font-bold">{formData.title || 'Your Title'}</h3>
                      <p className="text-sm opacity-90">{formData.message || 'Your message will appear here'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-2 block">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Welcome to Protocol!"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-medium mb-2 block">Message *</label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="e.g., Your trading community is now live!"
                    rows={2}
                  />
                </div>
              </div>

              {/* Visual Styling */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Visual Styling
                </h4>
                
                <div className="space-y-4">
                  {/* Gradient Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Color Gradient</label>
                    <div className="grid grid-cols-2 gap-2">
                      {gradientPresets.map(preset => (
                        <button
                          key={preset.value}
                          onClick={() => setFormData({ ...formData, gradient: preset.value })}
                          className={`${preset.preview} rounded-lg p-3 text-white text-left transition-all ${formData.gradient === preset.value ? 'ring-2 ring-blue-600 ring-offset-2' : ''}`}
                        >
                          <div className="font-semibold text-xs">{preset.label}</div>
                          <div className="text-xs opacity-80 mt-1">{preset.use}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Icon & Animation */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Icon</label>
                      <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map(icon => (
                            <SelectItem key={icon.value} value={icon.value}>
                              {icon.label} - {icon.use}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Animation</label>
                      <Select value={formData.animation} onValueChange={(value) => setFormData({ ...formData, animation: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {animationOptions.map(anim => (
                            <SelectItem key={anim.value} value={anim.value}>
                              {anim.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Targeting & Scheduling */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Targeting & Scheduling</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Target Audience</label>
                    <Select value={formData.target_audience} onValueChange={(value) => setFormData({ ...formData, target_audience: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">👥 All Users</SelectItem>
                        <SelectItem value="subscribers_only">👑 Subscribers Only</SelectItem>
                        <SelectItem value="traders_only">📈 Traders Only</SelectItem>
                        <SelectItem value="admins_only">🛡️ Admins Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Priority</label>
                    <Input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <Input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Input
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Call to Action */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Call to Action (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Button Text</label>
                    <Input
                      value={formData.action_label}
                      onChange={(e) => setFormData({ ...formData, action_label: e.target.value })}
                      placeholder="Learn More"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Button Link</label>
                    <Input
                      value={formData.action_url}
                      onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
                      placeholder="/Subscription"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t pt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingAnnouncement(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingAnnouncement ? handleUpdate : handleCreate}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {editingAnnouncement ? 'Update' : 'Create'} Announcement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{announcements.length}</p>
              </div>
              <Sparkles className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {announcements.filter(a => a.is_active).length}
                </p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-600">
                  {announcements.filter(a => !a.is_active).length}
                </p>
              </div>
              <EyeOff className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-orange-600">
                  {announcements.filter(a => a.start_date && new Date(a.start_date) > new Date()).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Announcements Yet</h3>
              <p className="text-gray-600 mb-4">Create your first announcement to engage with users</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Announcement
              </Button>
            </CardContent>
          </Card>
        ) : (
          announcements.map(announcement => (
            <Card key={announcement.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{announcement.title}</h3>
                      <Badge className={getTypeColor(announcement.type)}>
                        {announcement.type}
                      </Badge>
                      {announcement.is_active ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                      {announcement.priority > 0 && (
                        <Badge className="bg-orange-100 text-orange-800">
                          Priority: {announcement.priority}
                        </Badge>
                      )}
                    </div>

                    <p className="text-gray-600 mb-3">{announcement.message}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span className="capitalize">{announcement.target_audience?.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Palette className="w-4 h-4" />
                        <span>{announcement.gradient || 'blue-purple'}</span>
                      </div>
                      {announcement.animation && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          <span>{announcement.animation}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(announcement)}
                    >
                      {announcement.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(announcement)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(announcement.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}