import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Star, Wallet, Crown, TrendingUp, MessageSquare } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function QuickActions({ user }) {
  // ✅ Check if user already has these roles
  const isAdvisor = user?.app_role === 'advisor' || user?.roles?.includes('advisor');
  const isFinfluencer = user?.app_role === 'finfluencer' || user?.roles?.includes('finfluencer');

  // Colour-coded tiles as in the Base44 reference, drawn only from the
  // PROTOCALL palette: blue/grape for community, Neon Lime for the pledge pool
  // (growth; ink icon on the lime), red→orange for creators, orange for upgrades.
  const quickActions = [
    {
      icon: MessageSquare,
      label: "Join Chat",
      url: createPageUrl("ChatRooms"),
      show: true,
      tile: "bg-gradient-to-br from-protocall-blue to-protocall-deep text-white shadow-protocall-blue/30",
    },
    {
      icon: TrendingUp,
      label: "Vote on Polls",
      url: createPageUrl("Polls"),
      show: true,
      tile: "bg-gradient-to-br from-protocall-light to-protocall-grape text-white shadow-protocall-grape/30",
    },
    {
      icon: Wallet,
      label: "Pledge Pool",
      url: createPageUrl("PledgePool"),
      show: true,
      tile: "bg-buy text-buy-foreground shadow-buy/40",
    },
    {
      icon: Shield,
      label: "Become Advisor",
      url: createPageUrl("AdvisorRegistration"),
      show: !isAdvisor,
      tile: "bg-gradient-to-br from-protocall-grape to-protocall-deep text-white shadow-protocall-grape/30",
    },
    {
      icon: Star,
      label: "Become Finfluencer",
      url: createPageUrl("Finfluencers"),
      show: !isFinfluencer,
      tile: "bg-gradient-to-br from-sell to-hold text-white shadow-sell/30",
    },
    {
      icon: Crown,
      label: "Upgrade Plan",
      url: createPageUrl("Subscription"),
      show: true,
      tile: "bg-gradient-to-br from-hold to-hold-muted-foreground text-white shadow-hold/30",
    },
  ];

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <div className="border-b border-divider px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-premium-muted">
            <TrendingUp className="h-4 w-4 text-premium" />
          </span>
          Quick Actions
        </h2>
      </div>

      <CardContent className="p-3 sm:p-4">
        {/* auto-fit so the row stays even when role-gated tiles are hidden */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(92px,1fr))] gap-1 sm:gap-2">
          {quickActions.map((action, index) => (
            action.show && (
              <Link
                key={action.label + index}
                to={action.url}
                className="group flex flex-col items-center gap-2.5 rounded-xl px-2 py-4 transition-colors duration-200
                           hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-md ${action.tile}
                              transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105
                              motion-reduce:transform-none`}
                >
                  <action.icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <span className="text-center text-xs font-medium leading-tight text-foreground">
                  {action.label}
                </span>
              </Link>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
