import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, KeyRound, Loader2, PlugZap, RefreshCw, ShieldAlert, XCircle,
} from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { marketDataAdminApi, marketDataErrorMessage } from '@/lib/marketDataAdminApi';

const STATUS_POLL_MS = 60_000;

function formatDateTime(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? 'Never'
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** "in 5h 12m" / "3h 4m ago". */
function relativeTime(iso, now = Date.now()) {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - now;
  if (Number.isNaN(diff)) return '';
  const mins = Math.round(Math.abs(diff) / 60000);
  const text = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

function renderStatusBadge(status) {
  if (!status.encryption_available) {
    return <Badge variant="outline" className="border-sell/30 bg-sell-muted text-sell-muted-foreground">Encryption key missing</Badge>;
  }
  if (!status.configured) {
    return <Badge variant="outline" className="border-divider bg-surface-2 text-subtle">Not configured</Badge>;
  }
  if (status.status === 'lapsed') {
    return <Badge variant="outline" className="border-sell/30 bg-sell-muted text-sell-muted-foreground">Lapsed</Badge>;
  }
  if (status.disabled_reason) {
    return <Badge variant="outline" className="border-hold/30 bg-hold-muted text-hold-muted-foreground">Needs attention</Badge>;
  }
  return <Badge variant="outline" className="border-buy/30 bg-buy-muted text-buy-muted-foreground">Active</Badge>;
}

function renderFact(label, value, hint) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-foreground">{value}</dd>
      {hint ? <dd className="text-xs text-subtle">{hint}</dd> : null}
    </div>
  );
}

function renderGuidance(status) {
  if (!status.encryption_available) {
    return (
      <Alert variant="destructive" className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">The server has no encryption key for market data credentials</p>
          <p className="text-sm">Set <code>MARKET_DATA_KEY</code> in the API environment and restart. Until then the token cannot be stored and live NSE data stays on the fallback providers.</p>
        </div>
      </Alert>
    );
  }
  if (status.status === 'lapsed') {
    return (
      <Alert variant="destructive" className="flex items-start gap-3" aria-live="polite">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Lapsed</p>
          <p className="text-sm">Generate a new token at web.dhan.co &gt; My Profile &gt; Access DhanHQ APIs and paste it here. Live NSE data is using the fallback providers until you do.</p>
          {status.last_error ? <p className="mt-1 text-xs">Reason: {status.last_error}</p> : null}
        </div>
      </Alert>
    );
  }
  if (!status.configured) {
    return (
      <Alert className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Connect DhanHQ</p>
          <p className="text-sm">Generate an access token at web.dhan.co &gt; My Profile &gt; Access DhanHQ APIs (the Data API subscription must be active) and paste it below. After that the token renews itself every day.</p>
        </div>
      </Alert>
    );
  }
  if (status.disabled_reason === 'decrypt_failed') {
    return (
      <Alert variant="destructive" className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-sm">The stored token cannot be decrypted with the current <code>MARKET_DATA_KEY</code>. Paste the token again to replace it.</p>
      </Alert>
    );
  }
  return null;
}

