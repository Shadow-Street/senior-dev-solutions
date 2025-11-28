
import React, { useState, useEffect } from 'react';
import { AdvisorPledgeAccessRequest, Advisor } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

export default function PledgeManagementAccess({ user, advisorProfile }) {
  const [accessRequest, setAccessRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    experience_years: '',
    reason: '',
    trading_volume_estimate: 'medium',
    commission_rate_requested: 10
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadAccessRequest = async () => {
      if (!user?.id) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const requests = await AdvisorPledgeAccessRequest.filter(
          { user_id: user.id },
          '-created_date',
          1
        ).catch((err) => {
          if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
            return [];
          }
          throw err;
        });
        
        if (isMounted && !abortController.signal.aborted && requests.length > 0) {
          setAccessRequest(requests[0]);
        }
      } catch (error) {
        if (!error?.message?.includes('aborted') && error?.name !== 'AbortError') {
          console.error('Error loading access request:', error);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadAccessRequest();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.experience_years || !formData.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const newRequest = await AdvisorPledgeAccessRequest.create({
        advisor_id: advisorProfile.id,
        user_id: user.id,
        advisor_name: user.display_name || user.full_name,
        sebi_registration: advisorProfile.sebi_registration_number,
        experience_years: parseInt(formData.experience_years),
        reason: formData.reason,
        trading_volume_estimate: formData.trading_volume_estimate,
        commission_rate_requested: formData.commission_rate_requested,
        status: 'pending'
      });

      setAccessRequest(newRequest);
      toast.success('Access request submitted successfully!');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Request already submitted
  if (accessRequest) {
    const statusConfig = {
      pending: {
        icon: Clock,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        title: 'Request Pending Review',
        description: 'Your pledge management access request is being reviewed by our SuperAdmin team.'
      },
      approved: {
        icon: CheckCircle,
        color: 'bg-green-100 text-green-800 border-green-200',
        title: 'Access Approved!',
        description: 'Congratulations! You now have access to Pledge Management.'
      },
      rejected: {
        icon: XCircle,
        color: 'bg-red-100 text-red-800 border-red-200',
        title: 'Request Rejected',
        description: 'Your access request was not approved.'
      }
    };

    const config = statusConfig[accessRequest.status];
    const Icon = config.icon;

    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${config.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <CardTitle>{config.title}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{config.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="font-semibold">{new Date(accessRequest.created_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={config.color}>
                  {accessRequest.status.toUpperCase()}
                </Badge>
              </div>
              {accessRequest.status === 'approved' && (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Approved Commission Rate</p>
                    <p className="font-semibold text-green-600">{accessRequest.approved_commission_rate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Approved On</p>
                    <p className="font-semibold">{new Date(accessRequest.reviewed_at).toLocaleDateString()}</p>
                  </div>
                </>
              )}
            </div>

            {accessRequest.status === 'rejected' && accessRequest.rejection_reason && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Rejection Reason:</strong> {accessRequest.rejection_reason}
                </AlertDescription>
              </Alert>
            )}

            {accessRequest.admin_notes && (
              <Alert>
                <AlertDescription>
                  <strong>Admin Notes:</strong> {accessRequest.admin_notes}
                </AlertDescription>
              </Alert>
            )}

            {accessRequest.status === 'approved' && (
              <div className="text-center pt-4">
                <p className="text-green-600 font-semibold mb-2">
                  ✓ You can now access Pledge Management features
                </p>
                <p className="text-sm text-gray-600">
                  Refresh the page to see Pledge Management in your sidebar
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show request form
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="border-2 border-blue-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Request Pledge Management Access</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Enable pledge session creation and execution with commission earnings
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>What you'll get:</strong>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Create and manage pledge sessions for your followers</li>
                <li>Execute buy and sell orders (with SuperAdmin approval)</li>
                <li>Earn commission on convenience fees and trading profits</li>
                <li>Access to pledge analytics and performance tracking</li>
              </ul>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="experience">Years of Trading Experience *</Label>
              <Input
                id="experience"
                type="number"
                min="1"
                max="50"
                value={formData.experience_years}
                onChange={(e) => setFormData({...formData, experience_years: e.target.value})}
                placeholder="e.g., 5"
                required
              />
            </div>

            <div>
              <Label htmlFor="volume">Estimated Monthly Trading Volume *</Label>
              <Select
                value={formData.trading_volume_estimate}
                onValueChange={(value) => setFormData({...formData, trading_volume_estimate: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (₹1L - ₹10L)</SelectItem>
                  <SelectItem value="medium">Medium (₹10L - ₹50L)</SelectItem>
                  <SelectItem value="high">High (₹50L - ₹2Cr)</SelectItem>
                  <SelectItem value="very_high">Very High (₹2Cr+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="commission">Requested Commission Rate (%) *</Label>
              <Input
                id="commission"
                type="number"
                min="5"
                max="50"
                step="0.1"
                value={formData.commission_rate_requested}
                onChange={(e) => setFormData({...formData, commission_rate_requested: parseFloat(e.target.value)})}
              />
              <p className="text-xs text-gray-500 mt-1">
                Typical range: 10-20%. Final rate will be determined by SuperAdmin.
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Why do you want pledge management access? *</Label>
              <Textarea
                id="reason"
                rows={4}
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="Explain your trading strategy, experience, and how you plan to use pledge management..."
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
