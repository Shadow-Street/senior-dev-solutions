import { Button } from '@/components/ui/button';
import { CreditCard, RefreshCw } from 'lucide-react';
import { SectionNote } from './SettingsForm';
import { StatusBadge, StatusFrame, useIntegrationStatus } from './IntegrationStatus';

/**
 * Razorpay is the only gateway the API integrates with, and its keys come from
 * the server environment (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
 * RAZORPAY_WEBHOOK_SECRET). The previous screen saved keys, a Stripe
 * configuration and refund-policy options into platform settings; none of it
 * was used by the payment code, and the secrets were readable by every admin.
 */
export default function ManagePaymentGateway() {
  const { loading, error, data, reload } = useIntegrationStatus();
  const rp = data?.razorpay;
  return (
    <div className="space-y-6">
      <SectionNote>
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-2">
            <p>
              Payments run through <strong>Razorpay</strong>. Its keys are set in the API server environment and are never
              stored in the database or shown in the browser; ask your operations team to change them.
            </p>
            <p>
              Stripe was removed from this screen because the platform has no Stripe integration. Refund behaviour for
              subscriptions is under <strong>Monetization Settings</strong>.
            </p>
          </div>
        </div>
      </SectionNote>
      <StatusFrame loading={loading} error={error} reload={reload}>
        <dl className="divide-y divide-border rounded-lg border border-border">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <dt className="font-medium text-foreground">API keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)</dt>
            <dd><StatusBadge ok={Boolean(rp?.configured)} /></dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <dt className="font-medium text-foreground">Mode</dt>
            <dd className="text-sm font-semibold">
              {rp?.mode === 'live' && <span className="text-buy-muted-foreground">Live — real payments</span>}
              {rp?.mode === 'test' && <span className="text-hold-muted-foreground">Test — payments are simulated</span>}
              {!rp?.mode && <span className="text-muted-foreground">Unknown</span>}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <dt className="font-medium text-foreground">Webhook secret (RAZORPAY_WEBHOOK_SECRET)</dt>
            <dd><StatusBadge ok={Boolean(rp?.webhook_configured)} offText="Missing — refunds and renewals will not settle" /></dd>
          </div>
        </dl>
        <div className="flex justify-end">
          <Button variant="outline" onClick={reload}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Refresh</Button>
        </div>
      </StatusFrame>
    </div>
  );
}
