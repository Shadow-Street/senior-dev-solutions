
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  ShieldQuestion,
  Clock,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  User,
  Hourglass,
  Ban,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PledgeAccessRequest, User as UserEntity } from '@/api/entities';
import { useConfirm } from '../../hooks/useConfirm';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';


const statusConfig = {
  pending: { label: 'Pending', icon: Clock, classes: 'text-yellow-800 bg-yellow-100/60 border-yellow-200/80' },
  approved: { label: 'Approved', icon: CheckCircle, classes: 'text-green-800 bg-green-100/60 border-green-200/80' },
  rejected: { label: 'Rejected', icon: XCircle, classes: 'text-red-800 bg-red-100/60 border-red-200/80' },
  suspended: { label: 'Suspended', icon: Ban, classes: 'text-gray-800 bg-gray-200/60 border-gray-300/80' },
  withdrawn: { label: 'Withdrawn', icon: HelpCircle, classes: 'text-gray-800 bg-gray-100/60 border-gray-200/80' },
  unknown: { label: 'Unknown', icon: HelpCircle, classes: 'text-gray-800 bg-gray-100/60 border-gray-200/80' }
};

const filterRequests = (requests, searchTerm, statusFilter) => {
  // Add safety check for undefined/null requests
  if (!requests || !Array.isArray(requests)) {
    return [];
  }
  
  return requests.filter(request => {
    const statusMatch = statusFilter === 'all' || request.status === statusFilter;
    const searchMatch = searchTerm === '' ||
      request.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.broker?.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });
};

const ReviewRequestModal = ({ isOpen, onClose, request, onUpdateStatus }) => {
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (request) {
      setAdminNotes(request.admin_notes || '');
    }
  }, [request]);

  const handleStatusUpdate = (status) => {
    onUpdateStatus(request, status, adminNotes);
  };

  if (!isOpen || !request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Review Access Request</DialogTitle>
          <DialogDescription>
            Review the user's request for pledge trading access and take appropriate action.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          
          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">User Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{request.user_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{request.user_email}</p>
              </div>
              <div>
                <p className="text-gray-500">Demat Account</p>
                <p className="font-medium text-gray-900">{request.demat_account_id}</p>
              </div>
              <div>
                <p className="text-gray-500">Broker</p>
                <p className="font-medium text-gray-900 capitalize">{request.broker}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">Trading Profile</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Experience Level</p>
                <p className="font-medium text-gray-900 capitalize">{request.trading_experience?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-gray-500">Annual Income</p>
                <p className="font-medium text-gray-900">{request.annual_income_range?.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <div className="text-sm">
              <p className="text-gray-500">Risk Assessment Score</p>
              <div className="flex items-center gap-3 mt-1">
                <Progress value={request.risk_score || 0} className="w-full" />
                <span className="font-semibold text-gray-800">{request.risk_score || 0}/100</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Request Reason</h3>
            <p className="text-sm text-gray-700">{request.request_reason}</p>
          </div>

          <div>
            <label htmlFor="admin_notes" className="font-semibold text-gray-800 text-sm">Admin Review Notes</label>
            <Textarea
              id="admin_notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add review notes here..."
              className="mt-2"
              readOnly={request.status !== 'pending'}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {request.status === 'pending' && (
            <>
              <Button
                variant="destructive"
                onClick={() => handleStatusUpdate('rejected')}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleStatusUpdate('approved')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


export default function PledgeAccessRequests({ requests = [], onRequestUpdate, onRefresh, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  const { ConfirmDialog, confirm } = useConfirm();

  const filteredRequests = useMemo(() => {
    return filterRequests(requests, searchTerm, statusFilter);
  }, [requests, searchTerm, statusFilter]);

  const handleViewProfile = async (userId) => {
    setSelectedUserId(userId);
    setProfileModalOpen(true);
    setIsFetchingProfile(true);
    setProfileData(null);

    try {
      const user = await UserEntity.get(userId);
      setProfileData(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load user profile');
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const handleUpdateRequest = async (request, status, notes) => {
    const action = status === 'approved' ? 'Approve' : 'Reject';
    const confirmed = await confirm({
      title: `${action} Access Request?`,
      message: `Are you sure you want to ${action.toLowerCase()} this pledge access request for ${request.user_name}?`,
      confirmText: action,
      cancelText: "Cancel"
    });

    if (!confirmed) {
      toast.info('Action cancelled.');
      return;
    }

    try {
      toast.loading('Updating status...');
      await PledgeAccessRequest.update(request.id, {
        status: status,
        reviewed_by: 'ADMIN', // Placeholder for actual admin user ID
        reviewed_at: new Date().toISOString(),
        admin_notes: notes,
        rejection_reason: status === 'rejected' ? (notes || 'Not specified') : null
      });

      if (status === 'approved') {
        await UserEntity.update(request.user_id, { has_pledge_access: true });
      } else {
        await UserEntity.update(request.user_id, { has_pledge_access: false });
      }

      toast.dismiss();
      toast.success(`Request has been ${status}.`);
      
      // ✅ Update locally instead of reloading
      if (onRequestUpdate) {
        onRequestUpdate(request.id, {
          status,
          reviewed_by: 'ADMIN',
          reviewed_at: new Date().toISOString(),
          admin_notes: notes,
          rejection_reason: status === 'rejected' ? (notes || 'Not specified') : null
        });
      }
      
      setIsModalOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      toast.dismiss();
      toast.error(`Failed to update status: ${error.message}`);
    }
  };

  const openReviewModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };
  
  const closeReviewModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-4 text-gray-600">Loading access requests...</span>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog />
      <ReviewRequestModal 
        isOpen={isModalOpen}
        onClose={closeReviewModal}
        request={selectedRequest}
        onUpdateStatus={handleUpdateRequest}
      />
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldQuestion className="w-6 h-6 text-blue-600" />
                Pledge Access Requests
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Review and manage user requests for pledge trading access.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-grow"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Object.entries(statusConfig).filter(([key]) => key !== 'unknown').map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Requested On</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map(request => {
                  const statusInfo = statusConfig[request.status] || statusConfig.unknown;
                  const Icon = statusInfo.icon;
                  return (
                    <TableRow key={request.id} onClick={() => openReviewModal(request)} className="cursor-pointer hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium">{request.user_name}</div>
                        <div className="text-xs text-gray-500">{request.user_email}</div>
                      </TableCell>
                      <TableCell className="capitalize">{request.broker}</TableCell>
                      <TableCell>{format(new Date(request.created_date), 'PP')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(statusInfo.classes, 'border')}>
                          <Icon className="w-3 h-3 mr-1.5" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                      <ShieldQuestion className="h-4 w-4 text-blue-600" />
                      <AlertTitle>No Requests Found</AlertTitle>
                      <AlertDescription>
                        There are no access requests matching your current filters.
                      </AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
