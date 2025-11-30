import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Eye, 
  Users, 
  TrendingUp, 
  Clock, 
  Download,
  Search,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PostAnalyticsModal({ open, onClose, post, advisorId }) {
  const [viewers, setViewers] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    totalViews: 0,
    uniqueViewers: 0,
    subscriberViews: 0,
    nonSubscriberViews: 0,
    avgViewDuration: '2m 34s',
    engagement: 0
  });

  useEffect(() => {
    if (open && post) {
      loadAnalytics();
    }
  }, [open, post]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Get all subscribers
      const allSubscribers = await base44.entities.AdvisorSubscription.filter({
        advisor_id: advisorId
      });
      setSubscribers(allSubscribers);

      // Parse unique viewers from post
      const uniqueViewerIds = post.unique_viewers || [];
      
      // Create viewer list with subscriber status
      const viewersList = uniqueViewerIds.map(userId => {
        const subscription = allSubscribers.find(sub => sub.user_id === userId);
        return {
          user_id: userId,
          isSubscriber: !!subscription,
          subscription_status: subscription?.status || 'none',
          viewed_at: post.created_date, // You can add actual view timestamp if tracked
          plan_id: subscription?.plan_id
        };
      });

      setViewers(viewersList);

      // Calculate stats
      const subscriberViewCount = viewersList.filter(v => v.isSubscriber).length;
      const nonSubscriberViewCount = viewersList.filter(v => !v.isSubscriber).length;
      
      setStats({
        totalViews: post.view_count || 0,
        uniqueViewers: uniqueViewerIds.length,
        subscriberViews: subscriberViewCount,
        nonSubscriberViews: nonSubscriberViewCount,
        avgViewDuration: '2m 34s', // Mock data - implement tracking if needed
        engagement: uniqueViewerIds.length > 0 
          ? Math.round((subscriberViewCount / uniqueViewerIds.length) * 100)
          : 0
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    const csvContent = [
      ['User ID', 'Subscriber Status', 'Plan', 'Viewed At'],
      ...viewers.map(viewer => [
        viewer.user_id,
        viewer.isSubscriber ? 'Subscribed' : 'Non-Subscriber',
        viewer.plan_id || 'N/A',
        format(new Date(viewer.viewed_at), 'yyyy-MM-dd HH:mm:ss')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `post_analytics_${post.id}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Analytics exported successfully');
  };

  const filteredViewers = viewers.filter(viewer => {
    const matchesSearch = viewer.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'subscribed' && viewer.isSubscriber) ||
      (statusFilter === 'non_subscribed' && !viewer.isSubscriber);
    return matchesSearch && matchesStatus;
  });

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Post Analytics: {post.title}
          </DialogTitle>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.totalViews}</div>
              <div className="text-xs text-slate-600 mt-1">Total Views</div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.subscriberViews}</div>
              <div className="text-xs text-slate-600 mt-1">Subscriber Views</div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.nonSubscriberViews}</div>
              <div className="text-xs text-slate-600 mt-1">Non-Subscriber</div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.engagement}%</div>
              <div className="text-xs text-slate-600 mt-1">Engagement</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by User ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="subscribed">Subscribed</SelectItem>
              <SelectItem value="non_subscribed">Non-Subscriber</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Viewers List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700">Viewers ({filteredViewers.length})</h3>
          
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading analytics...</div>
          ) : filteredViewers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'No viewers match your filters' 
                : 'No views yet for this post'}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredViewers.map((viewer, index) => (
                <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {viewer.user_id.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          User: {viewer.user_id.substring(0, 8)}...
                        </p>
                        <p className="text-xs text-slate-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {format(new Date(viewer.viewed_at), 'MMM dd, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {viewer.isSubscriber ? (
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Subscribed
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Non-Subscriber
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Post Details */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold text-slate-700 mb-3">Post Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Published:</span>
              <span className="ml-2 font-medium">{format(new Date(post.created_date), 'MMM dd, yyyy')}</span>
            </div>
            <div>
              <span className="text-slate-500">Stock:</span>
              <span className="ml-2 font-medium">{post.stock_symbol || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500">Type:</span>
              <span className="ml-2 font-medium capitalize">{post.recommendation_type || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500">Status:</span>
              <span className="ml-2 font-medium capitalize">{post.recommendation_status || 'Active'}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}