import React, { useState, useEffect, useRef } from 'react';
import { ModuleApprovalRequest, FeatureConfig } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, XCircle, Clock, AlertTriangle, FileText, 
  User, Calendar, MessageSquare, ThumbsUp, ThumbsDown 
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ApprovalWorkflow({ user }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadRequests();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadRequests = async () => {
    try {
      if (isMounted.current) {
        setIsLoading(true);
      }
      
      const allRequests = await ModuleApprovalRequest.list('-created_date');
      
      if (isMounted.current) {
        setRequests(allRequests);
      }
    } catch (error) {
      if (isMounted.current && error.name !== 'AbortError') {
        console.error('Error loading approval requests:', error);
        toast.error('Failed to load approval requests');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleReviewRequest = (request) => {
    setSelectedRequest(request);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !reviewNotes.trim()) {
      toast.error('Please provide review notes');
      return;
    }

    setIsProcessing(true);
    try {
      // Update the approval request
      await ModuleApprovalRequest.update(selectedRequest.id, {
        status: 'approved',
        reviewed_by_id: user.id,
        reviewed_by_name: user.display_name || user.email,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      });

      // Apply the actual change to the FeatureConfig
      const module = await FeatureConfig.list();
      const targetModule = module.find(m => m.id === selectedRequest.module_id);

      if (targetModule) {
        const updatePayload = {
          feature_key: targetModule.feature_key,
          feature_name: targetModule.feature_name,
          description: targetModule.description,
          module_type: targetModule.module_type,
          route_path: targetModule.route_path,
          icon_name: targetModule.icon_name,
          tier: targetModule.tier,
          visibility_rule: targetModule.visibility_rule,
          sort_order: targetModule.sort_order || 0,
          last_status_change_date: new Date().toISOString(),
          changed_by_admin_id: user.id,
          changed_by_admin_name: user.display_name || user.email,
          reason_for_change: `Approved change request: ${selectedRequest.justification}`
        };

        // Apply the requested changes
        if (selectedRequest.change_type === 'status_change') {
          updatePayload.status = selectedRequest.requested_status;
        }
        if (selectedRequest.change_type === 'visibility_change') {
          updatePayload.visible_to_users = selectedRequest.requested_visibility;
        }

        await FeatureConfig.update(selectedRequest.module_id, updatePayload);
      }

      toast.success('Change request approved and applied');
      setShowReviewModal(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !reviewNotes.trim()) {
      toast.error('Please provide rejection reason');
      return;
    }

    setIsProcessing(true);
    try {
      await ModuleApprovalRequest.update(selectedRequest.id, {
        status: 'rejected',
        reviewed_by_id: user.id,
        reviewed_by_name: user.display_name || user.email,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      });

      toast.success('Change request rejected');
      setShowReviewModal(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-hold-muted text-hold-muted-foreground border-hold/30';
      case 'approved': return 'bg-buy-muted text-buy-muted-foreground border-buy/30';
      case 'rejected': return 'bg-sell-muted text-sell-muted-foreground border-sell/30';
      case 'cancelled': return 'bg-surface-2 text-foreground border-border';
      default: return 'bg-surface-2 text-foreground border-border';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-sell-muted text-sell-muted-foreground';
      case 'high': return 'bg-hold-muted text-hold-muted-foreground';
      case 'medium': return 'bg-premium-muted text-protocall-blue';
      case 'low': return 'bg-surface-2 text-foreground';
      default: return 'bg-surface-2 text-foreground';
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status !== 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-protocall-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-subtle">Loading approval requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-hold-muted-foreground">{pendingRequests.length}</p>
              </div>
              <Clock className="w-12 h-12 text-hold-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold text-buy-muted-foreground">
                  {requests.filter(r => r.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-buy-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold text-sell-muted-foreground">
                  {requests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="w-12 h-12 text-sell-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-3xl font-bold text-foreground">{requests.length}</p>
              </div>
              <FileText className="w-12 h-12 text-protocall-blue" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-hold-muted-foreground" />
              Pending Approval Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 border-2 border-hold/30 rounded-lg bg-hold-muted hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-foreground">{request.module_name}</h4>
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {request.change_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-subtle space-y-1">
                        {request.change_type === 'status_change' && (
                          <p>
                            <span className="font-medium">Status Change:</span> {request.current_status} → {request.requested_status}
                          </p>
                        )}
                        {request.change_type === 'visibility_change' && (
                          <p>
                            <span className="font-medium">Visibility:</span> {request.current_visibility ? 'Visible' : 'Hidden'} → {request.requested_visibility ? 'Visible' : 'Hidden'}
                          </p>
                        )}
                        <p><span className="font-medium">Justification:</span> {request.justification}</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleReviewRequest(request)}
                      size="sm"
                      className="bg-protocall-blue hover:bg-protocall-blue"
                    >
                      Review
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-hold/30 pt-2">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Requested by {request.requested_by_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(request.created_date), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviewed Requests */}
      {reviewedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request History ({reviewedRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reviewedRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 border border-border rounded-lg hover:bg-surface-2 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-foreground">{request.module_name}</h4>
                        <Badge className={`${getStatusColor(request.status)} border`}>
                          {request.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-subtle space-y-1">
                        <p>{request.justification}</p>
                        {request.review_notes && (
                          <p className="italic">Review: {request.review_notes}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    {request.reviewed_by_name && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Reviewed by {request.reviewed_by_name}</span>
                      </div>
                    )}
                    {request.reviewed_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(request.reviewed_at), 'MMM d, yyyy HH:mm')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-subtle mb-2">No Approval Requests</h3>
            <p className="text-muted-foreground">Change requests will appear here for review</p>
          </CardContent>
        </Card>
      )}

      {/* Review Modal */}
      {selectedRequest && (
        <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Review Change Request
              </DialogTitle>
              <DialogDescription>
                Review and approve or reject this module change request
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-surface-2 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">{selectedRequest.module_name}</h4>
                <div className="text-sm text-subtle space-y-2">
                  <div>
                    <span className="font-medium">Change Type:</span> {selectedRequest.change_type.replace('_', ' ')}
                  </div>
                  
                  {selectedRequest.change_type === 'status_change' && (
                    <div>
                      <span className="font-medium">Status Change:</span>{' '}
                      <span className="text-sell-muted-foreground">{selectedRequest.current_status}</span>
                      {' → '}
                      <span className="text-buy-muted-foreground">{selectedRequest.requested_status}</span>
                    </div>
                  )}

                  {selectedRequest.change_type === 'visibility_change' && (
                    <div>
                      <span className="font-medium">Visibility:</span>{' '}
                      <span className="text-sell-muted-foreground">{selectedRequest.current_visibility ? 'Visible' : 'Hidden'}</span>
                      {' → '}
                      <span className="text-buy-muted-foreground">{selectedRequest.requested_visibility ? 'Visible' : 'Hidden'}</span>
                    </div>
                  )}

                  <div>
                    <span className="font-medium">Justification:</span>
                    <p className="mt-1">{selectedRequest.justification}</p>
                  </div>

                  <div>
                    <span className="font-medium">Requested by:</span> {selectedRequest.requested_by_name}
                  </div>
                  
                  <div>
                    <span className="font-medium">Priority:</span>{' '}
                    <Badge className={getPriorityColor(selectedRequest.priority)}>
                      {selectedRequest.priority}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-subtle mb-2">
                  Review Notes <span className="text-sell">*</span>
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Provide your review notes (required for both approval and rejection)..."
                  className="h-24"
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
                  onClick={handleReject}
                  disabled={isProcessing || !reviewNotes.trim()}
                  className="text-sell-muted-foreground border-sell/30 hover:bg-sell-muted"
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing || !reviewNotes.trim()}
                  className="bg-buy hover:bg-buy"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Approve & Apply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}