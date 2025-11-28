import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Star, Calendar, Crown, TrendingUp, MessageSquare } from 'lucide-react';
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
      gradient: "from-blue-500 to-cyan-500",
      iconColor: "text-white",
    },
    {
      icon: TrendingUp,
      label: "Vote on Polls",
      url: createPageUrl("Polls"),
      show: true,
      gradient: "from-purple-500 to-pink-500",
      iconColor: "text-white",
    },
    {
      icon: Calendar,
      label: "Browse Events",
      url: createPageUrl("Events"),
      show: true,
      gradient: "from-green-500 to-emerald-500",
      iconColor: "text-white",
    },
    {
      icon: Shield,
      label: "Become Advisor",
      url: createPageUrl("AdvisorRegistration"),
      show: !isAdvisor,
      gradient: "from-indigo-500 to-purple-500",
      iconColor: "text-white",
    },
    {
      icon: Star,
      label: "Become Finfluencer",
      url: createPageUrl("Finfluencers"),
      show: !isFinfluencer,
      gradient: "from-orange-500 to-red-500",
      iconColor: "text-white",
    },
    {
      icon: Crown,
      label: "Upgrade Plan",
      url: createPageUrl("Subscription"),
      show: true,
      gradient: "from-amber-500 to-yellow-500",
      iconColor: "text-white",
    },
  ];

  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <TrendingUp className="w-5 h-5 text-blue-600" />
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
                className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-all duration-200 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-200`}>
                  <action.icon className={`w-6 h-6 ${action.iconColor}`} />
                </div>
                <span className="text-xs font-medium text-slate-700 text-center leading-tight">{action.label}</span>
              </button>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
}