
import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Star,
  Users,
  DollarSign,
  PlusCircle,
  TrendingUp,
  Eye,
  Wallet,
  Clock,
  CreditCard,
  Video,
  GraduationCap,
  BarChart3,
  Edit,
  Trash2, // Import Trash2 icon for delete
  AlertCircle // NEW: Import AlertCircle for rejected status
} from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PayoutRequestModal from '../components/entity/PayoutRequestModal';
import FinancialStatement from '../components/entity/FinancialStatement';
import FinfluencerLayout from '../components/layouts/FinfluencerLayout';
import CreateCourseModal from '../components/finfluencers/CreateCourseModal';
import CreateContentModal from '../components/finfluencers/CreateContentModal';

export default function FinfluencerDashboard() {
  const [user, setUser] = useState(null);
  const [finfluencer, setFinfluencer] = useState(null);
  const [courses, setCourses] = useState([]);
  const [posts, setPosts] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [revenueTransactions, setRevenueTransactions] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPayoutRequest, setShowPayoutRequest] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showProfileImageModal, setShowProfileImageModal] = useState(false);
  const [financialTab, setFinancialTab] = useState('overview');
  const [showCreatePost, setShowCreatePost] = useState(false);

  const [stats, setStats] = useState({
    totalStudents: 0,
    activeEnrollments: 0,
    totalEarnings: 0,
    availableBalance: 0,
    pendingPayouts: 0,
    avgRating: 0,
    totalCourses: 0,
    totalPosts: 0
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

        let finfluencerProfile;
        try {
          if (currentUser.app_role === 'super_admin' || currentUser.app_role === 'admin') {
            const profiles = await base44.entities.FinInfluencer.list('', 1).catch(() => []);
            finfluencerProfile = profiles[0];
            if (finfluencerProfile) {
              toast.info("Viewing as Admin: Displaying first available Finfluencer.", { duration: 3000 });
            } else {
              setFinfluencer({ id: 'admin-preview', display_name: "Admin Preview", verified: true });
              setIsLoading(false);
              return;
            }
          } else {
            const finfluencerProfiles = await base44.entities.FinInfluencer.filter({ user_id: currentUser.id }).catch(() => []);
            finfluencerProfile = finfluencerProfiles[0];
          }
        } catch (error) {
          console.error('Error loading finfluencer profile:', error);
          setFinfluencer(null);
          setIsLoading(false);
          return;
        }

        if (!isMounted) return;

        if (!finfluencerProfile) {
          setFinfluencer(null);
          setIsLoading(false);
          return;
        }
        
        setFinfluencer(finfluencerProfile);

        // Only load other data if finfluencer is 'approved'
        if (finfluencerProfile.status === 'approved') {
          try {
            const [coursesData, postsData] = await Promise.all([
              base44.entities.Course.filter({ influencer_id: finfluencerProfile.id }).catch(() => []),
              base44.entities.InfluencerPost.filter({ influencer_id: finfluencerProfile.id }).catch(() => [])
            ]);

            if (!isMounted) return;
            
            setCourses(coursesData || []);
            setPosts(postsData || []);

            setStats(prevStats => ({
              ...prevStats,
              totalCourses: (coursesData || []).length,
              totalPosts: (postsData || []).length
            }));
          } catch (error) {
            console.error('Error loading courses/posts:', error);
            setCourses([]);
            setPosts([]);
          }
          
          setIsLoading(false);

          setTimeout(async () => {
            if (!isMounted) return;
            
            try {
              const [enrollmentsData, revenueData, payoutRequestsData] = await Promise.all([
                base44.entities.CourseEnrollment.list().catch(() => []),
                base44.entities.RevenueTransaction.filter({ influencer_id: finfluencerProfile.id }).catch(() => []),
                base44.entities.PayoutRequest.filter({ entity_id: finfluencerProfile.id, entity_type: 'finfluencer' }).catch(() => [])
              ]);

              if (!isMounted) return;

              const currentCourses = await base44.entities.Course.filter({ influencer_id: finfluencerProfile.id }).catch(() => []);
              const courseIds = (currentCourses || []).map(c => c.id);
              const filteredEnrollments = (enrollmentsData || []).filter(e => courseIds.includes(e.course_id));
              
              setEnrollments(filteredEnrollments || []);
              setRevenueTransactions(revenueData || []);
              setPayoutRequests(payoutRequestsData || []);

              const totalEarnings = (revenueData || []).reduce((sum, t) => sum + (t.influencer_payout || 0), 0);
              const totalPaidOut = (payoutRequestsData || [])
                .filter(p => p.status === 'processed')
                .reduce((sum, p) => sum + (p.requested_amount || 0), 0);
              const pendingPayouts = (payoutRequestsData || [])
                .filter(p => p.status === 'pending' || p.status === 'approved')
                .reduce((sum, p) => sum + (p.requested_amount || 0), 0);
              const availableBalance = totalEarnings - totalPaidOut - pendingPayouts;
              
              const activeEnrollments = (filteredEnrollments || []).filter(e => e.enrollment_status === 'active').length;
              const ratingsSum = (filteredEnrollments || []).reduce((sum, e) => sum + (e.rating || 0), 0);
              const ratedCount = (filteredEnrollments || []).filter(e => e.rating).length;
              const avgRating = ratedCount > 0 ? ratingsSum / ratedCount : 0;

              if (isMounted) {
                setStats(prevStats => ({
                  ...prevStats,
                  totalStudents: (filteredEnrollments || []).length,
                  activeEnrollments,
                  totalEarnings,
                  availableBalance: Math.max(0, availableBalance),
                  pendingPayouts,
                  avgRating: Math.round(avgRating * 10) / 10
                }));
              }
            } catch (error) {
              console.error('Background data loading error:', error);
            }
          }, 100);
        } else {
          // If status is not 'approved', we don't need to load courses/posts/financials immediately
          setIsLoading(false);
        }

      } catch (error) {
        console.error('Error loading finfluencer dashboard:', error);
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

  const handlePayoutSubmit = async (payoutData) => {
    try {
      if (!user || !finfluencer) {
        toast.error('User or finfluencer information not available');
        return;
      }

      await base44.entities.PayoutRequest.create({
        user_id: user.id,
        entity_type: 'finfluencer',
        entity_id: finfluencer.id,
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
      
      const payoutRequestsData = await base44.entities.PayoutRequest.filter({ entity_id: finfluencer.id, entity_type: 'finfluencer' }).catch(() => []);
      setPayoutRequests(payoutRequestsData || []);
    } catch (error) {
      console.error('Error submitting payout request:', error);
      toast.error('Failed to submit payout request');
    }
  };

  const handleCourseCreate = async (courseData) => {
    try {
      if (!finfluencer || !finfluencer.id) {
        toast.error('Finfluencer information not available');
        return;
      }

      // Create or update course
      if (editingCourse) {
        await base44.entities.Course.update(editingCourse.id, {
          ...courseData,
          influencer_id: finfluencer.id,
        });
        toast.success('Course updated successfully!');
      } else {
        await base44.entities.Course.create({
          ...courseData,
          influencer_id: finfluencer.id,
          status: 'approved'
        });
        toast.success('Course created successfully!');
      }
      
      setShowCreateCourse(false);
      setEditingCourse(null); // Clear editing state
      
      const coursesData = await base44.entities.Course.filter({ influencer_id: finfluencer.id }).catch(() => []);
      setCourses(coursesData || []);
      setStats(prevStats => ({
        ...prevStats,
        totalCourses: (coursesData || []).length
      }));
    } catch (error) {
      console.error('Error creating/updating course:', error);
      toast.error('Failed to create/update course');
    }
  };

  const handleCourseDelete = async (courseId, courseTitle) => {
    if (!confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await base44.entities.Course.delete(courseId);
      toast.success('Course deleted successfully!');
      
      const coursesData = await base44.entities.Course.filter({ influencer_id: finfluencer.id }).catch(() => []);
      setCourses(coursesData || []);
      setStats(prevStats => ({
        ...prevStats,
        totalCourses: (coursesData || []).length
      }));
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  const handlePostCreate = async (postData) => {
    try {
      if (!finfluencer || !finfluencer.id) {
        toast.error('Finfluencer information not available');
        return;
      }

      await base44.entities.InfluencerPost.create({
        ...postData,
        influencer_id: finfluencer.id,
        status: 'pending'
      });
      
      toast.success('Content published! Pending admin approval.');
      setShowCreatePost(false);
      
      const postsData = await base44.entities.InfluencerPost.filter({ influencer_id: finfluencer.id }).catch(() => []);
      setPosts(postsData || []);
      setStats(prevStats => ({
        ...prevStats,
        totalPosts: (postsData || []).length
      }));
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
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
      
      await base44.entities.FinInfluencer.update(finfluencer.id, {
        profile_image_url: file_url
      });
      
      setFinfluencer(prev => ({ ...prev, profile_image_url: file_url }));
      setShowProfileImageModal(false);
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast.error('Failed to upload profile picture');
    }
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
      live: { color: 'bg-green-100 text-green-800', label: 'Live' },
      completed: { color: 'bg-blue-100 text-blue-800', label: 'Completed' }
    };
    const { color, label } = config[status] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    return <Badge className={`${color} border-0`}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <FinfluencerLayout activePage="finfluencer-dashboard">
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
      </FinfluencerLayout>
    );
  }

  if (!finfluencer) {
    return (
      <FinfluencerLayout activePage="finfluencer-dashboard">
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <Star className="w-16 h-16 text-purple-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Finfluencer Registration Required</h2>
              <p className="text-slate-600 mb-6">
                Complete your finfluencer registration to access this dashboard.
              </p>
              <Button onClick={() => window.location.href = createPageUrl('Finfluencers')}>
                Register Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </FinfluencerLayout>
    );
  }

  // NEW: Handle Pending/Rejected Status
  if (finfluencer.status === 'pending') {
    return (
      <FinfluencerLayout activePage="finfluencer-dashboard">
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-2 border-yellow-200">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Under Review</h2>
              <p className="text-slate-600 mb-4">
                Your finfluencer application is currently being reviewed by our admin team.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Status:</strong> Pending Approval
                </p>
                <p className="text-sm text-yellow-800 mt-2">
                  We'll notify you via email once your application is approved. This usually takes 1-2 business days.
                </p>
              </div>
              <Button onClick={() => window.location.href = createPageUrl('Dashboard')} variant="outline">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </FinfluencerLayout>
    );
  }

  if (finfluencer.status === 'rejected') {
    return (
      <FinfluencerLayout activePage="finfluencer-dashboard">
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-2 border-red-200">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Not Approved</h2>
              <p className="text-slate-600 mb-4">
                Unfortunately, your finfluencer application was not approved.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">
                  <strong>Status:</strong> Rejected
                </p>
                {finfluencer.rejection_reason && (
                  <p className="text-sm text-red-800 mt-2">
                    <strong>Reason:</strong> {finfluencer.rejection_reason}
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.href = createPageUrl('Dashboard')} variant="outline">
                  Back to Dashboard
                </Button>
                <Button onClick={() => window.location.href = createPageUrl('ContactSupport')}>
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </FinfluencerLayout>
    );
  }

  return (
    <FinfluencerLayout activePage="finfluencer-dashboard">
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="hidden">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="courses">My Courses</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-8 mt-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="relative group cursor-pointer" onClick={() => setShowProfileImageModal(true)}>
                    {finfluencer.profile_image_url ? (
                      <img 
                        src={finfluencer.profile_image_url} 
                        alt={finfluencer.display_name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-purple-200 shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-purple-200 shadow-lg">
                        {finfluencer.display_name?.charAt(0)?.toUpperCase() || 'F'}
                      </div>
                    )}
                    <button
                      className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-semibold"
                    >
                      Change
                    </button>
                  </div>
                  
                  <div>
                    <h2 className="text-3xl font-bold text-slate-800">Welcome back, {finfluencer.display_name}!</h2>
                    <p className="text-slate-600 mt-1">Here's your content creator dashboard overview</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-green-100 text-green-800 border-0">Verified Creator</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => setShowCreateCourse(true)} className="bg-purple-600 hover:bg-purple-700">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create Course
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Users className="w-8 h-8 text-indigo-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Active Students</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.activeEnrollments}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <CreditCard className="w-8 h-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Total Students</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.totalStudents}</p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GraduationCap className="w-8 h-8 text-purple-600" />
                          <div>
                            <p className="font-semibold text-slate-800">Total Courses</p>
                            <p className="text-sm text-slate-500">Live courses</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.totalCourses}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Video className="w-8 h-8 text-blue-600" />
                          <div>
                            <p className="font-semibold text-slate-800">Total Posts</p>
                            <p className="text-sm text-slate-500">Published content</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.totalPosts}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={() => setShowCreateCourse(true)} className="w-full justify-start" variant="outline">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Create New Course
                    </Button>
                    <Button onClick={() => setShowCreatePost(true)} className="w-full justify-start" variant="outline">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Create New Post
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
            
            <TabsContent value="courses" className="space-y-4 mt-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">My Courses</h2>
                <Button onClick={() => setShowCreateCourse(true)} className="bg-purple-600 hover:bg-purple-700">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create Course
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.length > 0 ? (
                  courses.map(course => {
                    const courseEnrollments = enrollments.filter(e => e.course_id === course.id);
                    const courseRevenue = courseEnrollments.reduce((sum, e) => sum + (e.amount_paid || 0), 0);
                    
                    return (
                      <Card key={course.id} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-200 bg-white overflow-hidden">
                        <CardContent className="p-5">
                          {/* Header with Badges */}
                          <div className="flex items-center gap-2 mb-4">
                            <Badge className="bg-blue-100 text-blue-800 border-0 font-semibold">
                              {course.course_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {getStatusBadge(course.status)}
                          </div>

                          {/* Course Title */}
                          <h3 className="font-bold text-xl text-slate-900 mb-4 line-clamp-2 min-h-[3.5rem]">
                            {course.title}
                          </h3>

                          {/* Course Info Section - Blue Background */}
                          <div className="bg-blue-50 rounded-lg p-3 mb-3">
                            <p className="text-xs text-slate-600 mb-1">Category</p>
                            <p className="text-sm font-semibold text-blue-800 uppercase">
                              {course.category?.replace('_', ' ')}
                            </p>
                          </div>

                          {/* Price and Students Grid */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                              <p className="text-xs text-slate-600 mb-1">Price</p>
                              <p className="text-lg font-bold text-green-700">₹{course.price}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                              <p className="text-xs text-slate-600 mb-1">Students</p>
                              <p className="text-lg font-bold text-purple-700">{courseEnrollments.length}</p>
                            </div>
                          </div>

                          {/* Revenue Section */}
                          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 mb-3 border border-orange-200">
                            <p className="text-xs text-slate-600 mb-1">Total Revenue</p>
                            <p className="text-lg font-bold text-orange-700">₹{courseRevenue.toLocaleString()}</p>
                          </div>

                          {/* Duration Badge */}
                          {course.duration_hours && (
                            <div className="flex items-center gap-2 mb-4">
                              <Badge variant="outline" className="text-slate-600">
                                <Clock className="w-3 h-3 mr-1" />
                                {course.duration_hours}h
                              </Badge>
                              <Badge variant="outline" className="text-slate-600">
                                {course.difficulty_level}
                              </Badge>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <Button 
                              variant="outline" 
                              className="w-full text-sm"
                              onClick={() => {
                                // For preview, maybe navigate to course page or show a preview modal
                                window.open(createPageUrl('CourseDetail', { id: course.id }), '_blank');
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Preview
                            </Button>
                            <Button 
                              variant="outline" 
                              className="w-full text-sm text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => {
                                // For stats, maybe open a modal or navigate to a dedicated stats page
                                toast.info('Course stats feature coming soon!');
                              }}
                            >
                              <BarChart3 className="w-4 h-4 mr-1" />
                              Stats
                            </Button>
                          </div>

                          {/* Edit & Delete Buttons */}
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => {
                                setEditingCourse(course);
                                setShowCreateCourse(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button 
                              variant="destructive"
                              className="w-full bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleCourseDelete(course.id, course.title)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>

                          {/* Date Footer */}
                          <div className="text-xs text-slate-500 mt-3 pt-3 border-t text-center">
                            {format(new Date(course.created_date), 'MMM dd, yyyy')}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="p-8 text-center">
                        <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600">No courses created yet.</p>
                        <Button onClick={() => setShowCreateCourse(true)} className="mt-4">
                          Create Your First Course
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4 mt-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">My Content</h2>
                <Button onClick={() => setShowCreatePost(true)} className="bg-purple-600 hover:bg-purple-700">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create Post
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.length > 0 ? (
                  posts.map(post => (
                    <Card key={post.id} className="hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {post.thumbnail_url && (
                            <img 
                              src={post.thumbnail_url} 
                              alt={post.title}
                              className="w-full h-40 object-cover rounded-lg"
                            />
                          )}
                          
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(post.status)}
                              <Badge className="bg-blue-100 text-blue-800">
                                {post.post_type}
                              </Badge>
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">
                              {post.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {post.view_count || 0}
                            </div>
                          </div>

                          <div className="text-xs text-slate-500 pt-3 border-t">
                            {format(new Date(post.created_date), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Video className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600">No content published yet.</p>
                        <Button onClick={() => setShowCreatePost(true)} className="mt-4 bg-purple-600 hover:bg-purple-700">
                          <PlusCircle className="w-4 h-4 mr-2" />
                          Create Your First Post
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="students" className="space-y-4 mt-0">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Students</h2>
              
              <div className="space-y-4">
                {enrollments.length > 0 ? (
                  enrollments.map(enrollment => {
                    const course = courses.find(c => c.id === enrollment.course_id);
                    return (
                      <Card key={enrollment.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-800">
                                Student ID: {enrollment.user_id.substring(0, 8)}...
                              </p>
                              <p className="text-sm text-slate-600">
                                Course: {course?.title || 'Unknown'}
                              </p>
                              <p className="text-xs text-slate-500">
                                Enrolled: {format(new Date(enrollment.created_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(enrollment.enrollment_status)}
                              {enrollment.rating && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                  <span className="text-sm font-semibold">{enrollment.rating}/5</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No students enrolled yet.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="financials" className="space-y-6 mt-0">
              <div className="flex gap-3 w-full">
                <Button
                  onClick={() => setFinancialTab('overview')}
                  className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${
                    financialTab === 'overview' 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                      : 'bg-gradient-to-r from-purple-50 to-blue-50 text-slate-700 hover:from-purple-100 hover:to-blue-100 hover:shadow-md border border-purple-200'
                  }`}
                >
                  <DollarSign className="w-5 h-5 mr-2 inline-block" />
                  Financials
                </Button>
                <Button
                  onClick={() => setFinancialTab('payouts')}
                  className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${
                    financialTab === 'payouts' 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                      : 'bg-gradient-to-r from-purple-50 to-blue-50 text-slate-700 hover:from-purple-100 hover:to-blue-100 hover:shadow-md border border-purple-200'
                  }`}
                >
                  <Wallet className="w-5 h-5 mr-2 inline-block" />
                  Payout Requests
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
                    entityType="finfluencer"
                    entityId={finfluencer?.id}
                    entityName={finfluencer?.display_name || 'Finfluencer'}
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
                          <TrendingUp className="w-8 h-8 text-purple-600" />
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
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-0">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Advanced Analytics</h2>
              
              <div className="space-y-6">
                <Card className="shadow-lg border-0">
                  <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-purple-50">
                    <CardTitle>Performance Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center p-4 bg-purple-50 rounded-xl">
                        <div className="text-3xl font-bold text-purple-600">{courses.length}</div>
                        <div className="text-sm text-slate-600 mt-1">Total Courses</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-xl">
                        <div className="text-3xl font-bold text-green-600">{enrollments.length}</div>
                        <div className="text-sm text-slate-600 mt-1">Total Enrollments</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <div className="text-3xl font-bold text-blue-600">{posts.length}</div>
                        <div className="text-sm text-slate-600 mt-1">Content Posts</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-xl">
                        <div className="text-3xl font-bold text-orange-600">
                          {posts.reduce((sum, p) => sum + (p.view_count || 0), 0)}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">Total Views</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0">
                  <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-purple-50">
                    <CardTitle>Revenue Trends</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {revenueTransactions.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={revenueTransactions.slice(-6)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="created_date" tickFormatter={(date) => format(new Date(date), 'MMM')} />
                          <YAxis />
                          <Tooltip formatter={(value) => [`₹${value}`, 'Earnings']} />
                          <Line type="monotone" dataKey="influencer_payout" stroke="#8b5cf6" strokeWidth={2} />
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

                <Card className="shadow-lg border-0">
                  <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-purple-50">
                    <CardTitle>Top Performing Courses</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {courses.length > 0 ? (
                      <div className="space-y-3">
                        {courses
                          .sort((a, b) => (b.current_enrollments || 0) - (a.current_enrollments || 0))
                          .slice(0, 5)
                          .map((course, index) => (
                            <div key={course.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{course.title}</p>
                                  <p className="text-xs text-slate-500">{format(new Date(course.created_date), 'MMM dd, yyyy')}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-purple-600">{course.current_enrollments || 0}</p>
                                <p className="text-xs text-slate-500">students</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center p-8 text-slate-500">
                        No courses available yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {showPayoutRequest && (
            <PayoutRequestModal
              open={showPayoutRequest}
              onClose={() => setShowPayoutRequest(false)}
              onSubmit={handlePayoutSubmit}
              availableBalance={stats.availableBalance}
              entityType="finfluencer"
            />
          )}

          {showCreateCourse && (
            <CreateCourseModal
              open={showCreateCourse}
              onClose={() => {
                setShowCreateCourse(false);
                setEditingCourse(null);
              }}
              onCreate={handleCourseCreate}
              editingCourse={editingCourse}
            />
          )}

          {showCreatePost && (
            <CreateContentModal
              open={showCreatePost}
              onClose={() => setShowCreatePost(false)}
              onCreate={handlePostCreate}
            />
          )}

          {showProfileImageModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-auto shadow-xl">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Update Profile Picture</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-center">
                    {finfluencer.profile_image_url ? (
                      <img 
                        src={finfluencer.profile_image_url} 
                        alt="Current"
                        className="w-32 h-32 rounded-full object-cover border-4 border-purple-200"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center text-white text-5xl font-bold">
                        {finfluencer.display_name?.charAt(0)?.toUpperCase() || 'F'}
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
        </div>
      </div>
    </FinfluencerLayout>
  );
}
