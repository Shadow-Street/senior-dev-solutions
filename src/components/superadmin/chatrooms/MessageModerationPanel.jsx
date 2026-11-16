import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Trash2, Pin, PinOff, Download, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import chatAdminApi from './chatAdminApi';
import { apiError, downloadText, formatDateTime, messagesToCsv } from './chatRoomUtils';
import ConfirmActionDialog from './ConfirmActionDialog';
import PropTypes from 'prop-types';

/** Messages of one room, newest first: search, pinned filter, pin, delete, export. */
export default function MessageModerationPanel({ room, onClose, onChanged }) {
  const open = Boolean(room);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState('loading'); // loading | ready | error | more
  const [error, setError] = useState(null);
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchPage = useCallback(async (cursor) => {
    const page = await chatAdminApi.messages(room.id, {
      search: search || undefined, pinned: pinnedOnly || undefined, before: cursor?.before, before_id: cursor?.before_id, limit: 50,
    });
    return page;
  }, [room?.id, search, pinnedOnly]);

  const reload = useCallback(async () => {
    if (!room) return;
    setState('loading');
    try {
      const page = await fetchPage();
      setMessages(page.messages);
      setHasMore(page.has_more);
      setState('ready');
    } catch (e) {
      setError(apiError(e, 'Could not load messages'));
      setState('error');
    }
  }, [room, fetchPage]);

  useEffect(() => { if (open) reload(); }, [open, reload]);
  useEffect(() => {
    const t = setTimeout(() => setSearch(term.trim()), 350);
    return () => clearTimeout(t);
  }, [term]);
  useEffect(() => { if (!open) { setTerm(''); setSearch(''); setPinnedOnly(false); } }, [open]);

  const loadMore = async () => {
    const last = messages[messages.length - 1];
    if (!last) return;
    setState('more');
    try {
      const page = await fetchPage({ before: last.created_at || last.created_date, before_id: last.id });
      setMessages((m) => [...m, ...page.messages]);
      setHasMore(page.has_more);
    } catch (e) {
      toast.error(apiError(e, 'Could not load more messages'));
    }
    setState('ready');
  };

  const togglePin = async (msg) => {
    setBusyId(msg.id);
    try {
      await chatAdminApi.pinMessage(msg.id, !msg.is_pinned);
      setMessages((list) => list.map((m) => (m.id === msg.id ? { ...m, is_pinned: !msg.is_pinned } : m)));
      toast.success(msg.is_pinned ? 'Message unpinned' : 'Message pinned');
    } catch (e) {
      toast.error(apiError(e, 'Failed to update the message'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await chatAdminApi.deleteMessage(deleting.id);
      setMessages((list) => list.filter((m) => m.id !== deleting.id));
      toast.success('Message deleted');
      setDeleting(null);
      onChanged?.();
    } catch (e) {
      toast.error(apiError(e, 'Failed to delete the message'));
    }
  };

  const exportShown = () => {
    if (!messages.length) { toast.error('Nothing to export'); return; }
    downloadText(`messages-${(room.name || 'room').replace(/[^\w-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`, messagesToCsv(room.name, messages));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Messages in “{room?.name}”</DialogTitle>
            <DialogDescription>Deleting or pinning updates the room live for everyone in it. Each action is audited.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden="true" />
              <Input aria-label="Search messages" placeholder="Search message text…" value={term} onChange={(e) => setTerm(e.target.value)} className="pl-10" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="pinned-only" checked={pinnedOnly} onCheckedChange={setPinnedOnly} />
              <Label htmlFor="pinned-only">Pinned only</Label>
            </div>
            <Button variant="outline" size="sm" onClick={exportShown}><Download className="w-4 h-4 mr-1" aria-hidden="true" />Export shown</Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mt-3">
            {state === 'loading' && <div className="py-12 text-center text-subtle" role="status"><Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" aria-hidden="true" />Loading messages…</div>}
            {state === 'error' && (
              <div className="py-12 text-center space-y-3" role="alert">
                <AlertTriangle className="w-6 h-6 mx-auto text-sell" aria-hidden="true" />
                <p className="text-sm">{error}</p>
                <Button size="sm" variant="outline" onClick={reload}>Retry</Button>
              </div>
            )}
            {(state === 'ready' || state === 'more') && messages.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">{search || pinnedOnly ? 'No messages match.' : 'No messages in this room yet.'}</p>
            )}
            {(state === 'ready' || state === 'more') && messages.map((msg) => (
              <div key={msg.id} className="bg-surface-2 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-semibold text-foreground">{msg.author?.name}</span>
                      {msg.is_pinned && <Badge className="bg-primary text-primary-foreground text-xs"><Pin className="w-3 h-3 mr-1" aria-hidden="true" />Pinned</Badge>}
                      {msg.message_type && msg.message_type !== 'text' && <Badge variant="outline" className="text-xs">{msg.message_type.replace('_', ' ')}</Badge>}
                      <span className="text-xs text-muted-foreground">{formatDateTime(msg.created_at || msg.created_date)}</span>
                      {msg.is_edited && <span className="text-xs text-muted-foreground">(edited)</span>}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" disabled={busyId === msg.id} onClick={() => togglePin(msg)} aria-label={msg.is_pinned ? 'Unpin message' : 'Pin message'} title={msg.is_pinned ? 'Unpin' : 'Pin'}>
                      {msg.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(msg)} className="text-sell-muted-foreground" aria-label="Delete message" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {hasMore && (state === 'ready' || state === 'more') && (
              <div className="text-center py-2">
                <Button variant="outline" size="sm" onClick={loadMore} disabled={state === 'more'}>
                  {state === 'more' && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}Load older messages
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        destructive
        title="Delete this message?"
        description="It disappears for everyone in the room right away. This cannot be undone."
        confirmLabel="Delete message"
      />
    </>
  );
}

MessageModerationPanel.propTypes = {
  room: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onChanged: PropTypes.func,
};
