import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, Volume2, Eye, ArrowDown, MessageSquare, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';

export default function ChatSettingsModal({ open, onClose, roomId }) {
  const [settings, setSettings] = useState({
    // Notification Settings
    notificationsEnabled: true,
    soundEnabled: true,
    desktopNotifications: false,
    
    // Display Settings
    showTypingIndicator: true,
    showReadReceipts: true,
    compactMode: false,
    
    // Behavior Settings
    autoScroll: true,
    enterToSend: true,
    showTimestamps: true,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(`chat_settings_${roomId}`);
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Failed to load chat settings:', error);
      }
    }
  }, [roomId]);

  // Save settings to localStorage whenever they change
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(`chat_settings_${roomId}`, JSON.stringify(newSettings));
    
    // Show feedback for important settings
    if (key === 'notificationsEnabled') {
      toast.success(value ? 'Notifications enabled' : 'Notifications disabled');
    }
  };

  const handleResetSettings = () => {
    const defaultSettings = {
      notificationsEnabled: true,
      soundEnabled: true,
      desktopNotifications: false,
      showTypingIndicator: true,
      showReadReceipts: true,
      compactMode: false,
      autoScroll: true,
      enterToSend: true,
      showTimestamps: true,
    };
    setSettings(defaultSettings);
    localStorage.setItem(`chat_settings_${roomId}`, JSON.stringify(defaultSettings));
    toast.success('Settings reset to default');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat Room Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Notification Settings */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4" />
              Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications" className="text-sm font-medium">
                    Enable Notifications
                  </Label>
                  <p className="text-xs text-slate-500">
                    Receive alerts for new messages
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(checked) => updateSetting('notificationsEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound" className="text-sm font-medium">
                    Sound Effects
                  </Label>
                  <p className="text-xs text-slate-500">
                    Play sound for new messages
                  </p>
                </div>
                <Switch
                  id="sound"
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
                  disabled={!settings.notificationsEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="desktop" className="text-sm font-medium">
                    Desktop Notifications
                  </Label>
                  <p className="text-xs text-slate-500">
                    Show system notifications
                  </p>
                </div>
                <Switch
                  id="desktop"
                  checked={settings.desktopNotifications}
                  onCheckedChange={(checked) => updateSetting('desktopNotifications', checked)}
                  disabled={!settings.notificationsEnabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Display Settings */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4" />
              Display
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="typing" className="text-sm font-medium">
                    Typing Indicators
                  </Label>
                  <p className="text-xs text-slate-500">
                    Show when others are typing
                  </p>
                </div>
                <Switch
                  id="typing"
                  checked={settings.showTypingIndicator}
                  onCheckedChange={(checked) => updateSetting('showTypingIndicator', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="timestamps" className="text-sm font-medium">
                    Message Timestamps
                  </Label>
                  <p className="text-xs text-slate-500">
                    Show time for each message
                  </p>
                </div>
                <Switch
                  id="timestamps"
                  checked={settings.showTimestamps}
                  onCheckedChange={(checked) => updateSetting('showTimestamps', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compact" className="text-sm font-medium">
                    Compact Mode
                  </Label>
                  <p className="text-xs text-slate-500">
                    Reduce spacing between messages
                  </p>
                </div>
                <Switch
                  id="compact"
                  checked={settings.compactMode}
                  onCheckedChange={(checked) => updateSetting('compactMode', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Behavior Settings */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <ArrowDown className="w-4 h-4" />
              Behavior
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoscroll" className="text-sm font-medium">
                    Auto-Scroll
                  </Label>
                  <p className="text-xs text-slate-500">
                    Automatically scroll to new messages
                  </p>
                </div>
                <Switch
                  id="autoscroll"
                  checked={settings.autoScroll}
                  onCheckedChange={(checked) => updateSetting('autoScroll', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enter" className="text-sm font-medium">
                    Enter to Send
                  </Label>
                  <p className="text-xs text-slate-500">
                    Press Enter to send (Shift+Enter for new line)
                  </p>
                </div>
                <Switch
                  id="enter"
                  checked={settings.enterToSend}
                  onCheckedChange={(checked) => updateSetting('enterToSend', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Info Section */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Pro Tip</h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              These settings are saved per chat room and persist across sessions. You can customize each room independently.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleResetSettings}
              className="flex-1"
            >
              Reset to Default
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}