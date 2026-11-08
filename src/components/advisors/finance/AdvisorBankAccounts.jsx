import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Landmark, Plus, Pencil, Trash2, Star, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { bankAccountsApi, apiErrorMessage } from '@/lib/withdrawalsApi';
import { addBankAccountSchema, editBankAccountSchema } from '@/lib/bankValidation';
import { formatDateTime } from './withdrawalStatus';

const EMPTY = {
  account_holder_name: '', bank_name: '', account_number: '', confirm_account_number: '', ifsc: '', account_type: 'savings',
};

/**
 * Advisor bank accounts: list, add, edit, remove, set primary.
 * Owns its data (no props). The full account number is never returned by the
 * API, so the UI only ever shows the masked form; editing the number means
 * typing a new one.
 */
export default function AdvisorBankAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null); // account being edited, or 'new'
  const [serverError, setServerError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const isNew = editing === 'new';
  const {
    register, handleSubmit, reset, setError, formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(isNew ? addBankAccountSchema : editBankAccountSchema),
    defaultValues: EMPTY,
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setAccounts(await bankAccountsApi.list());
    } catch (e) {
      setLoadError(apiErrorMessage(e, 'Could not load your bank accounts.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setServerError(''); reset(EMPTY); setEditing('new'); };
  const openEdit = (account) => {
    setServerError('');
    reset({ ...EMPTY, account_holder_name: account.account_holder_name, bank_name: account.bank_name, ifsc: account.ifsc, account_type: account.account_type });
    setEditing(account);
  };
  const closeForm = () => { setEditing(null); setServerError(''); };

  const onSubmit = async (values) => {
    setServerError('');
    try {
      if (isNew) {
        const payload = { ...values };
        delete payload.confirm_account_number;
        await bankAccountsApi.create(payload);
        toast.success('Bank account added');
      } else {
        const payload = { ...values };
        delete payload.confirm_account_number;
        if (!payload.account_number) delete payload.account_number;
        await bankAccountsApi.update(editing.id, payload);
        toast.success('Bank account updated');
      }
      closeForm();
      await load();
    } catch (e) {
      const details = e?.response?.data?.details;
      if (details && typeof details === 'object') {
        for (const [field, message] of Object.entries(details)) {
          if (field in EMPTY) setError(field, { message });
        }
      }
      setServerError(apiErrorMessage(e, 'Could not save the bank account.'));
    }
  };

  const makePrimary = async (account) => {
    setBusyId(account.id);
    try {
      await bankAccountsApi.setPrimary(account.id);
      toast.success('Primary account updated');
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not change the primary account.'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const target = deleting;
    setBusyId(target.id);
    try {
      await bankAccountsApi.remove(target.id);
      toast.success('Bank account removed');
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not remove the bank account.'));
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  };

  const field = (name, label, props = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`bank-${name}`}>{label}</Label>
      <Input id={`bank-${name}`} aria-invalid={Boolean(errors[name])} {...register(name)} {...props} />
      {errors[name] && <p role="alert" className="text-sm text-sell-muted-foreground">{errors[name].message}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bank Accounts</h2>
          <p className="text-sm text-subtle">Withdrawals are paid to your primary account. Account numbers are stored encrypted and only the last 4 digits are shown.</p>
        </div>
        <Button onClick={openAdd} className="bg-buy text-buy-foreground hover:bg-buy-soft">
          <Plus className="w-4 h-4 mr-2" /> Add bank account
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12" role="status" aria-label="Loading bank accounts">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && loadError && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-sell-muted-foreground mx-auto" />
            <p className="text-subtle">{loadError}</p>
            <Button variant="outline" onClick={load}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !loadError && accounts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Landmark className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-subtle">No bank accounts yet. Add one to request withdrawals.</p>
            <Button onClick={openAdd} className="bg-buy text-buy-foreground hover:bg-buy-soft">Add your first account</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !loadError && accounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{a.bank_name}</p>
                    <p className="text-sm text-subtle">{a.account_holder_name}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {a.is_primary && <Badge className="bg-premium-muted text-primary border-0">Primary</Badge>}
                    {a.cooling_off && (
                      <Badge className="bg-hold-muted text-hold-muted-foreground border-0">Security hold</Badge>
                    )}
                    {a.verified_at && (
                      <Badge className="bg-buy-muted text-buy-muted-foreground border-0"><ShieldCheck className="w-3 h-3 mr-1" />Verified</Badge>
                    )}
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  <p className="font-mono">{a.masked_account_number}</p>
                  <p className="text-subtle">IFSC {a.ifsc} · {a.account_type === 'current' ? 'Current' : 'Savings'}</p>
                  {a.cooling_off && (
                    <p className="text-xs text-hold-muted-foreground mt-1">
                      New or changed accounts can receive withdrawals from {formatDateTime(a.usable_from)} (24-hour security hold).
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {!a.is_primary && (
                    <Button size="sm" variant="outline" disabled={busyId === a.id} onClick={() => makePrimary(a)}>
                      <Star className="w-4 h-4 mr-1" /> Make primary
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" aria-label={`Remove ${a.bank_name} account ending ${a.account_last4}`} disabled={busyId === a.id} onClick={() => setDeleting(a)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? 'Add bank account' : 'Edit bank account'}</DialogTitle>
            <DialogDescription>
              {isNew
                ? 'Enter the account your withdrawals should be paid into. A new account has a 24-hour security hold before its first withdrawal.'
                : 'Leave the account number blank to keep the saved one. Changing the account number, IFSC or holder name marks the account unverified and starts a 24-hour security hold before it can receive a withdrawal. You will be notified of every change.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {field('account_holder_name', 'Account holder name', { autoComplete: 'off' })}
            {field('bank_name', 'Bank name', { autoComplete: 'off' })}
            {field('account_number', isNew ? 'Account number' : 'New account number (optional)', { inputMode: 'numeric', autoComplete: 'off' })}
            {field('confirm_account_number', 'Confirm account number', { inputMode: 'numeric', autoComplete: 'off', onPaste: (e) => e.preventDefault() })}
            {field('ifsc', 'IFSC code', { autoComplete: 'off', maxLength: 11, className: 'uppercase' })}
            <div className="space-y-1.5">
              <Label htmlFor="bank-account_type">Account type</Label>
              <select
                id="bank-account_type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('account_type')}
              >
                <option value="savings">Savings</option>
                <option value="current">Current</option>
              </select>
              {errors.account_type && <p role="alert" className="text-sm text-sell-muted-foreground">{errors.account_type.message}</p>}
            </div>
            {serverError && <p role="alert" className="text-sm text-sell-muted-foreground">{serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-buy text-buy-foreground hover:bg-buy-soft">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isNew ? 'Save account' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        variant="destructive"
        title="Remove bank account?"
        message={deleting ? `${deleting.bank_name} ${deleting.masked_account_number} will be removed. Past withdrawals keep their record.` : ''}
        confirmText="Remove"
      />
    </div>
  );
}
