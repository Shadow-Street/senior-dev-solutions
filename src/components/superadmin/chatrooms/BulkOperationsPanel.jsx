
import React, { useState } from 'react';
import { ChatRoom, Message, ChatRoomParticipant } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Upload,
  Settings,
  Users,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  FileText,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { logAuditAction, AuditActions } from '@/components/utils/auditLogger';

export default function BulkOperationsPanel({ chatRooms, onRefresh, adminUser }) {
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [bulkSettings, setBulkSettings] = useState({
    slow_mode_seconds: '',
    is_read_only: '',
    max_participants: '',
    is_premium: '',
    required_plan: ''
  });
  const [operationResults, setOperationResults] = useState([]);

  // Bulk Room Creation from CSV
  const handleBulkCreateFromCSV = async () => {
    if (!csvData.trim()) {
      toast.error('Please paste CSV data');
      return;
    }

    setIsProcessing(true);
    const results = [];

    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const roomData = {};
        
        headers.forEach((header, index) => {
          if (values[index]) {
            // Convert boolean strings
            if (values[index].toLowerCase() === 'true') roomData[header] = true;
            else if (values[index].toLowerCase() === 'false') roomData[header] = false;
            // Convert numbers
            else if (!isNaN(values[index]) && values[index] !== '') roomData[header] = Number(values[index]);
            else roomData[header] = values[index];
          }
        });

        try {
          const newRoom = await ChatRoom.create(roomData);
          results.push({ success: true, room: roomData.name, message: 'Created successfully' });
          
          if (adminUser) {
            await logAuditAction(
              adminUser,
              AuditActions.CHATROOM_CREATED,
              'ChatRoom',
              newRoom.id,
              `Bulk created room "${roomData.name}"`
            );
          }
        } catch (error) {
          results.push({ success: false, room: roomData.name, message: error.message });
        }
      }

      setOperationResults(results);
      const successCount = results.filter(r => r.success).length;
      toast.success(`Created ${successCount} out of ${results.length} rooms`);
      onRefresh();
      setCsvData('');
    } catch (error) {
      console.error('Error bulk creating rooms:', error);
      toast.error('Failed to parse CSV data');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Room Creation from Template
  const handleCreateFromTemplate = async (template) => {
    setIsProcessing(true);
    const results = [];

    try {
      const templates = {
        'stock-rooms': [
          { name: 'RELIANCE Discussion', room_type: 'stock_specific', stock_symbol: 'RELIANCE' },
          { name: 'TCS Discussion', room_type: 'stock_specific', stock_symbol: 'TCS' },
          { name: 'INFY Discussion', room_type: 'stock_specific', stock_symbol: 'INFY' },
          { name: 'HDFCBANK Discussion', room_type: 'stock_specific', stock_symbol: 'HDFCBANK' },
          { name: 'ICICIBANK Discussion', room_type: 'stock_specific', stock_symbol: 'ICICIBANK' }
        ],
        'sector-rooms': [
          { name: 'Banking Sector', room_type: 'sector', description: 'Banking stocks discussion' },
          { name: 'IT Sector', room_type: 'sector', description: 'IT stocks discussion' },
          { name: 'Pharma Sector', room_type: 'sector', description: 'Pharma stocks discussion' },
          { name: 'Auto Sector', room_type: 'sector', description: 'Auto stocks discussion' }
        ],
        'premium-rooms': [
          { name: 'Premium Trading Signals', room_type: 'premium_admin', is_premium: true, required_plan: 'premium', admin_only_post: true },
          { name: 'VIP Insider Tips', room_type: 'premium_admin', is_premium: true, required_plan: 'vip', admin_only_post: true }
        ]
      };

      const roomsToCreate = templates[template] || [];

      for (const roomData of roomsToCreate) {
        try {
          const newRoom = await ChatRoom.create(roomData);
          results.push({ success: true, room: roomData.name, message: 'Created successfully' });
          
          if (adminUser) {
            await logAuditAction(
              adminUser,
              AuditActions.CHATROOM_CREATED,
              'ChatRoom',
              newRoom.id,
              `Bulk created room "${roomData.name}" from template "${template}"`
            );
          }
        } catch (error) {
          results.push({ success: false, room: roomData.name, message: error.message });
        }
      }

      setOperationResults(results);
      const successCount = results.filter(r => r.success).length;
      toast.success(`Created ${successCount} out of ${results.length} rooms`);
      onRefresh();
    } catch (error) {
      console.error('Error creating from template:', error);
      toast.error('Failed to create rooms from template');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Settings Update
  const handleBulkUpdateSettings = async () => {
    if (selectedRooms.length === 0) {
      toast.error('Please select rooms to update');
      return;
    }

    // Build update object with only changed settings
    const updateData = {};
    if (bulkSettings.slow_mode_seconds !== '') updateData.slow_mode_seconds = Number(bulkSettings.slow_mode_seconds);
    if (bulkSettings.is_read_only !== '') updateData.is_read_only = bulkSettings.is_read_only === 'true';
    if (bulkSettings.max_participants !== '') updateData.max_participants = Number(bulkSettings.max_participants);
    if (bulkSettings.is_premium !== '') updateData.is_premium = bulkSettings.is_premium === 'true';
    if (bulkSettings.required_plan !== '') updateData.required_plan = bulkSettings.required_plan;

    if (Object.keys(updateData).length === 0) {
      toast.error('Please specify at least one setting to update');
      return;
    }

    setIsProcessing(true);
    const results = [];

    try {
      for (const roomId of selectedRooms) {
        const room = chatRooms.find(r => r.id === roomId);
        try {
          await ChatRoom.update(roomId, updateData);
          results.push({ success: true, room: room?.name || roomId, message: 'Updated successfully' });
          
          if (adminUser) {
            await logAuditAction(
              adminUser,
              AuditActions.CHATROOM_UPDATED,
              'ChatRoom',
              roomId,
              `Bulk updated settings for room "${room?.name}": ${JSON.stringify(updateData)}`
            );
          }
        } catch (error) {
          results.push({ success: false, room: room?.name || roomId, message: error.message });
        }
      }

      setOperationResults(results);
      const successCount = results.filter(r => r.success).length;
      toast.success(`Updated ${successCount} out of ${results.length} rooms`);
      onRefresh();
      setSelectedRooms([]);
      setBulkSettings({
        slow_mode_seconds: '',
        is_read_only: '',
        max_participants: '',
        is_premium: '',
        required_plan: ''
      });
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('Failed to update rooms');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Archive (Delete)
  const handleBulkArchive = async () => {
    if (selectedRooms.length === 0) {
      toast.error('Please select rooms to archive');
      return;
    }

    if (!window.confirm(`Are you sure you want to archive ${selectedRooms.length} room(s)? This will delete them permanently.`)) {
      return;
    }

    setIsProcessing(true);
    const results = [];

    try {
      for (const roomId of selectedRooms) {
        const room = chatRooms.find(r => r.id === roomId);
        try {
          await ChatRoom.delete(roomId);
          results.push({ success: true, room: room?.name || roomId, message: 'Archived successfully' });
          
          if (adminUser) {
            await logAuditAction(
              adminUser,
              AuditActions.CHATROOM_DELETED,
              'ChatRoom',
              roomId,
              `Bulk archived room "${room?.name}"`
            );
          }
        } catch (error) {
          results.push({ success: false, room: room?.name || roomId, message: error.message });
        }
      }

      setOperationResults(results);
      const successCount = results.filter(r => r.success).length;
      toast.success(`Archived ${successCount} out of ${results.length} rooms`);
      onRefresh();
      setSelectedRooms([]);
    } catch (error) {
      console.error('Error bulk archiving:', error);
      toast.error('Failed to archive rooms');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Export Messages
  const handleBulkExportMessages = async () => {
    if (selectedRooms.length === 0) {
      toast.error('Please select rooms to export messages from');
      return;
    }

    setIsProcessing(true);

    try {
      const allMessages = [];

      for (const roomId of selectedRooms) {
        const room = chatRooms.find(r => r.id === roomId);
        const messages = await Message.filter({ chat_room_id: roomId }).catch(() => []);
        
        messages.forEach(msg => {
          allMessages.push({
            room_name: room?.name || 'Unknown',
            room_id: roomId,
            message_id: msg.id,
            user_id: msg.user_id,
            content: msg.content,
            message_type: msg.message_type,
            created_date: msg.created_date,
            is_bot: msg.is_bot || false
          });
        });
      }

      if (allMessages.length === 0) {
        toast.warning('No messages found in selected rooms');
        setIsProcessing(false);
        return;
      }

      // Export as CSV
      const headers = Object.keys(allMessages[0]);
      const csvString = [
        headers.join(','),
        ...allMessages.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk-messages-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${allMessages.length} messages from ${selectedRooms.length} rooms`);
      
      if (adminUser) {
        await logAuditAction(
          adminUser,
          'BULK_EXPORT',
          'Message',
          null,
          `Bulk exported ${allMessages.length} messages from ${selectedRooms.length} rooms`
        );
      }
    } catch (error) {
      console.error('Error exporting messages:', error);
      toast.error('Failed to export messages');
    } finally {
      setIsProcessing(false);
    }
  };

  // Select/Deselect All
  const toggleSelectAll = () => {
    if (selectedRooms.length === chatRooms.length) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(chatRooms.map(r => r.id));
    }
  };

  const toggleRoomSelection = (roomId) => {
    if (selectedRooms.includes(roomId)) {
      setSelectedRooms(selectedRooms.filter(id => id !== roomId));
    } else {
      setSelectedRooms([...selectedRooms, roomId]);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-600" />
            Bulk Operations
            {selectedRooms.length > 0 && (
              <Badge className="bg-blue-100 text-blue-800">
                {selectedRooms.length} rooms selected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid grid-cols-4 bg-transparent rounded-lg p-1 gap-2">
          <TabsTrigger value="create" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <Upload className="w-4 h-4 mr-2" />
            Create Rooms
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <Settings className="w-4 h-4 mr-2" />
            Update Settings
          </TabsTrigger>
          <TabsTrigger value="export" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </TabsTrigger>
          <TabsTrigger value="archive" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <Trash2 className="w-4 h-4 mr-2" />
            Archive Rooms
          </TabsTrigger>
        </TabsList>

        {/* Create Rooms Tab */}
        <TabsContent value="create">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CSV Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create from CSV</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>CSV Data</Label>
                  <Textarea
                    placeholder="name,room_type,stock_symbol,is_premium,required_plan
RELIANCE Chat,stock_specific,RELIANCE,false,
TCS Chat,stock_specific,TCS,false,
Premium Signals,premium_admin,,true,premium"
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    rows={8}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Paste CSV with headers. Required: name, room_type
                  </p>
                </div>
                <Button
                  onClick={handleBulkCreateFromCSV}
                  disabled={isProcessing || !csvData.trim()}
                  className="w-full"
                >
                  {isProcessing ? 'Creating...' : 'Create Rooms from CSV'}
                </Button>
              </CardContent>
            </Card>

            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create from Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={() => handleCreateFromTemplate('stock-rooms')}
                    disabled={isProcessing}
                  >
                    <div className="text-left">
                      <p className="font-medium">Top 5 Stock Rooms</p>
                      <p className="text-xs text-slate-500">RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={() => handleCreateFromTemplate('sector-rooms')}
                    disabled={isProcessing}
                  >
                    <div className="text-left">
                      <p className="font-medium">Sector Discussion Rooms</p>
                      <p className="text-xs text-slate-500">Banking, IT, Pharma, Auto</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={() => handleCreateFromTemplate('premium-rooms')}
                    disabled={isProcessing}
                  >
                    <div className="text-left">
                      <p className="font-medium">Premium Rooms</p>
                      <p className="text-xs text-slate-500">Premium Trading Signals, VIP Insider Tips</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Update Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bulk Update Room Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Room Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Select Rooms</Label>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedRooms.length === chatRooms.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="border rounded-lg max-h-64 overflow-y-auto p-3 space-y-2">
                  {chatRooms.map(room => (
                    <div
                      key={room.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedRooms.includes(room.id)
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                      onClick={() => toggleRoomSelection(room.id)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRooms.includes(room.id)}
                          onChange={() => {}}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{room.name}</p>
                          <p className="text-xs text-slate-500">{room.room_type}</p>
                        </div>
                        <Badge variant="outline">{room.participant_count || 0} members</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings to Update */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Slow Mode (seconds)</Label>
                  <Input
                    type="number"
                    placeholder="Leave blank to skip"
                    value={bulkSettings.slow_mode_seconds}
                    onChange={(e) => setBulkSettings({...bulkSettings, slow_mode_seconds: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Max Participants</Label>
                  <Input
                    type="number"
                    placeholder="Leave blank to skip"
                    value={bulkSettings.max_participants}
                    onChange={(e) => setBulkSettings({...bulkSettings, max_participants: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Read-Only Mode</Label>
                  <Select value={bulkSettings.is_read_only} onValueChange={(value) => setBulkSettings({...bulkSettings, is_read_only: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Leave blank to skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Don't change</SelectItem>
                      <SelectItem value="true">Enable</SelectItem>
                      <SelectItem value="false">Disable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Premium Status</Label>
                  <Select value={bulkSettings.is_premium} onValueChange={(value) => setBulkSettings({...bulkSettings, is_premium: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Leave blank to skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Don't change</SelectItem>
                      <SelectItem value="true">Enable Premium</SelectItem>
                      <SelectItem value="false">Disable Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Required Plan</Label>
                  <Select value={bulkSettings.required_plan} onValueChange={(value) => setBulkSettings({...bulkSettings, required_plan: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Leave blank to skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Don't change</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleBulkUpdateSettings}
                disabled={isProcessing || selectedRooms.length === 0}
                className="w-full"
              >
                {isProcessing ? 'Updating...' : `Update ${selectedRooms.length} Room(s)`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Room Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Select Rooms to Export</Label>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedRooms.length === chatRooms.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="border rounded-lg max-h-96 overflow-y-auto p-3 space-y-2">
                  {chatRooms.map(room => (
                    <div
                      key={room.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedRooms.includes(room.id)
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                      onClick={() => toggleRoomSelection(room.id)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRooms.includes(room.id)}
                          onChange={() => {}}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{room.name}</p>
                          <p className="text-xs text-slate-500">{room.room_type}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleBulkExportMessages}
                disabled={isProcessing || selectedRooms.length === 0}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {isProcessing ? 'Exporting...' : `Export Messages from ${selectedRooms.length} Room(s)`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-600">Archive (Delete) Rooms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Warning: Permanent Deletion</p>
                    <p className="text-sm text-red-700 mt-1">
                      This action will permanently delete the selected rooms and cannot be undone.
                      All messages and participants will be removed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Room Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Select Rooms to Archive</Label>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedRooms.length === chatRooms.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="border rounded-lg max-h-96 overflow-y-auto p-3 space-y-2">
                  {chatRooms.map(room => (
                    <div
                      key={room.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedRooms.includes(room.id)
                          ? 'bg-red-100 border-2 border-red-500'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                      onClick={() => toggleRoomSelection(room.id)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRooms.includes(room.id)}
                          onChange={() => {}}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{room.name}</p>
                          <p className="text-xs text-slate-500">{room.room_type} • {room.participant_count || 0} members</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleBulkArchive}
                disabled={isProcessing || selectedRooms.length === 0}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isProcessing ? 'Archiving...' : `Archive ${selectedRooms.length} Room(s)`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Operation Results */}
      {operationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Operation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {operationResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                      {result.room}
                    </p>
                    <p className={`text-xs ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOperationResults([])}
              className="mt-4"
            >
              Clear Results
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
