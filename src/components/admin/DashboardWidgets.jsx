import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';

export const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = "blue" }) => {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600",
        purple: "bg-purple-50 text-purple-600",
        green: "bg-green-50 text-green-600",
        red: "bg-red-50 text-red-600",
        orange: "bg-orange-50 text-orange-600",
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-500">{title}</p>
                        <h3 className="text-2xl font-bold">{value}</h3>
                    </div>
                    <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
                {trend && (
                    <div className="flex items-center mt-4 text-xs">
                        <Badge variant="outline" className={`${trend === 'up' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} border-0`}>
                            {trend === 'up' ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                            {trendValue}
                        </Badge>
                        <span className="text-slate-400 ml-2">vs last month</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export const LiveFeedItem = ({ user, action, target, time }) => (
    <div className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden">
            {user?.image_url ? <img src={user.image_url} alt={user.name} className="w-full h-full object-cover" /> : user?.name?.[0] || '?'}
        </div>
        <div className="flex-1">
            <p className="text-sm">
                <span className="font-semibold text-slate-900">{user?.name || 'Unknown User'}</span>
                <span className="text-slate-500"> {action} </span>
                <span className="font-medium text-slate-700">{target}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">{time}</p>
        </div>
    </div>
);

export const LiveFeed = ({ items = [] }) => {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg">Live Activity</CardTitle>
                <CardDescription>Real-time platform updates</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {items.length > 0 ? (
                        items.map((item, index) => <LiveFeedItem key={index} {...item} />)
                    ) : (
                        <p className="text-center text-slate-500 py-8 text-sm">No recent activity</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
