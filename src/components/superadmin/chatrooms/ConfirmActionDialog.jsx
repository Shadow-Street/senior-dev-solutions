import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Loader2 } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * Confirmation for chat-room admin actions. Optional `requireText` (the user
 * must type it exactly, e.g. a room name before deletion) and `reasonLabel`
 * (an optional free-text reason passed to onConfirm).
 */
export default function ConfirmActionDialog({
  open, onClose, onConfirm, title, description, confirmLabel = 'Confirm',
  destructive = false, requireText = null, reasonLabel = null,
}) {
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setTyped(''); setReason(''); setBusy(false); }
  }, [open]);

  const blocked = requireText !== null && typed.trim() !== String(requireText).trim();

  const submit = async (e) => {
    e.preventDefault();
    if (blocked || busy) return;
    setBusy(true);
    try {
      await onConfirm({ typed: typed.trim(), reason: reason.trim() });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {destructive && <AlertTriangle className="w-5 h-5 text-sell" aria-hidden="true" />}
              {title}
            </DialogTitle>
            {description && <DialogDescription className="pt-2">{description}</DialogDescription>}
          </DialogHeader>

          <div className="space-y-4 py-4">
            {reasonLabel && (
              <div className="space-y-1">
                <Label htmlFor="confirm-reason">{reasonLabel}</Label>
                <Textarea id="confirm-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} className="h-20" />
              </div>
            )}
            {requireText !== null && (
              <div className="space-y-1">
                <Label htmlFor="confirm-text">
                  Type <span className="font-mono font-semibold">{requireText}</span> to confirm
                </Label>
                <Input id="confirm-text" value={typed} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={blocked || busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

ConfirmActionDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.node,
  description: PropTypes.node,
  confirmLabel: PropTypes.string,
  destructive: PropTypes.bool,
  requireText: PropTypes.string,
  reasonLabel: PropTypes.string,
};
