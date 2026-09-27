import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Vote, CheckCircle, Crown, Users, TrendingUp, Vote as PollIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className={`p-4 rounded-lg flex items-center gap-4 ${color.bg}`}>
    <div className={`p-3 rounded-full ${color.iconBg}`}>
      <Icon className={`w-5 h-5 ${color.iconText}`} />
    </div>
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  </div>
);

export default function PollOverview({ polls, stats }) {

  const overviewData = [
    { title: 'Total Polls', value: stats?.total || 0, icon: Vote, color: { bg: 'bg-premium-muted', iconBg: 'bg-premium-muted', iconText: 'text-protocall-blue' } },
    { title: 'Active Polls', value: stats?.active || 0, icon: CheckCircle, color: { bg: 'bg-buy-muted', iconBg: 'bg-buy-muted', iconText: 'text-buy-muted-foreground' } },
    { title: 'Premium Polls', value: stats?.premium || 0, icon: Crown, color: { bg: 'bg-premium-muted', iconBg: 'bg-premium-muted', iconText: 'text-protocall-premium-text' } },
    { title: 'Total Votes', value: stats?.totalVotes || 0, icon: Users, color: { bg: 'bg-hold-muted', iconBg: 'bg-hold-muted', iconText: 'text-hold-muted-foreground' } },
    { title: 'Avg. Votes', value: stats?.avgVotes || 0, icon: TrendingUp, color: { bg: 'bg-premium-muted', iconBg: 'bg-premium-muted', iconText: 'text-protocall-blue' } }
  ];

  const topPolls = [...polls]
    .sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {overviewData.map(stat => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-buy-muted-foreground" />
            Top Performing Polls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topPolls.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-subtle uppercase bg-surface-2">
                  <tr>
                    <th className="px-4 py-2 text-left">Poll Title</th>
                    <th className="px-4 py-2 text-center">Votes</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topPolls.map(poll => (
                    <tr key={poll.id} className="hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{poll.title}</div>
                        <div className="text-xs text-muted-foreground">{poll.stock_symbol}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-subtle">{poll.total_votes || 0}</td>
                      <td className="px-4 py-3 text-center">
                        {poll.is_active ? (
                          <Badge variant="outline" className="text-buy-muted-foreground border-buy/30 bg-buy-muted">Active</Badge>
                        ) : (
                          <Badge variant="outline">Expired</Badge>
                        )}
                        {poll.is_premium && (
                          <Badge className="ml-2 bg-premium-muted text-protocall-premium-text border-0">Premium</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {poll.created_date
                          ? formatDistanceToNow(new Date(poll.created_date), { addSuffix: true })
                          : 'N/A'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <PollIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No polls to display</h3>
              <p className="mt-1 text-sm text-muted-foreground">Polls will appear here as they are created.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}