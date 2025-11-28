import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  DollarSign,
  Eye,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdvisorPledgeAccessManager({ user }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    approved_commission_rate: 15,
    admin_notes: '',
    rejection_reason: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const allRequests = await base44.entities.AdvisorPledgeAccessRequest.list('-created_date');
      console.log('Loaded advisor pledge access requests:', allRequests);
      setRequests(Array.isArray(allRequests) ? allRequests : []);
    } catch (error) {
      console.error('Error loading advisor pledge access requests:', error);
      toast.error('Failed to load requests');
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request) => {
    setSelectedRequest(request);
    setReviewData({
      approved_commission_rate: request.commission_rate_requested || 15,
      admin_notes: '',
      rejection_reason: ''
    });
    setShowReviewModal(true);
  };

  const handleReject = async (request) => {
    setSelectedRequest(request);
    setReviewData({
      approved_commission_rate: 0,
      admin_notes: '',
      rejection_reason: ''
    });
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (approved) => {
    if (!selectedRequest) return;

    if (approved && (!reviewData.approved_commission_rate || reviewData.approved_commission_rate <= 0)) {
      toast.error('Please set a valid commission rate');
      return;
    }

    if (!approved && !reviewData.rejection_reason) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsProcessing(true);
    try {
      const updateData = {
        status: approved ? 'approved' : 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: reviewData.admin_notes,
        ...(approved && { approved_commission_rate: reviewData.approved_commission_rate }),
        ...(!approved && { rejection_reason: reviewData.rejection_reason })
      };

      await base44.entities.AdvisorPledgeAccessRequest.update(selectedRequest.id, updateData);

      toast.success(approved ? 'Advisor access approved!' : 'Request rejected');
      setShowReviewModal(false);
      setSelectedRequest(null);
      
      // Reload requests
      loadRequests();
    } catch (error) {
      console.error('Error reviewing request:', error);
      toast.error('Failed to process request');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending Review' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Rejected' }
    };
    const { color, icon: Icon, text } = config[status] || config.pending;
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {text}
      </Badge>
    );
  };

  const getVolumeBadge = (volume) => {
    const config = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-purple-100 text-purple-800',
      high: 'bg-orange-100 text-orange-800',
      very_high: 'bg-red-100 text-red-800'
    };
    return <Badge className={config[volume] || config.medium}>{volume.replace('_', ' ').toUpperCase()}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading advisor requests...</span>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advisor Pledge Access Requests</h2>
          <p className="text-gray-600 mt-1">
            Review and approve advisors to create and manage pledge sessions
          </p>
        </div>
        <Button onClick={loadRequests} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingRequests.length}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved Advisors</p>
                <p className="text-3xl font-bold text-green-600">{approvedRequests.length}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected Requests</p>
                <p className="text-3xl font-bold text-red-600">{rejectedRequests.length}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Requests Yet</h3>
            <p className="text-gray-600">Advisor pledge access requests will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="w-6 h-6 text-blue-600" />
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{request.advisor_name}</h3>
                        <p className="text-sm text-gray-600">SEBI: {request.sebi_registration || 'N/A'}</p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600 mb-1">Experience</p>
                        <p className="font-semibold text-blue-900">{request.experience_years || 0} years</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-600 mb-1">Trading Volume</p>
                        {getVolumeBadge(request.trading_volume_estimate)}
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-600 mb-1">Requested Rate</p>
                        <p className="font-semibold text-green-900">{request.commission_rate_requested || 0}%</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Submitted</p>
                        <p className="font-semibold text-gray-900 text-xs">
                          {new Date(request.created_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Reason for Request:</p>
                      <p className="text-sm text-gray-600">{request.reason}</p>
                    </div>

                    {request.status === 'approved' && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-green-800">Approved Commission Rate</p>
                            <p className="text-xs text-green-600 mt-1">Reviewed on {new Date(request.reviewed_at).toLocaleDateString()}</p>
                          </div>
                          <Badge className="bg-green-600 text-white text-lg px-4 py-2">
                            {request.approved_commission_rate}%
                          </Badge>
                        </div>
                        {request.admin_notes && (
                          <p className="text-xs text-green-700 mt-2">
                            <strong>Notes:</strong> {request.admin_notes}
                          </p>
                        )}
                      </div>
                    )}

                    {request.status === 'rejected' && request.rejection_reason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason:</p>
                        <p className="text-sm text-red-600">{request.rejection_reason}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleApprove(request)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(request)}
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedRequest && (
        <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Review Advisor Pledge Access Request
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">{selectedRequest.advisor_name}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-blue-600">Experience:</p>
                    <p className="font-semibold">{selectedRequest.experience_years || 0} years</p>
                  </div>
                  <div>
                    <p className="text-blue-600">Volume Estimate:</p>
                    <p className="font-semibold">{selectedRequest.trading_volume_estimate.replace('_', ' ')}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-blue-600">Requested Rate:</p>
                    <p className="font-semibold">{selectedRequest.commission_rate_requested || 0}%</p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="commission_rate">Approved Commission Rate (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  min="5"
                  max="50"
                  step="0.1"
                  value={reviewData.approved_commission_rate}
                  onChange={(e) => setReviewData({...reviewData, approved_commission_rate: parseFloat(e.target.value)})}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Typical range: 10-20%. Advisor will earn this percentage on all pledge executions.
                </p>
              </div>

              <div>
                <Label htmlFor="admin_notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="admin_notes"
                  value={reviewData.admin_notes}
                  onChange={(e) => setReviewData({...reviewData, admin_notes: e.target.value})}
                  placeholder="Any conditions or notes for the advisor..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="rejection_reason">Rejection Reason (if rejecting)</Label>
                <Textarea
                  id="rejection_reason"
                  value={reviewData.rejection_reason}
                  onChange={(e) => setReviewData({...reviewData, rejection_reason: e.target.value})}
                  placeholder="Provide clear reason for rejection..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSubmitReview(false)}
                  disabled={isProcessing}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Reject
                </Button>
                <Button
                  onClick={() => handleSubmitReview(true)}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve Access
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}