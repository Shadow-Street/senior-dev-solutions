import { Fragment, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Pencil, Trash2, ShieldCheck, FileDown, Table as TableIcon, Copy, History, Info, RefreshCw, Lock } from 'lucide-react';
import RoleTemplateManager from './RoleTemplateManager';
import { renderPermissionChecklist } from './PermissionChecklist';
import { RolesContext, RoleFormContext } from './rolesContext';
import { AdminAccessContext } from './useAdminAccess';
import AuditLogViewer from './AuditLogViewer';
import { adminUsersApi, adminErrorMessage, downloadCsv } from './adminUsersApi';

const tabClass = 'h-10 w-full rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-surface-2 text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md';

const NO_TEMPLATE = '__none__';

function RoleFormDialog() {
  const { data, templates, reload: onSaved } = useContext(RolesContext);
  const { formRole, setFormRole } = useContext(RoleFormContext);
  const categories = data.categories;
  const open = formRole !== undefined;
  const role = formRole || null;
  const onOpenChange = (o) => { if (!o) setFormRole(undefined); };
  const editing = Boolean(role);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState(NO_TEMPLATE);
  const [permissions, setPermissions] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(role?.name || '');
    setDescription(role?.description || '');
    setTemplateId(NO_TEMPLATE);
    setPermissions([]);
  }, [open, role]);

  const pickTemplate = (id) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) setPermissions(t.permissions);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        const body = { description };
        if (role.kind === 'custom') body.name = name.trim();
        await adminUsersApi.updateRole(role.id, body);
        toast.success('Role updated');
      } else {
        await adminUsersApi.createRole({ name: name.trim(), description, permissions });
        toast.success(`Role "${name.trim()}" created`);
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(adminErrorMessage(err, editing ? 'Could not update the role' : 'Could not create the role'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit role: ${role.name}` : 'Create custom role'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Change the name or description. Toggle permissions in the matrix.'
                : 'A custom role is a named set of admin-panel permissions. Assign it to a staff member from the Users tab.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role name</Label>
              <Input id="role-name" value={name} maxLength={50} required disabled={editing && role.kind !== 'custom'}
                placeholder="e.g. Customer Support" onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Textarea id="role-description" value={description} maxLength={500} rows={2} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {!editing && (
              <>
                {templates.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="role-template">Start from a template (optional)</Label>
                    <Select value={templateId} onValueChange={pickTemplate}>
                      <SelectTrigger id="role-template"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TEMPLATE}>No template</SelectItem>
                        {templates.filter((t) => t.is_active).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Permissions</span>
                  {renderPermissionChecklist(categories, permissions, setPermissions, 'new-role')}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy || name.trim().length < 2}>{busy ? 'Saving…' : editing ? 'Save role' : 'Create role'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PermissionMatrix() {
  const { data, reload: onReload } = useContext(RolesContext);
  const [roles, setRoles] = useState(data.roles);
  const [pending, setPending] = useState({});
  const [formRole, setFormRole] = useState(undefined); // undefined closed, null create, object edit
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => { setRoles(data.roles); }, [data]);

  const has = (role, key) => role.all || role.permissions.includes(key);

  const toggle = async (role, perm, granted) => {
    const cell = `${role.id}:${perm.key}`;
    const before = role.permissions;
    const optimistic = granted ? [...before, perm.key] : before.filter((k) => k !== perm.key);
    setRoles((rs) => rs.map((r) => (r.id === role.id ? { ...r, permissions: optimistic } : r)));
    setPending((p) => ({ ...p, [cell]: true }));
    try {
      const res = await adminUsersApi.setRolePermission(role.id, perm.key, granted);
      setRoles((rs) => rs.map((r) => (r.id === role.id ? { ...r, permissions: res.permissions } : r)));
      toast.success(`${granted ? 'Granted' : 'Revoked'} "${perm.label}" ${granted ? 'to' : 'from'} ${role.name}`);
    } catch (e) {
      setRoles((rs) => rs.map((r) => (r.id === role.id ? { ...r, permissions: before } : r)));
      toast.error(adminErrorMessage(e, 'Could not save the permission'));
    } finally {
      setPending((p) => { const n = { ...p }; delete n[cell]; return n; });
    }
  };

  const exportMatrix = () => {
    const rows = [['Category', 'Permission', ...roles.map((r) => r.name)]];
    for (const cat of data.categories) {
      for (const p of cat.permissions) rows.push([cat.name, p.label, ...roles.map((r) => (has(r, p.key) ? 'Yes' : 'No'))]);
    }
    downloadCsv(`permissions-matrix-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success('Matrix exported');
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await adminUsersApi.deleteRole(deleting.id);
      toast.success(`Role "${deleting.name}" deleted`);
      setDeleting(null);
      onReload();
    } catch (e) {
      toast.error(adminErrorMessage(e, 'Could not delete the role'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const canEdit = data.can_edit;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" />Permissions matrix</CardTitle>
            <CardDescription>Which admin sections each staff role can use. Changes save immediately.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportMatrix}><FileDown className="w-4 h-4 mr-2" />Export matrix</Button>
            {canEdit && <Button onClick={() => setFormRole(null)}><PlusCircle className="w-4 h-4 mr-2" />Create role</Button>}
          </div>
        </div>
        <div className="mt-3 flex gap-2 rounded-lg bg-surface-2 p-3 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <p>
            To give someone a role, open the <strong>Users</strong> tab, then <strong>⋮ › Change role</strong>. Super Admin and Admin always have every
            permission. Custom roles are assigned on top of Sub Admin and can be given User Management permissions.{!canEdit && ' Only a super admin can change this matrix.'}
            {!data.custom_roles_available && ' Assigning custom roles to users needs the pending database update (migration 017).'}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="p-3 text-left font-semibold text-foreground sticky left-0 bg-surface-2 z-10 min-w-[240px]">Permission</th>
                {roles.map((role) => (
                  <th key={role.id || role.key} scope="col" className="p-3 text-center font-semibold text-foreground min-w-[140px] align-top">
                    <div className="flex flex-col items-center gap-1">
                      <span>{role.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {role.user_count ?? 0} user{role.user_count === 1 ? '' : 's'}
                      </span>
                      {role.kind === 'system'
                        ? <Badge variant="outline" className="text-xs">{role.editable ? 'Built-in' : <><Lock className="w-3 h-3 mr-1" aria-hidden="true" />Fixed</>}</Badge>
                        : <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">Custom</Badge>}
                      {canEdit && role.id && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit role ${role.name}`} onClick={() => setFormRole(role)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {role.deletable && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-sell-muted-foreground" aria-label={`Delete role ${role.name}`} onClick={() => setDeleting(role)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.categories.map((cat) => (
                <Fragment key={cat.name}>
                  <tr className="bg-surface-2/60">
                    <th scope="colgroup" colSpan={roles.length + 1} className="p-3 text-left font-semibold text-foreground sticky left-0">{cat.name}</th>
                  </tr>
                  {cat.permissions.map((perm) => (
                    <tr key={perm.key} className="border-b hover:bg-surface-2">
                      <th scope="row" className="p-3 text-left font-normal sticky left-0 bg-card z-10 border-r">
                        <div className="text-foreground">{perm.label}</div>
                        <div className="text-xs text-muted-foreground">{perm.description}</div>
                      </th>
                      {roles.map((role) => (
                        <td key={role.id || role.key} className="p-3 text-center">
                          <Switch
                            checked={has(role, perm.key)}
                            disabled={!canEdit || !role.editable || Boolean(pending[`${role.id}:${perm.key}`])}
                            onCheckedChange={(v) => toggle(role, perm, v)}
                            aria-label={`${perm.label} for ${role.name}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {data.admin_only_sections?.length > 0 && (
          <div className="mt-4 border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />Admin only
            </h4>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              These sections are open to Admin and Super Admin only. They cannot be granted to a Sub Admin or a custom role yet.
            </p>
            <ul className="flex flex-wrap gap-2" aria-label="Admin-only sections">
              {data.admin_only_sections.map((s) => (
                <li key={s.section}><Badge variant="outline" className="text-xs">{s.label}</Badge></li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <RoleFormContext.Provider value={{ formRole, setFormRole }}>
        <RoleFormDialog />
      </RoleFormContext.Provider>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role &ldquo;{deleting?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              The role and its permissions are removed. A role that users still hold cannot be deleted; give them another role first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleteBusy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteBusy ? 'Deleting…' : 'Delete role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function RolesAndPermissions() {
  const access = useContext(AdminAccessContext);
  const [tab, setTab] = useState('matrix');
  const [data, setData] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [matrix, tpl] = await Promise.all([adminUsersApi.matrix(), adminUsersApi.listTemplates()]);
      setData(matrix);
      setTemplates(tpl);
    } catch (e) {
      setError(adminErrorMessage(e, 'Could not load roles and permissions.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <RolesContext.Provider value={{ data, templates, reload: load, access }}>
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-transparent p-1 gap-2 h-auto">
        <TabsTrigger value="matrix" className={tabClass}><TableIcon className="w-4 h-4" />Permissions matrix</TabsTrigger>
        <TabsTrigger value="templates" className={tabClass}><Copy className="w-4 h-4" />Role templates</TabsTrigger>
        <TabsTrigger value="audit" className={tabClass}><History className="w-4 h-4" />Audit log</TabsTrigger>
      </TabsList>

      <TabsContent value="matrix" className="mt-4">
        {loading && !data && <Skeleton className="h-96 w-full" />}
        {error && (
          <Card><CardContent className="py-12 text-center">
            <p role="alert" className="text-sell-muted-foreground mb-3">{error}</p>
            <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Try again</Button>
          </CardContent></Card>
        )}
        {data && !error && <PermissionMatrix />}
      </TabsContent>

      <TabsContent value="templates" className="mt-4">
        {data && (
          <RoleTemplateManager />
        )}
        {!data && loading && <Skeleton className="h-64 w-full" />}
        {!data && error && <p role="alert" className="text-sell-muted-foreground">{error}</p>}
      </TabsContent>

      <TabsContent value="audit" className="mt-4">
        <AuditLogViewer />
      </TabsContent>
    </Tabs>
    </RolesContext.Provider>
  );
}
