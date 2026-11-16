import React, { useCallback, useEffect, useState } from 'react';
import { Subscription } from '@/api/entities';
import apiClient from '@/lib/apiClient';
import { formatDate, formatINR } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users as UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE = 25;
const EMPTY_COUNTS = { active: 0, cancelling: 0, cancelled: 0, expired: 0 };

/**
 * Price as the subscriber pays it: "Free", "₹199/mo", "₹1,999/yr".
 * The card used to print `₹{subscription.price}/mo` from a field that does
 * not exist, so every row read "₹/mo".
 */
export function priceLabel(item) {
  if (item.price === null || item.price === undefined) return '—';
  if (Number(item.price) === 0) return 'Free';
  return `${formatINR(item.price)}/${item.billing_cycle === 'annually' ? 'yr' : 'mo'}`;
}

/** Free plans (and lifetime grants) have no end date: never "Jan 1, 1970". */
export function endDateLabel(item) {
  if (!item.end_date) return item.price !== null && item.price !== undefined && Number(item.price) === 0 ? 'Never (free plan)' : 'No end date';
  return formatDate(item.end_date);
}

function renderStatusBadge(status) {
  const styles = {
    active: ['bg-buy-muted text-buy-muted-foreground border-buy/30', CheckCircle, 'ACTIVE'],
    cancelling: ['bg-hold-muted text-hold-muted-foreground border-hold/30', Clock, 'CANCELLING'],
    cancelled: ['bg-sell-muted text-sell-muted-foreground border-sell/30', XCircle, 'CANCELLED'],
    expired: ['bg-surface-2 text-foreground border-border', XCircle, 'EXPIRED'],
  };
  const [cls, Icon, label] = styles[status] || ['bg-hold-muted text-hold-muted-foreground border-hold/30', AlertTriangle, String(status || 'unknown').toUpperCase()];
  return (
    <Badge className={cls}>
      <Icon className="mr-1 h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}

export default function SubscriptionUserManagement({ permissions = {} }) {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reinstating, setReinstating] = useState(null);

  // Search runs on the server; wait for typing to pause.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/subscriptions/admin/users', {
        params: { status: statusFilter, q: search || undefined, page, limit: PAGE_SIZE },
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setCounts({ ...EMPTY_COUNTS, ...(data?.counts || {}) });
      setTotal(Number(data?.total) || 0);
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setError(err?.response?.data?.error || 'Could not load subscriptions.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReinstate = async (item) => {
    if (!permissions.canEdit) {
      toast.error('You do not have permission to modify subscriptions');
      return;
    }
    if (!window.confirm(`Reinstate ${item.plan_name} for ${item.user.email || 'this user'}? Auto-renewal will be switched back on.`)) return;
    setReinstating(item.id);
    try {
      await Subscription.update(item.id, { cancelAtPeriodEnd: false, auto_renew: true });
      toast.success('Subscription reinstated');
      loadData();
    } catch (err) {
      console.error('Error reinstating subscription:', err);
      toast.error(err?.response?.data?.error || 'Failed to reinstate subscription');
    } finally {
      setReinstating(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const summary = [
    ['active', 'Active', 'bg-buy-muted', 'text-buy-muted-foreground'],
    ['cancelling', 'Cancelling', 'bg-hold-muted', 'text-hold-muted-foreground'],
    ['cancelled', 'Cancelled', 'bg-sell-muted', 'text-sell-muted-foreground'],
    ['expired', 'Expired', 'bg-surface-2', 'text-foreground'],
  ];

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-protocall-premium-text" aria-hidden="true" />
            User Subscriptions ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search by email, name, or plan..."
                aria-label="Search subscriptions"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[200px]" aria-label="Filter by status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subscriptions</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="cancelling">Cancelling</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {summary.map(([key, label, bg, fg]) => (
              <button
                key={key}
                type="button"
                onClick={() => { setStatusFilter(key); setPage(1); }}
                aria-pressed={statusFilter === key}
                className={`rounded-lg p-3 text-left transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${bg} ${statusFilter === key ? 'ring-2 ring-primary/40' : ''}`}
              >
                <p className={`mb-1 text-xs ${fg}`}>{label}</p>
                <p className={`text-xl font-bold ${fg}`}>{counts[key]}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-10 text-center" role="alert">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-sell-muted-foreground" aria-hidden="true" />
            <p className="font-semibold text-foreground">{error}</p>
            <Button variant="outline" className="mt-4" onClick={loadData}>Try again</Button>
          </CardContent>
        </Card>
      ) : isLoading && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 p-10 text-subtle">
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Loading subscriptions…
        </div>
      ) : items.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-12 text-center">
            <UsersIcon className="mx-auto mb-4 h-16 w-16 text-muted-foreground" aria-hidden="true" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">No Subscriptions Found</h3>
            <p className="text-subtle">Try adjusting your search or filter criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" aria-busy={isLoading}>
          {items.map((item) => {
            const name = item.user.name || item.user.email || 'Deleted user';
            return (
              <Card key={item.id} className="border-0 shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-protocall-deep to-protocall-blue font-semibold text-white" aria-hidden="true">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{name}</p>
                          <p className="truncate text-sm text-muted-foreground">{item.user.email || 'No email'}</p>
                        </div>
                      </div>

                      <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                          <dt className="text-xs text-muted-foreground">Plan</dt>
                          <dd className="font-semibold">
                            {item.plan_name}
                            {item.is_advisor_plan && <span className="ml-1 text-xs font-normal text-subtle">(advisor)</span>}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Price</dt>
                          <dd className="font-semibold">{priceLabel(item)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Start Date</dt>
                          <dd className="font-semibold">{formatDate(item.start_date)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">End Date</dt>
                          <dd className="font-semibold">{endDateLabel(item)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      {renderStatusBadge(item.status)}
                      {item.status === 'cancelling' && permissions.canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-buy/30 text-buy-muted-foreground hover:bg-buy-muted"
                          onClick={() => handleReinstate(item)}
                          disabled={reinstating === item.id}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                          Reinstate Subscription
                        </Button>
                      )}
                      {item.status === 'cancelling' && item.end_date && (
                        <p className="text-right text-xs text-hold-muted-foreground">Cancels on: {formatDate(item.end_date)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {pages > 1 && (
            <nav className="flex items-center justify-center gap-3" aria-label="Subscription pages">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
              </Button>
              <span className="text-sm text-subtle">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages || isLoading}>
                Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
