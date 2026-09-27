import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Star, Wallet, Crown, TrendingUp, MessageSquare } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function QuickActions({ user }) {
  console.log('🔍 QuickActions - User:', user);
  console.log('🔍 QuickActions - App Role:', user?.app_role);
  console.log('🔍 QuickActions - Roles:', user?.roles);

  // ✅ Check if user already has these roles
  const isAdvisor = user?.app_role === 'advisor' || user?.roles?.includes('advisor');
  const isFinfluencer = user?.app_role === 'finfluencer' || user?.roles?.includes('finfluencer');

  console.log('✅ Is Advisor:', isAdvisor);
  console.log('✅ Is Finfluencer:', isFinfluencer);

  const quickActions = [
    {
      icon: MessageSquare,
      label: "Join Chat",
      url: createPageUrl("ChatRooms"),
      show: true,
      gradient: "from-protocall-blue to-protocall-deep",
      iconColor: "text-white",
    },
    {
      icon: TrendingUp,
      label: "Vote on Polls",
      url: createPageUrl("Polls"),
      show: true,
      gradient: "from-protocall-grape to-protocall-deep",
      iconColor: "text-white",
    },
    {
      icon: Wallet,
      label: "Pledge Pool",
      url: createPageUrl("PledgePool"),
      show: true,
      gradient: "from-protocall-deep to-protocall-blue",
      iconColor: "text-white",
    },
    {
      icon: Shield,
      label: "Become Advisor",
      url: createPageUrl("AdvisorRegistration"),
      show: !isAdvisor,
      gradient: "from-protocall-blue to-protocall-grape",
      iconColor: "text-white",
    },
    {
      icon: Star,
      label: "Become Finfluencer",
      url: createPageUrl("Finfluencers"),
      show: !isFinfluencer,
      gradient: "from-protocall-grape to-protocall-light",
      iconColor: "text-white",
    },
    {
      icon: Crown,
      label: "Upgrade Plan",
      url: createPageUrl("Subscription"),
      show: true,
      gradient: "from-protocall-deep to-protocall-premium-light",
      iconColor: "text-white",
    },
  ];

  return (
    <Card className="shadow-lg border border-border bg-card">
      <CardHeader className="border-b border-divider bg-surface-2">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <TrendingUp className="w-5 h-5 text-protocall-blue" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action, index) => (
            action.show && (
              <button
                key={action.label + index}
                onClick={() => window.location.href = action.url}
                className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-surface-2 transition-all duration-200 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-200`}>
                  <action.icon className={`w-6 h-6 ${action.iconColor}`} />
                </div>
                <span className="text-xs font-medium text-subtle text-center leading-tight">{action.label}</span>
              </button>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
}