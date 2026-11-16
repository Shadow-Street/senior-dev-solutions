import SettingsForm, { SectionNote } from './SettingsForm';

const FIELDS = [
  { key: 'referral_system_enabled', kind: 'switch', help: 'When off, members cannot generate codes or apply a code, and the referral area shows the programme as paused. Existing referrals are kept.' },
  { key: 'referral_inviter_bonus', kind: 'number', help: 'Recorded on each new referral when the invited member applies a code, and shown on the referral screen. Paying it out is a manual step: there is no automatic payout or wallet.' },
  { key: 'referral_conditions', kind: 'textarea', rows: 3, help: 'Shown to members next to their referral link.' },
];

export default function ManageReferrals(props) {
  return (
    <div className="space-y-6">
      <SectionNote>
        Rules for the member referral programme, enforced by the API. Rewards are recorded on each referral; the platform
        has no automatic payout, so describe how rewards are paid in the conditions below. The separate invitee bonus
        option was removed: there is no wallet or credit ledger to pay it into, so it could not take effect.
      </SectionNote>
      <SettingsForm fields={FIELDS} {...props} saveLabel="Save referral settings" />
    </div>
  );
}
