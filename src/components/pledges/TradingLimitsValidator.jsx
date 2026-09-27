import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

/**
 * Trading Limits Validator - INFORMATIONAL ONLY
 * Shows recommended trading limits based on risk profile
 * Does NOT block pledge creation
 */
export default function TradingLimitsValidator({ riskScore, pledgeAmount }) {
  // Calculate recommended limit based on risk score
  const getRecommendedLimit = (score) => {
    if (score < 50) return { limit: 50000, level: 'Low Risk' };
    if (score < 70) return { limit: 100000, level: 'Medium Risk' };
    return { limit: 200000, level: 'High Risk' };
  };

  const { limit, level } = getRecommendedLimit(riskScore || 50);
  const isAboveRecommended = pledgeAmount > limit;

  // This is now purely informational - does not block
  if (!isAboveRecommended) {
    return null; // Don't show if within recommended limits
  }

  return (
    <div className="bg-hold-muted border border-hold/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-hold-muted-foreground mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-hold-muted-foreground text-sm mb-1">
            Above Recommended Limit
          </h4>
          <p className="text-xs text-hold-muted-foreground mb-2">
            Your pledge amount of <strong>₹{pledgeAmount.toLocaleString()}</strong> exceeds the recommended limit 
            of <strong>₹{limit.toLocaleString()}</strong> for your risk profile ({level}).
          </p>
          <div className="flex items-center gap-2 text-xs text-hold-muted-foreground">
            <Info className="w-4 h-4" />
            <span>This is a recommendation only. You may proceed if you wish.</span>
          </div>
        </div>
      </div>
    </div>
  );
}