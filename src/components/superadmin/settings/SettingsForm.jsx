import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Lock, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { platformSettingsApi, refreshPublicConfig, settingsErrorMessage, settingsFieldErrors } from '@/lib/platformSettingsApi';

/**
 * One section of managed platform settings, driven by the server registry.
 *
 * `fields` lists what this section shows and how:
 *   { key, kind: 'text' | 'textarea' | 'email' | 'url' | 'tel' | 'number' | 'switch', help?, placeholder?, rows? }
 * Labels, bounds, defaults and the role allowed to edit come from the server
 * (`managed.definitions`), so the screen cannot drift from what is enforced.
 * The server validates again on save and its per-field messages are shown
 * next to the inputs.
 */

const toDraft = (kind, value) => {
  if (kind === 'switch') return value === true;
  if (value === null || value === undefined) return '';
  return String(value);
};

/** Mirrors the server's checks for instant feedback; the server stays authoritative. */
export function checkField(def, kind, raw) {
  if (!def) return null;
  if (kind === 'switch') return null;
  const s = String(raw ?? '').trim();
  if (kind === 'number') {
    if (s === '') return 'Enter a number';
    const n = Number(s);
    if (!Number.isFinite(n)) return 'Enter a number';
    if (def.type === 'integer' && !Number.isInteger(n)) return 'Enter a whole number';
    if (def.min !== undefined && n < def.min) return `Must be at least ${def.min}`;
    if (def.max !== undefined && n > def.max) return `Must be at most ${def.max}`;
    return null;
  }
  if (def.min && s.length < def.min) return 'This field is required';
  if (def.max && s.length > def.max) return `Must be ${def.max} characters or fewer`;
  if (/[<>]/.test(s)) return 'Cannot contain < or >';
  if (s && kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return 'Enter a valid email address';
  if (s && kind === 'url' && !/^https:\/\/[^\s]+\.[^\s]+/.test(s)) return 'Enter a full https:// address';
  if (s && kind === 'tel' && !/^\+?[0-9][0-9 ()-]{5,19}$/.test(s)) return 'Enter a valid phone number';
  return null;
}

export default function SettingsForm({ fields, managed, onSaved, onDirtyChange, saveLabel = 'Save changes' }) {
  const defs = useMemo(() => {
    const map = {};
    for (const d of managed?.definitions || []) map[d.key] = d;
    return map;
  }, [managed]);
  const values = managed?.values || {};
  const canEditSecurity = Boolean(managed?.can_edit_security);

  const initial = useMemo(() => {
    const out = {};
    for (const f of fields) out[f.key] = toDraft(f.kind, values[f.key]);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, managed]);

  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(initial); setErrors({}); }, [initial]);

  const changedKeys = fields.map((f) => f.key).filter((k) => draft[k] !== initial[k]);
  const dirty = changedKeys.length > 0;
  useEffect(() => { if (onDirtyChange) onDirtyChange(dirty); }, [dirty, onDirtyChange]);

  const editable = (key) => {
    const def = defs[key];
    if (!def) return false;
    return def.role !== 'super_admin' || canEditSecurity;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const local = {};
    for (const f of fields) {
      if (!changedKeys.includes(f.key)) continue;
      const msg = checkField(defs[f.key], f.kind, draft[f.key]);
      if (msg) local[f.key] = msg;
    }
    if (Object.keys(local).length) {
      setErrors(local);
      toast.error('Please fix the highlighted fields.');
      return;
    }
    const payload = {};
    for (const k of changedKeys) payload[k] = typeof draft[k] === 'string' ? draft[k].trim() : draft[k];
    setSaving(true);
    setErrors({});
    try {
      const result = await platformSettingsApi.save(payload);
      toast.success(result.changed?.length ? 'Settings saved.' : 'No changes to save.');
      if (onSaved) onSaved(result.values);
      refreshPublicConfig();
    } catch (error) {
      const fieldErrors = settingsFieldErrors(error);
      setErrors(fieldErrors);
      toast.error(settingsErrorMessage(error, 'Could not save settings.'));
    } finally {
      setSaving(false);
    }
  };

  const renderField = (f) => {
    const def = defs[f.key];
    if (!def) return null;
    const id = `setting-${f.key}`;
    const disabled = !editable(f.key) || saving;
    const error = errors[f.key];
    const describedBy = [f.help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
    const lockedNote = def.role === 'super_admin' && !canEditSecurity;

    if (f.kind === 'switch') {
      return (
        <div key={f.key} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
          <div className="min-w-0">
            <Label htmlFor={id} className="font-semibold text-foreground">{def.label}</Label>
            {f.help && <p id={`${id}-help`} className="mt-1 text-sm text-muted-foreground">{f.help}</p>}
            {lockedNote && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" aria-hidden="true" /> Super admin only</p>}
            {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-sell">{error}</p>}
          </div>
          <Switch
            id={id}
            checked={draft[f.key] === true}
            onCheckedChange={(checked) => setDraft((d) => ({ ...d, [f.key]: checked }))}
            disabled={disabled}
            aria-describedby={describedBy}
          />
        </div>
      );
    }

    const common = {
      id,
      value: draft[f.key],
      onChange: (e) => setDraft((d) => ({ ...d, [f.key]: e.target.value })),
      disabled,
      placeholder: f.placeholder,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy,
      className: error ? 'border-sell focus-visible:ring-sell' : undefined,
    };
    const max = def.max && f.kind !== 'number' ? def.max : undefined;
    return (
      <div key={f.key} className={f.kind === 'textarea' ? 'space-y-2 md:col-span-2' : 'space-y-2'}>
        <Label htmlFor={id} className="font-semibold text-foreground">{def.label}</Label>
        {f.kind === 'textarea' ? (
          <Textarea {...common} rows={f.rows || 3} maxLength={max} />
        ) : (
          <Input
            {...common}
            type={f.kind === 'number' ? 'number' : f.kind === 'email' ? 'email' : f.kind === 'url' ? 'url' : f.kind === 'tel' ? 'tel' : 'text'}
            inputMode={f.kind === 'number' ? 'decimal' : undefined}
            min={f.kind === 'number' ? def.min : undefined}
            max={f.kind === 'number' ? def.max : undefined}
            step={f.kind === 'number' ? (def.type === 'integer' ? 1 : 0.01) : undefined}
            maxLength={max}
          />
        )}
        {f.help && <p id={`${id}-help`} className="text-xs text-muted-foreground">{f.help}</p>}
        {lockedNote && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" aria-hidden="true" /> Super admin only</p>}
        {error && <p id={`${id}-error`} role="alert" className="text-sm text-sell">{error}</p>}
      </div>
    );
  };

  const switches = fields.filter((f) => f.kind === 'switch');
  const inputs = fields.filter((f) => f.kind !== 'switch');

  return (
    <form onSubmit={handleSave} className="space-y-6" noValidate>
      {switches.length > 0 && <div className="space-y-3">{switches.map(renderField)}</div>}
      {inputs.length > 0 && <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{inputs.map(renderField)}</div>}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        {dirty && <span className="mr-auto text-sm text-hold-muted-foreground" role="status">Unsaved changes</span>}
        <Button type="button" variant="outline" onClick={() => { setDraft(initial); setErrors({}); }} disabled={!dirty || saving}>
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" /> Discard
        </Button>
        <Button type="submit" disabled={!dirty || saving}>
          <Save className="mr-2 h-4 w-4" aria-hidden="true" /> {saving ? 'Saving...' : saveLabel}
        </Button>
      </div>
    </form>
  );
}

/** Small explanatory banner used at the top of a section. */
export function SectionNote({ children, tone = 'info' }) {
  const cls = tone === 'warning'
    ? 'border-hold/30 bg-hold-muted text-hold-muted-foreground'
    : 'border-primary/20 bg-premium-muted text-foreground';
  return <div className={`rounded-lg border p-4 text-sm ${cls}`}>{children}</div>;
}

const managedShape = PropTypes.shape({
  definitions: PropTypes.arrayOf(PropTypes.object),
  values: PropTypes.object,
  can_edit_security: PropTypes.bool,
});

SettingsForm.propTypes = {
  fields: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    kind: PropTypes.oneOf(['text', 'textarea', 'email', 'url', 'tel', 'number', 'switch']).isRequired,
    help: PropTypes.string,
    placeholder: PropTypes.string,
    rows: PropTypes.number,
  })).isRequired,
  managed: managedShape,
  onSaved: PropTypes.func,
  onDirtyChange: PropTypes.func,
  saveLabel: PropTypes.string,
};

SectionNote.propTypes = { children: PropTypes.node, tone: PropTypes.oneOf(['info', 'warning']) };
