import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
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
      const pms = await base44.entities.PortfolioManager.list('-created_date');
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
      await base44.entities.PortfolioManager.update(pmId, {
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
      await base44.entities.PortfolioManager.update(pmId, {
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
      await base44.entities.PortfolioManager.update(pmId, { status: 'suspended' });
      toast.success('Portfolio Manager suspended');
      loadPortfolioManagers();
    } catch (error) {
      console.error('Error suspending PM:', error);
      toast.error('Failed to suspend PM');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' },
      suspended: { color: 'bg-orange-100 text-orange-800', icon: XCircle, label: 'Suspended' }
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
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Briefcase className="w-6 h-6" />
            Portfolio Management Service (PMS)
          </CardTitle>
          <p className="text-blue-100">Manage SEBI-registered Portfolio Managers and their clients</p>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total PMs</p>
                <p className="text-2xl font-bold">{portfolioManagers.length}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold">{pendingPMs.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active PMs</p>
                <p className="text-2xl font-bold">{approvedPMs.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total AUM</p>
                <p className="text-2xl font-bold">
                  ₹{(approvedPMs.reduce((sum, pm) => sum + (pm.total_aum || 0), 0) / 10000000).toFixed(2)}Cr
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
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
              <CardContent className="text-center py-12 text-gray-500">
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
                  <p className="text-sm text-gray-600">Display Name</p>
                  <p className="font-semibold">{selectedPM.display_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Company</p>
                  <p className="font-semibold">{selectedPM.company_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">SEBI Reg No.</p>
                  <p className="font-semibold">{selectedPM.sebi_registration_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Experience</p>
                  <p className="font-semibold">{selectedPM.experience_years} years</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Bio</p>
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
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' },
      suspended: { color: 'bg-orange-100 text-orange-800', icon: XCircle, label: 'Suspended' }
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
              <Briefcase className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">{pm.display_name}</h3>
                <p className="text-sm text-gray-600">SEBI: {pm.sebi_registration_number}</p>
              </div>
              {getStatusBadge(pm.status)}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">Total AUM</p>
                <p className="text-lg font-bold text-blue-900">
                  ₹{((pm.total_aum || 0) / 10000000).toFixed(2)}Cr
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-green-600 mb-1">Clients</p>
                <p className="text-lg font-bold text-green-900">{pm.total_clients || 0}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-xs text-purple-600 mb-1">Fee Rate</p>
                <p className="text-lg font-bold text-purple-900">{pm.performance_fee_percentage}%</p>
              </div>
            </div>

            <p className="text-sm text-gray-600">{pm.bio}</p>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              <Eye className="w-4 h-4 mr-2" />
              Details
            </Button>

            {pm.status === 'pending_approval' && onApprove && onReject && (
              <>
                <Button size="sm" onClick={() => onApprove(pm.id)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => onReject(pm.id)} className="text-red-600 border-red-600">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}

            {pm.status === 'approved' && onSuspend && (
              <Button size="sm" variant="outline" onClick={() => onSuspend(pm.id)} className="text-orange-600 border-orange-600">
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