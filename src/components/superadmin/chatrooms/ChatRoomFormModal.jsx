import { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, X, MessageSquare, Vote, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import CreatePollModal from '../../polls/CreatePollModal';
import { Poll } from '@/api/entities';
import { PLANS, ROOM_TYPES, apiError, normalizePlan, validateRoomForm } from './chatRoomUtils';
import PropTypes from 'prop-types';

const PREMIUM_TYPES = ['premium', 'premium_admin'];

const blank = {
  name: '', description: '', room_type: 'general', stock_symbol: '',
  required_plan: 'free', is_public: true, admin_only_post: false,
};

const fromRoom = (room) => ({
  name: room.name || '',
  description: room.description || '',
  room_type: room.room_type || 'general',
  stock_symbol: room.stock_symbol || '',
  required_plan: normalizePlan(room.required_plan),
  is_public: room.is_public !== false,
  admin_only_post: room.admin_only_post === true,
});

/**
 * Create / edit a chat room. Validation mirrors the server (which re-checks
 * everything); `onSave` should throw on failure so the dialog stays open.
 */
export default function ChatRoomFormModal({ open, onClose, room = null, onSave, user = null }) {
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const nameTouched = useRef(false);

  useEffect(() => {
    if (!open) return;
    setForm(room ? fromRoom(room) : blank);
    setErrors({});
    nameTouched.current = Boolean(room);
  }, [room, open]);

  const set = (key, value) => setForm((f) => {
    const next = { ...f, [key]: value };
    // Stock rooms are named after their symbol unless the admin typed a name.
    if (!room && key === 'stock_symbol' && next.room_type === 'stock_specific' && !nameTouched.current) next.name = value;
    if (key === 'room_type' && PREMIUM_TYPES.includes(value) && next.required_plan === 'free') next.required_plan = 'premium';
    if (key === 'room_type' && ['admin', 'premium_admin'].includes(value) && !room) next.admin_only_post = true;
    return next;
  });

  const submit = async (e) => {
    e.preventDefault();
    const found = validateRoomForm(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        stock_symbol: form.stock_symbol.trim().toUpperCase(),
      });
    } catch {
      // onSave already reported it; keep the dialog open.
    } finally {
      setSaving(false);
    }
  };

  const createPoll = async (pollData) => {
    try {
      const poll = await Poll.create({ ...pollData, chat_room_id: room.id, creation_source: 'chatroom', is_active: true, created_by_admin: true, created_by_role: user?.app_role || 'admin' });
      toast.success(`Poll "${poll.title || pollData.title}" created`);
      setShowPoll(false);
    } catch (err) {
      toast.error(apiError(err, 'Failed to create poll'));
    }
  };

  const premiumType = PREMIUM_TYPES.includes(form.room_type);
  const fieldError = (key) => errors[key] && <p className="text-xs text-sell-muted-foreground mt-1" role="alert">{errors[key]}</p>;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
              {room ? 'Edit chat room' : 'Create chat room'}
            </DialogTitle>
            <DialogDescription>
              {room ? 'Changes apply immediately; people who lose access are removed from the live room.' : 'Create a new room for the community.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-6" noValidate>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-subtle">Basic information</h3>
                {room && <Badge variant="outline" className="text-xs">ID {String(room.id).slice(-8)}</Badge>}
              </div>

              <div>
                <Label htmlFor="room_type">Room type</Label>
                <Select value={form.room_type} onValueChange={(v) => set('room_type', v)}>
                  <SelectTrigger id="room_type" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="stock_symbol">
                  Stock symbol {form.room_type === 'stock_specific' && <span className="text-sell-muted-foreground">*</span>}
                </Label>
                <Input
                  id="stock_symbol" className="mt-1" maxLength={20} placeholder="e.g. RELIANCE, TCS"
                  value={form.stock_symbol} onChange={(e) => set('stock_symbol', e.target.value.toUpperCase())}
                  aria-invalid={Boolean(errors.stock_symbol)}
                />
                {fieldError('stock_symbol')}
              </div>

              <div>
                <Label htmlFor="name">Room name *</Label>
                <Input
                  id="name" className="mt-1" maxLength={100} placeholder="Room name"
                  value={form.name} onChange={(e) => { nameTouched.current = true; set('name', e.target.value); }}
                  aria-invalid={Boolean(errors.name)}
                />
                {fieldError('name')}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description" className="mt-1 h-20" maxLength={1000} placeholder="What is this room for?"
                  value={form.description} onChange={(e) => set('description', e.target.value)}
                />
                {fieldError('description')}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-subtle">Access</h3>

              <div>
                <Label htmlFor="required_plan">Plan required to join</Label>
                <Select value={form.required_plan} onValueChange={(v) => set('required_plan', v)}>
                  <SelectTrigger id="required_plan" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLANS.map((p) => (
                      <SelectItem key={p.value} value={p.value} disabled={premiumType && p.value === 'free'}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Premium rooms open to Premium and VIP plans (or a room subscription); VIP rooms need a VIP plan.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                <div className="flex-1 pr-4">
                  <Label htmlFor="is_public" className="font-medium">Public room</Label>
                  <p className="text-xs text-subtle mt-1">Off: invite only (invite links or an admin adds people).</p>
                </div>
                <Switch id="is_public" checked={form.is_public} onCheckedChange={(v) => set('is_public', v)} />
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                <div className="flex-1 pr-4">
                  <Label htmlFor="admin_only_post" className="font-medium">Only moderators can post</Label>
                  <p className="text-xs text-subtle mt-1">Members can read; room moderators and staff post.</p>
                </div>
                <Switch id="admin_only_post" checked={form.admin_only_post} onCheckedChange={(v) => set('admin_only_post', v)} />
              </div>
            </div>

            {room && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <h3 className="text-sm font-semibold text-subtle flex items-center gap-2">
                    <Vote className="w-4 h-4 text-primary" aria-hidden="true" /> Polls
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Create a poll in this room</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPoll(true)}>
                  <Vote className="w-4 h-4 mr-2" aria-hidden="true" /> Create poll
                </Button>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                <X className="w-4 h-4 mr-2" aria-hidden="true" /> Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4 mr-2" aria-hidden="true" />}
                {saving ? 'Saving...' : room ? 'Update room' : 'Create room'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {room && (
        <CreatePollModal open={showPoll} onClose={() => setShowPoll(false)} room={room} user={user} onCreatePoll={createPoll} />
      )}
    </>
  );
}

ChatRoomFormModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  room: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  user: PropTypes.object,
};
