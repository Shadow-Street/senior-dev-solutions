import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Info, RefreshCw, Lock } from 'lucide-react';
import { adminUsersApi, adminErrorMessage } from '../users/adminUsersApi';

/**
 * Platform Settings › Role Management.
 *
 * This screen used to keep its own copy of role CRUD against the raw roles
 * table, with fields the table does not have (is_system_role), so it drifted
 * from Roles & Permissions. There is now one place to manage roles: User
 * Management › Roles & Permissions. This page shows the same roles, read-only,
 * and says where to change them.
 */
export default function ManageRoles() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminUsersApi.matrix());
    } catch (e) {
      setError(adminErrorMessage(e, 'Could not load roles.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = data ? data.categories.reduce((n, c) => n + c.permissions.length, 0) : 0;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" aria-hidden="true" />Role management</CardTitle>
        <CardDescription>The roles staff can hold and how many admin permissions each one has.</CardDescription>
        <div className="mt-3 flex gap-2 rounded-lg bg-surface-2 p-3 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <p>
            Create, edit and delete roles, and change their permissions, in <strong>User Management › Roles &amp; Permissions</strong>.
            Assign a role to a person from <strong>User Management › Users › ⋮ › Change role</strong>.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !data && <Skeleton className="h-40 w-full" />}
        {error && (
          <div className="text-center py-8">
            <p role="alert" className="text-sell-muted-foreground mb-3">{error}</p>
            <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Try again</Button>
          </div>
        )}
        {data && !error && (
          <ul className="divide-y border rounded-lg">
            {data.roles.map((role) => (
              <li key={role.id || role.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{role.name}</span>
                    {role.kind === 'custom'
                      ? <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">Custom</Badge>
                      : <Badge variant="outline" className="text-xs">{role.editable ? 'Built-in' : <><Lock className="w-3 h-3 mr-1" aria-hidden="true" />Fixed</>}</Badge>}
                  </div>
                  {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {role.all ? 'All' : role.permissions.length} of {total} permissions · {role.user_count ?? 0} user{role.user_count === 1 ? '' : 's'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
