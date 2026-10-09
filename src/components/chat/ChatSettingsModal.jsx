import React, { useCallback } from 'react';
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
import { AlertCircle, ArrowDown, Bell, Eye, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import useChatRoomSettings from '@/components/hooks/useChatRoomSettings';

export default function ChatSettingsModal({ open, onClose, roomId }) {
  const { settings, updateSetting, resetSettings, isLoading, isSaving, error } =
    useChatRoomSettings(roomId);

  /**
   * Desktop notifications need the browser's permission, not just a flag.
   * Turning the switch on asks for it and refuses the change if denied, so the
   * control never claims a capability the page does not have.
   */
  const handleDesktopToggle = useCallback(async (checked) => {
    if (!checked) {
      const r = await updateSetting('desktopNotifications', false);
      if (r.ok) toast.success('Desktop notifications disabled');
      return;
    }

    if (typeof Notification === 'undefined') {
      toast.error('This browser does not support desktop notifications.');
      return;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch {
        permission = 'denied';
      }
    }

    if (permission !== 'granted') {
      toast.error(
        permission === 'denied'
          ? 'Desktop notifications are blocked in your browser settings.'
          : 'Permission for desktop notifications was not granted.'
      );
      return;
    }

    const r = await updateSetting('desktopNotifications', true);
    if (r.ok) toast.success('Desktop notifications enabled');
    else toast.error(r.error);
  }, [updateSetting]);

  /** Every other toggle: optimistic, then confirm or surface the failure. */
  const handleToggle = useCallback(async (key, checked, label) => {
    const r = await updateSetting(key, checked);
    if (r.ok) toast.success(`${label} ${checked ? 'enabled' : 'disabled'}`);
    else toast.error(r.error || `Could not save ${label.toLowerCase()}`);
  }, [updateSetting]);

  const handleResetSettings = useCallback(async () => {
    const r = await resetSettings();
    if (r.ok) toast.success('Settings reset to default');
    else toast.error(r.error || 'Could not reset settings');
  }, [resetSettings]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat Room Settings
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading your saved preferences…
          </p>
        )}
        {isSaving && !isLoading && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving…
          </p>
        )}
        {error && (
          <p className="flex items-start gap-2 rounded-md bg-hold-muted px-3 py-2 text-xs text-hold-muted-foreground" role="alert">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="space-y-6 py-4">
          {/* Notification Settings */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4" />
              Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications" className="text-sm font-medium">
                    Enable Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive alerts for new messages
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(checked) => handleToggle('notificationsEnabled', checked, 'Notifications')}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound" className="text-sm font-medium">
                    Sound Effects
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Play sound for new messages
                  </p>
                </div>
                <Switch
                  id="sound"
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => handleToggle('soundEnabled', checked, 'Sound effects')}
                  disabled={isSaving || !settings.notificationsEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="desktop" className="text-sm font-medium">
                    Desktop Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show system notifications
                  </p>
                </div>
                <Switch
                  id="desktop"
                  checked={settings.desktopNotifications}
                  onCheckedChange={handleDesktopToggle}
                  disabled={isSaving || !settings.notificationsEnabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Display Settings */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4" />
              Display
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="typing" className="text-sm font-medium">
                    Typing Indicators
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show when others are typing
                  </p>
                </div>
                <Switch
                  id="typing"
                  checked={settings.showTypingIndicator}
                  onCheckedChange={(checked) => handleToggle('showTypingIndicator', checked, 'Typing indicator')}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="timestamps" className="text-sm font-medium">
                    Message Timestamps
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show time for each message
                  </p>
                </div>
                <Switch
                  id="timestamps"
                  checked={settings.showTimestamps}
                  onCheckedChange={(checked) => handleToggle('showTimestamps', checked, 'Timestamps')}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compact" className="text-sm font-medium">
                    Compact Mode
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Reduce spacing between messages
                  </p>
                </div>
                <Switch
                  id="compact"
                  checked={settings.compactMode}
                  onCheckedChange={(checked) => handleToggle('compactMode', checked, 'Compact mode')}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Behavior Settings */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <ArrowDown className="w-4 h-4" />
              Behavior
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoscroll" className="text-sm font-medium">
                    Auto-Scroll
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically scroll to new messages
                  </p>
                </div>
                <Switch
                  id="autoscroll"
                  checked={settings.autoScroll}
                  onCheckedChange={(checked) => handleToggle('autoScroll', checked, 'Auto-scroll')}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enter" className="text-sm font-medium">
                    Enter to Send
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Press Enter to send (Shift+Enter for new line)
                  </p>
                </div>
                <Switch
                  id="enter"
                  checked={settings.enterToSend}
                  onCheckedChange={(checked) => handleToggle('enterToSend', checked, 'Enter to send')}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Info Section */}
          <div className="bg-premium-muted rounded-lg p-4 border border-protocall-premium-light">
            <h4 className="text-sm font-semibold text-primary mb-2">💡 Pro Tip</h4>
            <p className="text-xs text-primary leading-relaxed">
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
              className="flex-1 bg-gradient-to-r from-primary to-protocall-grape text-white hover:from-primary hover:to-protocall-grape"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}