
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield, TrendingUp, Award, Users } from 'lucide-react';

export default function ProfileTrustScore({ user }) {
  const trustScore = user.trust_score || 50;

  const getScoreColor = (score) => {
    if (score >= 80) return { color: 'text-buy-muted-foreground', bg: 'from-buy to-buy-soft', ring: 'ring-buy' };
    if (score >= 40) return { color: 'text-hold-muted-foreground', bg: 'from-hold to-hold', ring: 'ring-hold' };
    return { color: 'text-sell-muted-foreground', bg: 'from-sell to-sell', ring: 'ring-sell' };
  };

  const getScoreLevel = (score) => {
    if (score >= 80) return 'Trusted Trader';
    if (score >= 60) return 'Reliable Member';
    if (score >= 40) return 'Growing Trader';
    return 'New Member';
  };

  const scoreData = getScoreColor(trustScore);
  const scoreLevel = getScoreLevel(trustScore);

  return (
    <div className="space-y-6">
      {/* Trust Score Display */}
      <Card className={`bg-gradient-to-r ${scoreData.bg} text-white border-0 shadow-lg`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="w-6 h-6" />
            Community Trust Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-6xl font-bold mb-2">{Math.round(trustScore)}</div>
            <div className="text-xl opacity-90">out of 100</div>
            <div className="text-sm opacity-80 mt-2">{scoreLevel}</div>
          </div>
          
          <div className="bg-white/20 rounded-full h-3">
            <div
              className="bg-white rounded-full h-3 transition-all duration-500"
              style={{ width: `${trustScore}%` }} />

          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <CardHeader className="bg-surface-2">
          <CardTitle>How Trust Score Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="bg-premium-muted my-1 p-3 flex items-start gap-3 rounded-lg">
              <Users className="w-5 h-5 text-protocall-blue mt-0.5" />
              <div>
                <h4 className="font-semibold text-protocall-blue">Community Participation</h4>
                <p className="text-sm text-protocall-blue">Active engagement in chat rooms and polls increases your score</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-buy-muted rounded-lg">
              <TrendingUp className="w-5 h-5 text-buy-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold text-buy-muted-foreground">Successful Referrals</h4>
                <p className="text-sm text-buy-muted-foreground">Inviting quality members to the community boosts your trust</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-premium-muted rounded-lg">
              <Award className="w-5 h-5 text-protocall-premium-text mt-0.5" />
              <div>
                <h4 className="font-semibold text-protocall-premium-text">Quality Contributions</h4>
                <p className="text-sm text-protocall-premium-text">Helpful advice and positive community behavior</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-surface-2 rounded-lg">
            <h4 className="font-semibold mb-2">Trust Score Ranges:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>0-39: New Member</span>
                <span className="text-sell-muted-foreground">●</span>
              </div>
              <div className="flex justify-between">
                <span>40-59: Growing Trader</span>
                <span className="text-hold-muted-foreground">●</span>
              </div>
              <div className="flex justify-between">
                <span>60-79: Reliable Member</span>
                <span className="text-hold-muted-foreground">●</span>
              </div>
              <div className="flex justify-between">
                <span>80-100: Trusted Trader</span>
                <span className="text-buy-muted-foreground">●</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);

}