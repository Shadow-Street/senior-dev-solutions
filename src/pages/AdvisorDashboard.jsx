
import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShieldCheck,
  Users,
  DollarSign,
  Star,
  PlusCircle,
  TrendingUp,
  Eye,
  Edit,
  FileText,
  CreditCard,
  Wallet,
  Clock,
  CheckCircle,
  Trash2,
  AlertCircle,
  BarChart3 // Added BarChart3 icon
} from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CreatePostModal from '../components/advisors/CreatePostModal';
import PayoutRequestModal from '../components/entity/PayoutRequestModal';
import FinancialStatement from '../components/entity/FinancialStatement';
import AdvisorLayout from '../components/layouts/AdvisorLayout';
import CreatePlanModal from '../components/advisors/CreatePlanModal';
import PostPreviewModal from '../components/advisors/PostPreviewModal';
import SubscriberAnalytics from '../components/advisors/SubscriberAnalytics';
import RefundManagementSection from '../components/advisors/RefundManagementSection';
import PostLimitTracker from '../components/advisors/PostLimitTracker';
import PostAnalyticsModal from '../components/advisors/PostAnalyticsModal'; // Added PostAnalyticsModal import

export default function AdvisorDashboard() {
  const [user, setUser] = useState(null);
  const [advisor, setAdvisor] = useState(null);
  const [posts, setPosts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showPayoutRequest, setShowPayoutRequest] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewingPost, setViewingPost] = useState(null);
  const [showPostPreview, setShowPostPreview] = useState(false);
  const [showProfileImageModal, setShowProfileImageModal] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [financialTab, setFinancialTab] = useState('overview');
  const [viewingPostStats, setViewingPostStats] = useState(null); // New state for post analytics
  const [showPostAnalytics, setShowPostAnalytics] = useState(false); // New state for post analytics modal

  const [stats, setStats] = useState({
    totalSubscribers: 0,
    activeSubscribers: 0,
    totalEarnings: 0,
    availableBalance: 0,
    pendingPayouts: 0,
    avgRating: 0
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab('overview');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      
      try {
        const currentUser = await base44.auth.me().catch(() => null);
        if (!isMounted || !currentUser) {
          setIsLoading(false);
          toast.error('Please log in to access this page');
          return;
        }
        setUser(currentUser);

        let advisorProfile;
        try {
          if (currentUser.app_role === 'super_admin' || currentUser.app_role === 'admin') {
            const profiles = await base44.entities.Advisor.list('', 1).catch(() => []);
            advisorProfile = profiles[0];
            if (advisorProfile) {
              toast.info("Viewing as Admin: Displaying first available Advisor.", { duration: 3000 });
            } else {
              setAdvisor({ id: 'admin-preview', display_name: "Admin Preview", sebi_registration_number: "PREVIEW-000", status: 'approved' }); // Default status for admin preview
              setIsLoading(false);
              return;
            }
          } else {
            const advisorProfiles = await base44.entities.Advisor.filter({ user_id: currentUser.id }).catch(() => []);
            advisorProfile = advisorProfiles[0];
          }
        } catch (error) {
          console.error('Error loading advisor profile:', error);
          setAdvisor(null);
          setIsLoading(false);
          return;
        }

        if (!isMounted) return;

        if (!advisorProfile) {
          setAdvisor(null);
          setIsLoading(false);
          return;
        }
        
        setAdvisor(advisorProfile);

        // Only load other data if advisor is approved
        if (advisorProfile.status === 'approved') {
          try {
            const [postsData, plansData] = await Promise.all([
              base44.entities.AdvisorPost.filter({ advisor_id: advisorProfile.id }).catch(() => []),
              base44.entities.AdvisorPlan.filter({ advisor_id: advisorProfile.id }).catch(() => [])
            ]);

            if (!isMounted) return;
            setPosts(postsData || []);
            setPlans(plansData || []);
          } catch (error) {
            console.error('Error loading posts/plans:', error);
            setPosts([]);
            setPlans([]);
          }
          
          setIsLoading(false);

          setTimeout(async () => {
            if (!isMounted) return;
            
            try {
              const [subscriptionsData, commissionsData, reviewsData, payoutRequestsData] = await Promise.all([
                base44.entities.AdvisorSubscription.filter({ advisor_id: advisorProfile.id }).catch(() => []),
                base44.entities.CommissionTracking.filter({ advisor_id: advisorProfile.id }).catch(() => []),
                base44.entities.AdvisorReview.filter({ advisor_id: advisorProfile.id }).catch(() => []),
                base44.entities.PayoutRequest.filter({ entity_id: advisorProfile.id, entity_type: 'advisor' }).catch(() => [])
              ]);

              if (!isMounted) return;

              setSubscriptions(subscriptionsData || []);
              setCommissions(commissionsData || []);
              setReviews(reviewsData || []);
              setPayoutRequests(payoutRequestsData || []);

              const totalEarnings = (commissionsData || []).reduce((sum, c) => sum + (c.advisor_payout || 0), 0);
              const totalPaidOut = (payoutRequestsData || [])
                .filter(p => p.status === 'processed')
                .reduce((sum, p) => sum + (p.requested_amount || 0), 0);
              const pendingPayouts = (payoutRequestsData || [])
                .filter(p => p.status === 'pending' || p.status === 'approved')
                .reduce((sum, p) => sum + (p.requested_amount || 0), 0);
              const availableBalance = totalEarnings - totalPaidOut - pendingPayouts;
              
              const activeSubscribers = (subscriptionsData || []).filter(s => s.status === 'active').length;
              const ratingsSum = (reviewsData || []).reduce((sum, r) => sum + (r.rating || 0), 0);
              const avgRating = ratingsSum > 0 ? ratingsSum / reviewsData.length : 0;

              if (isMounted) {
                setStats({
                  totalSubscribers: (subscriptionsData || []).length,
                  activeSubscribers,
                  totalEarnings,
                  availableBalance: Math.max(0, availableBalance),
                  pendingPayouts,
                  avgRating: Math.round(avgRating * 10) / 10
                });
              }
            } catch (error) {
              console.error('Background data loading error:', error);
            }
          }, 100);
        } else {
          // If advisor is not 'approved', no need to load posts, plans, etc.
          setIsLoading(false);
        }

      } catch (error) {
        console.error('Error loading advisor dashboard:', error);
        toast.error('Failed to load dashboard data');
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePostSubmit = async (postData) => {
    try {
      if (!advisor || !advisor.id) {
        toast.error('Advisor information not available');
        return;
      }

      console.log('Creating post with data:', postData);
      
      const enrichedPostData = {
        ...postData,
        advisor_id: advisor.id,
        status: 'published',
        entry_price: postData.target_price || 0,
        recommendation_status: postData.recommendation_type ? 'active' : undefined,
        view_count: 0,
        unique_viewers: []
      };
      
      const newPost = await base44.entities.AdvisorPost.create(enrichedPostData);
      
      toast.success('Advisory published successfully!');
      
      // Send notifications in the background - non-blocking
      setTimeout(async () => {
        try {
          console.log('Sending notifications for post:', newPost.id);
          const notifResult = await base44.functions.invoke('sendAdvisorPostNotifications', {
            postId: newPost.id,
            advisorId: advisor.id,
            advisorName: advisor.display_name,
            postTitle: postData.title,
            requiredPlanId: postData.required_plan_id
          });
          
          console.log('Notifications sent:', notifResult);
          
          if (notifResult?.data?.notifications_sent > 0) {
            toast.success(`📧 Notified ${notifResult.data.notifications_sent} subscribers!`, {
              description: `${notifResult.data.emails_queued || 0} emails sent, ${notifResult.data.sms_queued || 0} SMS queued`
            });
          }
        } catch (notifError) {
          console.error('Failed to send notifications:', notifError);
          // Don't show error toast - notifications are optional
        }
      }, 1000);
      
      setShowCreatePost(false);
      setEditingPost(null);
      
      const postsData = await base44.entities.AdvisorPost.filter({ advisor_id: advisor.id }).catch(() => []);
      setPosts(postsData || []);
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save advisory');
    }
  };

  const handlePayoutSubmit = async (payoutData) => {
    try {
      if (!user || !advisor) {
        toast.error('User or advisor information not available');
        return;
      }

      await base44.entities.PayoutRequest.create({
        user_id: user.id,
        entity_type: 'advisor',
        entity_id: advisor.id,
        requested_amount: payoutData.requested_amount,
        available_balance: stats.availableBalance,
        payout_method: payoutData.payout_method,
        bank_details: payoutData.bank_details,
        upi_id: payoutData.upi_id,
        paypal_email: payoutData.paypal_email,
        status: 'pending'
      });
      
      toast.success('Payout request submitted successfully!');
      setShowPayoutRequest(false);
      
      const payoutRequestsData = await base44.entities.PayoutRequest.filter({ entity_id: advisor.id, entity_type: 'advisor' }).catch(() => []);
      setPayoutRequests(payoutRequestsData || []);
    } catch (error) {
      console.error('Error submitting payout request:', error);
      toast.error('Failed to submit payout request');
    }
  };

  const handlePlanSubmit = async (planData, planId = null) => {
    try {
      if (!advisor || !advisor.id) {
        toast.error('Advisor information not available');
        return;
      }

      if (planId) {
        await base44.entities.AdvisorPlan.update(planId, planData);
        toast.success('Subscription plan updated successfully!');
      } else {
        await base44.entities.AdvisorPlan.create({
          ...planData,
          advisor_id: advisor.id
        });
        toast.success('Subscription plan created successfully!');
      }
      
      setShowCreatePlan(false);
      setEditingPlan(null);
      
      const plansData = await base44.entities.AdvisorPlan.filter({ advisor_id: advisor.id }).catch(() => []);
      setPlans(plansData || []);
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setShowCreatePlan(true);
  };

  const handleCreateNewPlan = () => {
    setEditingPlan(null);
    setShowCreatePlan(true);
  };

  const handleTogglePlanStatus = async (plan) => {
    try {
      await base44.entities.AdvisorPlan.update(plan.id, {
        is_active: !plan.is_active
      });
      
      toast.success(`Plan ${plan.is_active ? 'deactivated' : 'activated'} successfully!`);
      
      const plansData = await base44.entities.AdvisorPlan.filter({ advisor_id: advisor.id }).catch(() => []);
      setPlans(plansData || []);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update plan');
    }
  };

  const handleDeletePlan = async () => {
    if (!deletingPlan) return;

    try {
      const planSubscribers = (subscriptions || []).filter(
        s => s.plan_id === deletingPlan.id && s.status === 'active'
      );

      if (planSubscribers.length > 0) {
        toast.error(`Cannot delete plan with ${planSubscribers.length} active subscriber${planSubscribers.length > 1 ? 's' : ''}. Please deactivate it instead.`);
        setShowDeleteConfirm(false);
        setDeletingPlan(null);
        return;
      }

      await base44.entities.AdvisorPlan.delete(deletingPlan.id);
      
      toast.success('Subscription plan deleted successfully!');
      setShowDeleteConfirm(false);
      setDeletingPlan(null);
      
      const plansData = await base44.entities.AdvisorPlan.filter({ advisor_id: advisor.id }).catch(() => []);
      setPlans(plansData || []);
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };

  const confirmDeletePlan = (plan) => {
    setDeletingPlan(plan);
    setShowDeleteConfirm(true);
  };

  const handleProfileImageUpload = async (file) => {
    try {
      if (!file) return;
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      toast.info('Uploading image...');
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.Advisor.update(advisor.id, {
        profile_image_url: file_url
      });
      
      setAdvisor(prev => ({ ...prev, profile_image_url: file_url }));
      setShowProfileImageModal(false);
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast.error('Failed to upload profile picture');
    }
  };

  const handleViewPostStats = (post) => {
    setViewingPostStats(post);
    setShowPostAnalytics(true);
  };

  const getStatusBadge = (status) => {
    const config = {
      published: { color: 'bg-green-100 text-green-800', label: 'Published' },
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved' },
      processed: { color: 'bg-green-100 text-green-800', label: 'Processed' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Approval' }
    };
    const { color, label } = config[status] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    return <Badge className={`${color} border-0`}>{label}</Badge>;
  };

  const getPlanNameForPost = (planId) => {
    if (!planId) return 'All Subscribers';
    const plan = (plans || []).find(p => p.id === planId);
    return plan ? `${plan.name} Only` : 'Unknown Plan';
  };

  const getPlanColor = (planName) => {
    const name = planName?.toLowerCase();
    if (name?.includes('vip') || name?.includes('diamond') || name?.includes('gold')) {
      return 'from-amber-500 to-orange-600';
    }
    if (name?.includes('premium') || name?.includes('pro') || name?.includes('plus')) {
      return 'from-purple-500 to-pink-600';
    }
    if (name?.includes('basic') || name?.includes('starter') || name?.includes('momentum')) {
      return 'from-blue-500 to-cyan-600';
    }
    return 'from-indigo-500 to-purple-600';
  };

  const getPlanIcon = (planName) => {
    const name = planName?.toLowerCase();
    if (name?.includes('vip') || name?.includes('diamond') || name?.includes('gold')) {
      return '👑';
    }
    if (name?.includes('premium') || name?.includes('pro') || name?.includes('plus')) {
      return '⭐';
    }
    if (name?.includes('basic') || name?.includes('starter') || name?.includes('momentum')) {
      return '📊';
    }
    return '💎';
  };

  if (isLoading) {
    return (
      <AdvisorLayout activePage="advisor-dashboard">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AdvisorLayout>
    );
  }

  if (!advisor) {
    return (
      <AdvisorLayout activePage="advisor-dashboard">
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <ShieldCheck className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">SEBI Advisor Registration Required</h2>
              <p className="text-slate-600 mb-6">
                Complete your SEBI advisor registration to access this dashboard.
              </p>
              <Button onClick={() => window.location.href = '/AdvisorRegistration'}>
                Register Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdvisorLayout>
    );
  }

  // NEW: Handle Pending/Rejected Status
  if (advisor.status === 'pending_approval') {
    return (
      <AdvisorLayout activePage="advisor-dashboard">
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-2 border-yellow-200">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Under Review</h2>
              <p className="text-slate-600 mb-4">
                Your SEBI advisor application is currently being reviewed by our admin team.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Status:</strong> {getStatusBadge(advisor.status)}
                </p>
                <p className="text-sm text-yellow-800 mt-2">
                  We'll notify you via email once your application is approved. This usually takes 1-2 business days.
                </p>
              </div>
              <Button onClick={() => window.location.href = '/Dashboard'} variant="outline">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdvisorLayout>
    );
  }

  if (advisor.status === 'rejected') {
    return (
      <AdvisorLayout activePage="advisor-dashboard">
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-2 border-red-200">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Not Approved</h2>
              <p className="text-slate-600 mb-4">
                Unfortunately, your advisor application was not approved.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">
                  <strong>Status:</strong> {getStatusBadge(advisor.status)}
                </p>
                {advisor.rejection_reason && (
                  <p className="text-sm text-red-800 mt-2">
                    <strong>Reason:</strong> {advisor.rejection_reason}
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.href = '/Dashboard'} variant="outline">
                  Back to Dashboard
                </Button>
                <Button onClick={() => window.location.href = '/ContactSupport'}>
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdvisorLayout>
    );
  }

  return (
    <AdvisorLayout activePage="advisor-dashboard">
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="hidden">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="posts">My Posts</TabsTrigger>
              <TabsTrigger value="plans">Plans</TabsTrigger>
              <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-8 mt-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="relative group cursor-pointer" onClick={() => setShowProfileImageModal(true)}>
                    {advisor.profile_image_url ? (
                      <img 
                        src={advisor.profile_image_url} 
                        alt={advisor.display_name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-purple-200 shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-purple-200 shadow-lg">
                        {advisor.display_name?.charAt(0)?.toUpperCase() || 'A'}
                      </div>
                    )}
                    <button
                      className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-semibold"
                    >
                      Change
                    </button>
                  </div>
                  
                  <div>
                    <h2 className="text-3xl font-bold text-slate-800">Welcome back, {advisor.display_name}!</h2>
                    <p className="text-slate-600 mt-1">Here's your advisory dashboard overview</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-green-100 text-green-800 border-0">SEBI Registered</Badge>
                      <span className="text-sm text-slate-500">#{advisor.sebi_registration_number}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => setShowCreatePost(true)} className="bg-blue-600 hover:bg-blue-700">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create Advisory
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Users className="w-8 h-8 text-indigo-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Active Subscribers</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.activeSubscribers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <CreditCard className="w-8 h-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Total Subscribers</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.totalSubscribers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <DollarSign className="w-8 h-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Total Earnings</p>
                        <p className="text-2xl font-bold text-slate-900">₹{stats.totalEarnings.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Wallet className="w-8 h-8 text-emerald-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Available Balance</p>
                        <p className="text-2xl font-bold text-slate-900">₹{stats.availableBalance.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Star className="w-8 h-8 text-yellow-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Avg Rating</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.avgRating}/5</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <PostLimitTracker posts={posts} plans={plans} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-blue-600" />
                          <div>
                            <p className="font-semibold text-slate-800">Total Posts</p>
                            <p className="text-sm text-slate-500">Published advisories</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{posts.length}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-8 h-8 text-green-600" />
                          <div>
                            <p className="font-semibold text-slate-800">Active Plans</p>
                            <p className="text-sm text-slate-500">Subscription plans</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{plans.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={() => setShowCreatePost(true)} className="w-full justify-start" variant="outline">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Create New Advisory
                    </Button>
                    <Button onClick={() => setShowPayoutRequest(true)} className="w-full justify-start" variant="outline" disabled={stats.availableBalance <= 0}>
                      <Wallet className="w-4 h-4 mr-2" />
                      Request Payout
                    </Button>
                    <Button onClick={() => setActiveTab('analytics')} className="w-full justify-start" variant="outline">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View Analytics
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="posts" className="space-y-4 mt-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">My Posts</h2>
                <Button onClick={() => setShowCreatePost(true)} className="bg-blue-600 hover:bg-blue-700">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create Advisory
                </Button>
              </div>

              <PostLimitTracker posts={posts} plans={plans} />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.length > 0 ? (
                  posts.map(post => (
                    <Card key={post.id} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {post.recommendation_type && (
                                  <Badge variant="outline" className={`font-semibold ${
                                    post.recommendation_type === 'buy' ? 'text-green-600 border-green-600 bg-green-50' :
                                    post.recommendation_type === 'sell' ? 'text-red-600 border-red-600 bg-red-50' : 
                                    'text-yellow-600 border-yellow-600 bg-yellow-50'
                                  }`}>
                                    {post.recommendation_type?.toUpperCase()}
                                  </Badge>
                                )}
                                {getStatusBadge(post.status)}
                              </div>
                              <h3 className="font-bold text-lg text-slate-900 line-clamp-2 mb-2">
                                {post.title}
                              </h3>
                            </div>
                          </div>

                          {post.stock_symbol && (
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
                              <p className="text-xs text-slate-600 mb-1">Stock Symbol</p>
                              <p className="text-xl font-bold text-blue-600">{post.stock_symbol}</p>
                            </div>
                          )}

                          {(post.target_price || post.stop_loss) && (
                            <div className="grid grid-cols-2 gap-3">
                              {post.target_price && (
                                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                  <p className="text-xs text-slate-600 mb-1">Target Price</p>
                                  <p className="text-lg font-bold text-green-700">₹{post.target_price}</p>
                                </div>
                              )}
                              {post.stop_loss && (
                                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                                  <p className="text-xs text-slate-600 mb-1">Stop Loss</p>
                                  <p className="text-lg font-bold text-red-700">₹{post.stop_loss}</p>
                                </div>
                              )}
                            </div>
                          )}

                          <p className="text-sm text-slate-600 line-clamp-3">
                            {post.content}
                          </p>

                          <div className="flex items-center justify-between pt-3 border-t">
                            <Badge className={post.required_plan_id ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                              {getPlanNameForPost(post.required_plan_id)}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Eye className="w-3 h-3" />
                              {post.view_count || 0}
                            </div>
                          </div>

                          {/* ACTION BUTTONS */}
                          <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setViewingPost(post);
                                setShowPostPreview(true);
                              }}
                              className="h-8"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Preview
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewPostStats(post)}
                              className="h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <BarChart3 className="w-3 h-3 mr-1" />
                              Stats
                            </Button>
                          </div>

                          <div className="text-xs text-slate-500 pt-3 border-t">
                            <span>{format(new Date(post.created_date), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="p-8 text-center">
                        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600">No advisories published yet.</p>
                        <Button onClick={() => setShowCreatePost(true)} className="mt-4">
                          Create Your First Advisory
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="plans" className="space-y-4 mt-0">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Subscription Plans</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    You have {plans.length} of 3 plans created
                  </p>
                </div>
                {plans.length < 3 ? (
                  <Button onClick={handleCreateNewPlan} className="bg-green-600 hover:bg-green-700">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create New Plan
                  </Button>
                ) : (
                  <div className="text-right">
                    <Badge className="bg-orange-100 text-orange-800 border-0 mb-2">
                      Maximum Plans Reached
                    </Badge>
                    <p className="text-xs text-slate-600">You can only create up to 3 plans</p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.length > 0 ? (
                  plans.map(plan => {
                    const activeSubs = (subscriptions || []).filter(
                      s => s.plan_id === plan.id && s.status === 'active'
                    ).length;
                    
                    return (
                      <Card key={plan.id} className={`relative overflow-hidden hover:shadow-2xl transition-all duration-300 ${
                        plan.is_active ? 'border-2 border-purple-200' : 'border-2 border-gray-200 opacity-75'
                      }`}>
                        <div className={`p-6 text-center bg-gradient-to-br ${getPlanColor(plan.name)}`}>
                          <div className="flex justify-between items-start mb-3">
                            <Badge className={plan.is_active ? 'bg-white/90 text-green-600 border-0' : 'bg-white/90 text-gray-600 border-0'}>
                              {plan.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {activeSubs > 0 && (
                              <Badge className="bg-white/90 text-blue-600 border-0">
                                {activeSubs} Subscriber{activeSubs > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-4xl mb-2">
                            {getPlanIcon(plan.name)}
                          </div>
                          
                          <h3 className="text-2xl font-bold text-white mb-3 tracking-wide">
                            {plan.name}
                          </h3>
                          
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold text-white">₹{plan.price?.toLocaleString() || 0}</span>
                            <span className="text-white/90 text-sm font-medium">/ {plan.billing_interval}</span>
                          </div>
                        </div>

                        <CardContent className="p-6">
                          {plan.description && (
                            <p className="text-sm text-slate-600 mb-4 text-center leading-relaxed">
                              {plan.description}
                            </p>
                          )}

                          {plan.monthly_post_limit && (
                            <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                              <p className="text-xs text-slate-600 mb-1 text-center">Monthly Post Limit</p>
                              <p className="text-lg font-bold text-blue-600 text-center">
                                {plan.monthly_post_limit} Posts/Month
                              </p>
                            </div>
                          )}

                          {plan.features && plan.features.length > 0 && (
                            <div className="space-y-3 mb-6">
                              <p className="text-xs font-semibold text-slate-700 text-center uppercase tracking-wide">What's Included</p>
                              <ul className="space-y-2">
                                {plan.features.map((feature, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="space-y-2 pt-4 border-t">
                            <div className="grid grid-cols-2 gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleTogglePlanStatus(plan)}
                                className="w-full"
                              >
                                {plan.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditPlan(plan)}
                                className="w-full"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => confirmDeletePlan(plan)}
                              className="w-full text-red-600 hover:text-red-700 hover:border-red-600"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete Plan
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="p-8 text-center">
                        <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600">No subscription plans created yet.</p>
                        <Button onClick={handleCreateNewPlan} className="mt-4 bg-green-600 hover:bg-green-700">
                          Create Your First Plan
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="subscribers" className="space-y-4 mt-0">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Subscribers</h2>
              <SubscriberAnalytics subscriptions={subscriptions || []} plans={plans || []} />
            </TabsContent>
            
            <TabsContent value="financials" className="space-y-6 mt-0">
              {/* Sub-Navigation with Full Rounded Buttons */}
              <div className="flex gap-3 w-full">
                <Button
                  onClick={() => setFinancialTab('overview')}
                  className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${
                    financialTab === 'overview' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                      : 'bg-gradient-to-r from-blue-50 to-purple-50 text-slate-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md border border-blue-200'
                  }`}
                >
                  <DollarSign className="w-5 h-5 mr-2 inline-block" />
                  Financials
                </Button>
                <Button
                  onClick={() => setFinancialTab('payouts')}
                  className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${
                    financialTab === 'payouts' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                      : 'bg-gradient-to-r from-blue-50 to-purple-50 text-slate-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md border border-blue-200'
                  }`}
                >
                  <Wallet className="w-5 h-5 mr-2 inline-block" />
                  Payout Requests
                </Button>
                <Button
                  onClick={() => setFinancialTab('refunds')}
                  className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${
                    financialTab === 'refunds' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                      : 'bg-gradient-to-r from-blue-50 to-purple-50 text-slate-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md border border-blue-200'
                  }`}
                >
                  <TrendingUp className="w-5 h-5 mr-2 inline-block" />
                  Refund Management
                </Button>
              </div>

              {financialTab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">Financial Overview</h2>
                    <Button 
                      onClick={() => setShowPayoutRequest(true)} 
                      disabled={stats.availableBalance <= 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Request Payout
                    </Button>
                  </div>

                  <FinancialStatement 
                    entityType="advisor"
                    entityId={advisor?.id}
                    entityName={advisor?.display_name || 'Advisor'}
                  />
                </div>
              )}

              {financialTab === 'payouts' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">Payout Requests</h2>
                    <Button 
                      onClick={() => setShowPayoutRequest(true)} 
                      disabled={stats.availableBalance <= 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Request Payout
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <Wallet className="w-8 h-8 text-green-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-slate-600">Available Balance</p>
                            <p className="text-2xl font-bold text-slate-900">₹{stats.availableBalance.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <Clock className="w-8 h-8 text-orange-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-slate-600">Pending Payouts</p>
                            <p className="text-2xl font-bold text-slate-900">₹{stats.pendingPayouts.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <TrendingUp className="w-8 h-8 text-blue-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-slate-600">Total Earned</p>
                            <p className="text-2xl font-bold text-slate-900">₹{stats.totalEarnings.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    {payoutRequests.length > 0 ? (
                      payoutRequests.map(payout => (
                        <Card key={payout.id}>
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold">₹{payout.requested_amount.toLocaleString()}</p>
                                <p className="text-sm text-slate-600">{format(new Date(payout.created_date), 'MMM d, yyyy')}</p>
                                <p className="text-xs text-slate-500">{payout.payout_method}</p>
                              </div>
                              {getStatusBadge(payout.status)}
                            </div>
                            {payout.admin_notes && (
                              <p className="text-sm text-slate-600 mt-2">Admin Notes: {payout.admin_notes}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Wallet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                          <p className="text-slate-600">No payout requests yet.</p>
                          {stats.availableBalance > 0 && (
                            <Button onClick={() => setShowPayoutRequest(true)} className="mt-4 bg-green-600 hover:bg-green-700">
                              Request Your First Payout
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {financialTab === 'refunds' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-800">Refund Management</h2>
                  <RefundManagementSection advisorId={advisor?.id} />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-0">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Advanced Analytics</h2>
              
              {/* Enhanced Analytics Section */}
              <div className="space-y-6">
                {/* Performance Overview */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                    <CardTitle>Performance Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <div className="text-3xl font-bold text-blue-600">{posts.length}</div>
                        <div className="text-sm text-slate-600 mt-1">Total Posts</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-xl">
                        <div className="text-3xl font-bold text-green-600">
                          {posts.reduce((sum, p) => sum + (p.view_count || 0), 0)}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">Total Views</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-xl">
                        <div className="text-3xl font-bold text-purple-600">{stats.activeSubscribers}</div>
                        <div className="text-sm text-slate-600 mt-1">Active Subscribers</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-xl">
                        <div className="text-3xl font-bold text-orange-600">
                          {posts.length > 0 ? Math.round(posts.reduce((sum, p) => sum + (p.view_count || 0), 0) / posts.length) : 0}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">Avg Views/Post</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue Trends */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                    <CardTitle>Revenue Trends</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {commissions.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={commissions.slice(-6)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="transaction_date" tickFormatter={(date) => format(new Date(date), 'MMM')} />
                          <YAxis />
                          <Tooltip formatter={(value) => [`₹${value}`, 'Earnings']} />
                          <Line type="monotone" dataKey="advisor_payout" stroke="#8884d8" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center p-8">
                        <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600">No revenue data available yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Performing Posts */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                    <CardTitle>Top Performing Posts</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {posts.length > 0 ? (
                      <div className="space-y-3">
                        {posts
                          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
                          .slice(0, 5)
                          .map((post, index) => (
                            <div key={post.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{post.title}</p>
                                  <p className="text-xs text-slate-500">{format(new Date(post.created_date), 'MMM dd, yyyy')}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-bold text-blue-600">{post.view_count || 0}</p>
                                  <p className="text-xs text-slate-500">views</p>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleViewPostStats(post)}
                                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                >
                                  <BarChart3 className="w-3 h-3 mr-1" />
                                  Details
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center p-8 text-slate-500">
                        No posts available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Subscriber Engagement */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                    <CardTitle>Subscriber Engagement</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {plans.map(plan => {
                        const planSubs = subscriptions.filter(s => s.plan_id === plan.id && s.status === 'active');
                        const planPosts = posts.filter(p => p.required_plan_id === plan.id);
                        const totalPlanViews = planPosts.reduce((sum, p) => sum + (p.view_count || 0), 0);
                        const avgEngagement = planSubs.length > 0 ? Math.round(totalPlanViews / planSubs.length) : 0;

                        return (
                          <div key={plan.id} className="p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-slate-800">{plan.name}</h4>
                              <Badge className="bg-blue-100 text-blue-800">
                                {planSubs.length} subscribers
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-slate-500">Exclusive Posts</p>
                                <p className="font-bold text-slate-800">{planPosts.length}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Total Views</p>
                                <p className="font-bold text-slate-800">{totalPlanViews}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Avg Views/Sub</p>
                                <p className="font-bold text-slate-800">{avgEngagement}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {showCreatePost && (
            <CreatePostModal
              open={showCreatePost}
              onClose={() => {
                setShowCreatePost(false);
                setEditingPost(null);
              }}
              onCreatePost={handlePostSubmit}
              advisorId={advisor.id}
            />
          )}

          {showPayoutRequest && (
            <PayoutRequestModal
              open={showPayoutRequest}
              onClose={() => setShowPayoutRequest(false)}
              onSubmit={handlePayoutSubmit}
              availableBalance={stats.availableBalance}
              entityType="advisor"
            />
          )}

          {showCreatePlan && (
            <CreatePlanModal
              open={showCreatePlan}
              onClose={() => {
                setShowCreatePlan(false);
                setEditingPlan(null);
              }}
              onSubmit={handlePlanSubmit}
              editingPlan={editingPlan}
            />
          )}

          {showPostPreview && viewingPost && (
            <PostPreviewModal
              open={showPostPreview}
              onClose={() => {
                setShowPostPreview(false);
                setViewingPost(null);
              }}
              post={viewingPost}
              advisor={advisor}
            />
          )}

          {showProfileImageModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-auto shadow-xl">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Update Profile Picture</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-center">
                    {advisor.profile_image_url ? (
                      <img 
                        src={advisor.profile_image_url} 
                        alt="Current"
                        className="w-32 h-32 rounded-full object-cover border-4 border-purple-200"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold">
                        {advisor.display_name?.charAt(0)?.toUpperCase() || 'A'}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="profile-image">Choose New Image</Label>
                    <Input
                      id="profile-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProfileImageUpload(file);
                      }}
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Recommended: Square image, at least 400x400px, max 5MB
                    </p>
                  </div>
                  
                  <div className="flex gap-3 justify-end mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowProfileImageModal(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showDeleteConfirm && deletingPlan && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Delete Subscription Plan?</h3>
                    <p className="text-sm text-slate-600">This action cannot be undone</p>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800 font-semibold mb-2">
                    You are about to delete: <span className="font-bold">{deletingPlan.name}</span>
                  </p>
                  <ul className="text-xs text-red-700 space-y-1 ml-4 list-disc">
                    <li>Price: ₹{deletingPlan.price?.toLocaleString()} / {deletingPlan.billing_interval}</li>
                    <li>This plan will be permanently removed</li>
                    <li>Historical data will be preserved</li>
                  </ul>
                </div>

                {(() => {
                  const activeSubs = (subscriptions || []).filter(
                    s => s.plan_id === deletingPlan.id && s.status === 'active'
                  ).length;
                  
                  if (activeSubs > 0) {
                    return (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-orange-800 font-semibold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Warning: {activeSubs} Active Subscriber{activeSubs > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          You cannot delete a plan with active subscribers. Please deactivate the plan instead, or wait for subscriptions to expire.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletingPlan(null);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeletePlan}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Delete Plan
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showPostAnalytics && viewingPostStats && (
            <PostAnalyticsModal
              open={showPostAnalytics}
              onClose={() => {
                setShowPostAnalytics(false);
                setViewingPostStats(null);
              }}
              post={viewingPostStats}
              advisorId={advisor.id}
            />
          )}
        </div>
      </div>
    </AdvisorLayout>
  );
}
