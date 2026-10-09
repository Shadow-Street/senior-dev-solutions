import React, { useState, useEffect } from 'react';
import { Subscription, User, SubscriptionPlan } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users as UsersIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SubscriptionUserManagement({ permissions }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subsData, usersData, plansData] = await Promise.all([
        Subscription.list('-created_date'),
        User.list(),
        SubscriptionPlan.list()
      ]);

      // Map plan details to subscriptions
      const enrichedSubs = subsData.map(sub => {
        const plan = plansData.find(p => p.id === sub.plan_id ||
          p.name.toLowerCase() === sub.plan_type?.toLowerCase());
        return {
          ...sub,
          planDetails: plan,
          displayPlanName: plan?.name || sub.plan_type || 'Unknown Plan',
          displayPrice: plan?.price_monthly || plan?.price || sub.price || 0
        };
      });

      setSubscriptions(enrichedSubs);
      setUsers(usersData);
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReinstate = async (subscription) => {
    if (!permissions.canEdit) {
      toast.error('You do not have permission to modify subscriptions');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to reinstate this subscription for the user?\n\nThis will re-enable auto-renewal.`
    );

    if (!confirmed) return;

    try {
      await Subscription.update(subscription.id, {
        cancelAtPeriodEnd: false,
        auto_renew: true
      });
      toast.success('Subscription reinstated successfully');
      loadData();
    } catch (error) {
      console.error('Error reinstating subscription:', error);
      toast.error('Failed to reinstate subscription');
    }
  };

  const getUserForSubscription = (subscription) => {
    return users.find(u => u.id === subscription.user_id);
  };

  const getStatusBadge = (subscription) => {
    if (subscription.cancelAtPeriodEnd && subscription.status === 'active') {
      return (
        <Badge className="bg-hold-muted text-hold-muted-foreground border-hold/30">
          <Clock className="w-3 h-3 mr-1" />
          CANCELLING
        </Badge>
      );
    }

    switch (subscription.status) {
      case 'active':
        return (
          <Badge className="bg-buy-muted text-buy-muted-foreground border-buy/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            ACTIVE
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-sell-muted text-sell-muted-foreground border-sell/30">
            <XCircle className="w-3 h-3 mr-1" />
            CANCELLED
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-surface-2 text-foreground border-border">
            <XCircle className="w-3 h-3 mr-1" />
            EXPIRED
          </Badge>
        );
      default:
        return (
          <Badge className="bg-hold-muted text-hold-muted-foreground border-hold/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {(subscription.status || 'unknown').toUpperCase()}
          </Badge>
        );
    }
  };

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const user = getUserForSubscription(sub);
    const matchesSearch = !searchTerm ||
      (user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.plan_type?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && sub.status === 'active' && !sub.cancelAtPeriodEnd) ||
      (statusFilter === 'cancelling' && sub.cancelAtPeriodEnd && sub.status === 'active') ||
      (statusFilter === 'cancelled' && sub.status === 'cancelled') ||
      (statusFilter === 'expired' && sub.status === 'expired');

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return <div className="p-6">Loading subscriptions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-protocall-premium-text" />
            User Subscriptions ({filteredSubscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subscriptions</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="cancelling">Cancelling</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-buy-muted rounded-lg">
              <p className="text-xs text-buy-muted-foreground mb-1">Active</p>
              <p className="text-xl font-bold text-buy-muted-foreground">
                {subscriptions.filter(s => s.status === 'active' && !s.cancelAtPeriodEnd).length}
              </p>
            </div>
            <div className="p-3 bg-hold-muted rounded-lg">
              <p className="text-xs text-hold-muted-foreground mb-1">Cancelling</p>
              <p className="text-xl font-bold text-hold-muted-foreground">
                {subscriptions.filter(s => s.cancelAtPeriodEnd && s.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-sell-muted rounded-lg">
              <p className="text-xs text-sell-muted-foreground mb-1">Cancelled</p>
              <p className="text-xl font-bold text-sell-muted-foreground">
                {subscriptions.filter(s => s.status === 'cancelled').length}
              </p>
            </div>
            <div className="p-3 bg-surface-2 rounded-lg">
              <p className="text-xs text-subtle mb-1">Expired</p>
              <p className="text-xl font-bold text-foreground">
                {subscriptions.filter(s => s.status === 'expired').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      {filteredSubscriptions.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-12 text-center">
            <UsersIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Subscriptions Found</h3>
            <p className="text-subtle">Try adjusting your search or filter criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubscriptions.map((subscription) => {
            const user = getUserForSubscription(subscription);
            return (
              <Card key={subscription.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-protocall-deep to-protocall-blue flex items-center justify-center text-white font-semibold">
                          {user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{user?.display_name || 'Unknown User'}</p>
                          <p className="text-sm text-muted-foreground">{user?.email || 'No email'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Plan</p>
                          <p className="font-semibold capitalize">{subscription.plan_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Price</p>
                          <p className="font-semibold">₹{subscription.price}/mo</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Start Date</p>
                          <p className="font-semibold">{format(new Date(subscription.start_date), 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">End Date</p>
                          <p className="font-semibold">{format(new Date(subscription.end_date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col items-end gap-3">
                      {getStatusBadge(subscription)}

                      {/* Reinstate Button - Only show for subscriptions marked for cancellation */}
                      {subscription.cancelAtPeriodEnd && subscription.status === 'active' && permissions.canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-buy/30 text-buy-muted-foreground hover:bg-buy-muted"
                          onClick={() => handleReinstate(subscription)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Reinstate Subscription
                        </Button>
                      )}

                      {subscription.cancelAtPeriodEnd && (
                        <p className="text-xs text-hold-muted-foreground text-right">
                          Cancels on: {format(new Date(subscription.end_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}