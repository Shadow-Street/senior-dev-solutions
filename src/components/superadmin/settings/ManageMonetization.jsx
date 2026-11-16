import SettingsForm, { SectionNote } from './SettingsForm';

const FIELDS = [
  { key: 'subscription_refund_enabled', kind: 'switch', help: 'On: cancelling a paid subscription refunds the unused amount through Razorpay. Off: cancelling only stops renewal; the plan runs to the end of its period and nothing is refunded. Event and course refunds are not affected.' },
  { key: 'global_commission_rate', kind: 'number', help: 'Platform share of advisor subscription payments when no advisor-specific rate is set under Stock Advisors > Pricing & Commission.' },
];

export default function ManageMonetization(props) {
  return (
    <div className="space-y-6">
      <SectionNote>
        Applied by the server when payments and cancellations are processed. Ad campaign prices and the minimum payout
        threshold were removed from this screen: campaign prices are set per campaign and no payout rule read the
        threshold, so changing them here had no effect.
      </SectionNote>
      <SettingsForm fields={FIELDS} {...props} saveLabel="Save monetization settings" />
    </div>
  );
}
