import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Crown, Shield, Star } from "lucide-react";

export default function BadgeShowcase({ badges }) {
  const badgeIcons = {
    community_builder: Award,
    community_leader: Shield,
    community_champion: Crown
  };

  const badgeColors = {
    community_builder: "bg-premium-muted text-primary border-protocall-premium-light",
    community_leader: "bg-premium-muted text-protocall-premium-text border-protocall-premium-light",
    community_champion: "bg-hold-muted text-hold-muted-foreground border-hold/30"
  };

  const badgeBackgrounds = {
    community_builder: "bg-primary",
    community_leader: "bg-primary",
    community_champion: "bg-hold"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-hold" />
          Your Badges
        </CardTitle>
      </CardHeader>
      <CardContent>
        {badges.length > 0 ? (
          <div className="space-y-4">
            {badges.map((badge) => {
              const IconComponent = badgeIcons[badge.badge_type];
              return (
                <div key={badge.id} className="flex items-center gap-4 p-3 rounded-lg bg-surface-2">
                  <div className={`w-12 h-12 rounded-full ${badgeBackgrounds[badge.badge_type]} flex items-center justify-center text-white`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{badge.badge_name}</h3>
                    <p className="text-sm text-subtle">
                      Earned with {badge.referral_count} successful referrals
                    </p>
                    {badge.trust_score_bonus && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        +{badge.trust_score_bonus} Trust Score
                      </Badge>
                    )}
                  </div>
                  <Badge className={badgeColors[badge.badge_type]}>
                    Active
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-subtle mb-2">No badges earned yet</h3>
            <p className="text-sm text-subtle">Start inviting traders to earn your first badge!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}