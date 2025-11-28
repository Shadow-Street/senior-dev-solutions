import React, { useState, useEffect, useRef } from 'react';
import { FinInfluencer, User, Course, CourseEnrollment, RevenueTransaction, PayoutRequest } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  Star,
  AlertCircle,
  FileText,
  Users,
  Percent,
  DollarSign,
  TrendingUp,
  Wallet,
  Settings,
  BarChart3,
  Trash2,
  Ban
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from 'date-fns';
import FinfluencerPricingCommission from './finfluencers/FinfluencerPricingCommission';
import { logAuditAction, AuditActions } from '@/components/utils/auditLogger';

export default function FinfluencerManagement() {
  const [finfluencers, setFinfluencers] = useState([]);
  const [filteredFinfluencers, setFilteredFinfluencers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFinfluencer, setSelectedFinfluencer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [finfluencerToDelete, setFinfluencerToDelete] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [commissionOverride, setCommissionOverride] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [finfluencerStats, setFinfluencerStats] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadFinfluencers();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let filtered = finfluencers;
    if (statusFilter !== 'all') {
      filtered = filtered.filter((f) => f.status === statusFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter((f) =>
        f.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredFinfluencers(filtered);
  }, [finfluencers, statusFilter, searchTerm]);

  const loadFinfluencers = async () => {
    setIsLoading(true);
    try {
      const applications = await FinInfluencer.list('-created_date');

      if (!isMountedRef.current) return;

      const validObjectIdRegex = /^[0-9a-fA-F]{24}$/;
      const userIds = applications
        .map((a) => a.user_id)
        .filter((id) => id && validObjectIdRegex.test(id));

      let users = [];
      if (userIds.length > 0) {
        users = await User.filter({ id: { '$in': userIds } }).catch(() => []);
      }

      if (!isMountedRef.current) return;

      const usersMap = new Map(users.map((u) => [u.id, u]));

      const populatedFinfluencers = applications.map((app) => ({
        ...app,
        user: usersMap.get(app.user_id),
        display_name: app.display_name || app.user?.display_name || `Finfluencer ${app.id?.slice(-6) || 'Unknown'}`
      }));

      if (isMountedRef.current) {
        setFinfluencers(populatedFinfluencers);
        setStats({
          total: populatedFinfluencers.length,
          pending: populatedFinfluencers.filter((a) => a.status === 'pending').length,
          approved: populatedFinfluencers.filter((a) => a.status === 'approved').length,
          rejected: populatedFinfluencers.filter((a) => a.status === 'rejected').length,
          suspended: populatedFinfluencers.filter((a) => a.status === 'suspended').length
        });

        // Load stats for each finfluencer
        for (const finfluencer of populatedFinfluencers) {
          loadFinfluencerStats(finfluencer.id);
        }
      }
    } catch (error) {
      console.error("Error loading finfluencer applications:", error);
      if (isMountedRef.current) {
        toast.error('Failed to load finfluencer applications');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const loadFinfluencerStats = async (finfluencerId) => {
    try {
      const [courses, enrollments, revenues] = await Promise.all([
        Course.filter({ influencer_id: finfluencerId }).catch(() => []),
        CourseEnrollment.filter({ course_id: { $exists: true } }).catch(() => []),
        RevenueTransaction.filter({ influencer_id: finfluencerId }).catch(() => [])
      ]);

      const finfluencerCourses = courses || [];
      const finfluencerEnrollments = (enrollments || []).filter(e => 
        finfluencerCourses.some(c => c.id === e.course_id)
      );

      const totalStudents = finfluencerEnrollments.length;
      const totalViews = finfluencerCourses.reduce((sum, c) => sum + (c.current_enrollments || 0), 0);
      const totalEarnings = (revenues || []).reduce((sum, r) => sum + (r.influencer_payout || 0), 0);
      const avgRating = finfluencerEnrollments.length > 0
        ? finfluencerEnrollments.reduce((sum, e) => sum + (e.rating || 0), 0) / finfluencerEnrollments.filter(e => e.rating).length
        : 0;

      const activeCourses = finfluencerCourses.filter(c => ['approved', 'live'].includes(c.status)).length;

      setFinfluencerStats(prev => ({
        ...prev,
        [finfluencerId]: {
          totalCourses: finfluencerCourses.length,
          activeCourses,
          totalStudents,
          totalViews,
          totalEarnings,
          avgRating: Math.round(avgRating * 10) / 10
        }
      }));
    } catch (error) {
      console.error(`Error loading stats for finfluencer ${finfluencerId}:`, error);
    }
  };

  const handleStatusChange = async (finfluencerId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        admin_notes: reviewNotes,
        commission_override_rate: commissionOverride === '' ? null : parseFloat(commissionOverride)
      };

      await FinInfluencer.update(finfluencerId, updateData);

      const finfluencerToUpdate = finfluencers.find((f) => f.id === finfluencerId);
      if (newStatus === 'approved' && finfluencerToUpdate?.user_id) {
        await User.update(finfluencerToUpdate.user_id, { app_role: 'finfluencer' });
      }

      const currentAdmin = await User.me().catch(() => null);
      
      const actionMap = {
        'approved': AuditActions.FINFLUENCER_APPROVED,
        'rejected': AuditActions.FINFLUENCER_REJECTED,
        'suspended': AuditActions.FINFLUENCER_SUSPENDED
      };
      
      await logAuditAction(
        currentAdmin,
        actionMap[newStatus] || 'FINFLUENCER_UPDATED',
        'FinInfluencer',
        finfluencerId,
        `${newStatus === 'approved' ? 'Approved' : newStatus === 'rejected' ? 'Rejected' : 'Suspended'} finfluencer "${finfluencerToUpdate?.display_name || 'Unknown'}". Notes: ${reviewNotes || 'None'}`
      );

      toast.success(`Finfluencer status updated to ${newStatus}`);
      loadFinfluencers();
      setShowDetailsModal(false);
      setReviewNotes('');
      setCommissionOverride('');
    } catch (error) {
      console.error('Error updating finfluencer status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!finfluencerToDelete) return;

    try {
      await FinInfluencer.delete(finfluencerToDelete.id);
      toast.success('Finfluencer deleted successfully');
      setFinfluencers(finfluencers.filter(f => f.id !== finfluencerToDelete.id));
      setShowDeleteDialog(false);
      setFinfluencerToDelete(null);
    } catch (error) {
      console.error('Error deleting finfluencer:', error);
      toast.error('Failed to delete finfluencer');
    }
  };

  const openDetailsModal = (finfluencer) => {
    setSelectedFinfluencer(finfluencer);
    setReviewNotes('');
    setCommissionOverride(finfluencer.commission_override_rate !== null ? String(finfluencer.commission_override_rate) : '');
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected', icon: XCircle },
      suspended: { color: 'bg-orange-100 text-orange-800', label: 'Suspended', icon: Ban }
    };
    const { color, label, icon: Icon } = config[status] || config.pending;
    return (
      <Badge className={`${color} border-0 flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
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
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Finfluencer Management</h2>
              <p className="text-sm text-slate-600">Manage content creators and their courses</p>
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
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-semibold whitespace-nowrap">Finfluencers Overview</span>
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
              placeholder="Search finfluencers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
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
                    <p className="text-sm text-slate-600">Total Finfluencers</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Star className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Pending Approval</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Active Finfluencers</p>
                    <p className="text-2xl font-bold">{stats.approved}</p>
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
                      ₹{Object.values(finfluencerStats).reduce((sum, stat) => sum + (stat?.totalEarnings || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {filteredFinfluencers.map((finfluencer) => {
              const stats = finfluencerStats[finfluencer.id] || {};

              return (
                <Card key={finfluencer.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      <img
                        src={finfluencer.profile_image_url || `https://avatar.vercel.sh/${finfluencer.display_name}.png`}
                        alt={finfluencer.display_name}
                        className="w-20 h-20 rounded-full object-cover border-2 border-purple-200"
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-800">{finfluencer.display_name}</h3>
                          {getStatusBadge(finfluencer.status)}
                          {finfluencer.verified && (
                            <Badge className="bg-blue-100 text-blue-800 border-0">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 mb-4">{finfluencer.bio}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <p className="text-xs text-blue-600 font-medium">Courses</p>
                            </div>
                            <p className="text-lg font-bold text-blue-900">
                              {stats.activeCourses || 0} / {stats.totalCourses || 0}
                            </p>
                            <p className="text-xs text-blue-600">Active / Total</p>
                          </div>

                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="w-4 h-4 text-green-600" />
                              <p className="text-xs text-green-600 font-medium">Students</p>
                            </div>
                            <p className="text-lg font-bold text-green-900">{stats.totalStudents || 0}</p>
                            <p className="text-xs text-green-600">{stats.totalViews || 0} total views</p>
                          </div>

                          <div className="bg-purple-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <DollarSign className="w-4 h-4 text-purple-600" />
                              <p className="text-xs text-purple-600 font-medium">Earnings</p>
                            </div>
                            <p className="text-lg font-bold text-purple-900">₹{(stats.totalEarnings || 0).toLocaleString()}</p>
                            <p className="text-xs text-purple-600">Total revenue</p>
                          </div>

                          <div className="bg-orange-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Star className="w-4 h-4 text-orange-600" />
                              <p className="text-xs text-orange-600 font-medium">Rating</p>
                            </div>
                            <p className="text-lg font-bold text-orange-900">{stats.avgRating || 0} ⭐</p>
                            <p className="text-xs text-orange-600">Average rating</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {finfluencer.specialization?.map((spec, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          onClick={() => openDetailsModal(finfluencer)}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>

                        {finfluencer.status === 'pending' && (
                          <>
                            <Button onClick={() => handleStatusChange(finfluencer.id, 'approved')} className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button onClick={() => handleStatusChange(finfluencer.id, 'rejected')} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}

                        {finfluencer.status === 'approved' && (
                          <Button onClick={() => handleStatusChange(finfluencer.id, 'suspended')} variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-50">
                            <Ban className="w-4 h-4 mr-2" />
                            Suspend
                          </Button>
                        )}

                        {finfluencer.status === 'suspended' && (
                          <Button onClick={() => handleStatusChange(finfluencer.id, 'approved')} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Reactivate
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedFinfluencer(finfluencer);
                            setShowDetailsModal(false);
                          }}
                          className="text-indigo-600 border-indigo-600 hover:bg-indigo-50"
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Analytics
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setFinfluencerToDelete(finfluencer);
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

          {filteredFinfluencers.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Star className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No finfluencers found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pricing">
          <FinfluencerPricingCommission />
        </TabsContent>

        <TabsContent value="payouts">
          <FinfluencerPayoutsSection 
            finfluencers={finfluencers} 
            finfluencerStats={finfluencerStats} 
          />
        </TabsContent>
      </Tabs>

      {selectedFinfluencer && showDetailsModal && (
        <FinfluencerDetailsModal
          finfluencer={selectedFinfluencer}
          stats={finfluencerStats[selectedFinfluencer.id]}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedFinfluencer(null);
          }}
          reviewNotes={reviewNotes}
          setReviewNotes={setReviewNotes}
          commissionOverride={commissionOverride}
          setCommissionOverride={setCommissionOverride}
          handleStatusChange={handleStatusChange}
        />
      )}

      {selectedFinfluencer && !showDetailsModal && (
        <FinfluencerAnalyticsModal
          finfluencer={selectedFinfluencer}
          stats={finfluencerStats[selectedFinfluencer.id]}
          onClose={() => setSelectedFinfluencer(null)}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {finfluencerToDelete?.display_name} and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFinfluencerToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Finfluencer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FinfluencerDetailsModal({ finfluencer, stats, onClose, reviewNotes, setReviewNotes, commissionOverride, setCommissionOverride, handleStatusChange }) {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, [finfluencer.id]);

  const loadDetails = async () => {
    try {
      const [userData, coursesData] = await Promise.all([
        finfluencer.user_id ? User.get(finfluencer.user_id).catch(() => null) : Promise.resolve(null),
        Course.filter({ influencer_id: finfluencer.id }).catch(() => [])
      ]);
      setUser(userData);
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading finfluencer details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-600" />
            Finfluencer Details: {finfluencer.display_name}
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
                  <p className="font-semibold">{finfluencer.display_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Email</p>
                  <p className="font-semibold">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Status</p>
                  <p className="font-semibold capitalize">{finfluencer.status?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Followers</p>
                  <p className="font-semibold">{finfluencer.follower_count || 0}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-600">Bio</p>
                  <p className="font-medium text-sm">{finfluencer.bio}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-600">Specialization</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {finfluencer.specialization?.map((spec, idx) => (
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
                  <FileText className="w-5 h-5 text-blue-600 mb-2" />
                  <p className="text-xs text-blue-600">Total Courses</p>
                  <p className="text-2xl font-bold text-blue-900">{stats?.totalCourses || 0}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <Users className="w-5 h-5 text-green-600 mb-2" />
                  <p className="text-xs text-green-600">Total Students</p>
                  <p className="text-2xl font-bold text-green-900">{stats?.totalStudents || 0}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600 mb-2" />
                  <p className="text-xs text-purple-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-purple-900">₹{(stats?.totalEarnings || 0).toLocaleString()}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <Star className="w-5 h-5 text-orange-600 mb-2" />
                  <p className="text-xs text-orange-600">Avg Rating</p>
                  <p className="text-2xl font-bold text-orange-900">{stats?.avgRating || 0}⭐</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Courses ({courses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {courses.length > 0 ? (
                  <div className="space-y-3">
                    {courses.map(course => (
                      <div key={course.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-semibold">{course.title}</p>
                          <p className="text-sm text-slate-600">{course.category?.replace('_', ' ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600">₹{course.price?.toLocaleString()}</p>
                          <Badge className={course.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {course.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No courses created yet</p>
                )}
              </CardContent>
            </Card>

            <div>
              <label className="text-sm font-medium">Review Notes (Optional)</label>
              <Textarea
                placeholder="Add any notes about this application review..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-lg">
              <label htmlFor="commission_override_rate" className="text-sm font-medium flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-slate-500" />
                Commission Override Rate (%)
              </label>
              <Input
                id="commission_override_rate"
                type="number"
                placeholder="e.g., 20 (leave blank for global default)"
                value={commissionOverride}
                onChange={(e) => setCommissionOverride(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">Set a custom commission rate for this finfluencer. Leave blank to use the global default.</p>
            </div>

            {finfluencer.status === 'pending' && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  className="text-red-600 hover:text-red-800"
                  onClick={() => handleStatusChange(finfluencer.id, 'rejected')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Application
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleStatusChange(finfluencer.id, 'approved')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Finfluencer
                </Button>
              </div>
            )}

            {finfluencer.status === 'approved' && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button
                  variant="ghost"
                  className="text-orange-600 hover:text-orange-800"
                  onClick={() => handleStatusChange(finfluencer.id, 'suspended')}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Suspend Finfluencer
                </Button>
              </div>
            )}

            {finfluencer.status === 'suspended' && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleStatusChange(finfluencer.id, 'approved')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Reactivate Finfluencer
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FinfluencerAnalyticsModal({ finfluencer, stats, onClose }) {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDetailedData();
  }, [finfluencer.id]);

  const loadDetailedData = async () => {
    try {
      const [coursesData, enrollmentsData] = await Promise.all([
        Course.filter({ influencer_id: finfluencer.id }, '-created_date', 20),
        CourseEnrollment.filter({}, '-created_date', 20)
      ]);
      setCourses(coursesData);
      
      const finfluencerEnrollments = enrollmentsData.filter(e => 
        coursesData.some(c => c.id === e.course_id)
      );
      setEnrollments(finfluencerEnrollments);
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
              {finfluencer.display_name} - Detailed Analytics
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
                <TabsTrigger value="courses">Courses Performance</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-blue-50">
                    <CardContent className="p-4">
                      <FileText className="w-6 h-6 text-blue-600 mb-2" />
                      <p className="text-2xl font-bold text-blue-900">{stats?.totalCourses || 0}</p>
                      <p className="text-xs text-blue-600">Total Courses</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50">
                    <CardContent className="p-4">
                      <Users className="w-6 h-6 text-green-600 mb-2" />
                      <p className="text-2xl font-bold text-green-900">{stats?.totalStudents || 0}</p>
                      <p className="text-xs text-green-600">Total Students</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-50">
                    <CardContent className="p-4">
                      <DollarSign className="w-6 h-6 text-purple-600 mb-2" />
                      <p className="text-2xl font-bold text-purple-900">₹{(stats?.totalEarnings || 0).toLocaleString()}</p>
                      <p className="text-xs text-purple-600">Total Earnings</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-orange-50">
                    <CardContent className="p-4">
                      <Star className="w-6 h-6 text-orange-600 mb-2" />
                      <p className="text-2xl font-bold text-orange-900">{stats?.avgRating || 0}⭐</p>
                      <p className="text-xs text-orange-600">Avg Rating</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="courses" className="space-y-4">
                {courses.map(course => {
                  const courseEnrollments = enrollments.filter(e => e.course_id === course.id);
                  return (
                    <Card key={course.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{course.title}</h4>
                            <div className="flex gap-2 flex-wrap mb-2">
                              <Badge variant="outline">{course.category?.replace('_', ' ')}</Badge>
                              <Badge className={
                                course.status === 'approved' ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {course.status}
                              </Badge>
                            </div>
                            <div className="flex gap-4 text-xs text-slate-500">
                              <span>👥 {courseEnrollments.length} students</span>
                              <span>💰 ₹{course.price}</span>
                              <span>📅 {format(new Date(course.created_date), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="students" className="space-y-4">
                {enrollments.map(enrollment => (
                  <Card key={enrollment.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Course: {courses.find(c => c.id === enrollment.course_id)?.title}</p>
                          <p className="text-sm text-slate-600">
                            Enrolled: {format(new Date(enrollment.created_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={enrollment.enrollment_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                            {enrollment.enrollment_status}
                          </Badge>
                          {enrollment.rating && (
                            <p className="text-sm text-slate-600 mt-1">
                              Rating: {enrollment.rating}⭐
                            </p>
                          )}
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

function FinfluencerPayoutsSection({ finfluencers, finfluencerStats }) {
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFinfluencer, setSelectedFinfluencer] = useState('all');

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    setIsLoading(true);
    try {
      const [allPayouts, allRevenues] = await Promise.all([
        PayoutRequest.filter({ entity_type: 'finfluencer' }, '-created_date').catch(() => []),
        RevenueTransaction.list('-created_date').catch(() => [])
      ]);
      setPayoutRequests(allPayouts || []);
      setRevenues(allRevenues || []);
    } catch (error) {
      console.error('Error loading payouts:', error);
      toast.error('Failed to load payout requests');
      setPayoutRequests([]);
      setRevenues([]);
    } finally {
      setIsLoading(false);
    }
  };

  const safePayoutRequests = payoutRequests || [];
  const safeRevenues = revenues || [];
  const safeFinfluencers = finfluencers || [];

  const filteredPayouts = selectedFinfluencer === 'all' 
    ? safePayoutRequests 
    : safePayoutRequests.filter(p => p.entity_id === selectedFinfluencer);

  const totalPending = safePayoutRequests.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.requested_amount || 0), 0);
  const totalApproved = safePayoutRequests.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.requested_amount || 0), 0);
  const totalProcessed = safePayoutRequests.filter(p => p.status === 'processed').reduce((sum, p) => sum + (p.requested_amount || 0), 0);

  const totalGrossEarnings = safeRevenues.reduce((sum, r) => sum + (r.gross_amount || 0), 0);
  const totalPlatformCommission = safeRevenues.reduce((sum, r) => sum + (r.platform_commission || 0), 0);
  const totalFinfluencerPayout = safeRevenues.reduce((sum, r) => sum + (r.influencer_payout || 0), 0);
  const totalPaidOut = safePayoutRequests.filter(p => p.status === 'processed').reduce((sum, p) => sum + (p.requested_amount || 0), 0);
  const pendingPayoutAmount = totalFinfluencerPayout - totalPaidOut;

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-semibold mb-1">Gross Earnings</p>
                <p className="text-3xl font-bold text-blue-900">₹{totalGrossEarnings.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">Total course revenue</p>
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
                <p className="text-xs text-orange-600 mt-1">Awaiting finfluencer requests</p>
              </div>
              <Wallet className="w-12 h-12 text-orange-600 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

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
        <label className="text-sm font-medium text-slate-700">Filter by Finfluencer:</label>
        <select
          value={selectedFinfluencer}
          onChange={(e) => setSelectedFinfluencer(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        >
          <option value="all">All Finfluencers</option>
          {safeFinfluencers.filter(f => f.status === 'approved').map(finfluencer => (
            <option key={finfluencer.id} value={finfluencer.id}>
              {finfluencer.display_name}
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
                const finfluencer = safeFinfluencers.find(f => f.id === payout.entity_id);
                const stats = (finfluencerStats && finfluencerStats[payout.entity_id]) || {};
                
                return (
                  <Card key={payout.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg">{finfluencer?.display_name || 'Unknown Finfluencer'}</h4>
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
                {selectedFinfluencer === 'all' 
                  ? 'No payout requests found' 
                  : 'No payout requests for this finfluencer'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}