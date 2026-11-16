import PropTypes from 'prop-types';
import { Gift, PauseCircle } from 'lucide-react';
import { formatINR } from '@/lib/format';

/**
 * Referral rules from Platform Settings > Referral Settings, shown to members.
 * `config` is the public platform config (usePublicConfig()).
 */
export default function ReferralProgramNotice({ config }) {
  if (config.referral_system_enabled === false) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-hold/30 bg-hold-muted p-4 text-sm text-hold-muted-foreground">
        <PauseCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p><span className="font-semibold">The referral programme is paused.</span> New invite codes cannot be used right now; your existing referrals are kept.</p>
      </div>
    );
  }
  const bonus = Number(config.referral_inviter_bonus) || 0;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-premium-muted p-4 text-sm text-foreground">
      <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="space-y-1">
        {bonus > 0 && <p className="font-semibold">Referral reward: {formatINR(bonus)} for each friend who joins with your code.</p>}
        {config.referral_conditions && <p className="text-muted-foreground">{config.referral_conditions}</p>}
      </div>
    </div>
  );
}

ReferralProgramNotice.propTypes = {
  config: PropTypes.shape({
    referral_system_enabled: PropTypes.bool,
    referral_inviter_bonus: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    referral_conditions: PropTypes.string,
  }).isRequired,
};
