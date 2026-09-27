
import React, { useState, useEffect } from 'react';
import { RefundRequest } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RefreshCw,
  Search,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function RefundManagementSection({ advisorId }) {
  const [refunds, setRefunds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadRefunds();
  }, [advisorId]);

  const loadRefunds = async () => {
    try {
      setIsLoading(true);
      const allRefunds = await RefundRequest.filter({
        transaction_type: 'advisor_subscription'
      });

      // Filter refunds related to this advisor's subscriptions
      const advisorRefunds = allRefunds.filter(r =>
        r.related_entity_name?.includes(advisorId) ||
        r.user_id // Show all for now - ideally we'd link via subscription
      );

      setRefunds(advisorRefunds);
    } catch (error) {
      console.error('Error loading refunds:', error);
      toast.error('Failed to load refund requests');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-hold-muted text-hold-muted-foreground', label: 'Pending', icon: Clock },
      approved: { color: 'bg-premium-muted text-protocall-blue', label: 'Approved', icon: CheckCircle },
      rejected: { color: 'bg-sell-muted text-sell-muted-foreground', label: 'Rejected', icon: XCircle },
      processing: { color: 'bg-hold-muted text-hold-muted-foreground', label: 'Processing', icon: RefreshCw },
      processed: { color: 'bg-buy-muted text-buy-muted-foreground', label: 'Processed', icon: CheckCircle },
      failed: { color: 'bg-sell-muted text-sell-muted-foreground', label: 'Failed', icon: AlertCircle }
    };
    const { color, label, icon: Icon } = config[status] || config.pending;
    return (
      <Badge className={`${color} border-0 flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const filteredRefunds = refunds.filter(refund => {
    const matchesSearch =
      refund.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.original_transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || refund.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: refunds.length,
    pending: refunds.filter(r => r.status === 'pending').length,
    processed: refunds.filter(r => r.status === 'processed').length,
    totalAmount: refunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-protocall-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-foreground">Refund Management</h3>
        <Button onClick={loadRefunds} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle">Total Refunds</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <DollarSign className="w-8 h-8 text-protocall-blue" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle">Pending</p>
                <p className="text-2xl font-bold text-hold-muted-foreground">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-hold-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle">Processed</p>
                <p className="text-2xl font-bold text-buy-muted-foreground">{stats.processed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-buy-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle">Total Amount</p>
                <p className="text-2xl font-bold text-protocall-premium-text">₹{stats.totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-protocall-premium-text" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by user name, email, or transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-border rounded-md text-sm font-normal text-subtle focus:outline-none focus:ring-2 focus:ring-ring focus:border-protocall-blue"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="processing">Processing</option>
          <option value="processed">Processed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Refunds List */}
      <div className="space-y-4">
        {filteredRefunds.length > 0 ? (
          filteredRefunds.map(refund => (
            <Card key={refund.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-foreground">{refund.user_name || 'Unknown User'}</h4>
                      {getStatusBadge(refund.status)}
                      <Badge variant="outline">
                        {refund.refund_type === 'full' ? 'Full Refund' : 'Partial Refund'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground text-xs">User Email</p>
                        <p className="text-foreground">{refund.user_email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Transaction ID</p>
                        <p className="text-foreground font-mono text-xs">{refund.original_transaction_id?.substring(0, 20) || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Original Amount</p>
                        <p className="text-foreground font-semibold">₹{refund.original_amount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Refund Amount</p>
                        <p className="text-buy-muted-foreground font-bold">₹{refund.refund_amount?.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Reason</p>
                        <p className="text-sm text-subtle">{refund.request_reason}</p>
                      </div>

                      {refund.admin_notes && (
                        <div>
                          <p className="text-xs text-muted-foreground">Admin Notes</p>
                          <p className="text-sm text-subtle">{refund.admin_notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                      <span>Requested: {format(new Date(refund.created_date), 'MMM dd, yyyy hh:mm a')}</span>
                      {refund.processed_date && (
                        <span>Processed: {format(new Date(refund.processed_date), 'MMM dd, yyyy')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No refund requests found</p>
              <p className="text-muted-foreground text-sm">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Refund requests will appear here'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
