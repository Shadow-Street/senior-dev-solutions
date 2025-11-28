
import React, { useState, useEffect } from 'react';
import { Advisor, User, AdvisorSubscription, AdvisorPost, AdvisorPlan, CommissionTracking, PayoutRequest } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Target,
  BarChart3,
  Trash2,
  Ban,
  Wallet,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import AdvisorPricingCommission from './advisors/AdvisorPricingCommission';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdvisorManagement({ refreshEntityConfigs }) {
  const [advisors, setAdvisors] = useState([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  const [advisorStats, setAdvisorStats] = useState({});
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [advisorToDelete, setAdvisorToDelete] = useState(null);

  useEffect(() => {
    loadAdvisors();
  }, []);

  const loadAdvisors = async () => {
    setIsLoading(true);
    try {
      const advisorsList = await Advisor.list('-created_date');
      setAdvisors(advisorsList);

      for (const advisor of advisorsList) {
        loadAdvisorStats(advisor.id);
      }
    } catch (error) {
      console.error('Error loading advisors:', error);
      toast.error('Failed to load advisors');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdvisorStats = async (advisorId) => {
    try {
      const [subscriptions, posts, plans, commissions] = await Promise.all([
        AdvisorSubscription.filter({ advisor_id: advisorId }).catch(() => []),
        AdvisorPost.filter({ advisor_id: advisorId }).catch(() => []),
        AdvisorPlan.filter({ advisor_id: advisorId }).catch(() => []),
        CommissionTracking.filter({ advisor_id: advisorId }).catch(() => [])
      ]);

      const activeSubscribers = subscriptions.filter(s => s.status === 'active').length;
      const totalViews = posts.reduce((sum, p) => sum + (p.view_count || 0), 0);
      const totalEarnings = commissions.reduce((sum, c) => sum + (c.advisor_payout || 0), 0);
      const avgEngagement = subscriptions.length > 0
        ? subscriptions.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / subscriptions.length
        : 0;

      const activeRecommendations = posts.filter(p => p.recommendation_status === 'active').length;
      const targetsHit = posts.filter(p => p.recommendation_status === 'target_hit').length;
      const stopLossHit = posts.filter(p => p.recommendation_status === 'stop_loss_hit').length;
      const successRate = (targetsHit + stopLossHit) > 0
        ? (targetsHit / (targetsHit + stopLossHit)) * 100
        : 0;

      setAdvisorStats(prev => ({
        ...prev,
        [advisorId]: {
          totalSubscribers: subscriptions.length,
          activeSubscribers,
          totalPosts: posts.length,
          totalViews,
          totalEarnings,
          avgEngagement: Math.round(avgEngagement),
          activePlans: plans.filter(p => p.is_active).length,
          activeRecommendations,
          targetsHit,
          stopLossHit,
          successRate: Math.round(successRate)
        }
      }));
    } catch (error) {
      console.error(`Error loading stats for advisor ${advisorId}:`, error);
    }
  };

  const handleApprove = async (advisorId) => {
    try {
      await Advisor.update(advisorId, { status: 'approved' });
      toast.success('Advisor approved successfully');
      loadAdvisors();
    } catch (error) {
      console.error('Error approving advisor:', error);
      toast.error('Failed to approve advisor');
    }
  };

  const handleReject = async (advisorId) => {
    try {
      await Advisor.update(advisorId, { status: 'rejected' });
      toast.success('Advisor application rejected');
      loadAdvisors();
    } catch (error) {
      console.error('Error rejecting advisor:', error);
      toast.error('Failed to reject advisor');
    }
  };

  const handleSuspend = async (advisorId) => {
    try {
      await Advisor.update(advisorId, { status: 'suspended' });
      toast.success('Advisor suspended');
      loadAdvisors();
    } catch (error) {
      console.error('Error suspending advisor:', error);
      toast.error('Failed to suspend advisor');
    }
  };

  const handleDelete = async () => {
    if (!advisorToDelete) return;

    try {
      await Advisor.delete(advisorToDelete.id);
      toast.success('Advisor deleted successfully');
      setAdvisors(advisors.filter(a => a.id !== advisorToDelete.id));
      setShowDeleteDialog(false);
      setAdvisorToDelete(null);
    } catch (error) {
      console.error('Error deleting advisor:', error);
      toast.error('Failed to delete advisor');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected', icon: XCircle },
      suspended: { color: 'bg-orange-100 text-orange-800', label: 'Suspended', icon: Ban }
    };
    const { color, label, icon: Icon } = config[status] || config.pending_approval;
    return (
      <Badge className={`${color} border-0 flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const filteredAdvisors = advisors.filter(advisor => {
    const matchesSearch =
      advisor.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      advisor.bio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || advisor.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Advisor Management</h2>
              <p className="text-sm text-slate-600">Manage SEBI registered advisors and their subscriptions</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-4 h-auto bg-transparent p-0">
          <TabsTrigger 
            value="overview" 
            className="w-full h-auto p-0 transition-all duration-300 data-[state=active]:scale-105"
          >
            <Card className={`w-full border-0 rounded-full transition-all duration-300 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md'
            }`}>
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2 justify-center">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-sm font-semibold whitespace-nowrap">Advisors Overview</span>
                </div>
              </CardContent>
            </Card>
          </TabsTrigger>

          <TabsTrigger 
            value="pricing" 
            className="w-full h-auto p-0 transition-all duration-300 data-[state=active]:scale-105"
          >
            <Card className={`w-full border-0 rounded-full transition-all duration-300 ${
              activeTab === 'pricing'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md'
            }`}>
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2 justify-center">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-semibold whitespace-nowrap">Pricing & Commission</span>
                </div>
              </CardContent>
            </Card>
          </TabsTrigger>

          <TabsTrigger 
            value="payouts" 
            className="w-full h-auto p-0 transition-all duration-300 data-[state=active]:scale-105"
          >
            <Card className={`w-full border-0 rounded-full transition-all duration-300 ${
              activeTab === 'payouts'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md'
            }`}>
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2 justify-center">
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-semibold whitespace-nowrap">Payout Tracking</span>
                </div>
              </CardContent>
            </Card>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search advisors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="all">All Status</option>
              <option value="pending_approval">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Advisors</p>
                    <p className="text-2xl font-bold">{advisors.length}</p>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Pending Approval</p>
                    <p className="text-2xl font-bold">{advisors.filter(a => a.status === 'pending_approval').length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Active Advisors</p>
                    <p className="text-2xl font-bold">{advisors.filter(a => a.status === 'approved').length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Revenue</p>
                    <p className="text-2xl font-bold">
                      ₹{Object.values(advisorStats).reduce((sum, stat) => sum + (stat?.totalEarnings || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {filteredAdvisors.map((advisor) => {
              const stats = advisorStats[advisor.id] || {};

              return (
                <Card key={advisor.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      <img
                        src={advisor.profile_image_url || `https://avatar.vercel.sh/${advisor.display_name}.png`}
                        alt={advisor.display_name}
                        className="w-20 h-20 rounded-full object-cover border-2 border-purple-200"
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-800">{advisor.display_name}</h3>
                          {getStatusBadge(advisor.status)}
                          <Badge className="bg-blue-100 text-blue-800 border-0">
                            SEBI: {advisor.sebi_registration_number}
                          </Badge>
                        </div>

                        <p className="text-sm text-slate-600 mb-4">{advisor.bio}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="w-4 h-4 text-blue-600" />
                              <p className="text-xs text-blue-600 font-medium">Subscribers</p>
                            </div>
                            <p className="text-lg font-bold text-blue-900">
                              {stats.activeSubscribers || 0} / {stats.totalSubscribers || 0}
                            </p>
                            <p className="text-xs text-blue-600">Active / Total</p>
                          </div>

                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-green-600" />
                              <p className="text-xs text-green-600 font-medium">Posts</p>
                            </div>
                            <p className="text-lg font-bold text-green-900">{stats.totalPosts || 0}</p>
                            <p className="text-xs text-green-600">{stats.totalViews || 0} total views</p>
                          </div>

                          <div className="bg-purple-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <DollarSign className="w-4 h-4 text-purple-600" />
                              <p className="text-xs text-purple-600 font-medium">Earnings</p>
                            </div>
                            <p className="text-lg font-bold text-purple-900">₹{(stats.totalEarnings || 0).toLocaleString()}</p>
                            <p className="text-xs text-purple-600">{stats.activePlans || 0} active plans</p>
                          </div>

                          <div className="bg-orange-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Target className="w-4 h-4 text-orange-600" />
                              <p className="text-xs text-orange-600 font-medium">Performance</p>
                            </div>
                            <p className="text-lg font-bold text-orange-900">{stats.successRate || 0}%</p>
                            <p className="text-xs text-orange-600">
                              {stats.targetsHit || 0} targets / {stats.stopLossHit || 0} SL
                            </p>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-slate-700">Avg Engagement Score:</span>
                            </div>
                            <Badge className="bg-blue-600 text-white">
                              {stats.avgEngagement || 0}/100
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-slate-600">Active Recommendations:</span>
                            <span className="text-sm font-bold text-blue-900">{stats.activeRecommendations || 0}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {advisor.specialization?.map((spec, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedAdvisor(advisor);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>

                        {advisor.status === 'pending_approval' && (
                          <>
                            <Button onClick={() => handleApprove(advisor.id)} className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button onClick={() => handleReject(advisor.id)} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}

                        {advisor.status === 'approved' && (
                          <Button onClick={() => handleSuspend(advisor.id)} variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-50">
                            <Ban className="w-4 h-4 mr-2" />
                            Suspend
                          </Button>
                        )}

                        {advisor.status === 'suspended' && (
                          <Button onClick={() => handleApprove(advisor.id)} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Reactivate
                          </Button>
                        )}

                        {advisor.sebi_document_url && (
                          <Button
                            variant="outline"
                            onClick={() => window.open(advisor.sebi_document_url, '_blank')}
                            className="text-purple-600 border-purple-600 hover:bg-purple-50"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            SEBI Doc
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedAdvisor(advisor);
                            setShowDetailsModal(false); // Make sure this is false to show Analytics modal
                          }}
                          className="text-indigo-600 border-indigo-600 hover:bg-indigo-50"
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Analytics
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setAdvisorToDelete(advisor);
                            setShowDeleteDialog(true);
                          }}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredAdvisors.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <ShieldCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No advisors found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pricing">
          <AdvisorPricingCommission refreshEntityConfigs={refreshEntityConfigs} />
        </TabsContent>

        <TabsContent value="payouts">
          <AdvisorPayoutsSection advisors={advisors} advisorStats={advisorStats} />
        </TabsContent>
      </Tabs>

      {selectedAdvisor && showDetailsModal && (
        <AdvisorDetailsModal
          advisor={selectedAdvisor}
          stats={advisorStats[selectedAdvisor.id]}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAdvisor(null);
          }}
        />
      )}

      {selectedAdvisor && !showDetailsModal && (
        <AdvisorAnalyticsModal
          advisor={selectedAdvisor}
          stats={advisorStats[selectedAdvisor.id]}
          onClose={() => setSelectedAdvisor(null)}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {advisorToDelete?.display_name} and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAdvisorToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Advisor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AdvisorDetailsModal({ advisor, stats, onClose }) {
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, [advisor.id]);

  const loadDetails = async () => {
    try {
      const [userData, plansData] = await Promise.all([
        advisor.user_id ? User.get(advisor.user_id).catch(() => null) : Promise.resolve(null),
        AdvisorPlan.filter({ advisor_id: advisor.id }).catch(() => [])
      ]);
      setUser(userData);
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading advisor details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            Advisor Details: {advisor.display_name}
          </DialogTitle>
          <DialogDescription>
            Complete profile and performance information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Display Name</p>
                  <p className="font-semibold">{advisor.display_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">SEBI Registration</p>
                  <p className="font-semibold">{advisor.sebi_registration_number}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Email</p>
                  <p className="font-semibold">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Status</p>
                  <p className="font-semibold capitalize">{advisor.status?.replace('_', ' ')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-600">Bio</p>
                  <p className="font-medium text-sm">{advisor.bio}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-600">Specialization</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {advisor.specialization?.map((spec, idx) => (
                      <Badge key={idx} variant="outline">{spec}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 mb-2" />
                  <p className="text-xs text-blue-600">Active Subscribers</p>
                  <p className="text-2xl font-bold text-blue-900">{stats?.activeSubscribers || 0}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600 mb-2" />
                  <p className="text-xs text-green-600">Total Posts</p>
                  <p className="text-2xl font-bold text-green-900">{stats?.totalPosts || 0}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-600 mb-2" />
                  <p className="text-xs text-purple-600">Total Views</p>
                  <p className="text-2xl font-bold text-purple-900">{stats?.totalViews || 0}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <Target className="w-5 h-5 text-orange-600 mb-2" />
                  <p className="text-xs text-orange-600">Success Rate</p>
                  <p className="text-2xl font-bold text-orange-900">{stats?.successRate || 0}%</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subscription Plans ({plans.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {plans.length > 0 ? (
                  <div className="space-y-3">
                    {plans.map(plan => (
                      <div key={plan.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-semibold">{plan.name}</p>
                          <p className="text-sm text-slate-600">{plan.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600">₹{plan.price?.toLocaleString()}</p>
                          <Badge className={plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No plans created yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AdvisorAnalyticsModal({ advisor, stats, onClose }) {
  const [posts, setPosts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDetailedData();
  }, [advisor.id]);

  const loadDetailedData = async () => {
    try {
      const [postsData, subsData] = await Promise.all([
        AdvisorPost.filter({ advisor_id: advisor.id }, '-created_date', 20),
        AdvisorSubscription.filter({ advisor_id: advisor.id }, '-created_date', 20)
      ]);
      setPosts(postsData);
      setSubscriptions(subsData);
    } catch (error) {
      console.error('Error loading detailed data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              {advisor.display_name} - Detailed Analytics
            </CardTitle>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="posts">Posts Performance</TabsTrigger>
                <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-blue-50">
                    <CardContent className="p-4">
                      <Users className="w-6 h-6 text-blue-600 mb-2" />
                      <p className="text-2xl font-bold text-blue-900">{stats?.activeSubscribers || 0}</p>
                      <p className="text-xs text-blue-600">Active Subscribers</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50">
                    <CardContent className="p-4">
                      <FileText className="w-6 h-6 text-green-600 mb-2" />
                      <p className="text-2xl font-bold text-green-900">{stats?.totalPosts || 0}</p>
                      <p className="text-xs text-green-600">Total Posts</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-50">
                    <CardContent className="p-4">
                      <Eye className="w-6 h-6 text-purple-600 mb-2" />
                      <p className="text-2xl font-bold text-purple-900">{stats?.totalViews || 0}</p>
                      <p className="text-xs text-purple-600">Total Views</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-orange-50">
                    <CardContent className="p-4">
                      <Target className="w-6 h-6 text-orange-600 mb-2" />
                      <p className="text-2xl font-bold text-orange-900">{stats?.successRate || 0}%</p>
                      <p className="text-xs text-orange-600">Success Rate</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="posts" className="space-y-4">
                {posts.map(post => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{post.title}</h4>
                          <div className="flex gap-2 flex-wrap mb-2">
                            <Badge variant="outline">{post.stock_symbol}</Badge>
                            {post.recommendation_type && (
                              <Badge className={
                                post.recommendation_type === 'buy' ? 'bg-green-100 text-green-800' :
                                post.recommendation_type === 'sell' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {post.recommendation_type.toUpperCase()}
                              </Badge>
                            )}
                            {post.recommendation_status && post.recommendation_status !== 'active' && (
                              <Badge className={
                                post.recommendation_status === 'target_hit' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {post.recommendation_status === 'target_hit' ? '🎯 Target Hit' : '🛑 Stop Loss'}
                                {post.return_percentage && ` (${post.return_percentage.toFixed(1)}%)`}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-4 text-xs text-slate-500">
                            <span>👁️ {post.view_count || 0} views</span>
                            <span>📅 {format(new Date(post.created_date), 'MMM d, yyyy')}</span>
                            {post.notification_sent && <span>✅ Notified</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="subscribers" className="space-y-4">
                {subscriptions.map(sub => (
                  <Card key={sub.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">User: {sub.user_id?.substring(0, 10)}...</p>
                          <p className="text-sm text-slate-600">
                            Started: {format(new Date(sub.start_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {sub.status}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            Engagement: {sub.engagement_score || 0}/100
                          </p>
                          <p className="text-xs text-slate-500">
                            Posts read: {sub.posts_read || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdvisorPayoutsSection({ advisors, advisorStats }) {
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAdvisor, setSelectedAdvisor] = useState('all');

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    setIsLoading(true);
    try {
      const [allPayouts, allCommissions] = await Promise.all([
        PayoutRequest.filter({ entity_type: 'advisor' }, '-created_date').catch(() => []),
        CommissionTracking.list('-transaction_date').catch(() => [])
      ]);
      setPayoutRequests(allPayouts || []);
      setCommissions(allCommissions || []);
    } catch (error) {
      console.error('Error loading payouts:', error);
      toast.error('Failed to load payout requests');
      setPayoutRequests([]);
      setCommissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Safety check - ensure arrays exist
  const safePayoutRequests = payoutRequests || [];
  const safeCommissions = commissions || [];
  const safeAdvisors = advisors || [];

  const filteredPayouts = selectedAdvisor === 'all' 
    ? safePayoutRequests 
    : safePayoutRequests.filter(p => p.entity_id === selectedAdvisor);

  // Existing stats with safety checks
  const totalPending = safePayoutRequests.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.requested_amount || 0), 0);
  const totalApproved = safePayoutRequests.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.requested_amount || 0), 0);
  const totalProcessed = safePayoutRequests.filter(p => p.status === 'processed').reduce((sum, p) => sum + (p.requested_amount || 0), 0);

  // Business-level stats with safety checks
  const totalGrossEarnings = safeCommissions.reduce((sum, c) => sum + (c.gross_amount || 0), 0);
  const totalPlatformCommission = safeCommissions.reduce((sum, c) => sum + (c.platform_fee || 0), 0);
  const totalAdvisorPayout = safeCommissions.reduce((sum, c) => sum + (c.advisor_payout || 0), 0);
  const totalPaidOut = safePayoutRequests.filter(p => p.status === 'processed').reduce((sum, p) => sum + (p.requested_amount || 0), 0);
  const pendingPayoutAmount = totalAdvisorPayout - totalPaidOut;

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved' },
      processed: { color: 'bg-green-100 text-green-800', label: 'Processed' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };
    const { color, label } = config[status] || config.pending;
    return <Badge className={`${color} border-0`}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Business Stats - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-semibold mb-1">Gross Earnings</p>
                <p className="text-3xl font-bold text-blue-900">₹{totalGrossEarnings.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">Total subscription revenue</p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-semibold mb-1">Platform Commission</p>
                <p className="text-3xl font-bold text-purple-900">₹{totalPlatformCommission.toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-1">Total commission earned</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-semibold mb-1">Payout Pending</p>
                <p className="text-3xl font-bold text-orange-900">₹{Math.max(0, pendingPayoutAmount).toLocaleString()}</p>
                <p className="text-xs text-orange-600 mt-1">Awaiting advisor requests</p>
              </div>
              <Wallet className="w-12 h-12 text-orange-600 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Stats - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Requests</p>
                <p className="text-2xl font-bold">{safePayoutRequests.length}</p>
              </div>
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending</p>
                <p className="text-2xl font-bold">₹{totalPending.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Approved</p>
                <p className="text-2xl font-bold">₹{totalApproved.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Processed</p>
                <p className="text-2xl font-bold">₹{totalProcessed.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-slate-700">Filter by Advisor:</label>
        <select
          value={selectedAdvisor}
          onChange={(e) => setSelectedAdvisor(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        >
          <option value="all">All Advisors</option>
          {safeAdvisors.filter(a => a.status === 'approved').map(advisor => (
            <option key={advisor.id} value={advisor.id}>
              {advisor.display_name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayouts.length > 0 ? (
            <div className="space-y-4">
              {filteredPayouts.map(payout => {
                const advisor = safeAdvisors.find(a => a.id === payout.entity_id);
                const stats = (advisorStats && advisorStats[payout.entity_id]) || {};
                
                return (
                  <Card key={payout.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg">{advisor?.display_name || 'Unknown Advisor'}</h4>
                            {getStatusBadge(payout.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <p className="text-xs text-slate-600">Requested Amount</p>
                              <p className="text-xl font-bold text-purple-600">₹{(payout.requested_amount || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-600">Available Balance</p>
                              <p className="text-sm font-semibold">₹{(payout.available_balance || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-600">Payout Method</p>
                              <p className="text-sm font-semibold capitalize">{payout.payout_method?.replace('_', ' ') || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-600">Request Date</p>
                              <p className="text-sm font-semibold">{format(new Date(payout.created_date), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                          {payout.admin_notes && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-blue-600 font-medium">Admin Notes:</p>
                              <p className="text-sm text-slate-700">{payout.admin_notes}</p>
                            </div>
                          )}
                          {payout.processed_date && (
                            <p className="text-xs text-slate-500 mt-2">
                              Processed on: {format(new Date(payout.processed_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                        
                        <div className="ml-4 text-right">
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-600">Total Earnings</p>
                            <p className="text-lg font-bold text-slate-900">₹{(stats.totalEarnings || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-12">
              <Wallet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {selectedAdvisor === 'all' 
                  ? 'No payout requests found' 
                  : 'No payout requests for this advisor'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
