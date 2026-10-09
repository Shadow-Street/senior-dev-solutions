import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, UserPlus, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function ReferralHistory({ referrals }) {
  const getStatusBadge = (referral) => {
    if (referral.is_active_member) {
      return <Badge className="bg-buy-muted text-buy-muted-foreground border-buy/30">Active Member</Badge>;
    } else if (referral.signup_completed) {
      return <Badge className="bg-premium-muted text-primary border-protocall-premium-light">Signed Up</Badge>;
    } else if (referral.invitee_email) {
      return <Badge className="bg-hold-muted text-hold-muted-foreground border-hold/30">Invited</Badge>;
    } else {
      return <Badge className="bg-surface-2 text-foreground border-border">Link Generated</Badge>;
    }
  };

  const getStatusIcon = (referral) => {
    if (referral.is_active_member) {
      return <CheckCircle className="w-4 h-4 text-positive" />;
    } else if (referral.signup_completed) {
      return <UserPlus className="w-4 h-4 text-protocall-premium-light" />;
    } else {
      return <Clock className="w-4 h-4 text-hold" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-subtle" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {referrals.length > 0 ? (
          <div className="space-y-3">
            {referrals.slice(0, 10).map((referral) => (
              <div key={referral.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                {getStatusIcon(referral)}
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {referral.invitee_email ? `Invited ${referral.invitee_email}` : 'Referral link created'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(referral.created_date), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {getStatusBadge(referral)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-subtle mb-2">No referral activity yet</h3>
            <p className="text-sm text-subtle">Start sharing your referral link to see activity here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}