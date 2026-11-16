import { useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PlusCircle, Pencil, Trash2, Copy, FileDown, UserPlus, LayoutTemplate } from 'lucide-react';
import { adminUsersApi, adminErrorMessage, downloadCsv } from './adminUsersApi';
import { renderPermissionChecklist } from './PermissionChecklist';
import { RolesContext, TemplateUiContext } from './rolesContext';

function TemplateDialog() {
  const { data, reload: onSaved } = useContext(RolesContext);
  const { editing: current, setEditing } = useContext(TemplateUiContext);
  const categories = data.categories;
  const open = current !== undefined;
  const template = current || null;
  const onOpenChange = (o) => { if (!o) setEditing(undefined); };
  const [form, setForm] = useState({ name: '', description: '', is_active: true, permissions: [] });
  const [busy, setBusy] = useState(false);
  const editing = Boolean(template?.id);

  useEffect(() => {
    if (open) {
      setForm({
        name: template?.name || '',
        description: template?.description || '',
        is_active: template ? template.is_active !== false : true,
        permissions: template?.permissions || [],
      });
    }
  }, [open, template]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form, name: form.name.trim() };
      if (editing) await adminUsersApi.updateTemplate(template.id, body);
      else await adminUsersApi.createTemplate(body);
      toast.success(editing ? 'Template updated' : 'Template created');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(adminErrorMessage(err, 'Could not save the template'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit template: ${template.name}` : 'New role template'}</DialogTitle>
            <DialogDescription>A template is a reusable set of permissions to start new custom roles from.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template name</Label>
              <Input id="template-name" value={form.name} maxLength={80} required onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea id="template-description" value={form.description} maxLength={500} rows={2} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="template-active" checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label htmlFor="template-active">Active (offered when creating roles)</Label>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Permissions</span>
              {renderPermissionChecklist(categories, form.permissions, (permissions) => setForm((f) => ({ ...f, permissions })), 'template')}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy || form.name.trim().length < 2}>{busy ? 'Saving…' : 'Save template'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoleFromTemplateDialog() {
  const { reload: onSaved } = useContext(RolesContext);
  const { fromTemplate: template, setFromTemplate } = useContext(TemplateUiContext);
  const open = Boolean(template);
  const onOpenChange = (o) => { if (!o) setFromTemplate(null); };
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setName(''); }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminUsersApi.createRole({ name: name.trim(), description: template.description, template_id: template.id });
      toast.success(`Role "${name.trim()}" created from "${template.name}"`);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(adminErrorMessage(err, 'Could not create the role'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Create role from &ldquo;{template?.name}&rdquo;</DialogTitle>
            <DialogDescription>The new role starts with this template&rsquo;s {template?.permissions.length} permission(s).</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="role-from-template-name">Role name</Label>
            <Input id="role-from-template-name" value={name} maxLength={50} required onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy || name.trim().length < 2}>{busy ? 'Creating…' : 'Create role'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RoleTemplateManager() {
  const { data, templates, reload: onChanged, access } = useContext(RolesContext);
  const categories = data.categories;
  const canEdit = Boolean(access?.is_super_admin);
  const [editing, setEditing] = useState(undefined); // undefined closed, null new, object edit
  const [fromTemplate, setFromTemplate] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const labelOf = new Map(categories.flatMap((c) => c.permissions.map((p) => [p.key, p.label])));

  const exportTemplates = () => {
    const rows = [['Template', 'Description', 'Active', 'Permissions', 'Created by', 'Created']];
    for (const t of templates) {
      rows.push([t.name, t.description, t.is_active ? 'Yes' : 'No', t.permissions.map((k) => labelOf.get(k) || k).join('; '),
        t.created_by_name || '', t.created_at ? new Date(t.created_at).toLocaleDateString() : '']);
    }
    downloadCsv(`role-templates-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await adminUsersApi.deleteTemplate(deleting.id);
      toast.success('Template deleted');
      setDeleting(null);
      onChanged();
    } catch (e) {
      toast.error(adminErrorMessage(e, 'Could not delete the template'));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-primary" />Role templates</CardTitle>
          <CardDescription>Reusable permission sets for creating custom roles quickly.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportTemplates} disabled={templates.length === 0}><FileDown className="w-4 h-4 mr-2" />Export</Button>
          {canEdit && <Button onClick={() => setEditing(null)}><PlusCircle className="w-4 h-4 mr-2" />New template</Button>}
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <LayoutTemplate className="w-10 h-10 mx-auto mb-2" aria-hidden="true" />
            <p className="font-medium">No templates yet</p>
            {canEdit && <p className="text-sm">Create one to reuse a set of permissions.</p>}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((t) => (
              <div key={t.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-foreground">{t.name}</h4>
                    {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                  </div>
                  <Badge variant="outline" className={t.is_active ? 'bg-buy-muted text-buy-muted-foreground' : ''}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.permissions.length === 0
                    ? <span className="text-xs text-muted-foreground">No permissions</span>
                    : t.permissions.map((k) => <Badge key={k} variant="secondary" className="text-xs">{labelOf.get(k) || k}</Badge>)}
                </div>
                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setFromTemplate(t)} disabled={!t.is_active}><UserPlus className="w-4 h-4 mr-1" />Create role</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(t)}><Pencil className="w-4 h-4 mr-1" />Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing({ ...t, id: undefined, name: `${t.name} (copy)` })}><Copy className="w-4 h-4 mr-1" />Duplicate</Button>
                    <Button size="sm" variant="outline" className="text-sell-muted-foreground" onClick={() => setDeleting(t)} aria-label={`Delete template ${t.name}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <TemplateUiContext.Provider value={{ editing, setEditing, fromTemplate, setFromTemplate }}>
        <TemplateDialog />
        <RoleFromTemplateDialog />
      </TemplateUiContext.Provider>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template &ldquo;{deleting?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>Roles already created from it keep their permissions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleteBusy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteBusy ? 'Deleting…' : 'Delete template'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
