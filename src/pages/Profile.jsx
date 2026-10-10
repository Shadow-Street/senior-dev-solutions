import React, { useState, useEffect } from "react";
import { User, Referral, ReferralBadge, Subscription } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Award,
  Crown,
  Shield,
  Star,
  UserIcon,
  TrendingUp
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/components/context/AuthContext";

import ProfileGeneralSettings from "../components/profile/ProfileGeneralSettings";
import ProfileReferralSection from "../components/profile/ProfileReferralSection";
import ProfileSubscriptionSection from "../components/profile/ProfileSubscriptionSection";
import ProfileBillingSection from "../components/profile/ProfileBillingSection";
import ProfileTrustScore from "../components/profile/ProfileTrustScore";
import ProfileCreditsSection from "../components/profile/ProfileCreditsSection";

export default function Profile() {
  /**
   * This page used to render a hardcoded `mockUser` — "Demo User",
   * demo@protocall.com — for every visitor, with a comment saying no
   * authentication was required. Whoever you signed in as, the profile showed
   * someone else's details, which is what made it look like accounts were
   * being mixed up. Everything here now comes from the authenticated session.
   */
  const { user: authUser, loading: authLoading, refreshUser } = useAuth();

  const [user, setUser] = useState(authUser);
  const [referrals, setReferrals] = useState([]);
  const [badges, setBadges] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(authUser);
  }, [authUser]);

  useEffect(() => {
    let cancelled = false;
    if (!authUser?.id) {
      setReferrals([]);
      setBadges([]);
      setSubscription(null);
      setIsLoading(false);
      return undefined;
    }

    // Everything is scoped to the signed-in id, so one account can never be
    // shown another's referrals, badges or plan.
    (async () => {
      setIsLoading(true);
      const [ref, bdg, sub] = await Promise.all([
        Referral.filter({ referrer_id: authUser.id }).catch(() => []),
        ReferralBadge.filter({ user_id: authUser.id }).catch(() => []),
        Subscription.filter({ user_id: authUser.id }).catch(() => []),
      ]);
      if (cancelled) return;
      setReferrals(Array.isArray(ref) ? ref : []);
      setBadges(Array.isArray(bdg) ? bdg : []);
      setSubscription(Array.isArray(sub) ? sub[0] || null : sub || null);
      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [authUser?.id]);

  /** Persist a profile edit, then re-read the session so every surface agrees. */
  const handleUserUpdate = async (updated) => {
    setUser(updated);
    await refreshUser();
  };

  if (authLoading) {
    return (
      <div className="w-full bg-background p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="space-y-4 text-center">
            <Skeleton className="mx-auto h-24 w-24 rounded-full" />
            <Skeleton className="mx-auto h-7 w-48" />
            <Skeleton className="mx-auto h-4 w-64" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="w-full bg-background p-6">
        <Card className="mx-auto max-w-md border border-border bg-card text-center shadow-sm">
          <CardContent className="space-y-4 p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-premium-muted">
              <UserIcon className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Sign in to view your profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your referrals, plan and trust score are tied to your account.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to={createPageUrl("Login")}>Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-protocall-deep to-protocall-blue flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            {user.profile_image_url ? (
              <img src={user.profile_image_url} alt={user.display_name} className="w-24 h-24 rounded-full object-cover" />
            ) : (
              user.display_name?.[0]
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{user.display_name}</h1>
            <p className="text-subtle">{user.email}</p>
          </div>
        </div>

        {/* Profile Tabs */}
        <Card className="border border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="w-full bg-transparent rounded-none h-auto p-0 grid grid-cols-5 gap-2">
                <TabsTrigger
                  value="general"
                  className="justify-center whitespace-nowrap text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg bg-card text-primary"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger
                  value="referrals"
                  className="justify-center whitespace-nowrap text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg bg-card text-primary"
                >
                  <Award className="w-4 h-4" />
                  <span className="hidden sm:inline">Referrals</span>
                </TabsTrigger>
                <TabsTrigger
                  value="subscription"
                  className="justify-center whitespace-nowrap text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg bg-card text-primary"
                >
                  <Crown className="w-4 h-4" />
                  <span className="hidden sm:inline">Subscription</span>
                </TabsTrigger>
                <TabsTrigger
                  value="trust-score"
                  className="justify-center whitespace-nowrap text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg bg-card text-primary"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Trust Score</span>
                </TabsTrigger>
                <TabsTrigger
                  value="credits"
                  className="justify-center whitespace-nowrap text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg bg-card text-primary"
                >
                  <Star className="w-4 h-4" />
                  <span className="hidden sm:inline">Credits</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-6">
                <ProfileGeneralSettings user={user} onUserUpdate={handleUserUpdate} />
              </TabsContent>

              <TabsContent value="referrals" className="mt-6">
                <ProfileReferralSection
                  user={user}
                  referrals={referrals}
                  badges={badges}
                />
              </TabsContent>

              <TabsContent value="subscription" className="mt-6 space-y-5">
                <ProfileBillingSection subscription={subscription} />
                <ProfileSubscriptionSection subscription={subscription} />
              </TabsContent>

              <TabsContent value="trust-score" className="mt-6">
                <ProfileTrustScore user={user} />
              </TabsContent>

              <TabsContent value="credits" className="mt-6">
                <ProfileCreditsSection user={user} referrals={referrals} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}