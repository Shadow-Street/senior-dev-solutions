import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Upload, CheckCircle, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function PMRegistration() {
  const [user, setUser] = useState(null);
  const [existingPM, setExistingPM] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    display_name: '',
    company_name: '',
    sebi_registration_number: '',
    sebi_document_url: '',
    bio: '',
    experience_years: '',
    specialization: [],
    performance_fee_percentage: 15,
    crystallization_frequency: 'quarterly'
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Check if user already has a PM profile
      const pmProfiles = await base44.entities.PortfolioManager.filter({ user_id: currentUser.id });
      if (pmProfiles.length > 0) {
        setExistingPM(pmProfiles[0]);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, sebi_document_url: file_url });
      toast.success('SEBI certificate uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.display_name || !formData.sebi_registration_number || !formData.sebi_document_url) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await base44.entities.PortfolioManager.create({
        ...formData,
        user_id: user.id,
        experience_years: parseInt(formData.experience_years),
        status: 'pending_approval',
        total_aum: 0,
        total_clients: 0,
        total_revenue: 0
      });

      toast.success('Application submitted successfully! Awaiting SuperAdmin approval.');
      window.location.href = createPageUrl('Dashboard');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (existingPM) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              {existingPM.status === 'pending_approval' && (
                <>
                  <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Application Pending</h2>
                  <p className="text-gray-600 mb-4">
                    Your Portfolio Manager application is under review by the SuperAdmin.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg text-left">
                    <p className="text-sm text-blue-800 mb-2"><strong>Application Details:</strong></p>
                    <p className="text-sm text-blue-700">Display Name: {existingPM.display_name}</p>
                    <p className="text-sm text-blue-700">SEBI Reg: {existingPM.sebi_registration_number}</p>
                    <p className="text-sm text-blue-700">Submitted: {new Date(existingPM.created_date).toLocaleDateString()}</p>
                  </div>
                </>
              )}

              {existingPM.status === 'approved' && (
                <>
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Application Approved!</h2>
                  <p className="text-gray-600 mb-4">
                    Your Portfolio Manager application has been approved.
                  </p>
                  <Button 
                    onClick={() => window.location.href = createPageUrl('PortfolioManagerDashboard')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Go to PM Dashboard
                  </Button>
                </>
              )}

              {existingPM.status === 'rejected' && (
                <>
                  <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Application Rejected</h2>
                  <p className="text-gray-600 mb-4">
                    Your application was not approved.
                  </p>
                  {existingPM.rejection_reason && (
                    <div className="bg-red-50 p-4 rounded-lg text-left mb-4">
                      <p className="text-sm text-red-800"><strong>Reason:</strong></p>
                      <p className="text-sm text-red-700">{existingPM.rejection_reason}</p>
                    </div>
                  )}
                  <Button 
                    onClick={() => window.location.href = createPageUrl('Dashboard')}
                    variant="outline"
                  >
                    Back to Dashboard
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-blue-600 text-white rounded-full p-4 mb-4">
            <Briefcase className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Become a Portfolio Manager
          </h1>
          <p className="text-gray-600">
            Join our SEBI-registered Portfolio Management Service platform
          </p>
        </div>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Manager Application</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                    placeholder="Your professional name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="company_name">Company/Firm Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="Registered company name"
                  />
                </div>

                <div>
                  <Label htmlFor="sebi_reg">SEBI Registration Number *</Label>
                  <Input
                    id="sebi_reg"
                    value={formData.sebi_registration_number}
                    onChange={(e) => setFormData({...formData, sebi_registration_number: e.target.value})}
                    placeholder="INP000000000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="experience">Years of Experience *</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({...formData, experience_years: e.target.value})}
                    placeholder="Years"
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* SEBI Certificate Upload */}
              <div>
                <Label htmlFor="sebi_doc">SEBI Registration Certificate *</Label>
                <div className="mt-2">
                  <Input
                    id="sebi_doc"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                  />
                  {formData.sebi_document_url && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Document uploaded successfully
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Describe your investment philosophy and expertise..."
                  rows={4}
                />
              </div>

              {/* Specialization */}
              <div>
                <Label>Specialization</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {['Equity', 'Debt', 'Hybrid', 'Balanced', 'Sectoral', 'Derivatives'].map(spec => (
                    <label key={spec} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.specialization.includes(spec)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, specialization: [...formData.specialization, spec]});
                          } else {
                            setFormData({...formData, specialization: formData.specialization.filter(s => s !== spec)});
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{spec}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Fee Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="fee">Performance Fee (%)</Label>
                  <Input
                    id="fee"
                    type="number"
                    value={formData.performance_fee_percentage}
                    onChange={(e) => setFormData({...formData, performance_fee_percentage: parseFloat(e.target.value)})}
                    min="5"
                    max="25"
                    step="0.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Typical range: 10-20%</p>
                </div>

                <div>
                  <Label htmlFor="frequency">Fee Crystallization Frequency</Label>
                  <Select
                    value={formData.crystallization_frequency}
                    onValueChange={(value) => setFormData({...formData, crystallization_frequency: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="half_yearly">Half Yearly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.location.href = createPageUrl('Dashboard')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <span>Your application will be reviewed by our SuperAdmin team</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <span>We'll verify your SEBI registration and credentials</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <span>Once approved, you'll get access to the Portfolio Manager Dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <span>You can then invite clients and start managing portfolios</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}