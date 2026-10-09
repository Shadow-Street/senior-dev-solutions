import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, TrendingUp, Target } from "lucide-react";

export default function ReferralStats({ stats }) {
  const statCards = [
    {
      title: "Total Invites Sent",
      value: stats.totalInvites,
      icon: Users,
      color: "bg-primary text-white",
      bgColor: "bg-premium-muted"
    },
    {
      title: "Successful Signups",
      value: stats.successfulSignups,
      icon: UserCheck,
      color: "bg-buy text-buy-foreground",
      bgColor: "bg-buy-muted"
    },
    {
      title: "Active Members",
      value: stats.activeMembers,
      icon: Target,
      color: "bg-primary text-primary-foreground",
      bgColor: "bg-premium-muted"
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: "bg-hold text-hold-foreground",
      bgColor: "bg-hold-muted"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className={`${stat.bgColor} border-0 shadow-lg`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-full ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}