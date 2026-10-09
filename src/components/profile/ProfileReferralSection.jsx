
import React, { useState, useEffect, useCallback } from 'react';
import { Referral } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Share2, Copy, Award, Crown, Shield, Star, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileReferralSection({ user, referrals, badges }) {
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");

  const generateReferralData = useCallback(async () => {
    if (!user) return;
    
    // Check if user already has a referral code
    const existingReferrals = referrals.filter(r => r.referral_code);
    
    let code;
    if (existingReferrals.length > 0) {
      code = existingReferrals[0].referral_code;
    } else {
      // Generate new referral code
      code = `REF${user.id.slice(-6).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      try {
        await Referral.create({
          inviter_id: user.id,
          referral_code: code
        });
      } catch (error) {
        console.error("Error creating referral:", error);
      }
    }

    setReferralCode(code);
    setReferralLink(`${window.location.origin}/invite/${code}`);
  }, [user, referrals]);

  useEffect(() => {
    generateReferralData();
  }, [generateReferralData]);

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const shareViaWhatsApp = () => {
    const message = `Join me on Protocol, India's largest retail investor community! Use my referral link: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = "Join Protocol Trading Community";
    const body = `Join me on Protocol, India's largest retail investor community! Use my referral link: ${referralLink}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const successfulReferrals = referrals.filter(r => r.signup_completed).length;
  const activeMembers = referrals.filter(r => r.is_active_member).length;

  const getBadgeProgress = () => {
    if (activeMembers >= 10) return { current: "Community Champion", progress: 100, next: null, color: "from-hold to-hold" };
    if (activeMembers >= 5) return { current: "Community Leader", progress: 100, next: "Community Champion (10 referrals)", color: "from-protocall-grape to-protocall-blue" };
    if (activeMembers >= 1) return { current: "Community Builder", progress: 100, next: "Community Leader (5 referrals)", color: "from-buy to-protocall-blue" };
    
    return { current: null, progress: 0, next: "Community Builder (1 referral)", color: "from-surface-2 to-surface-2" };
  };

  const badgeProgress = getBadgeProgress();

  return (
    <div className="space-y-6">
      {/* Referral Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-protocall-deep to-protocall-blue text-white border-0">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <div className="text-2xl font-bold">{referrals.length}</div>
            <div className="text-xs opacity-90">Total Invites</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-buy to-protocall-blue text-white border-0">
          <CardContent className="p-4 text-center">
            <Star className="w-8 h-8 mx-auto mb-2" />
            <div className="text-2xl font-bold">{successfulReferrals}</div>
            <div className="text-xs opacity-90">Successful Signups</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-hold to-sell text-white border-0">
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 mx-auto mb-2" />
            <div className="text-2xl font-bold">{activeMembers}</div>
            <div className="text-xs opacity-90">Active Members</div>
          </CardContent>
        </Card>
      </div>

      {/* Badge Progress */}
      <Card className="bg-card border-protocall-premium-light">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-protocall-premium-text">
            <Crown className="w-5 h-5" />
            Badge Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {badgeProgress.current ? (
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-hold-muted-foreground" />
              <div>
                <p className="font-semibold text-lg text-foreground">Current Badge: {badgeProgress.current}</p>
                <p className="text-sm text-subtle">Congratulations on your achievement!</p>
              </div>
            </div>
          ) : (
            <p className="text-subtle">No badges earned yet. Make your first referral to get started!</p>
          )}
          
          {badgeProgress.next && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-subtle">Next: {badgeProgress.next}</p>
                <span className="text-xs text-muted-foreground">{activeMembers}/10</span>
              </div>
              <div className="relative h-2 bg-border rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-protocall-deep to-protocall-blue rounded-full transition-all duration-500"
                  style={{ width: `${(activeMembers / 10) * 100}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Link */}
      <Card>
        <CardHeader className="bg-card border-b border-divider">
          <CardTitle className="flex items-center gap-2 text-buy-muted-foreground">
            <Share2 className="w-5 h-5" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4 bg-gradient-to-r from-surface-2 to-buy-muted border-buy/30 rounded-b-lg">
          <div className="flex gap-2">
            <Input 
              value={referralLink}
              readOnly
              className="font-mono text-sm bg-white"
            />
            <Button 
              onClick={copyReferralLink} 
              variant="outline"
              className="text-foreground border-border hover:bg-gradient-to-r hover:from-surface-2 hover:to-surface-2 hover:border-protocall-premium-light transition-all duration-300"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={shareViaWhatsApp} 
              className="bg-buy text-buy-foreground hover:bg-buy-soft flex-1"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button 
              onClick={shareViaEmail} 
              variant="outline" 
              className="flex-1 text-foreground border-border hover:bg-gradient-to-r hover:from-surface-2 hover:to-surface-2 hover:border-protocall-premium-light transition-all duration-300"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