function renderTestResult(result) {
  if (!result) return null;
  return (
    <Alert variant={result.ok ? 'default' : 'destructive'} className="flex items-start gap-3" aria-live="polite">
      {result.ok
        ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden="true" />
        : <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
      <div className="text-sm">
        {result.ok ? (
          <>
            <p className="font-semibold">Dhan accepted the token</p>
            <p>Data API plan: {result.data_plan || 'unknown'}{result.token_valid_until ? ` · token valid until ${formatDateTime(result.token_valid_until)}` : ''}</p>
          </>
        ) : (
          <p className="font-semibold">{result.message || `Check failed (${String(result.reason || 'unknown').replace(/_/g, ' ')})`}</p>
        )}
      </div>
    </Alert>
  );
}

export default function ManageMarketData() {
  const [status, setStatus] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [clientId, setClientId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(null); // 'save' | 'renew' | 'test' | null
  const [testResult, setTestResult] = useState(null);

  const load = useCallback(async () => {
    try {
      setStatus(await marketDataAdminApi.status());
      setLoadError(null);
    } catch (error) {
      setLoadError(marketDataErrorMessage(error, 'Could not load the market data status.'));
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, STATUS_POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const handleSave = async (event) => {
    event.preventDefault();
    setFormError(null);
    const id = clientId.trim();
    const token = accessToken.trim();
    if (!/^\d{4,20}$/.test(id)) { setFormError('Enter the numeric Dhan client id.'); return; }
    if (token.length < 20) { setFormError('Paste the full access token.'); return; }
    setBusy('save');
    try {
      setStatus(await marketDataAdminApi.save({ clientId: id, accessToken: token }));
      setAccessToken(''); // write-only: never kept on screen after submit
      setTestResult(null);
      toast.success('Dhan token verified and saved. It will renew automatically.');
    } catch (error) {
      setFormError(marketDataErrorMessage(error, 'Could not save the token.'));
    } finally {
      setBusy(null);
    }
  };

  const handleRenew = async () => {
    setBusy('renew');
    try {
      setStatus(await marketDataAdminApi.renew());
      toast.success('Token renewed.');
    } catch (error) {
      toast.error(marketDataErrorMessage(error, 'Renewal failed.'));
      await load();
    } finally {
      setBusy(null);
    }
  };

  const handleTest = async () => {
    setBusy('test');
    try {
      const result = await marketDataAdminApi.test();
      setTestResult(result);
      if (result.status) setStatus(result.status);
    } catch (error) {
      setTestResult({ ok: false, message: marketDataErrorMessage(error, 'Test failed.') });
    } finally {
      setBusy(null);
    }
  };

  if (!status && !loadError) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading market data status">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!status) {
    return (
      <Alert variant="destructive" className="flex items-center justify-between gap-3">
        <span className="text-sm">{loadError}</span>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Retry</Button>
      </Alert>
    );
  }

  const canRenew = status.encryption_available && status.configured && status.status !== 'lapsed';
  const canTest = status.encryption_available && status.configured && status.status !== 'lapsed';
  const keyMissing = !status.encryption_available;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Activity className="h-5 w-5 text-premium" aria-hidden="true" /> DhanHQ live NSE data
        </h3>
        {renderStatusBadge(status)}
        {status.provider_active
          ? <Badge variant="outline" className="border-buy/30 bg-buy-muted text-buy-muted-foreground"><PlugZap className="mr-1 h-3 w-3" aria-hidden="true" />Serving live data</Badge>
          : <Badge variant="outline" className="border-divider bg-surface-2 text-subtle">Using fallback providers</Badge>}
        {loadError ? <span className="text-xs text-sell-muted-foreground" role="status">Could not refresh: {loadError}</span> : null}
      </div>

      {renderGuidance(status)}

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {renderFact('Client id', status.client_id_masked || 'Not set')}
        {renderFact('Token expires', formatDateTime(status.expires_at), relativeTime(status.expires_at))}
        {renderFact('Last renewed', formatDateTime(status.last_renewed_at), relativeTime(status.last_renewed_at))}
        {renderFact('NSE symbols tracked', status.universe_size ? status.universe_size.toLocaleString() : '0',
          status.market_open ? 'Market open · refreshing every minute' : 'Market closed · refreshing every 15 minutes')}
        {renderFact('Last market snapshot', formatDateTime(status.snapshot_at), status.snapshot_stale ? 'Stale' : relativeTime(status.snapshot_at))}
        {renderFact('Last error', status.last_error || 'None', status.last_error_at ? formatDateTime(status.last_error_at) : undefined)}
      </dl>

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-border bg-card p-4" autoComplete="off">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-premium" aria-hidden="true" />
          <h4 className="font-semibold text-foreground">{status.configured ? 'Replace the access token' : 'Add the access token'}</h4>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dhan-client-id">Dhan client id</Label>
            <Input
              id="dhan-client-id"
              inputMode="numeric"
              autoComplete="off"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 1100003626"
              disabled={keyMissing || busy !== null}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dhan-access-token">Access token</Label>
            <Input
              id="dhan-access-token"
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={status.configured ? 'Paste a new token to replace the stored one' : 'Paste the token from web.dhan.co'}
              disabled={keyMissing || busy !== null}
            />
          </div>
        </div>
        <p className="text-xs text-subtle">The token is checked with Dhan before it is stored, saved encrypted, and never shown again. Only tokens generated from Dhan Web can be renewed automatically.</p>
        {formError ? <p role="alert" className="text-sm text-sell-muted-foreground">{formError}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={keyMissing || busy !== null || !clientId || !accessToken} className="bg-buy font-semibold text-buy-foreground hover:bg-buy-soft">
            {busy === 'save' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />}
            Verify and save
          </Button>
          <Button type="button" variant="outline" onClick={handleRenew} disabled={!canRenew || busy !== null}>
            {busy === 'renew' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
            Renew now
          </Button>
          <Button type="button" variant="outline" onClick={handleTest} disabled={!canTest || busy !== null}>
            {busy === 'test' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Clock className="mr-2 h-4 w-4" aria-hidden="true" />}
            Test connection
          </Button>
        </div>
      </form>

      {renderTestResult(testResult)}
    </div>
  );
}
