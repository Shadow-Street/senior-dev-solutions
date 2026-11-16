import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, MoreVertical, Pencil, ShieldCheck, Trophy, Ban, UserCheck, Trash2, ChevronLeft, ChevronRight, Users, RefreshCw,
} from 'lucide-react';
import TrustScoreBadge from '@/components/ui/TrustScoreBadge';
import { renderUserRoleBadges } from './UserRoleBadges';
import { adminUsersApi, adminErrorMessage } from './adminUsersApi';
import { statusInfo, isRestricted, hasAnyAction, STATUS_FILTERS, ROLE_FILTERS } from './userAdminHelpers';
import UserActionDialogs, { UserDialogContext } from './UserActionDialogs';
import { AdminAccessContext } from './useAdminAccess';

const PAGE_SIZES = [10, 20, 50];

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function renderAvatar(user) {
  if (user.profile_image_url) {
    return <img className="h-10 w-10 rounded-full object-cover" src={user.profile_image_url} alt="" />;
  }
  const initial = (user.display_name || user.name || user.email || 'U').charAt(0).toUpperCase();
  return (
    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold" aria-hidden="true">
      {initial}
    </div>
  );
}

function renderRowMenu(user, onAction) {
  const a = user.actions || {};
  const label = `Actions for ${user.display_name || user.name || user.email}`;
  if (user.is_self) {
    return <span className="text-xs text-muted-foreground">You</span>;
  }
  if (!hasAnyAction(a)) {
    return <span className="text-xs text-muted-foreground" title="Your role cannot manage this account">No actions</span>;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Manage account</DropdownMenuLabel>
        {a.edit && <DropdownMenuItem onSelect={() => onAction('edit', user)}><Pencil className="w-4 h-4 mr-2" />Edit user</DropdownMenuItem>}
        {a.role && <DropdownMenuItem onSelect={() => onAction('role', user)}><ShieldCheck className="w-4 h-4 mr-2" />Change role</DropdownMenuItem>}
        {a.trust && <DropdownMenuItem onSelect={() => onAction('trust', user)}><Trophy className="w-4 h-4 mr-2" />Adjust trust score</DropdownMenuItem>}
        {a.status && (isRestricted(user)
          ? <DropdownMenuItem onSelect={() => onAction('reactivate', user)}><UserCheck className="w-4 h-4 mr-2" />Reactivate user</DropdownMenuItem>
          : <DropdownMenuItem onSelect={() => onAction('deactivate', user)}><Ban className="w-4 h-4 mr-2" />Deactivate user</DropdownMenuItem>)}
        {a.delete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-sell-muted-foreground focus:text-sell-muted-foreground" onSelect={() => onAction('delete', user)}>
              <Trash2 className="w-4 h-4 mr-2" />Delete user
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function UserTable() {
  const access = useContext(AdminAccessContext);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState({ type: null, user: null });
  const debouncedSearch = useDebounced(search.trim(), 300);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (role !== 'all') params.role = role;
      if (status !== 'all') params.status = status;
      const data = await adminUsersApi.listUsers(params);
      if (id === requestId.current) setResult(data);
    } catch (e) {
      if (id === requestId.current) setError(adminErrorMessage(e, 'Could not load users.'));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [page, limit, debouncedSearch, role, status]);

  useEffect(() => { load(); }, [load]);
  // A new search or filter starts again from page 1.
  useEffect(() => { setPage(1); }, [debouncedSearch, role, status, limit]);

  const openDialog = (type, user) => setDialog({ type, user });
  const closeDialog = (open) => { if (!open) setDialog({ type: null, user: null }); };
  const users = result?.data || [];
  const pages = result?.pages || 1;
  const total = result?.total ?? 0;
  const trustAvailable = result?.features?.trust_score;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Label htmlFor="user-search" className="sr-only">Search users</Label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden="true" />
          <Input id="user-search" placeholder="Search by name or email" value={search} maxLength={100}
            onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-full md:w-[190px]" aria-label="Filter by role"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full md:w-[170px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-2">
              <tr>
                {['User', 'Role', 'Trust score', 'Status', 'Registered'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && !result && Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-10 w-full" /></td></tr>
              ))}
              {error && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p role="alert" className="text-sell-muted-foreground mb-3">{error}</p>
                    <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Try again</Button>
                  </td>
                </tr>
              )}
              {!error && result && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2" aria-hidden="true" />
                    <p className="font-medium">No users found</p>
                    <p className="text-sm">Try a different search or filter.</p>
                  </td>
                </tr>
              )}
              {!error && users.map((user) => {
                const s = statusInfo(user);
                return (
                  <tr key={user.id} className={`hover:bg-surface-2 ${loading ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {renderAvatar(user)}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{user.display_name || user.name || 'No name'}</div>
                          <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{renderUserRoleBadges(user)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {typeof user.trust_score === 'number' ? <TrustScoreBadge score={user.trust_score} /> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge variant="outline" className={s.className}>{s.label}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{renderRowMenu(user, openDialog)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-[80px]" aria-label="Rows per page"><SelectValue /></SelectTrigger>
            <SelectContent>{PAGE_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{total} user{total === 1 ? '' : 's'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1 || loading}>
            <ChevronLeft className="h-4 w-4" />Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(p + 1, pages))} disabled={page >= pages || loading}>
            Next<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {result && trustAvailable === false && (
        <p className="text-xs text-muted-foreground">Trust scores become available once the pending database update (migration 017) is applied.</p>
      )}

      <UserDialogContext.Provider value={{ dialog, close: closeDialog, onDone: load, access }}>
        <UserActionDialogs />
      </UserDialogContext.Provider>
    </div>
  );
}
