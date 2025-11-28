import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, Eye, UserPlus, Ticket, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function ConversionFunnel({ events, tickets, attendees, checkIns }) {
  const funnelData = useMemo(() => {
    // Simulate page views (typically 10x RSVPs)
    const estimatedViews = attendees.length * 10;
    const rsvpCount = attendees.filter(a => a.rsvp_status === 'yes').length;
    const ticketCount = tickets.length;
    const checkInCount = checkIns?.length || 0;
    
    // Calculate conversion rates
    const viewToRSVP = rsvpCount > 0 ? (rsvpCount / estimatedViews) * 100 : 0;
    const rsvpToTicket = rsvpCount > 0 ? (ticketCount / rsvpCount) * 100 : 0;
    const ticketToCheckIn = ticketCount > 0 ? (checkInCount / ticketCount) * 100 : 0;
    const overallConversion = estimatedViews > 0 ? (checkInCount / estimatedViews) * 100 : 0;

    return [
      { 
        stage: 'Page Views', 
        count: estimatedViews, 
        conversion: 100, 
        icon: Eye,
        color: '#3B82F6',
        dropoff: 0
      },
      { 
        stage: 'RSVPs', 
        count: rsvpCount, 
        conversion: viewToRSVP,
        icon: UserPlus,
        color: '#8B5CF6',
        dropoff: estimatedViews - rsvpCount
      },
      { 
        stage: 'Tickets Purchased', 
        count: ticketCount, 
        conversion: rsvpToTicket,
        icon: Ticket,
        color: '#10B981',
        dropoff: rsvpCount - ticketCount
      },
      { 
        stage: 'Attended', 
        count: checkInCount, 
        conversion: ticketToCheckIn,
        icon: CheckCircle,
        color: '#F59E0B',
        dropoff: ticketCount - checkInCount
      }
    ];
  }, [events, tickets, attendees, checkIns]);

  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-purple-600" />
          Conversion Funnel Analysis
        </CardTitle>
        <p className="text-sm text-slate-600">Track how visitors convert to attendees</p>
      </CardHeader>
      <CardContent>
        {/* Funnel Visualization */}
        <div className="space-y-4 mb-6">
          {funnelData.map((stage, index) => {
            const Icon = stage.icon;
            const maxCount = funnelData[0].count;
            const widthPercent = (stage.count / maxCount) * 100;
            
            return (
              <div key={stage.stage} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Icon className="w-5 h-5" style={{ color: stage.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{stage.stage}</p>
                      <p className="text-sm text-slate-600">{stage.count.toLocaleString()} people</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: stage.color }}>
                      {stage.conversion.toFixed(1)}%
                    </p>
                    {index > 0 && stage.dropoff > 0 && (
                      <p className="text-xs text-red-600">-{stage.dropoff} drop-off</p>
                    )}
                  </div>
                </div>
                
                <div className="w-full bg-slate-200 rounded-full h-8 overflow-hidden">
                  <div 
                    className="h-full flex items-center justify-center text-white text-sm font-semibold transition-all duration-500"
                    style={{ 
                      width: `${widthPercent}%`,
                      backgroundColor: stage.color
                    }}
                  >
                    {stage.count > 0 && `${stage.count}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Conversion Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={funnelData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Conversion Rate']} />
            <Legend />
            <Bar dataKey="conversion" name="Conversion Rate %" radius={[8, 8, 0, 0]}>
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-xs text-blue-600 font-medium mb-1">Best Converting Stage</p>
            <p className="text-lg font-bold text-blue-900">
              {funnelData.reduce((max, stage) => stage.conversion > max.conversion ? stage : max).stage}
            </p>
            <p className="text-xs text-blue-600">{funnelData.reduce((max, stage) => stage.conversion > max.conversion ? stage : max).conversion.toFixed(1)}% conversion</p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-xs text-red-600 font-medium mb-1">Biggest Drop-Off</p>
            <p className="text-lg font-bold text-red-900">
              {funnelData.reduce((max, stage) => (stage.dropoff || 0) > (max.dropoff || 0) ? stage : max).stage}
            </p>
            <p className="text-xs text-red-600">{funnelData.reduce((max, stage) => (stage.dropoff || 0) > (max.dropoff || 0) ? stage : max).dropoff} people lost</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-xs text-green-600 font-medium mb-1">Overall Conversion</p>
            <p className="text-lg font-bold text-green-900">
              {((funnelData[3].count / funnelData[0].count) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-green-600">View to attendance</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}