import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';
import chatAdminApi from './chatAdminApi';
import PropTypes from 'prop-types';

/**
 * Searches users by name or email (admin-only endpoint) and calls
 * onSelect(user). `actionLabel` is the button text; `excludeIds` hides people
 * already present.
 */
export default function UserPicker({ onSelect, actionLabel = 'Add', excludeIds = [], disabled = false, id = 'user-picker' }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [state, setState] = useState('idle'); // idle | loading | done | error

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) { setResults([]); setState('idle'); return undefined; }
    let cancelled = false;
    setState('loading');
    const timer = setTimeout(async () => {
      try {
        const users = await chatAdminApi.searchUsers(q);
        if (!cancelled) { setResults(Array.isArray(users) ? users : []); setState('done'); }
      } catch {
        if (!cancelled) { setResults([]); setState('error'); }
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [term]);

  const shown = results.filter((u) => !excludeIds.map(String).includes(String(u.id)));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden="true" />
        <Input
          id={id}
          aria-label="Search users by name or email"
          placeholder="Search users by name or email (2+ characters)"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="pl-10"
          disabled={disabled}
        />
      </div>
      {state === 'loading' && (
        <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Searching…</p>
      )}
      {state === 'error' && <p className="text-xs text-sell-muted-foreground" role="alert">User search failed. Try again.</p>}
      {state === 'done' && shown.length === 0 && <p className="text-xs text-muted-foreground">No matching users.</p>}
      {shown.length > 0 && (
        <ul className="max-h-48 overflow-y-auto divide-y rounded-md border">
          {shown.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {u.status && u.status !== 'active' && <Badge variant="outline" className="text-xs">{u.status}</Badge>}
                <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onSelect(u)}>{actionLabel}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

UserPicker.propTypes = {
  onSelect: PropTypes.func.isRequired,
  actionLabel: PropTypes.string,
  excludeIds: PropTypes.array,
  disabled: PropTypes.bool,
  id: PropTypes.string,
};
