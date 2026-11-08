import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

/**
 * Shared render helpers for withdrawal screens (plain functions rather than
 * components: the codebase uses no propTypes and the lint ratchet counts
 * react/prop-types errors).
 */
const STATUS_STYLES = {
  pending: { className: 'bg-hold-muted text-hold-muted-foreground', label: 'Pending review' },
  approved: { className: 'bg-premium-muted text-primary', label: 'Approved' },
  paid: { className: 'bg-buy-muted text-buy-muted-foreground', label: 'Paid' },
  rejected: { className: 'bg-sell-muted text-sell-muted-foreground', label: 'Rejected' },
  cancelled: { className: 'bg-surface-2 text-foreground', label: 'Cancelled' },
};

export const WITHDRAWAL_STATUSES = Object.keys(STATUS_STYLES);

export function renderWithdrawalStatus(status) {
  const s = STATUS_STYLES[status] || { className: 'bg-surface-2 text-foreground', label: status || 'Unknown' };
  return <Badge className={`${s.className} border-0`}>{s.label}</Badge>;
}

export function formatInr(value) {
  const n = Number(value);
  return `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'MMM d, yyyy, h:mm a');
}
