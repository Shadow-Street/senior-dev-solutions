import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, CircleSlash, RefreshCw, ShieldCheck } from 'lucide-react';
import { platformSettingsApi, settingsErrorMessage } from '@/lib/platformSettingsApi';
import { SectionNote } from './SettingsForm';

/**
 * Read-only status of the integrations the API is configured with.
 * Credentials are set in the server environment and never travel to the
 * browser; this screen only learns whether each one is present.
 */
export function useIntegrationStatus() {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      setState({ loading: false, error: null, data: await platformSettingsApi.integrations() });
    } catch (error) {
      setState({ loading: false, error: settingsErrorMessage(error, 'Could not load integration status.'), data: null });
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

export function StatusBadge({ ok, okText = 'Configured', offText = 'Not configured' }) {
  return ok ? (
    <Badge className="border-buy/30 bg-buy-muted text-buy-muted-foreground"><CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />{okText}</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground"><CircleSlash className="mr-1 h-3 w-3" aria-hidden="true" />{offText}</Badge>
  );
}

export function StatusFrame({ loading, error, reload, children }) {
  if (loading) return <div className="p-8 text-center text-muted-foreground" role="status">Checking configuration...</div>;
  if (error) {
    return (
      <div className="space-y-3 p-6 text-center" role="alert">
        <p className="text-sell">{error}</p>
        <Button variant="outline" onClick={reload}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Try again</Button>
      </div>
    );
  }
  return children;
}

export default function IntegrationStatus() {
  const { loading, error, data, reload } = useIntegrationStatus();
  return (
    <div className="space-y-6">
      <SectionNote>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p>
            API keys are configured in the server environment by your operations team, not from the browser, so they
            cannot leak through the admin panel. This page shows which integrations the API currently has. The old
            Stock Data, News and Google Maps key fields were removed: nothing used the values typed there. Live
            market data is managed under <strong>Market Data (Dhan)</strong>.
          </p>
        </div>
      </SectionNote>
      <StatusFrame loading={loading} error={error} reload={reload}>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {(data?.integrations || []).map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">Environment: {item.env.join(', ')}</p>
              </div>
              <StatusBadge ok={item.configured} />
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button variant="outline" onClick={reload}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Refresh</Button>
        </div>
      </StatusFrame>
    </div>
  );
}

StatusBadge.propTypes = { ok: PropTypes.bool, okText: PropTypes.string, offText: PropTypes.string };
StatusFrame.propTypes = { loading: PropTypes.bool, error: PropTypes.string, reload: PropTypes.func.isRequired, children: PropTypes.node };
