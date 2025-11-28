
import React, { useState, useEffect } from 'react';
import { ChatRoomSchedule, ChatRoom } from '@/api/entities';
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
  Clock,
  Calendar,
  MessageSquare,
  Video,
  Trash2,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';

export default function RoomAutomationPanel({ adminUser }) {
  const [schedules, setSchedules] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    chat_room_id: '',
    schedule_type: 'announcement',
    action: 'send_message',
    scheduled_time: '',
    recurrence: 'once',
    message_content: '',
    meeting_url: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [schedulesData, roomsData] = await Promise.all([
        ChatRoomSchedule.list('-created_date'),
        ChatRoom.list()
      ]);

      setSchedules(schedulesData);
      setChatRooms(roomsData);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast.error('Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!formData.chat_room_id || !formData.scheduled_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const scheduleData = {
        ...formData,
        created_by: adminUser?.id,
        created_by_name: adminUser?.display_name,
        next_execution: formData.scheduled_time,
        is_active: true
      };

      if (editingSchedule) {
        await ChatRoomSchedule.update(editingSchedule.id, scheduleData);
        toast.success('Schedule updated successfully');
      } else {
        await ChatRoomSchedule.create(scheduleData);
        toast.success('Schedule created successfully');
      }

      loadData();
      setShowCreateModal(false);
      setEditingSchedule(null);
      resetForm();
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error('Failed to create schedule');
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    const scheduledTime = schedule.scheduled_time || schedule.next_execution;
    setFormData({
      chat_room_id: schedule.chat_room_id,
      schedule_type: schedule.schedule_type,
      action: schedule.action,
      scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString().slice(0, 16) : '',
      recurrence: schedule.recurrence || 'once',
      message_content: schedule.message_content || '',
      meeting_url: schedule.meeting_url || ''
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      await ChatRoomSchedule.delete(scheduleId);
      toast.success('Schedule deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const handleToggleActive = async (schedule) => {
    try {
      await ChatRoomSchedule.update(schedule.id, {
        is_active: !schedule.is_active
      });
      toast.success(`Schedule ${!schedule.is_active ? 'activated' : 'deactivated'}`);
      loadData();
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast.error('Failed to toggle schedule');
    }
  };

  const resetForm = () => {
    setFormData({
      chat_room_id: '',
      schedule_type: 'announcement',
      action: 'send_message',
      scheduled_time: '',
      recurrence: 'once',
      message_content: '',
      meeting_url: ''
    });
  };

  const scheduleTypeConfig = {
    announcement: { icon: MessageSquare, color: 'text-blue-600', label: 'Announcement' },
    meeting: { icon: Video, color: 'text-purple-600', label: 'Meeting' },
    open_close: { icon: Clock, color: 'text-green-600', label: 'Open/Close' },
    read_only_toggle: { icon: Edit, color: 'text-orange-600', label: 'Read-Only Toggle' },
    cleanup: { icon: Trash2, color: 'text-red-600', label: 'Cleanup' }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading Automation...</p>
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
              <h3 className="text-lg font-semibold">Room Automation & Scheduling</h3>
              <p className="text-sm text-slate-600">Automate room actions and schedule recurring tasks</p>
            </div>
            <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Schedules</p>
                <p className="text-3xl font-bold">{schedules.length}</p>
              </div>
              <Calendar className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Active</p>
                <p className="text-3xl font-bold">{schedules.filter(s => s.is_active).length}</p>
              </div>
              <Play className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Recurring</p>
                <p className="text-3xl font-bold">{schedules.filter(s => s.recurrence !== 'once').length}</p>
              </div>
              <RefreshCw className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Announcements</p>
                <p className="text-3xl font-bold">{schedules.filter(s => s.schedule_type === 'announcement').length}</p>
              </div>
              <MessageSquare className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedules List */}
      <Card>
        <CardHeader>
          <CardTitle>All Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schedules.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No schedules created yet</p>
                <p className="text-slate-500 text-sm mt-1">Create your first automated schedule</p>
              </div>
            ) : (
              schedules.map(schedule => {
                const room = chatRooms.find(r => r.id === schedule.chat_room_id);
                const config = scheduleTypeConfig[schedule.schedule_type] || scheduleTypeConfig.announcement;
                const Icon = config.icon;

                return (
                  <div key={schedule.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center ${config.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900">{room?.name || 'Unknown Room'}</p>
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                        {schedule.recurrence !== 'once' && (
                          <Badge variant="outline" className="text-purple-600">
                            {schedule.recurrence}
                          </Badge>
                        )}
                        {schedule.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {schedule.action.replace(/_/g, ' ')} • 
                        Next: {new Date(schedule.next_execution || schedule.scheduled_time).toLocaleString()}
                      </p>
                      {schedule.message_content && (
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          Message: "{schedule.message_content}"
                        </p>
                      )}
                      {schedule.execution_count > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          Executed {schedule.execution_count} time(s)
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(schedule)}
                      >
                        {schedule.is_active ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(schedule)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(schedule.id)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
            <DialogDescription>
              Set up automated actions for your chat rooms
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
                <Label>Schedule Type</Label>
                <Select value={formData.schedule_type} onValueChange={(value) => setFormData({...formData, schedule_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="open_close">Open/Close Room</SelectItem>
                    <SelectItem value="read_only_toggle">Read-Only Toggle</SelectItem>
                    <SelectItem value="cleanup">Cleanup Messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Action</Label>
                <Select value={formData.action} onValueChange={(value) => setFormData({...formData, action: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_message">Send Message</SelectItem>
                    <SelectItem value="start_meeting">Start Meeting</SelectItem>
                    <SelectItem value="open">Open Room</SelectItem>
                    <SelectItem value="close">Close Room</SelectItem>
                    <SelectItem value="enable_read_only">Enable Read-Only</SelectItem>
                    <SelectItem value="disable_read_only">Disable Read-Only</SelectItem>
                    <SelectItem value="delete_old_messages">Delete Old Messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scheduled Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                />
              </div>

              <div>
                <Label>Recurrence</Label>
                <Select value={formData.recurrence} onValueChange={(value) => setFormData({...formData, recurrence: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(formData.schedule_type === 'announcement' || formData.action === 'send_message') && (
              <div>
                <Label>Message Content</Label>
                <Textarea
                  placeholder="Enter message to post..."
                  value={formData.message_content}
                  onChange={(e) => setFormData({...formData, message_content: e.target.value})}
                  rows={3}
                />
              </div>
            )}

            {(formData.schedule_type === 'meeting' || formData.action === 'start_meeting') && (
              <div>
                <Label>Meeting URL</Label>
                <Input
                  placeholder="https://meet.google.com/..."
                  value={formData.meeting_url}
                  onChange={(e) => setFormData({...formData, meeting_url: e.target.value})}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSchedule}>
                {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
