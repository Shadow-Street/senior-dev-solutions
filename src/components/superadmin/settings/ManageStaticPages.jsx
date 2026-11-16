import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, RefreshCw, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { platformSettingsApi, settingsErrorMessage, settingsFieldErrors } from '@/lib/platformSettingsApi';
import { SectionNote } from './SettingsForm';

const PUBLIC_PATHS = { privacy: '/Privacy', terms: '/Terms', cookies: '/Cookies', 'risk-disclosure': '/RiskDisclosure' };

/**
 * Editor for the public legal pages. A *published* page replaces the built-in
 * text on its public route; a draft is saved but not shown. Content is plain
 * text (blank lines separate paragraphs) — it is rendered as text, never HTML.
 */
export default function ManageStaticPages({ onDirtyChange }) {
  const [pages, setPages] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [active, setActive] = useState('privacy');
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setPages(await platformSettingsApi.staticPages());
    } catch (error) {
      setLoadError(settingsErrorMessage(error, 'Could not load the pages.'));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saved = useMemo(() => (pages || []).find((p) => p.slug === active) || null, [pages, active]);
  useEffect(() => {
    if (saved) setDraft({ title: saved.title || saved.default_title || '', content: saved.content || '', status: saved.status || 'draft' });
    setErrors({});
  }, [saved]);

  const dirty = Boolean(saved && draft && (draft.title !== saved.title || draft.content !== saved.content || draft.status !== saved.status));
  useEffect(() => { if (onDirtyChange) onDirtyChange(dirty); }, [dirty, onDirtyChange]);

  const switchPage = (slug) => {
    if (slug === active) return;
    if (dirty && !window.confirm('Discard unsaved changes to this page?')) return;
    setActive(slug);
  };

  const save = async (status) => {
    const body = { ...draft, title: draft.title || '', content: draft.content || '', status };
    const local = {};
    if (!body.title.trim()) local.title = 'Title is required';
    if (status === 'published' && body.content.trim().length < 50) local.content = 'Published content must be at least 50 characters';
    if (Object.keys(local).length) { setErrors(local); return; }
    setSaving(true);
    setErrors({});
    try {
      const result = await platformSettingsApi.saveStaticPage(active, body);
      setPages((list) => list.map((p) => (p.slug === active ? { ...p, ...result } : p)));
      toast.success(status === 'published' ? 'Page published.' : 'Saved as draft — the built-in page is shown.');
    } catch (error) {
      setErrors(settingsFieldErrors(error));
      toast.error(settingsErrorMessage(error, 'Could not save the page.'));
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-3 p-6 text-center" role="alert">
        <p className="text-sell">{loadError}</p>
        <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Try again</Button>
      </div>
    );
  }
  if (!pages || !draft) return <div className="p-8 text-center text-muted-foreground" role="status">Loading pages...</div>;

  return (
    <div className="space-y-6">
      <SectionNote>
        Publish your own text for the public legal pages. While a page is a draft (or empty) visitors see the built-in
        version. Write plain text; leave a blank line between paragraphs. Have legal copy reviewed before publishing.
      </SectionNote>

      <div role="tablist" aria-label="Pages" className="flex flex-wrap gap-2">
        {pages.map((p) => (
          <button
            key={p.slug}
            role="tab"
            type="button"
            aria-selected={p.slug === active}
            onClick={() => switchPage(p.slug)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              p.slug === active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-surface-2'}`}
          >
            {p.default_title}
            {p.status === 'published' && <span className="sr-only"> (published)</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {saved.status === 'published'
          ? <Badge className="border-buy/30 bg-buy-muted text-buy-muted-foreground">Published — replaces the built-in page</Badge>
          : <Badge variant="outline">Draft — built-in page shown</Badge>}
        <a href={PUBLIC_PATHS[active]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          View public page <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      <div className="space-y-2">
        <Label htmlFor="static-title" className="font-semibold">Title</Label>
        <Input id="static-title" value={draft.title} maxLength={200} disabled={saving}
          aria-invalid={errors.title ? true : undefined} aria-describedby={errors.title ? 'static-title-error' : undefined}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
        {errors.title && <p id="static-title-error" role="alert" className="text-sm text-sell">{errors.title}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="static-content" className="font-semibold">Content</Label>
        <Textarea id="static-content" value={draft.content} rows={16} maxLength={100000} disabled={saving}
          className="font-mono text-sm" aria-invalid={errors.content ? true : undefined}
          aria-describedby={errors.content ? 'static-content-error' : undefined}
          onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))} />
        <p className="text-xs text-muted-foreground">{draft.content.length.toLocaleString('en-IN')} / 100,000 characters</p>
        {errors.content && <p id="static-content-error" role="alert" className="text-sm text-sell">{errors.content}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        {dirty && <span className="mr-auto text-sm text-hold-muted-foreground" role="status">Unsaved changes</span>}
        <Button type="button" variant="outline" disabled={!dirty || saving}
          onClick={() => setDraft({ title: saved.title || saved.default_title || '', content: saved.content || '', status: saved.status || 'draft' })}>
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />Discard
        </Button>
        <Button type="button" variant="outline" disabled={saving} onClick={() => save('draft')}>
          {saved.status === 'published' ? 'Unpublish (save as draft)' : 'Save draft'}
        </Button>
        <Button type="button" disabled={saving} onClick={() => save('published')}>
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />{saving ? 'Saving...' : 'Publish'}
        </Button>
      </div>
    </div>
  );
}

ManageStaticPages.propTypes = { onDirtyChange: PropTypes.func };
