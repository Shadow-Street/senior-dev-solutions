
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, MessageSquare, BarChart3, Users, Clock, Star } from "lucide-react";
import TrustScoreBadge from "../ui/TrustScoreBadge";

export default function RecentActivity() {
  const activities = [
  {
    type: "poll",
    icon: BarChart3,
    title: "New poll created for RELIANCE",
    description: "Should we buy the dip?",
    time: "2 min ago",
    color: "text-primary"
  },
  {
    type: "chat",
    icon: MessageSquare,
    title: "Active discussion in TCS room",
    description: "15 traders discussing Q3 results",
    time: "5 min ago",
    color: "text-primary"
  },
  {
    type: "join",
    icon: Users,
    title: "5 new traders joined",
    description: "Community growing strong",
    time: "10 min ago",
    color: "text-positive"
  },
  {
    type: "poll",
    icon: BarChart3,
    title: "Poll result: HDFC Bank",
    description: "65% voted BUY",
    time: "15 min ago",
    color: "text-primary"
  }];


  const trustedUsers = [
  { name: 'TraderJoe', score: 98 },
  { name: 'CryptoKing', score: 95 },
  { name: 'StockSensei', score: 92 }];


  return (
    <Card className="shadow-lg border border-border bg-card">
      <CardHeader className="border-b border-divider bg-surface-2">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Activity className="w-5 h-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-divider">
        <div className="p-6 space-y-4">
          {activities.map((activity, index) =>
          <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-2">
              <div className={`p-2 rounded-full bg-surface-2 ${activity.color}`}>
                <activity.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground">{activity.title}</h4>
                <p className="text-xs text-subtle mt-1">{activity.description}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-6">
            <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-protocall-grape" />
                Top Trusted Users
            </h4>
            <ul className="space-y-2">
                {trustedUsers.map((user) =>
            <li key={user.name} className="flex justify-between items-center text-sm">
                        <span className="text-subtle">{user.name}</span>
                        <TrustScoreBadge score={user.score} size="xs" />
                    </li>
            )}
            </ul>
        </div>
      </CardContent>
    </Card>);

}