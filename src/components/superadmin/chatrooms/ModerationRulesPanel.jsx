import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Plus, Edit, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import chatAdminApi from './chatAdminApi';
import { apiError } from './chatRoomUtils';
import ConfirmActionDialog from './ConfirmActionDialog';
import PropTypes from 'prop-types';

const RULE_TYPES = {
  word_filter: { label: 'Blocked words', help: 'Messages containing any of these words or phrases (whole words, any case).' },
  link_filter: { label: 'Link filter', help: 'Messages with links to any site not on the allowed list.' },
  caps_lock: { label: 'All caps', help: 'Messages of 10+ letters where the share of capitals is above the limit.' },
  mention_limit: { label: 'Mention limit', help: 'Messages that @mention more people than allowed.' },
  rate_limit: { label: 'Rate limit (slow mode)', help: 'Members posting more than N messages within the window.' },
};
const ACTIONS = { block: 'Block the message', mute: 'Block and mute the sender in that room' };

const blank = {
  name: '', rule_type: 'word_filter', action: 'block', chat_room_id: 'global',
  words: '', allowed_domains: '', max_caps_percentage: 70, max_mentions: 5, max_messages: 5, window_seconds: 60,
};

/** Builds the API payload's `conditions` for the chosen rule type. */
function ruleConditions(form) {
  switch (form.rule_type) {
    case 'word_filter': return { words: form.words };
    case 'link_filter': return { allowed_domains: form.allowed_domains };
    case 'caps_lock': return { max_caps_percentage: Number(form.max_caps_percentage) };
    case 'mention_limit': return { max_mentions: Number(form.max_mentions) };
    case 'rate_limit': return { max_messages: Number(form.max_messages), window_seconds: Number(form.window_seconds) };
    default: return {};
  }
}

const describe = (rule) => {
  const c = rule.conditions || {};
  switch (rule.rule_type) {
    case 'word_filter': return `${(c.words || []).length} word(s): ${(c.words || []).slice(0, 6).join(', ')}${(c.words || []).length > 6 ? '…' : ''}`;
    case 'link_filter': return c.allowed_domains?.length ? `Allowed: ${c.allowed_domains.join(', ')}` : 'No links allowed';
    case 'caps_lock': return `Over ${c.max_caps_percentage}% capitals`;
    case 'mention_limit': return `More than ${c.max_mentions} mentions`;
    case 'rate_limit': return `More than ${c.max_messages} messages in ${c.window_seconds}s`;
    default: return '';
  }
};

/**
 * Moderation rules checked on every chat post (REST and live). Staff and room
 * moderators are exempt. Rules can be global or for one room.
 */
