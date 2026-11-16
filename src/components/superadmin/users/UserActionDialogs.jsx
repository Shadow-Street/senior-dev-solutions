import { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { adminUsersApi, adminErrorMessage } from './adminUsersApi';

/**
 * The row dialogs read their state from this context instead of props
 * (the codebase's no-propTypes style): { dialog: { type, user }, close,
 * onDone, access }. UserTable provides it and renders <UserActionDialogs />.
 */
export const UserDialogContext = createContext({ dialog: { type: null, user: null }, close: () => {}, onDone: () => {}, access: null });

function useDialog(types) {
  const { dialog, close, onDone, access } = useContext(UserDialogContext);
  return {
    user: dialog.user,
    mode: dialog.type,
    open: types.includes(dialog.type),
    onOpenChange: close,
    onDone,
    canEditEmail: Boolean(access?.is_super_admin),
  };
}

const nameOf = (user) => user?.display_name || user?.name || user?.email || 'this user';

/** Primary dialog button with a busy spinner (render helper, see above). */
function renderSubmit(busy, label, buttonProps = {}) {
  return (
    <Button {...buttonProps} disabled={busy || buttonProps.disabled}>
      {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {label}
    </Button>
  );
}

/** Wraps an API call with busy state, toasts and the after-success hook. */
function useAction(onDone) {
  const [busy, setBusy] = useState(false);
  const run = async (work, success, failure) => {
    setBusy(true);
    try {
      const result = await work();
      toast.success(success);
      onDone?.(result);
      return true;
    } catch (e) {
      toast.error(adminErrorMessage(e, failure));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

// ---------------------------------------------------------------------------

function EditUserDialog() {
  const { user, open, onOpenChange, onDone, canEditEmail } = useDialog(['edit']);
  const [form, setForm] = useState({ name: '', display_name: '', email: '' });
  const { busy, run } = useAction(onDone);

  useEffect(() => {
    if (open && user) setForm({ name: user.name || '', display_name: user.display_name || '', email: user.email || '' });
  }, [open, user]);

  const submit = async (e) => {
    e.preventDefault();
    const body = { name: form.name.trim(), display_name: form.display_name.trim() };
    if (canEditEmail) body.email = form.email.trim();
    if (!body.name || !body.display_name) {
      toast.error('Full name and display name are required.');
      return;
    }
    if (await run(() => adminUsersApi.editUser(user.id, body), 'User details saved', 'Could not save the user details')) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update the account details for {nameOf(user)}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Full name</Label>
              <Input id="edit-user-name" value={form.name} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-display">Display name</Label>
              <Input id="edit-user-display" value={form.display_name} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input id="edit-user-email" type="email" value={form.email} maxLength={150} disabled={!canEditEmail}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              {!canEditEmail && <p className="text-xs text-muted-foreground">Only a super admin can change an email address.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            {renderSubmit(busy, 'Save changes', { type: 'submit' })}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

const DEFAULT_SUB_ADMIN = '__sub_admin_default__';

function RoleDialog() {
  const { user, open, onOpenChange, onDone } = useDialog(['role']);
  const [options, setOptions] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [role, setRole] = useState('');
  const [customRole, setCustomRole] = useState(DEFAULT_SUB_ADMIN);
  const { busy, run } = useAction(onDone);

  useEffect(() => {
    if (!open || !user) return;
    setRole(user.effective_role || 'user');
    setCustomRole(user.custom_role?.id || DEFAULT_SUB_ADMIN);
    setLoadError(null);
    let live = true;
    adminUsersApi.assignableRoles()
      .then((o) => { if (live) setOptions(o); })
      .catch((e) => { if (live) setLoadError(adminErrorMessage(e, 'Could not load the role options')); });
    return () => { live = false; };
  }, [open, user]);

  const selected = options?.roles?.find((r) => r.key === role);
  const unchanged = role === user?.effective_role && (role !== 'sub_admin' || (user?.custom_role?.id || DEFAULT_SUB_ADMIN) === customRole);
  const showCustom = role === 'sub_admin' && options?.can_assign_custom && options.custom_roles.length > 0;

  const submit = async () => {
    const body = { role };
    if (role === 'sub_admin' && customRole !== DEFAULT_SUB_ADMIN) body.custom_role_id = customRole;
    if (await run(() => adminUsersApi.setRole(user.id, body), 'Role updated', 'Could not change the role')) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Assign, change or revoke the role of {nameOf(user)}. Choose <strong>User</strong> to revoke a role.
          </DialogDescription>
        </DialogHeader>
        {loadError ? (
          <p role="alert" className="text-sm text-sell-muted-foreground py-4">{loadError}</p>
        ) : !options ? (
          <p className="text-sm text-muted-foreground py-4">Loading role options…</p>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="assign-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="assign-role"><SelectValue placeholder="Choose a role" /></SelectTrigger>
                <SelectContent>
                  {options.roles.map((r) => (
                    <SelectItem key={r.key} value={r.key} disabled={!r.grantable && r.key !== user?.effective_role}>
                      {r.label}{!r.grantable ? ' (super admin only)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected && <p className="text-xs text-muted-foreground">{selected.description}</p>}
              {['advisor', 'portfolio_manager'].includes(role) && role !== user?.effective_role && (
                <p className="text-xs text-hold-muted-foreground">
                  This grants the role only. SEBI verification and the public profile still come from the application review.
                </p>
              )}
            </div>
            {showCustom && (
              <div className="space-y-2">
                <Label htmlFor="assign-custom-role">Admin access</Label>
                <Select value={customRole} onValueChange={setCustomRole}>
                  <SelectTrigger id="assign-custom-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT_SUB_ADMIN}>Sub Admin permissions (default)</SelectItem>
                    {options.custom_roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Which permissions this staff member gets, as set in Roles &amp; Permissions.</p>
              </div>
            )}
            {role === 'sub_admin' && !options.custom_roles_available && (
              <p className="text-xs text-muted-foreground">Custom roles become available once the pending database update is applied.</p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          {renderSubmit(busy, 'Save role', { disabled: !options || unchanged, onClick: submit })}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

const clampScore = (n) => Math.max(0, Math.min(100, Math.round(n)));

function TrustScoreDialog() {
  const { user, open, onOpenChange, onDone } = useDialog(['trust']);
  const current = typeof user?.trust_score === 'number' ? user.trust_score : 50;
  const [score, setScore] = useState(current);
  const [reason, setReason] = useState('');
  const { busy, run } = useAction(onDone);

  useEffect(() => {
    if (open) { setScore(current); setReason(''); }
  }, [open, current]);

  const delta = score - current;
  const valid = Number.isInteger(score) && score >= 0 && score <= 100 && delta !== 0 && reason.trim().length >= 3;

  const submit = async () => {
    if (await run(() => adminUsersApi.setTrustScore(user.id, { score, reason: reason.trim() }), `Trust score set to ${score}`, 'Could not update the trust score')) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust trust score</DialogTitle>
          <DialogDescription>Scores run from 0 to 100. The change and its reason are logged.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-baseline justify-center gap-3">
            <span className="text-sm text-muted-foreground">Current {current}</span>
            <span className="text-4xl font-bold text-foreground">{score}</span>
            <span className={`text-sm font-semibold ${delta > 0 ? 'text-buy-muted-foreground' : delta < 0 ? 'text-sell-muted-foreground' : 'text-muted-foreground'}`}>
              {delta > 0 ? `+${delta}` : delta}
            </span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trust-score-value">New score</Label>
            <Input id="trust-score-value" type="number" min={0} max={100} step={1} value={score}
              onChange={(e) => setScore(clampScore(Number(e.target.value) || 0))} />
            <div className="flex flex-wrap gap-2" aria-label="Quick adjustments">
              {[-10, -5, 5, 10].map((d) => (
                <Button key={d} type="button" variant="outline" size="sm" onClick={() => setScore((s) => clampScore(s + d))}>
                  {d > 0 ? `+${d}` : d}
                </Button>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={() => setScore(current)}>Reset</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trust-score-reason">Reason (required)</Label>
            <Textarea id="trust-score-reason" value={reason} maxLength={500} rows={3}
              placeholder="Why is this score changing?" onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          {renderSubmit(busy, 'Save score', { disabled: !valid, onClick: submit })}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

function StatusDialog() {
  const { user, mode, open, onOpenChange, onDone } = useDialog(['deactivate', 'reactivate']);
  const [reason, setReason] = useState('');
  const { busy, run } = useAction(onDone);
  useEffect(() => { if (open) setReason(''); }, [open]);
  const deactivate = mode === 'deactivate';

  const submit = async () => {
    const ok = await run(
      () => adminUsersApi.setStatus(user.id, { action: mode, reason: reason.trim() || undefined }),
      deactivate ? 'User deactivated' : 'User reactivated',
      deactivate ? 'Could not deactivate the user' : 'Could not reactivate the user'
    );
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deactivate ? 'Deactivate user' : 'Reactivate user'}</DialogTitle>
          <DialogDescription>
            {deactivate
              ? `${nameOf(user)} will be signed out everywhere and cannot sign in until reactivated.`
              : `${nameOf(user)} will be able to sign in again. Any suspension or block is lifted.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="status-reason">Reason (optional, shown to the user)</Label>
          <Textarea id="status-reason" value={reason} maxLength={500} rows={3} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          {renderSubmit(busy, deactivate ? 'Deactivate' : 'Reactivate', { onClick: submit, variant: deactivate ? 'destructive' : 'default' })}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

function DeleteUserDialog() {
  const { user, open, onOpenChange, onDone } = useDialog(['delete']);
  const [confirm, setConfirm] = useState('');
  const { busy, run } = useAction(onDone);
  useEffect(() => { if (open) setConfirm(''); }, [open]);
  const matches = confirm.trim().toLowerCase() === String(user?.email || '').toLowerCase() && confirm.trim() !== '';

  const submit = async () => {
    if (await run(() => adminUsersApi.deleteUser(user.id, confirm.trim()), 'User deleted', 'Could not delete the user')) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sell-muted-foreground">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" /> Delete user permanently
          </DialogTitle>
          <DialogDescription>
            This cannot be undone. The name, email and photo of {nameOf(user)} are erased from the account, the account is signed out
            everywhere and can never sign in again, and auto-renewal is stopped. Any public advisor, portfolio manager or finfluencer
            profile is unpublished and anonymised and its posts are archived. Payment, subscription, SEBI and audit records are kept,
            without the personal details on the account, for financial and regulatory record-keeping.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="delete-confirm">Type <span className="font-mono">{user?.email}</span> to confirm</Label>
          <Input id="delete-confirm" value={confirm} autoComplete="off" onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          {renderSubmit(busy, 'Delete user', { disabled: !matches, variant: 'destructive', onClick: submit })}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** All row dialogs; state comes from UserDialogContext. */
export default function UserActionDialogs() {
  return (
    <>
      <EditUserDialog />
      <RoleDialog />
      <TrustScoreDialog />
      <StatusDialog />
      <DeleteUserDialog />
    </>
  );
}
