import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowDown, ArrowUp, RotateCcw, Save, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { platformSettingsApi, refreshPublicConfig, settingsErrorMessage, settingsFieldErrors } from '@/lib/platformSettingsApi';
import { ADMIN_NAV_DEFAULTS, ADMIN_NAV_LOCKED, USER_NAV_DEFAULTS, editorRows, rowsToConfig } from '@/lib/navigationConfig';
import { SectionNote } from './SettingsForm';

/**
 * Sidebar & Navigation (formerly "Entity Configuration").
 *
 * The old screen created rows in entity_configs with fields that table does
 * not have, so every save failed and nothing read the rows anyway — the list
 * was always "No Entity Configurations". What admins actually need from it is
 * control over the sidebars, so that is what this does: rename, hide and
 * reorder the member sidebar and the Super Admin sidebar. Nothing configured
 * = today's sidebars.
 */
const LISTS = {
  user: { settingKey: 'nav_config_user', defaults: USER_NAV_DEFAULTS, locked: [], title: 'Member sidebar', hint: 'The left menu members see in the app.' },
  admin: { settingKey: 'nav_config_admin', defaults: ADMIN_NAV_DEFAULTS, locked: ADMIN_NAV_LOCKED, title: 'Super Admin sidebar', hint: 'Dashboard and Platform Settings cannot be hidden.' },
};

const sameRows = (a, b) => JSON.stringify(rowsToConfig(a)) === JSON.stringify(rowsToConfig(b));

function NavList({ list, managed, onSaved, onDirty }) {
  // Keyed on this list's own stored value (as JSON), not the whole `managed`
  // object: saving the other list must not reset this one's pending edits.
  const storedJson = JSON.stringify(managed?.values?.[list.settingKey] ?? null);
  const saved = useMemo(() => editorRows(list.defaults, JSON.parse(storedJson)), [list, storedJson]);
  const [rows, setRows] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { setRows(saved); setError(null); }, [saved]);

  const dirty = !sameRows(rows, saved);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);

  const move = (i, delta) => setRows((r) => {
    const j = i + delta;
    if (j < 0 || j >= r.length) return r;
    const next = [...r];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const patch = (i, values) => setRows((r) => r.map((row, k) => (k === i ? { ...row, ...values } : row)));

  const persist = async (config, message) => {
    setSaving(true);
    setError(null);
    try {
      const result = await platformSettingsApi.save({ [list.settingKey]: config });
      onSaved(result.values);
      refreshPublicConfig();
      toast.success(message);
    } catch (err) {
      const fields = settingsFieldErrors(err);
      setError(fields[list.settingKey] || settingsErrorMessage(err, 'Could not save the sidebar.'));
      toast.error(settingsErrorMessage(err, 'Could not save the sidebar.'));
    } finally {
      setSaving(false);
    }
  };

  const tooLong = rows.find((r) => (r.label || '').trim().length > 40);

  return (
    <section aria-labelledby={`nav-${list.settingKey}`} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 id={`nav-${list.settingKey}`} className="text-lg font-semibold text-foreground">{list.title}</h3>
        <p className="text-sm text-muted-foreground">{list.hint}</p>
      </div>
      <ol className="space-y-2">
        {rows.map((row, i) => {
          const locked = list.locked.includes(row.key);
          const inputId = `${list.settingKey}-${row.key}-label`;
          return (
            <li key={row.key} className={`flex flex-wrap items-center gap-3 rounded-md border border-border p-2 ${row.visible ? '' : 'bg-surface-2 opacity-75'}`}>
              <span className="w-6 text-center text-xs text-muted-foreground" aria-hidden="true">{i + 1}</span>
              <label htmlFor={inputId} className="sr-only">Label for {row.defaultLabel}</label>
              <Input id={inputId} value={row.label} placeholder={row.defaultLabel} maxLength={40} disabled={saving}
                className="h-9 min-w-[10rem] flex-1" onChange={(e) => patch(i, { label: e.target.value })} />
              <div className="flex items-center gap-2">
                <Switch checked={row.visible} disabled={saving || locked} aria-label={`Show ${row.defaultLabel}`}
                  onCheckedChange={(checked) => patch(i, { visible: checked })} />
                <span className="w-12 text-xs text-muted-foreground">{locked ? 'Always' : row.visible ? 'Shown' : 'Hidden'}</span>
              </div>
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={saving || i === 0}
                  aria-label={`Move ${row.defaultLabel} up`} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={saving || i === rows.length - 1}
                  aria-label={`Move ${row.defaultLabel} down`} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
              </div>
            </li>
          );
        })}
      </ol>
      {(error || tooLong) && <p role="alert" className="text-sm text-sell">{error || 'Labels must be 40 characters or fewer.'}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
        {dirty && <span className="mr-auto text-sm text-hold-muted-foreground" role="status">Unsaved changes</span>}
        <Button type="button" variant="ghost" disabled={saving} onClick={() => {
          if (window.confirm(`Restore the ${list.title.toLowerCase()} to its default labels, order and visibility?`)) persist({ items: [] }, 'Sidebar restored to default.');
        }}>
          <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />Restore default
        </Button>
        <Button type="button" variant="outline" disabled={!dirty || saving} onClick={() => setRows(saved)}>
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />Discard
        </Button>
        <Button type="button" disabled={!dirty || saving || Boolean(tooLong)} onClick={() => persist(rowsToConfig(rows), 'Sidebar saved.')}>
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />{saving ? 'Saving...' : 'Save sidebar'}
        </Button>
      </div>
    </section>
  );
}

export default function ManageEntityConfig({ managed, onSaved, onDirtyChange }) {
  const [dirty, setDirty] = useState({ user: false, admin: false });
  const setUserDirty = React.useCallback((d) => setDirty((s) => (s.user === d ? s : { ...s, user: d })), []);
  const setAdminDirty = React.useCallback((d) => setDirty((s) => (s.admin === d ? s : { ...s, admin: d })), []);
  useEffect(() => { if (onDirtyChange) onDirtyChange(dirty.user || dirty.admin); }, [dirty, onDirtyChange]);

  return (
    <div className="space-y-6">
      <SectionNote>
        Rename, hide or reorder sidebar entries. Changes apply to everyone on their next page load. Hiding an entry only
        removes it from the menu — to switch a feature off, use Product Lifecycle Manager. This replaces the former
        “Entity Configuration”, which was never connected to the sidebars.
      </SectionNote>
      <NavList list={LISTS.user} managed={managed} onSaved={onSaved} onDirty={setUserDirty} />
      <NavList list={LISTS.admin} managed={managed} onSaved={onSaved} onDirty={setAdminDirty} />
    </div>
  );
}

const managedShape = PropTypes.shape({
  definitions: PropTypes.arrayOf(PropTypes.object),
  values: PropTypes.object,
  can_edit_security: PropTypes.bool,
});

NavList.propTypes = {
  list: PropTypes.shape({
    settingKey: PropTypes.string.isRequired,
    defaults: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, label: PropTypes.string })).isRequired,
    locked: PropTypes.arrayOf(PropTypes.string).isRequired,
    title: PropTypes.string.isRequired,
    hint: PropTypes.string,
  }).isRequired,
  managed: managedShape,
  onSaved: PropTypes.func.isRequired,
  onDirty: PropTypes.func.isRequired,
};

ManageEntityConfig.propTypes = { managed: managedShape, onSaved: PropTypes.func, onDirtyChange: PropTypes.func };