export default function ModerationRulesPanel({ rooms }) {
  const [rules, setRules] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRules(await chatAdminApi.rules());
    } catch (e) {
      setError(apiError(e, 'Could not load moderation rules'));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(blank); setEditing('new'); };
  const openEdit = (r) => {
    const c = r.conditions || {};
    setForm({
      ...blank,
      name: r.name || '', rule_type: r.rule_type, action: r.action || 'block', chat_room_id: r.chat_room_id || 'global',
      words: (c.words || []).join(', '), allowed_domains: (c.allowed_domains || []).join(', '),
      max_caps_percentage: c.max_caps_percentage ?? 70, max_mentions: c.max_mentions ?? 5,
      max_messages: c.max_messages ?? 5, window_seconds: c.window_seconds ?? 60,
    });
    setEditing(r);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Give the rule a name'); return; }
    if (form.rule_type === 'word_filter' && !form.words.trim()) { toast.error('Add at least one word'); return; }
    const payload = {
      name: form.name.trim(), rule_type: form.rule_type, action: form.action,
      chat_room_id: form.chat_room_id === 'global' ? null : form.chat_room_id, conditions: ruleConditions(form),
    };
    setSaving(true);
    try {
      if (editing === 'new') await chatAdminApi.createRule(payload);
      else await chatAdminApi.updateRule(editing.id, payload);
      toast.success(editing === 'new' ? 'Rule created and active' : 'Rule updated');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(apiError(err, 'Failed to save the rule'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rule) => {
    try {
      await chatAdminApi.updateRule(rule.id, { is_active: !rule.is_active });
      toast.success(rule.is_active ? 'Rule turned off' : 'Rule turned on');
      await load();
    } catch (e) {
      toast.error(apiError(e, 'Failed to update the rule'));
    }
  };

  const remove = async () => {
    try {
      await chatAdminApi.deleteRule(deleting.id);
      toast.success('Rule deleted');
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(apiError(e, 'Failed to delete the rule'));
    }
  };

  const roomName = (id) => (id ? rooms.find((r) => r.id === id)?.name || 'Deleted room' : 'All rooms');
  const num = (key, label, min, max) => (
    <div>
      <Label htmlFor={`rule-${key}`}>{label}</Label>
      <Input id={`rule-${key}`} type="number" min={min} max={max} className="mt-1" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-4 flex-1 min-w-[18rem]">
          {[
            ['Active rules', rules ? rules.filter((r) => r.is_active).length : '—'],
            ['Global', rules ? rules.filter((r) => !r.chat_room_id).length : '—'],
            ['Room-specific', rules ? rules.filter((r) => r.chat_room_id).length : '—'],
          ].map(([label, value]) => (
            <Card key={label}><CardContent className="p-4"><p className="text-2xl font-bold">{value}</p><p className="text-sm text-subtle">{label}</p></CardContent></Card>
          ))}
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" aria-hidden="true" />New rule</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" aria-hidden="true" />Moderation rules</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Checked on every message before it is posted. Staff and the room&apos;s own moderators are exempt.</p>
          {error && <p className="text-sm text-sell-muted-foreground flex items-center gap-2" role="alert"><AlertTriangle className="w-4 h-4" aria-hidden="true" />{error}<Button size="sm" variant="outline" onClick={load}>Retry</Button></p>}
          {!rules && !error && <p className="text-sm text-subtle" role="status"><Loader2 className="w-4 h-4 inline animate-spin mr-1" aria-hidden="true" />Loading…</p>}
          {rules && rules.length === 0 && <p className="text-sm text-subtle text-center py-8">No rules yet.</p>}
          {rules && rules.length > 0 && (
            <ul className="divide-y">
              {rules.map((r) => (
                <li key={r.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      <Badge variant="outline">{RULE_TYPES[r.rule_type]?.label || r.rule_type}</Badge>
                      <Badge variant="outline">{roomName(r.chat_room_id)}</Badge>
                      <Badge className={r.action === 'mute' ? 'bg-sell-muted text-sell-muted-foreground' : 'bg-hold-muted text-hold-muted-foreground'}>{r.action === 'mute' ? 'Block + mute' : 'Block'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 break-words">{describe(r)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch aria-label={r.is_active ? `Turn off ${r.name}` : `Turn on ${r.name}`} checked={Boolean(r.is_active)} onCheckedChange={() => toggle(r)} />
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)} aria-label={`Edit ${r.name}`}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(r)} className="text-sell-muted-foreground" aria-label={`Delete ${r.name}`}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => { if (!o && !saving) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={save} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editing === 'new' ? 'New moderation rule' : 'Edit moderation rule'}</DialogTitle>
              <DialogDescription>{RULE_TYPES[form.rule_type]?.help}</DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="rule-name">Name</Label>
              <Input id="rule-name" className="mt-1" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rule-type">Rule type</Label>
                <Select value={form.rule_type} onValueChange={(v) => setForm({ ...form, rule_type: v })}>
                  <SelectTrigger id="rule-type" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(RULE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rule-room">Applies to</Label>
                <Select value={form.chat_room_id} onValueChange={(v) => setForm({ ...form, chat_room_id: v })}>
                  <SelectTrigger id="rule-room" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">All rooms</SelectItem>
                    {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.rule_type === 'word_filter' && (
              <div>
                <Label htmlFor="rule-words">Words or phrases (comma or new line separated)</Label>
                <Textarea id="rule-words" className="mt-1 h-24" value={form.words} onChange={(e) => setForm({ ...form, words: e.target.value })} />
              </div>
            )}
            {form.rule_type === 'link_filter' && (
              <div>
                <Label htmlFor="rule-domains">Allowed sites (leave empty to block all links)</Label>
                <Input id="rule-domains" className="mt-1" placeholder="nseindia.com, bseindia.com" value={form.allowed_domains} onChange={(e) => setForm({ ...form, allowed_domains: e.target.value })} />
              </div>
            )}
            {form.rule_type === 'caps_lock' && num('max_caps_percentage', 'Maximum capitals (%)', 50, 100)}
            {form.rule_type === 'mention_limit' && num('max_mentions', 'Maximum mentions per message', 1, 50)}
            {form.rule_type === 'rate_limit' && (
              <div className="grid grid-cols-2 gap-3">
                {num('max_messages', 'Messages allowed', 1, 100)}
                {num('window_seconds', 'Per (seconds)', 5, 3600)}
              </div>
            )}

            <div>
              <Label htmlFor="rule-action">When it matches</Label>
              <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v })}>
                <SelectTrigger id="rule-action" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ACTIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}Save rule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        destructive
        title={`Delete "${deleting?.name}"?`}
        description="Messages will no longer be checked against it. Mutes it already applied stay until lifted."
        confirmLabel="Delete rule"
      />
    </div>
  );
}

ModerationRulesPanel.propTypes = {
  rooms: PropTypes.array.isRequired,
};
