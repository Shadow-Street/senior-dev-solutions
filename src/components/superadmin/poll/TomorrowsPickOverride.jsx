import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Target, RotateCcw, Save, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { pollAdminApi, errorMessage } from './pollAdminApi';
import { usePollAdminResource } from './usePollAdminResource';

const EMPTY = { title: '', stock_symbol: '', reasoning: '', target_price: '', recommendation_type: 'buy', confidence: 'High' };

/**
 * Tomorrow's Pick override, read by the chat sidebar (components/chat/TomorrowsPick.jsx)
 * from the `tomorrows_pick_override` platform setting. Saved through the
 * validated, audit-logged admin endpoint.
 */
export default function TomorrowsPickOverride({ canManage }) {
  const res = usePollAdminResource(() => pollAdminApi.getTomorrowsPick(), 'tomorrows-pick');
  const [active, setActive] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Fill the form once from the server; later refetches never overwrite edits.
  useEffect(() => {
    if (res.data && saved === null) {
      setSaved(res.data);
      setActive(Boolean(res.data.active));
      if (res.data.active) {
        setForm({
          ...EMPTY,
          ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, res.data[k] ?? EMPTY[k]])),
          target_price: res.data.target_price === undefined || res.data.target_price === null ? '' : String(res.data.target_price),
        });
      }
    }
  }, [res.data, saved]);

  const save = async (nextActive) => {
    setError('');
    if (nextActive && (!form.stock_symbol.trim() || form.reasoning.trim().length < 10)) {
      setError('A stock symbol and at least 10 characters of reasoning are required.');
      return;
    }
    setIsSaving(true);
    try {
      const body = nextActive ? { active: true, ...form, stock_symbol: form.stock_symbol.trim().toUpperCase() } : { active: false };
      const stored = await pollAdminApi.saveTomorrowsPick(body);
      setSaved(stored);
      setActive(Boolean(stored.active));
      if (!stored.active) setForm(EMPTY);
      toast.success(stored.active ? "Tomorrow's Pick override is live" : 'Automatic selection restored');
    } catch (err) {
      setError(errorMessage(err, 'Could not save the override.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (res.isLoading) {
    return <div className="h-64 rounded-xl bg-surface-2 animate-pulse" aria-busy="true" aria-label="Loading Tomorrow's Pick" />;
  }
  if (res.error && !res.data) {
    return (
      <div role="alert" className="rounded-xl border border-sell/30 bg-sell-muted p-6 text-center space-y-3">
        <p className="text-sm text-sell-muted-foreground">{errorMessage(res.error, "Could not load Tomorrow's Pick.")}</p>
        <Button variant="outline" size="sm" onClick={res.reload}>Try again</Button>
      </div>
    );
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-5 h-5 text-primary" aria-hidden="true" />
          Tomorrow&apos;s Pick Override
          {saved?.active && <Badge className="bg-primary text-primary-foreground">LIVE: {saved.stock_symbol}</Badge>}
        </CardTitle>
        <p className="text-sm text-subtle">Choose what members see as &ldquo;Tomorrow&apos;s Pick&rdquo; in chat rooms. Off means it is picked automatically.</p>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="pick-override" className="font-semibold text-foreground">Manual override</Label>
            <p className="text-sm text-subtle">Turn on to set the pick yourself, then save.</p>
          </div>
          <Switch id="pick-override" checked={active} onCheckedChange={setActive} disabled={!canManage} />
        </div>

        {active && (
          <div className="space-y-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 text-primary text-sm font-semibold">
              <Sparkles className="w-4 h-4" aria-hidden="true" />Override details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pick-symbol">Stock symbol *</Label>
                <Input id="pick-symbol" className="uppercase" placeholder="e.g. RELIANCE" value={form.stock_symbol} onChange={set('stock_symbol')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pick-target">Target price (₹)</Label>
                <Input id="pick-target" type="number" min="0" placeholder="e.g. 2500" value={form.target_price} onChange={set('target_price')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pick-type">Recommendation</Label>
                <Select value={form.recommendation_type} onValueChange={set('recommendation_type')}>
                  <SelectTrigger id="pick-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                    <SelectItem value="hold">Hold</SelectItem>
                    <SelectItem value="watch">Watch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pick-confidence">Confidence</Label>
                <Select value={form.confidence} onValueChange={set('confidence')}>
                  <SelectTrigger id="pick-confidence"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pick-title">Headline</Label>
              <Input id="pick-title" placeholder="Defaults to Tomorrow's Pick: SYMBOL" value={form.title} onChange={set('title')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pick-reasoning">Analysis & reasoning *</Label>
              <Textarea id="pick-reasoning" rows={4} maxLength={1000} placeholder="Why is this tomorrow's pick?" value={form.reasoning} onChange={set('reasoning')} />
            </div>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-sell-muted-foreground">{error}</p>}

        {canManage && (
          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="outline" onClick={() => save(false)} disabled={isSaving || (!saved?.active && !active)}>
              <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />Reset to automatic
            </Button>
            <Button onClick={() => save(active)} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" aria-hidden="true" />{isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}

        {!active && (
          <div className="p-4 rounded-lg bg-surface-2 border border-border">
            <div className="flex items-center gap-2 text-primary mb-1 text-sm font-semibold">
              <TrendingUp className="w-4 h-4" aria-hidden="true" />Automatic mode
            </div>
            <p className="text-xs text-subtle">The chat sidebar shows the latest advisor recommendation.</p>
          </div>
        )}
        {saved?.updated_at && (
          <p className="text-xs text-muted-foreground">Last changed {new Date(saved.updated_at).toLocaleString()} by {saved.updated_by || 'an admin'}.</p>
        )}
      </CardContent>
    </Card>
  );
}
