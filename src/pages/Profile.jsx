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

import ProfileGeneralSettings from "../components/profile/ProfileGeneralSettings";
import ProfileReferralSection from "../components/profile/ProfileReferralSection";
import ProfileSubscriptionSection from "../components/profile/ProfileSubscriptionSection";
import ProfileTrustScore from "../components/profile/ProfileTrustScore";
import ProfileCreditsSection from "../components/profile/ProfileCreditsSection";

export default function Profile() {
  // Mock user for demo purposes - no authentication required
  const mockUser = {
    id: "demo-user",
    display_name: "Demo User",
    email: "demo@protocall.com",
    app_role: "trader",
    profile_image_url: null
  };

  const [user, setUser] = useState(mockUser);
  const [referrals, setReferrals] = useState([]);
  const [badges, setBadges] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Show profile immediately with mock data - no loading, no authentication
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
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="w-full bg-transparent rounded-none h-auto p-0 grid grid-cols-5 gap-2">
                <TabsTrigger
                  value="general"
                  className="justify-center whitespace-nowrap text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg bg-background text-protocall-blue"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger
                  value="referrals"
                  className="justify-center whitespace-nowrap text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg bg-background text-protocall-blue"
                >
                  <Award className="w-4 h-4" />
                  <span className="hidden sm:inline">Referrals</span>
                </TabsTrigger>
                <TabsTrigger
                  value="subscription"
                  className="justify-center whitespace-nowrap text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg bg-background text-protocall-blue"
                >
                  <Crown className="w-4 h-4" />
                  <span className="hidden sm:inline">Subscription</span>
                </TabsTrigger>
                <TabsTrigger
                  value="trust-score"
                  className="justify-center whitespace-nowrap text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg bg-background text-protocall-blue"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Trust Score</span>
                </TabsTrigger>
                <TabsTrigger
                  value="credits"
                  className="justify-center whitespace-nowrap text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg bg-background text-protocall-blue"
                >
                  <Star className="w-4 h-4" />
                  <span className="hidden sm:inline">Credits</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-6">
                <ProfileGeneralSettings user={user} onUserUpdate={setUser} />
              </TabsContent>

              <TabsContent value="referrals" className="mt-6">
                <ProfileReferralSection
                  user={user}
                  referrals={referrals}
                  badges={badges}
                />
              </TabsContent>

              <TabsContent value="subscription" className="mt-6">
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