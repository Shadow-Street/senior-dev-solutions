import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  RefreshCw,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  TrendingDown,
  Eye,
  CheckSquare,
  Loader2
} from 'lucide-react';
import { RefundRequest, EventTicket, Notification } from '@/api/entities';
import { toast } from 'sonner';

export default function EventRefundPanel({ event, onUpdate }) {
  const [refundRequests, setRefundRequests] = useState([]);
  const [eventTickets, setEventTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadRefundData();
  }, [event.id]);

  const loadRefundData = async () => {
    setIsLoading(true);
    try {
      // Get all tickets for this event
      const tickets = await EventTicket.filter({ event_id: event.id });
      setEventTickets(tickets);

      // Get all refund requests for these tickets
      const ticketIds = tickets.map(t => t.id);
      const allRefunds = await RefundRequest.filter({
        transaction_type: 'event_ticket'
      });

      // Filter refunds that match our event's tickets
      const eventRefunds = allRefunds.filter(r => 
        ticketIds.includes(r.related_entity_id)
      );

      setRefundRequests(eventRefunds);
    } catch (error) {
      console.error('Error loading refund data:', error);
      toast.error('Failed to load refund data');
    } finally {
      setIsLoading(false);
    }
  };

  const refundStats = {
    total: refundRequests.length,
    pending: refundRequests.filter(r => r.status === 'pending').length,
    approved: refundRequests.filter(r => r.status === 'approved').length,
    processing: refundRequests.filter(r => r.status === 'processing').length,
    processed: refundRequests.filter(r => r.status === 'processed').length,
    rejected: refundRequests.filter(r => r.status === 'rejected').length,
    totalAmount: refundRequests
      .filter(r => ['approved', 'processing', 'processed'].includes(r.status))
      .reduce((sum, r) => sum + (r.refund_amount || 0), 0)
  };

  const handleOrganizerApprove = async (request) => {
    setIsProcessing(true);
    try {
      await RefundRequest.update(request.id, {
        status: 'approved',
        admin_notes: adminNotes,
        processed_by: event.organizer_id,
        processed_by_name: event.organizer_name
      });

      // Notify user
      await Notification.create({
        user_id: request.user_id,
        title: '✅ Refund Request Approved by Organizer',
        message: `Your refund request for "${event.title}" has been approved by the organizer. It's now pending final admin processing.`,
        type: 'info',
        page: 'general'
      });

      toast.success('Refund request approved - now pending admin processing');
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setAdminNotes('');
      await loadRefundData();
      await onUpdate();
    } catch (error) {
      console.error('Error approving refund:', error);
      toast.error('Failed to approve refund request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOrganizerReject = async (request) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsProcessing(true);
    try {
      await RefundRequest.update(request.id, {
        status: 'rejected',
        rejection_reason: rejectionReason,
        admin_notes: adminNotes,
        processed_by: event.organizer_id,
        processed_by_name: event.organizer_name,
        processed_date: new Date().toISOString()
      });

      // Notify user
      await Notification.create({
        user_id: request.user_id,
        title: '❌ Refund Request Rejected',
        message: `Your refund request for "${event.title}" has been rejected by the organizer. Reason: ${rejectionReason}`,
        type: 'warning',
        page: 'general'
      });

      toast.success('Refund request rejected');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setAdminNotes('');
      await loadRefundData();
      await onUpdate();
    } catch (error) {
      console.error('Error rejecting refund:', error);
      toast.error('Failed to reject refund request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdminProcess = async (request) => {
    setIsProcessing(true);
    try {
      // Update refund status to processing
      await RefundRequest.update(request.id, {
        status: 'processing',
        admin_notes: adminNotes,
        processed_date: new Date().toISOString()
      });

      // Simulate payment gateway refund processing
      // In production, this would call actual payment gateway API
      setTimeout(async () => {
        try {
          await RefundRequest.update(request.id, {
            status: 'processed',
            gateway_refund_id: `RF${Date.now()}`,
            expected_completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          });

          // Update ticket status
          await EventTicket.update(request.related_entity_id, {
            status: 'refunded'
          });

          // Notify user
          await Notification.create({
            user_id: request.user_id,
            title: '💰 Refund Processed Successfully',
            message: `Your refund of ₹${request.refund_amount} for "${event.title}" has been processed. You should receive it within 5-7 business days.`,
            type: 'info',
            page: 'general'
          });

          toast.success('Refund processed successfully');
          await loadRefundData();
          await onUpdate();
        } catch (error) {
          console.error('Error completing refund:', error);
          toast.error('Failed to complete refund processing');
        }
      }, 2000);

      setShowProcessModal(false);
      setSelectedRequest(null);
      setAdminNotes('');
      toast.info('Refund processing initiated...');
      
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { color: 'bg-hold-muted text-hold-muted-foreground border-hold/30', icon: Clock, text: 'Pending Organizer' },
      approved: { color: 'bg-premium-muted text-primary border-protocall-premium-light', icon: CheckCircle, text: 'Approved - Pending Admin' },
      processing: { color: 'bg-premium-muted text-protocall-premium-text border-protocall-premium-light', icon: RefreshCw, text: 'Processing' },
      processed: { color: 'bg-buy-muted text-buy-muted-foreground border-buy/30', icon: CheckCircle, text: 'Processed' },
      rejected: { color: 'bg-sell-muted text-sell-muted-foreground border-sell/30', icon: XCircle, text: 'Rejected' }
    };

    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1 border`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-subtle">Loading refund data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Refund Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-surface-2 to-hold-muted border-hold/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-hold-muted rounded-lg">
                <Clock className="w-5 h-5 text-hold-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-hold-muted-foreground font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-hold-muted-foreground">{refundStats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-2 border-protocall-premium-light">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-premium-muted rounded-lg">
                <CheckSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-primary font-medium">Approved</p>
                <p className="text-2xl font-bold text-primary">{refundStats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-surface-2 to-buy-muted border-buy/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-buy-muted rounded-lg">
                <CheckCircle className="w-5 h-5 text-buy-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-buy-muted-foreground font-medium">Processed</p>
                <p className="text-2xl font-bold text-buy-muted-foreground">{refundStats.processed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-2 border-protocall-premium-light">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-premium-muted rounded-lg">
                <DollarSign className="w-5 h-5 text-protocall-premium-text" />
              </div>
              <div>
                <p className="text-sm text-protocall-premium-text font-medium">Total Refunded</p>
                <p className="text-2xl font-bold text-protocall-premium-text">₹{refundStats.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refund Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Refund Requests ({refundStats.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {refundRequests.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Refund Requests</h3>
              <p className="text-subtle">No refund requests have been submitted for this event yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-2 border-b-2 border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-subtle uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-subtle uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-subtle uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-subtle uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-subtle uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-subtle uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-divider">
                  {refundRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-surface-2">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">{request.user_name}</p>
                          <p className="text-sm text-muted-foreground">{request.user_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-foreground">₹{request.refund_amount?.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <Badge variant="outline" className="mb-1">
                            {request.reason_category?.replace('_', ' ')}
                          </Badge>
                          <p className="text-sm text-subtle line-clamp-2">{request.request_reason}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-subtle">
                        {new Date(request.created_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {/* Organizer Actions */}
                          {request.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowApprovalModal(true);
                                }}
                                className="text-buy-muted-foreground hover:text-buy-muted-foreground hover:bg-buy-muted"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectModal(true);
                                }}
                                className="text-sell-muted-foreground hover:text-sell-muted-foreground hover:bg-sell-muted"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}

                          {/* Admin Actions */}
                          {request.status === 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowProcessModal(true);
                              }}
                              className="bg-primary hover:bg-primary"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Process Refund
                            </Button>
                          )}

                          {/* View Details */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowApprovalModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve Refund Request</DialogTitle>
            <DialogDescription>
              Review and approve this refund request. After approval, an admin will process the actual refund.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-surface-2 rounded-lg">
                <div>
                  <Label className="text-sm text-subtle">User</Label>
                  <p className="font-medium">{selectedRequest.user_name}</p>
                  <p className="text-sm text-subtle">{selectedRequest.user_email}</p>
                </div>
                <div>
                  <Label className="text-sm text-subtle">Refund Amount</Label>
                  <p className="font-semibold text-lg text-buy-muted-foreground">₹{selectedRequest.refund_amount?.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm text-subtle">Reason Category</Label>
                  <Badge variant="outline" className="mt-1">
                    {selectedRequest.reason_category?.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm text-subtle">Detailed Reason</Label>
                  <p className="text-sm mt-1">{selectedRequest.request_reason}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Add internal notes about this refund approval..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApprovalModal(false);
                setSelectedRequest(null);
                setAdminNotes('');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleOrganizerApprove(selectedRequest)}
              disabled={isProcessing}
              className="bg-buy text-buy-foreground hover:bg-buy-soft"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Refund Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this refund request. The user will be notified.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-sell-muted rounded-lg border border-sell/30">
                <p className="text-sm text-sell-muted-foreground">
                  <strong>User:</strong> {selectedRequest.user_name}
                </p>
                <p className="text-sm text-sell-muted-foreground mt-1">
                  <strong>Amount:</strong> ₹{selectedRequest.refund_amount?.toLocaleString()}
                </p>
              </div>

              <div>
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Explain why this refund request is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="adminNotesReject">Admin Notes (Optional)</Label>
                <Textarea
                  id="adminNotesReject"
                  placeholder="Add internal notes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setSelectedRequest(null);
                setRejectionReason('');
                setAdminNotes('');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleOrganizerReject(selectedRequest)}
              disabled={isProcessing || !rejectionReason.trim()}
              className="bg-sell hover:bg-sell"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Refund Modal (Admin Only) */}
      <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              This will initiate the actual refund through the payment gateway. The user will receive their money within 5-7 business days.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-premium-muted rounded-lg border border-protocall-premium-light">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-primary">User</Label>
                    <p className="font-medium text-primary">{selectedRequest.user_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-primary">Refund Amount</Label>
                    <p className="font-semibold text-lg text-primary">₹{selectedRequest.refund_amount?.toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm text-primary">Original Payment ID</Label>
                    <p className="font-mono text-sm text-primary">{selectedRequest.original_transaction_id}</p>
                  </div>
                </div>
              </div>

              <div className="bg-hold-muted border border-hold/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-hold-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-hold-muted-foreground">
                    <p className="font-semibold mb-1">Important:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>This action will process the refund immediately</li>
                      <li>The payment gateway will be charged</li>
                      <li>User will be notified automatically</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="processNotes">Processing Notes (Optional)</Label>
                <Textarea
                  id="processNotes"
                  placeholder="Add any notes about this refund processing..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowProcessModal(false);
                setSelectedRequest(null);
                setAdminNotes('');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleAdminProcess(selectedRequest)}
              disabled={isProcessing}
              className="bg-primary hover:bg-primary"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Process Refund
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
