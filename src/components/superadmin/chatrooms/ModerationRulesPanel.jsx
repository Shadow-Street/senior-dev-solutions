
import React, { useState, useEffect } from 'react';
import { ModerationRule, ChatRoom } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Shield,
  AlertTriangle,
  Ban,
  Clock,
  Link as LinkIcon,
  MessageSquare,
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Play,
  Pause
} from 'lucide-react';
import { toast } from 'sonner';

export default function ModerationRulesPanel() {
  const [rules, setRules] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    chat_room_id: '',
    rule_name: '',
    rule_type: 'word_filter',
    severity: 'medium',
    action: 'warn',
    banned_words: '',
    allowed_domains: '',
    max_caps_percentage: 70,
    rate_limit_messages: 5,
    rate_limit_window_seconds: 60,
    max_mentions: 3,
    mute_duration_minutes: 60,
    auto_escalate: false,
    escalation_threshold: 3
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rulesData, roomsData] = await Promise.all([
        ModerationRule.list('-created_date'),
        ChatRoom.list()
      ]);

      setRules(rulesData);
      setChatRooms(roomsData);
    } catch (error) {
      console.error('Error loading moderation rules:', error);
      toast.error('Failed to load moderation rules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!formData.rule_name) {
      toast.error('Please enter a rule name');
      return;
    }

    try {
      const ruleData = {
        ...formData,
        chat_room_id: formData.chat_room_id || null,
        banned_words: formData.banned_words ? formData.banned_words.split(',').map(w => w.trim()) : [],
        allowed_domains: formData.allowed_domains ? formData.allowed_domains.split(',').map(d => d.trim()) : [],
        is_active: true
      };

      if (editingRule) {
        await ModerationRule.update(editingRule.id, ruleData);
        toast.success('Rule updated successfully');
      } else {
        await ModerationRule.create(ruleData);
        toast.success('Rule created successfully');
      }

      loadData();
      setShowCreateModal(false);
      setEditingRule(null);
      resetForm();
    } catch (error) {
      console.error('Error creating rule:', error);
      toast.error('Failed to create rule');
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      chat_room_id: rule.chat_room_id || '',
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      severity: rule.severity,
      action: rule.action,
      banned_words: rule.banned_words?.join(', ') || '',
      allowed_domains: rule.allowed_domains?.join(', ') || '',
      max_caps_percentage: rule.max_caps_percentage || 70,
      rate_limit_messages: rule.rate_limit_messages || 5,
      rate_limit_window_seconds: rule.rate_limit_window_seconds || 60,
      max_mentions: rule.max_mentions || 3,
      mute_duration_minutes: rule.mute_duration_minutes || 60,
      auto_escalate: rule.auto_escalate || false,
      escalation_threshold: rule.escalation_threshold || 3
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      await ModerationRule.delete(ruleId);
      toast.success('Rule deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const handleToggleActive = async (rule) => {
    try {
      await ModerationRule.update(rule.id, {
        is_active: !rule.is_active
      });
      toast.success(`Rule ${!rule.is_active ? 'activated' : 'deactivated'}`);
      loadData();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Failed to toggle rule');
    }
  };

  const resetForm = () => {
    setFormData({
      chat_room_id: '',
      rule_name: '',
      rule_type: 'word_filter',
      severity: 'medium',
      action: 'warn',
      banned_words: '',
      allowed_domains: '',
      max_caps_percentage: 70,
      rate_limit_messages: 5,
      rate_limit_window_seconds: 60,
      max_mentions: 3,
      mute_duration_minutes: 60,
      auto_escalate: false,
      escalation_threshold: 3
    });
  };

  const ruleTypeConfig = {
    word_filter: { icon: MessageSquare, color: 'text-red-600', label: 'Word Filter' },
    spam_detection: { icon: AlertTriangle, color: 'text-orange-600', label: 'Spam Detection' },
    link_filter: { icon: LinkIcon, color: 'text-blue-600', label: 'Link Filter' },
    caps_lock: { icon: MessageSquare, color: 'text-yellow-600', label: 'Caps Lock' },
    rate_limit: { icon: Clock, color: 'text-purple-600', label: 'Rate Limit' },
    mention_limit: { icon: MessageSquare, color: 'text-cyan-600', label: 'Mention Limit' },
    file_restriction: { icon: FileText, color: 'text-green-600', label: 'File Restriction' }
  };

  const severityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  // Group rules by type
  const globalRules = rules.filter(r => !r.chat_room_id);
  const roomSpecificRules = rules.filter(r => r.chat_room_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading Moderation Rules...</p>
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
              <h3 className="text-lg font-semibold">Enhanced Moderation Rules</h3>
              <p className="text-sm text-slate-600">Create automated moderation rules for your chat rooms</p>
            </div>
            <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
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
                <p className="text-sm opacity-90">Total Rules</p>
                <p className="text-3xl font-bold">{rules.length}</p>
              </div>
              <Shield className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Active Rules</p>
                <p className="text-3xl font-bold">{rules.filter(r => r.is_active).length}</p>
              </div>
              <Play className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Global Rules</p>
                <p className="text-3xl font-bold">{globalRules.length}</p>
              </div>
              <Shield className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Violations</p>
                <p className="text-3xl font-bold">{rules.reduce((sum, r) => sum + (r.violation_count || 0), 0)}</p>
              </div>
              <AlertTriangle className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Tabs */}
      <Tabs defaultValue="global" className="space-y-6">
        <TabsList className="grid grid-cols-2 bg-transparent rounded-lg p-1 gap-2">
          <TabsTrigger value="global" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            Global Rules ({globalRules.length})
          </TabsTrigger>
          <TabsTrigger value="room" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            Room-Specific ({roomSpecificRules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <Card>
            <CardHeader>
              <CardTitle>Global Moderation Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {globalRules.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">No global rules yet</p>
                    <p className="text-slate-500 text-sm mt-1">Create rules that apply to all rooms</p>
                  </div>
                ) : (
                  globalRules.map(rule => {
                    const config = ruleTypeConfig[rule.rule_type] || ruleTypeConfig.word_filter;
                    const Icon = config.icon;

                    return (
                      <div key={rule.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center ${config.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-900">{rule.rule_name}</p>
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                            <Badge className={severityColors[rule.severity]}>
                              {rule.severity}
                            </Badge>
                            {rule.is_active ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            Action: {rule.action.replace(/_/g, ' ')} • 
                            Violations: {rule.violation_count || 0}
                          </p>
                          {rule.auto_escalate && (
                            <p className="text-xs text-purple-600 mt-1">
                              Auto-escalate after {rule.escalation_threshold} violations
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(rule)}
                          >
                            {rule.is_active ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(rule)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rule.id)}
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
        </TabsContent>

        <TabsContent value="room">
          <Card>
            <CardHeader>
              <CardTitle>Room-Specific Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roomSpecificRules.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">No room-specific rules yet</p>
                    <p className="text-slate-500 text-sm mt-1">Create rules for individual rooms</p>
                  </div>
                ) : (
                  roomSpecificRules.map(rule => {
                    const room = chatRooms.find(r => r.id === rule.chat_room_id);
                    const config = ruleTypeConfig[rule.rule_type] || ruleTypeConfig.word_filter;
                    const Icon = config.icon;

                    return (
                      <div key={rule.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center ${config.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-900">{rule.rule_name}</p>
                            <Badge variant="outline">{room?.name || 'Unknown Room'}</Badge>
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                            <Badge className={severityColors[rule.severity]}>
                              {rule.severity}
                            </Badge>
                            {rule.is_active ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            Action: {rule.action.replace(/_/g, ' ')} • 
                            Violations: {rule.violation_count || 0}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(rule)}
                          >
                            {rule.is_active ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(rule)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rule.id)}
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
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Moderation Rule'}</DialogTitle>
            <DialogDescription>
              Configure automated moderation for your chat rooms
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Rule Name</Label>
              <Input
                placeholder="e.g., No Spam Links"
                value={formData.rule_name}
                onChange={(e) => setFormData({...formData, rule_name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Chat Room (Optional)</Label>
                <Select value={formData.chat_room_id} onValueChange={(value) => setFormData({...formData, chat_room_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Global (all rooms)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Global (all rooms)</SelectItem>
                    {chatRooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Rule Type</Label>
                <Select value={formData.rule_type} onValueChange={(value) => setFormData({...formData, rule_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="word_filter">Word Filter</SelectItem>
                    <SelectItem value="spam_detection">Spam Detection</SelectItem>
                    <SelectItem value="link_filter">Link Filter</SelectItem>
                    <SelectItem value="caps_lock">Caps Lock</SelectItem>
                    <SelectItem value="rate_limit">Rate Limit</SelectItem>
                    <SelectItem value="mention_limit">Mention Limit</SelectItem>
                    <SelectItem value="file_restriction">File Restriction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Severity</Label>
                <Select value={formData.severity} onValueChange={(value) => setFormData({...formData, severity: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
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
                    <SelectItem value="warn">Warn User</SelectItem>
                    <SelectItem value="delete_message">Delete Message</SelectItem>
                    <SelectItem value="mute_user">Mute User</SelectItem>
                    <SelectItem value="ban_user">Ban User</SelectItem>
                    <SelectItem value="flag_for_review">Flag for Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rule-specific fields */}
            {formData.rule_type === 'word_filter' && (
              <div>
                <Label>Banned Words (comma-separated)</Label>
                <Input
                  placeholder="scam, spam, fraud"
                  value={formData.banned_words}
                  onChange={(e) => setFormData({...formData, banned_words: e.target.value})}
                />
              </div>
            )}

            {formData.rule_type === 'link_filter' && (
              <div>
                <Label>Allowed Domains (comma-separated, leave blank to block all)</Label>
                <Input
                  placeholder="google.com, youtube.com"
                  value={formData.allowed_domains}
                  onChange={(e) => setFormData({...formData, allowed_domains: e.target.value})}
                />
              </div>
            )}

            {formData.rule_type === 'caps_lock' && (
              <div>
                <Label>Max Caps Percentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.max_caps_percentage}
                  onChange={(e) => setFormData({...formData, max_caps_percentage: Number(e.target.value)})}
                />
              </div>
            )}

            {formData.rule_type === 'rate_limit' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Messages</Label>
                  <Input
                    type="number"
                    value={formData.rate_limit_messages}
                    onChange={(e) => setFormData({...formData, rate_limit_messages: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Time Window (seconds)</Label>
                  <Input
                    type="number"
                    value={formData.rate_limit_window_seconds}
                    onChange={(e) => setFormData({...formData, rate_limit_window_seconds: Number(e.target.value)})}
                  />
                </div>
              </div>
            )}

            {formData.rule_type === 'mention_limit' && (
              <div>
                <Label>Max Mentions per Message</Label>
                <Input
                  type="number"
                  value={formData.max_mentions}
                  onChange={(e) => setFormData({...formData, max_mentions: Number(e.target.value)})}
                />
              </div>
            )}

            {formData.action === 'mute_user' && (
              <div>
                <Label>Mute Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.mute_duration_minutes}
                  onChange={(e) => setFormData({...formData, mute_duration_minutes: Number(e.target.value)})}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto_escalate"
                  checked={formData.auto_escalate}
                  onChange={(e) => setFormData({...formData, auto_escalate: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="auto_escalate">Auto-escalate on repeat violations</Label>
              </div>

              {formData.auto_escalate && (
                <div>
                  <Label>Escalation Threshold</Label>
                  <Input
                    type="number"
                    value={formData.escalation_threshold}
                    onChange={(e) => setFormData({...formData, escalation_threshold: Number(e.target.value)})}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRule}>
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
