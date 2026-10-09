
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

  /**
   * Approval has to move two records, not one.
   *
   * `/AdvisorDashboard` is gated on the *user's* app_role, so setting only
   * Advisor.status left an approved advisor unable to open their own dashboard.
   * Approval therefore also marks the profile verified (the SEBI badge the
   * investor-facing pages read) and promotes the owning user to 'advisor';
   * rejection and suspension demote them back, or a suspended advisor would
   * keep working dashboard access.
   */
  const setOwnerRole = async (advisorId, appRole) => {
    const advisor = advisors.find(a => a.id === advisorId);
    if (!advisor?.user_id) return;
    try {
      await User.update(advisor.user_id, { app_role: appRole });
    } catch (error) {
      console.error(`Could not set app_role=${appRole} for user ${advisor.user_id}:`, error);
      toast.error('Status saved, but the account role could not be updated.');
    }
  };

  const handleApprove = async (advisorId) => {
    try {
      await Advisor.update(advisorId, { status: 'approved', verified: true });
      await setOwnerRole(advisorId, 'advisor');
      toast.success('Advisor approved successfully');
      loadAdvisors();
    } catch (error) {
      console.error('Error approving advisor:', error);
      toast.error('Failed to approve advisor');
    }
  };

  const handleReject = async (advisorId) => {
    try {
      await Advisor.update(advisorId, { status: 'rejected', verified: false });
      await setOwnerRole(advisorId, 'user');
      toast.success('Advisor application rejected');
      loadAdvisors();
    } catch (error) {
      console.error('Error rejecting advisor:', error);
      toast.error('Failed to reject advisor');
    }
  };

  const handleSuspend = async (advisorId) => {
    try {
      await Advisor.update(advisorId, { status: 'suspended', verified: false });
      await setOwnerRole(advisorId, 'user');
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
      pending_approval: { color: 'bg-hold-muted text-hold-muted-foreground', label: 'Pending', icon: Clock },
      approved: { color: 'bg-buy-muted text-buy-muted-foreground', label: 'Approved', icon: CheckCircle },
      rejected: { color: 'bg-sell-muted text-sell-muted-foreground', label: 'Rejected', icon: XCircle },
      suspended: { color: 'bg-hold-muted text-hold-muted-foreground', label: 'Suspended', icon: Ban }
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Advisor Management</h2>
              <p className="text-sm text-subtle">Manage SEBI registered advisors and their subscriptions</p>
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
                ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-lg' 
                : 'bg-surface-2 text-primary hover:from-surface-2 hover:to-surface-2 hover:shadow-md'
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
                ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-lg' 
                : 'bg-surface-2 text-primary hover:from-surface-2 hover:to-surface-2 hover:shadow-md'
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
                ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-lg' 
                : 'bg-surface-2 text-primary hover:from-surface-2 hover:to-surface-2 hover:shadow-md'
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
              className="px-3 py-2 text-sm border border-border rounded-md bg-white hover:border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
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
                    <p className="text-sm text-subtle">Total Advisors</p>
                    <p className="text-2xl font-bold">{advisors.length}</p>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-subtle">Pending Approval</p>
                    <p className="text-2xl font-bold">{advisors.filter(a => a.status === 'pending_approval').length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-hold-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-subtle">Active Advisors</p>
                    <p className="text-2xl font-bold">{advisors.filter(a => a.status === 'approved').length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-buy-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-subtle">Total Revenue</p>
                    <p className="text-2xl font-bold">
                      ₹{Object.values(advisorStats).reduce((sum, stat) => sum + (stat?.totalEarnings || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-protocall-premium-text" />
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
                        className="w-20 h-20 rounded-full object-cover border-2 border-protocall-premium-light"
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-foreground">{advisor.display_name}</h3>
                          {getStatusBadge(advisor.status)}
                          <Badge className="bg-premium-muted text-primary border-0">
                            SEBI: {advisor.sebi_registration_number}
                          </Badge>
                        </div>

                        <p className="text-sm text-subtle mb-4">{advisor.bio}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-premium-muted rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="w-4 h-4 text-primary" />
                              <p className="text-xs text-primary font-medium">Subscribers</p>
                            </div>
                            <p className="text-lg font-bold text-primary">
                              {stats.activeSubscribers || 0} / {stats.totalSubscribers || 0}
                            </p>
                            <p className="text-xs text-primary">Active / Total</p>
                          </div>

                          <div className="bg-buy-muted rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-buy-muted-foreground" />
                              <p className="text-xs text-buy-muted-foreground font-medium">Posts</p>
                            </div>
                            <p className="text-lg font-bold text-buy-muted-foreground">{stats.totalPosts || 0}</p>
                            <p className="text-xs text-buy-muted-foreground">{stats.totalViews || 0} total views</p>
                          </div>

                          <div className="bg-premium-muted rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <DollarSign className="w-4 h-4 text-protocall-premium-text" />
                              <p className="text-xs text-protocall-premium-text font-medium">Earnings</p>
                            </div>
                            <p className="text-lg font-bold text-protocall-premium-text">₹{(stats.totalEarnings || 0).toLocaleString()}</p>
                            <p className="text-xs text-protocall-premium-text">{stats.activePlans || 0} active plans</p>
                          </div>

                          <div className="bg-hold-muted rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Target className="w-4 h-4 text-hold-muted-foreground" />
                              <p className="text-xs text-hold-muted-foreground font-medium">Performance</p>
                            </div>
                            <p className="text-lg font-bold text-hold-muted-foreground">{stats.successRate || 0}%</p>
                            <p className="text-xs text-hold-muted-foreground">
                              {stats.targetsHit || 0} targets / {stats.stopLossHit || 0} SL
                            </p>
                          </div>
                        </div>

                        <div className="bg-surface-2 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium text-subtle">Avg Engagement Score:</span>
                            </div>
                            <Badge className="bg-primary text-white">
                              {stats.avgEngagement || 0}/100
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-subtle">Active Recommendations:</span>
                            <span className="text-sm font-bold text-primary">{stats.activeRecommendations || 0}</span>
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
                          className="text-primary border-primary hover:bg-premium-muted"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>

                        {advisor.status === 'pending_approval' && (
                          <>
                            <Button onClick={() => handleApprove(advisor.id)} className="bg-buy text-buy-foreground hover:bg-buy-soft">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button onClick={() => handleReject(advisor.id)} variant="outline" className="text-sell-muted-foreground border-sell hover:bg-sell-muted">
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}

                        {advisor.status === 'approved' && (
                          <Button onClick={() => handleSuspend(advisor.id)} variant="outline" className="text-hold-muted-foreground border-hold hover:bg-hold-muted">
                            <Ban className="w-4 h-4 mr-2" />
                            Suspend
                          </Button>
                        )}

                        {advisor.status === 'suspended' && (
                          <Button onClick={() => handleApprove(advisor.id)} className="bg-buy text-buy-foreground hover:bg-buy-soft">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Reactivate
                          </Button>
                        )}

                        {advisor.sebi_document_url && (
                          <Button
                            variant="outline"
                            onClick={() => window.open(advisor.sebi_document_url, '_blank')}
                            className="text-protocall-premium-text border-primary hover:bg-premium-muted"
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
                          className="text-primary border-primary hover:bg-premium-muted"
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
                          className="text-sell-muted-foreground border-sell hover:bg-sell-muted"
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
                <ShieldCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No advisors found</p>
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
            <AlertDialogAction onClick={handleDelete} className="bg-sell hover:bg-sell">
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
            <ShieldCheck className="w-5 h-5 text-protocall-premium-text" />
            Advisor Details: {advisor.display_name}
          </DialogTitle>
          <DialogDescription>
            Complete profile and performance information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-subtle">Display Name</p>
                  <p className="font-semibold">{advisor.display_name}</p>
                </div>
                <div>
                  <p className="text-sm text-subtle">SEBI Registration</p>
                  <p className="font-semibold">{advisor.sebi_registration_number}</p>
                </div>
                <div>
                  <p className="text-sm text-subtle">Email</p>
                  <p className="font-semibold">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-subtle">Status</p>
                  <p className="font-semibold capitalize">{advisor.status?.replace('_', ' ')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-subtle">Bio</p>
                  <p className="font-medium text-sm">{advisor.bio}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-subtle">Specialization</p>
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
                <div className="bg-premium-muted p-3 rounded-lg">
                  <Users className="w-5 h-5 text-primary mb-2" />
                  <p className="text-xs text-primary">Active Subscribers</p>
                  <p className="text-2xl font-bold text-primary">{stats?.activeSubscribers || 0}</p>
                </div>
                <div className="bg-buy-muted p-3 rounded-lg">
                  <FileText className="w-5 h-5 text-buy-muted-foreground mb-2" />
                  <p className="text-xs text-buy-muted-foreground">Total Posts</p>
                  <p className="text-2xl font-bold text-buy-muted-foreground">{stats?.totalPosts || 0}</p>
                </div>
                <div className="bg-premium-muted p-3 rounded-lg">
                  <Eye className="w-5 h-5 text-protocall-premium-text mb-2" />
                  <p className="text-xs text-protocall-premium-text">Total Views</p>
                  <p className="text-2xl font-bold text-protocall-premium-text">{stats?.totalViews || 0}</p>
                </div>
                <div className="bg-hold-muted p-3 rounded-lg">
                  <Target className="w-5 h-5 text-hold-muted-foreground mb-2" />
                  <p className="text-xs text-hold-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-hold-muted-foreground">{stats?.successRate || 0}%</p>
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
                      <div key={plan.id} className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                        <div>
                          <p className="font-semibold">{plan.name}</p>
                          <p className="text-sm text-subtle">{plan.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-protocall-premium-text">₹{plan.price?.toLocaleString()}</p>
                          <Badge className={plan.is_active ? 'bg-buy-muted text-buy-muted-foreground' : 'bg-surface-2 text-foreground'}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No plans created yet</p>
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
              <BarChart3 className="w-5 h-5 text-protocall-premium-text" />
              {advisor.display_name} - Detailed Analytics
            </CardTitle>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
                  <Card className="bg-premium-muted">
                    <CardContent className="p-4">
                      <Users className="w-6 h-6 text-primary mb-2" />
                      <p className="text-2xl font-bold text-primary">{stats?.activeSubscribers || 0}</p>
                      <p className="text-xs text-primary">Active Subscribers</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-buy-muted">
                    <CardContent className="p-4">
                      <FileText className="w-6 h-6 text-buy-muted-foreground mb-2" />
                      <p className="text-2xl font-bold text-buy-muted-foreground">{stats?.totalPosts || 0}</p>
                      <p className="text-xs text-buy-muted-foreground">Total Posts</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-premium-muted">
                    <CardContent className="p-4">
                      <Eye className="w-6 h-6 text-protocall-premium-text mb-2" />
                      <p className="text-2xl font-bold text-protocall-premium-text">{stats?.totalViews || 0}</p>
                      <p className="text-xs text-protocall-premium-text">Total Views</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-hold-muted">
                    <CardContent className="p-4">
                      <Target className="w-6 h-6 text-hold-muted-foreground mb-2" />
                      <p className="text-2xl font-bold text-hold-muted-foreground">{stats?.successRate || 0}%</p>
                      <p className="text-xs text-hold-muted-foreground">Success Rate</p>
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
                                post.recommendation_type === 'buy' ? 'bg-buy-muted text-buy-muted-foreground' :
                                post.recommendation_type === 'sell' ? 'bg-sell-muted text-sell-muted-foreground' :
                                'bg-hold-muted text-hold-muted-foreground'
                              }>
                                {post.recommendation_type.toUpperCase()}
                              </Badge>
                            )}
                            {post.recommendation_status && post.recommendation_status !== 'active' && (
                              <Badge className={
                                post.recommendation_status === 'target_hit' ? 'bg-buy-muted text-buy-muted-foreground' :
                                'bg-sell-muted text-sell-muted-foreground'
                              }>
                                {post.recommendation_status === 'target_hit' ? '🎯 Target Hit' : '🛑 Stop Loss'}
                                {post.return_percentage && ` (${post.return_percentage.toFixed(1)}%)`}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
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
                          <p className="text-sm text-subtle">
                            Started: {format(new Date(sub.start_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={sub.status === 'active' ? 'bg-buy-muted text-buy-muted-foreground' : 'bg-surface-2 text-foreground'}>
                            {sub.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Engagement: {sub.engagement_score || 0}/100
                          </p>
                          <p className="text-xs text-muted-foreground">
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
      pending: { color: 'bg-hold-muted text-hold-muted-foreground', label: 'Pending' },
      approved: { color: 'bg-premium-muted text-primary', label: 'Approved' },
      processed: { color: 'bg-buy-muted text-buy-muted-foreground', label: 'Processed' },
      rejected: { color: 'bg-sell-muted text-sell-muted-foreground', label: 'Rejected' }
    };
    const { color, label } = config[status] || config.pending;
    return <Badge className={`${color} border-0`}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Business Stats - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg border-0 bg-surface-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary font-semibold mb-1">Gross Earnings</p>
                <p className="text-3xl font-bold text-primary">₹{totalGrossEarnings.toLocaleString()}</p>
                <p className="text-xs text-primary mt-1">Total subscription revenue</p>
              </div>
              <DollarSign className="w-12 h-12 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-surface-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-protocall-premium-text font-semibold mb-1">Platform Commission</p>
                <p className="text-3xl font-bold text-protocall-premium-text">₹{totalPlatformCommission.toLocaleString()}</p>
                <p className="text-xs text-protocall-premium-text mt-1">Total commission earned</p>
              </div>
              <TrendingUp className="w-12 h-12 text-protocall-premium-text opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-surface-2 to-hold-muted">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-hold-muted-foreground font-semibold mb-1">Payout Pending</p>
                <p className="text-3xl font-bold text-hold-muted-foreground">₹{Math.max(0, pendingPayoutAmount).toLocaleString()}</p>
                <p className="text-xs text-hold-muted-foreground mt-1">Awaiting advisor requests</p>
              </div>
              <Wallet className="w-12 h-12 text-hold-muted-foreground opacity-70" />
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
                <p className="text-sm text-subtle">Total Requests</p>
                <p className="text-2xl font-bold">{safePayoutRequests.length}</p>
              </div>
              <Wallet className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle">Pending</p>
                <p className="text-2xl font-bold">₹{totalPending.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-hold-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle">Approved</p>
                <p className="text-2xl font-bold">₹{totalApproved.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle">Processed</p>
                <p className="text-2xl font-bold">₹{totalProcessed.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-buy-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-subtle">Filter by Advisor:</label>
        <select
          value={selectedAdvisor}
          onChange={(e) => setSelectedAdvisor(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white hover:border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
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
                              <p className="text-xs text-subtle">Requested Amount</p>
                              <p className="text-xl font-bold text-protocall-premium-text">₹{(payout.requested_amount || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-subtle">Available Balance</p>
                              <p className="text-sm font-semibold">₹{(payout.available_balance || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-subtle">Payout Method</p>
                              <p className="text-sm font-semibold capitalize">{payout.payout_method?.replace('_', ' ') || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-subtle">Request Date</p>
                              <p className="text-sm font-semibold">{format(new Date(payout.created_date), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                          {payout.admin_notes && (
                            <div className="mt-3 p-3 bg-premium-muted rounded-lg">
                              <p className="text-xs text-primary font-medium">Admin Notes:</p>
                              <p className="text-sm text-subtle">{payout.admin_notes}</p>
                            </div>
                          )}
                          {payout.processed_date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Processed on: {format(new Date(payout.processed_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                        
                        <div className="ml-4 text-right">
                          <div className="bg-surface-2 p-3 rounded-lg">
                            <p className="text-xs text-subtle">Total Earnings</p>
                            <p className="text-lg font-bold text-foreground">₹{(stats.totalEarnings || 0).toLocaleString()}</p>
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
              <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
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
