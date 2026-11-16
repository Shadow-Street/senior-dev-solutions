import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, RefreshCw } from 'lucide-react';
import UserTable from './users/UserTable';
import RolesAndPermissions from './users/RolesAndPermissions';
import useAdminAccess, { AdminAccessContext } from './users/useAdminAccess';
import { adminErrorMessage } from './users/adminUsersApi';

const tabClass = 'h-10 w-full rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-surface-2 text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md';

/**
 * Super Admin › User Management: the user list with its row actions, and
 * Roles & Permissions. What is shown follows GET /api/admin/access/me; the
 * API enforces the same permissions on every call.
 */
export default function UserManagement() {
  const { access, loading, error, reload, can } = useAdminAccess();
  const [tab, setTab] = useState('users');

  if (loading) {
    return (
      <Card className="shadow-sm"><CardContent className="p-6 space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" />
      </CardContent></Card>
    );
  }

  if (error || !access) {
    return (
      <Card className="shadow-sm"><CardContent className="p-10 text-center">
        <p role="alert" className="text-sell-muted-foreground mb-3">{adminErrorMessage(error, 'Could not confirm your access.')}</p>
        <Button variant="outline" onClick={reload}><RefreshCw className="w-4 h-4 mr-2" />Try again</Button>
      </CardContent></Card>
    );
  }

  const showUsers = can('users.view');
  const showRoles = access.is_super_admin || access.role === 'admin';
  const current = !showUsers && showRoles ? 'roles' : tab;

  if (!showUsers && !showRoles) {
    return (
      <Card className="shadow-sm"><CardContent className="p-12 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No access</h3>
        <p className="text-muted-foreground">Your role does not include User Management.</p>
      </CardContent></Card>
    );
  }

  return (
    <Card className="shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" aria-hidden="true" />
          Users and roles
        </CardTitle>
        <p className="text-sm text-muted-foreground">Find users, manage their accounts and decide what each staff role can do.</p>
      </CardHeader>
      <CardContent>
        <AdminAccessContext.Provider value={access}>
        <Tabs value={current} onValueChange={setTab}>
          <TabsList className={`grid w-full ${showUsers && showRoles ? 'grid-cols-2' : 'grid-cols-1'} bg-transparent p-1 gap-2 h-auto`}>
            {showUsers && <TabsTrigger value="users" className={tabClass}><Users className="w-4 h-4" />Users</TabsTrigger>}
            {showRoles && <TabsTrigger value="roles" className={tabClass}><Shield className="w-4 h-4" />Roles &amp; Permissions</TabsTrigger>}
          </TabsList>
          {showUsers && (
            <TabsContent value="users" className="mt-4">
              <UserTable />
            </TabsContent>
          )}
          {showRoles && (
            <TabsContent value="roles" className="mt-4">
              <RolesAndPermissions />
            </TabsContent>
          )}
        </Tabs>
        </AdminAccessContext.Provider>
      </CardContent>
    </Card>
  );
}
