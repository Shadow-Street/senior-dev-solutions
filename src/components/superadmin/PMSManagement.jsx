import React, { useState, useEffect } from 'react';
import { PortfolioManager } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Users, TrendingUp, Settings, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PMSManagement({ user }) {
  const [portfolioManagers, setPortfolioManagers] = useState([]);
  const [selectedPM, setSelectedPM] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadPortfolioManagers();
  }, []);

  const loadPortfolioManagers = async () => {
    try {
      const pms = await PortfolioManager.list('-created_date');
      setPortfolioManagers(pms);
    } catch (error) {
      console.error('Error loading PMs:', error);
      toast.error('Failed to load Portfolio Managers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (pmId) => {
    try {
      await PortfolioManager.update(pmId, {
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      });
      toast.success('Portfolio Manager approved successfully');
      loadPortfolioManagers();
    } catch (error) {
      console.error('Error approving PM:', error);
      toast.error('Failed to approve PM');
    }
  };

  const handleReject = async (pmId) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      await PortfolioManager.update(pmId, {
        status: 'rejected',
        rejection_reason: reason
      });
      toast.success('Portfolio Manager application rejected');
      loadPortfolioManagers();
    } catch (error) {
      console.error('Error rejecting PM:', error);
      toast.error('Failed to reject PM');
    }
  };

  const handleSuspend = async (pmId) => {
    try {
      await PortfolioManager.update(pmId, { status: 'suspended' });
      toast.success('Portfolio Manager suspended');
      loadPortfolioManagers();
    } catch (error) {
      console.error('Error suspending PM:', error);
      toast.error('Failed to suspend PM');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending_approval: { color: 'bg-hold-muted text-hold-muted-foreground', icon: Clock, label: 'Pending' },
      approved: { color: 'bg-buy-muted text-buy-muted-foreground', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-sell-muted text-sell-muted-foreground', icon: XCircle, label: 'Rejected' },
      suspended: { color: 'bg-hold-muted text-hold-muted-foreground', icon: XCircle, label: 'Suspended' }
    };
    const { color, icon: Icon, label } = config[status] || config.pending_approval;
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const pendingPMs = portfolioManagers.filter(pm => pm.status === 'pending_approval');
  const approvedPMs = portfolioManagers.filter(pm => pm.status === 'approved');
  const rejectedPMs = portfolioManagers.filter(pm => pm.status === 'rejected' || pm.status === 'suspended');

  if (isLoading) {
    return <div className="flex items-center justify-center p-12">Loading Portfolio Managers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-protocall-deep to-protocall-blue text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Briefcase className="w-6 h-6" />
            Portfolio Management Service (PMS)
          </CardTitle>
          <p className="text-white/80">Manage SEBI-registered Portfolio Managers and their clients</p>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle">Total PMs</p>
                <p className="text-2xl font-bold">{portfolioManagers.length}</p>
              </div>
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle">Pending Approval</p>
                <p className="text-2xl font-bold">{pendingPMs.length}</p>
              </div>
              <Clock className="w-8 h-8 text-hold-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle">Active PMs</p>
                <p className="text-2xl font-bold">{approvedPMs.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-buy-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle">Total AUM</p>
                <p className="text-2xl font-bold">
                  ₹{(approvedPMs.reduce((sum, pm) => sum + (pm.total_aum || 0), 0) / 10000000).toFixed(2)}Cr
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-protocall-premium-text" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-white">
          <TabsTrigger value="pending">
            Pending ({pendingPMs.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedPMs.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected/Suspended ({rejectedPMs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingPMs.map(pm => (
            <PMCard
              key={pm.id}
              pm={pm}
              onApprove={handleApprove}
              onReject={handleReject}
              onViewDetails={() => {
                setSelectedPM(pm);
                setShowDetailsModal(true);
              }}
            />
          ))}
          {pendingPMs.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                No pending applications
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-6">
          {approvedPMs.map(pm => (
            <PMCard
              key={pm.id}
              pm={pm}
              onSuspend={handleSuspend}
              onViewDetails={() => {
                setSelectedPM(pm);
                setShowDetailsModal(true);
              }}
            />
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-6">
          {rejectedPMs.map(pm => (
            <PMCard
              key={pm.id}
              pm={pm}
              onViewDetails={() => {
                setSelectedPM(pm);
                setShowDetailsModal(true);
              }}
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* Details Modal */}
      {showDetailsModal && selectedPM && (
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Portfolio Manager Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-subtle">Display Name</p>
                  <p className="font-semibold">{selectedPM.display_name}</p>
                </div>
                <div>
                  <p className="text-sm text-subtle">Company</p>
                  <p className="font-semibold">{selectedPM.company_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-subtle">SEBI Reg No.</p>
                  <p className="font-semibold">{selectedPM.sebi_registration_number}</p>
                </div>
                <div>
                  <p className="text-sm text-subtle">Experience</p>
                  <p className="font-semibold">{selectedPM.experience_years} years</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-subtle">Bio</p>
                  <p className="text-sm">{selectedPM.bio}</p>
                </div>
              </div>

              {selectedPM.sebi_document_url && (
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedPM.sebi_document_url, '_blank')}
                  className="w-full"
                >
                  View SEBI Certificate
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PMCard({ pm, onApprove, onReject, onSuspend, onViewDetails }) {
  const getStatusBadge = (status) => {
    const config = {
      pending_approval: { color: 'bg-hold-muted text-hold-muted-foreground', icon: Clock, label: 'Pending' },
      approved: { color: 'bg-buy-muted text-buy-muted-foreground', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-sell-muted text-sell-muted-foreground', icon: XCircle, label: 'Rejected' },
      suspended: { color: 'bg-hold-muted text-hold-muted-foreground', icon: XCircle, label: 'Suspended' }
    };
    const { color, icon: Icon, label } = config[status] || config.pending_approval;
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Briefcase className="w-6 h-6 text-primary" />
              <div>
                <h3 className="text-lg font-bold text-foreground">{pm.display_name}</h3>
                <p className="text-sm text-subtle">SEBI: {pm.sebi_registration_number}</p>
              </div>
              {getStatusBadge(pm.status)}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-premium-muted p-3 rounded-lg">
                <p className="text-xs text-primary mb-1">Total AUM</p>
                <p className="text-lg font-bold text-primary">
                  ₹{((pm.total_aum || 0) / 10000000).toFixed(2)}Cr
                </p>
              </div>
              <div className="bg-buy-muted p-3 rounded-lg">
                <p className="text-xs text-buy-muted-foreground mb-1">Clients</p>
                <p className="text-lg font-bold text-buy-muted-foreground">{pm.total_clients || 0}</p>
              </div>
              <div className="bg-premium-muted p-3 rounded-lg">
                <p className="text-xs text-protocall-premium-text mb-1">Fee Rate</p>
                <p className="text-lg font-bold text-protocall-premium-text">{pm.performance_fee_percentage}%</p>
              </div>
            </div>

            <p className="text-sm text-subtle">{pm.bio}</p>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              <Eye className="w-4 h-4 mr-2" />
              Details
            </Button>

            {pm.status === 'pending_approval' && onApprove && onReject && (
              <>
                <Button size="sm" onClick={() => onApprove(pm.id)} className="bg-buy text-buy-foreground hover:bg-buy-soft">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => onReject(pm.id)} className="text-sell-muted-foreground border-sell">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}

            {pm.status === 'approved' && onSuspend && (
              <Button size="sm" variant="outline" onClick={() => onSuspend(pm.id)} className="text-hold-muted-foreground border-hold">
                <XCircle className="w-4 h-4 mr-2" />
                Suspend
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
