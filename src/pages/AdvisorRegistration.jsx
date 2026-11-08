import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UploadCloud, Loader2, AlertCircle, CheckCircle, FileCheck, Lock, Clock, XCircle, ShieldCheck } from 'lucide-react';
import { UploadFile } from '@/api/integrations';
import { advisorApi } from '@/lib/advisorApi';
import { apiErrorMessage } from '@/lib/withdrawalsApi';
import { useAuth } from '@/components/context/AuthContext';
import { createPageUrl } from '@/utils';
import { EXPERTISE_OPTIONS } from '@/components/advisors/expertise';

const SEBI_PATTERN = /^IN[A-Z]\d{9}$/;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const STAFF_ROLES = ['admin', 'super_admin', 'sub_admin'];

const STATUS_VIEW = {
  pending_approval: {
    icon: Clock,
    tone: 'bg-hold-muted text-hold-muted-foreground',
    title: 'Application under review',
    message: 'Thank you for applying. Our team is checking your SEBI details and certificate. You will get a notification and an email as soon as a decision is made.',
  },
  approved: {
    icon: CheckCircle,
    tone: 'bg-buy-muted text-buy-muted-foreground',
    title: 'You are an approved advisor',
    message: 'Your application was approved. You can now create plans, publish advisories and receive subscribers from your advisor dashboard.',
  },
  rejected: {
    icon: XCircle,
    tone: 'bg-sell-muted text-sell-muted-foreground',
    title: 'Application not approved',
    message: 'Your application was not approved. Review the reason below, correct your details and apply again.',
  },
  suspended: {
    icon: AlertCircle,
    tone: 'bg-hold-muted text-hold-muted-foreground',
    title: 'Advisor account suspended',
    message: 'Your advisor account is suspended. Please contact support for more information.',
  },
};

export default function AdvisorRegistration() {
  const { user, refreshUser } = useAuth();
  const [advisor, setAdvisor] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reapplying, setReapplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({ fullName: '', sebiNumber: '', bio: '', expertise: [] });
  const [customExpertise, setCustomExpertise] = useState('');
  const [file, setFile] = useState(null);

  const load = useCallback(async () => {
    setIsChecking(true);
    setLoadError(null);
    try {
      const { advisor: mine } = await advisorApi.me();
      setAdvisor(mine);
      // An approval may have happened since this tab last loaded the user; make
      // sure the dashboard link works without a manual reload.
      if (mine?.status === 'approved') refreshUser?.();
    } catch (error) {
      setLoadError(apiErrorMessage(error, 'We could not check your application. Please try again.'));
    } finally {
      setIsChecking(false);
    }
  }, [refreshUser]);

  useEffect(() => { load(); }, [load]);

  const isStaff = STAFF_ROLES.includes(user?.app_role || user?.role);

  const startReapply = () => {
    setFormData({
      fullName: advisor?.display_name || '',
      sebiNumber: advisor?.sebi_registration_number || '',
      bio: advisor?.bio || '',
      expertise: Array.isArray(advisor?.specialization) ? advisor.specialization : [],
    });
    setFile(null);
    setFormError(null);
    setReapplying(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleExpertise = (label) => {
    setFormData((prev) => {
      const has = prev.expertise.includes(label);
      if (!has && prev.expertise.length >= 8) {
        toast.error('Choose at most 8 areas of expertise.');
        return prev;
      }
      return { ...prev, expertise: has ? prev.expertise.filter((x) => x !== label) : [...prev.expertise, label] };
    });
  };

  const addCustomExpertise = () => {
    const label = customExpertise.trim();
    if (!label) return;
    if (label.length > 40) { toast.error('Keep each expertise label under 40 characters.'); return; }
    if (!formData.expertise.some((x) => x.toLowerCase() === label.toLowerCase())) toggleExpertise(label);
    setCustomExpertise('');
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_FILE_BYTES) { toast.error('The certificate must be 10 MB or smaller.'); return; }
    setFile(selected);
  };

  const validate = () => {
    if (formData.fullName.trim().length < 2) return 'Enter your full name.';
    if (!SEBI_PATTERN.test(formData.sebiNumber.replace(/\s+/g, '').toUpperCase())) {
      return 'The SEBI registration number must look like INA000012345 (IN, a letter, then 9 digits).';
    }
    if (formData.bio.trim().length < 10) return 'Describe your experience in at least 10 characters.';
    if (!file) return 'Upload your SEBI certificate.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    setFormError(problem);
    if (problem) return;

    setIsSubmitting(true);
    try {
      // is_private: the certificate is a regulatory identity document that only
      // the applicant and our reviewers may open.
      const { key } = await UploadFile({ file, is_private: true, folder: 'sebi-certificates' });
      const { advisor: created } = await advisorApi.apply({
        display_name: formData.fullName.trim(),
        bio: formData.bio.trim(),
        sebi_registration_number: formData.sebiNumber.replace(/\s+/g, '').toUpperCase(),
        sebi_document_key: key,
        specialization: formData.expertise,
      });
      setAdvisor(created);
      setReapplying(false);
      toast.success('Application submitted. It is now under review.');
    } catch (error) {
      const message = apiErrorMessage(error, 'Submitting your application failed. Please try again.');
      setFormError(message);
      toast.error(message);
      // A 409 means an application already exists; show it instead of the form.
      if (error?.response?.status === 409) load();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderShell = (content) => (
    <div className="min-h-screen flex items-center justify-center bg-surface-2 p-6">{content}</div>
  );

  if (isChecking) {
    return renderShell(
      <Card className="w-full max-w-md text-center p-8">
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-subtle">Checking your advisor status...</p>
      </Card>
    );
  }

  if (loadError) {
    return renderShell(
      <Card className="w-full max-w-md text-center p-8">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-sell-muted-foreground" />
        <p className="text-subtle mb-4">{loadError}</p>
        <Button onClick={load}>Try again</Button>
      </Card>
    );
  }

  if (isStaff) {
    return renderShell(
      <Card className="w-full max-w-md text-center p-8">
        <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-bold mb-2">Staff accounts cannot apply</h2>
        <p className="text-subtle mb-4">Advisor applications are made from a regular user account. Staff review them from Advisor Management.</p>
        <Link to={createPageUrl('Dashboard')}><Button variant="outline">Back to dashboard</Button></Link>
      </Card>
    );
  }

  if (advisor && !reapplying) {
    const view = STATUS_VIEW[advisor.status] || STATUS_VIEW.pending_approval;
    const StatusIcon = view.icon;
    return renderShell(
      <Card className="w-full max-w-md text-center p-8">
        <CardHeader>
          <div className={`w-16 h-16 rounded-full ${view.tone} flex items-center justify-center mx-auto mb-4`}>
            <StatusIcon className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold">{view.title}</CardTitle>
          <CardDescription className="text-subtle mt-3">{view.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {advisor.status === 'rejected' && advisor.rejection_reason && (
            <div className="bg-sell-muted border border-sell/30 rounded-lg p-4 text-left">
              <p className="text-sm font-semibold text-sell-muted-foreground">Reason</p>
              <p className="text-sm text-sell-muted-foreground mt-1">{advisor.rejection_reason}</p>
            </div>
          )}
          {advisor.status === 'suspended' && advisor.rejection_reason && (
            <div className="bg-hold-muted border border-hold/30 rounded-lg p-4 text-left">
              <p className="text-sm font-semibold text-hold-muted-foreground">Note from the review team</p>
              <p className="text-sm text-hold-muted-foreground mt-1">{advisor.rejection_reason}</p>
            </div>
          )}

          <div className="bg-surface-2 rounded-lg p-4 text-left">
            <h4 className="font-semibold text-foreground mb-3">Your application</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4"><span className="text-subtle">Email</span><span className="font-medium text-foreground truncate">{user?.email}</span></div>
              <div className="flex justify-between gap-4"><span className="text-subtle">Display name</span><span className="font-medium text-foreground">{advisor.display_name}</span></div>
              <div className="flex justify-between gap-4"><span className="text-subtle">SEBI number</span><span className="font-medium text-foreground">{advisor.sebi_registration_number}</span></div>
              <div className="flex justify-between gap-4">
                <span className="text-subtle">Status</span>
                <Badge className={`${view.tone} border-0`}>{String(advisor.status || '').replace('_', ' ').toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-subtle">Submitted</span>
                <span className="font-medium text-foreground">{advisor.created_at ? new Date(advisor.created_at).toLocaleDateString() : '-'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {advisor.status === 'approved' && (
              <Link to={createPageUrl('AdvisorDashboard')}>
                <Button className="w-full">Go to my advisor dashboard</Button>
              </Link>
            )}
            {advisor.status === 'rejected' && (
              <Button className="w-full" onClick={startReapply}>Update details and apply again</Button>
            )}
            {advisor.status === 'suspended' && (
              <Link to={createPageUrl('ContactSupport')}>
                <Button className="w-full">Contact support</Button>
              </Link>
            )}
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" className="w-full">Back to dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return renderShell(
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">
          {reapplying ? 'Update and re-apply' : 'Become a Stock Advisor'}
        </CardTitle>
        <CardDescription className="text-center">
          Join as a SEBI registered advisor and share your expertise. Every application is reviewed by our team before you can publish.
        </CardDescription>
        {reapplying && advisor?.rejection_reason && (
          <div className="mt-3 bg-sell-muted border border-sell/30 rounded-lg p-3 text-sm text-sell-muted-foreground">
            <strong>Previous reason:</strong> {advisor.rejection_reason}
          </div>
        )}
        <div className="mt-4">
          <Badge variant="outline" className="bg-hold-muted text-hold-muted-foreground border-hold/30">
            <Clock className="w-3 h-3 mr-1" />
            Reviewed by an admin before approval
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="advisor-email" className="block text-sm font-medium text-subtle mb-2">Email address</label>
            <div className="relative">
              <Input id="advisor-email" type="email" value={user?.email || ''} readOnly disabled className="bg-surface-2 cursor-not-allowed" />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">This is your signed-in account email and cannot be changed here.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="advisor-name" className="block text-sm font-medium text-subtle mb-2">
                Full name <span className="text-sell-muted-foreground">*</span>
              </label>
              <Input id="advisor-name" name="fullName" placeholder="Your full name" value={formData.fullName} onChange={handleInputChange} maxLength={100} required />
            </div>
            <div>
              <label htmlFor="advisor-sebi" className="block text-sm font-medium text-subtle mb-2">
                SEBI registration number <span className="text-sell-muted-foreground">*</span>
              </label>
              <Input id="advisor-sebi" name="sebiNumber" placeholder="e.g. INA000012346" value={formData.sebiNumber} onChange={handleInputChange} maxLength={20} required />
            </div>
          </div>

          <div>
            <label htmlFor="advisor-bio" className="block text-sm font-medium text-subtle mb-2">
              Bio <span className="text-sell-muted-foreground">*</span>
            </label>
            <Textarea
              id="advisor-bio"
              name="bio"
              placeholder="Tell investors about your experience and approach"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              maxLength={2000}
            />
          </div>

          <div>
            <p className="block text-sm font-medium text-subtle mb-2">Areas of expertise</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Areas of expertise">
              {[...EXPERTISE_OPTIONS, ...formData.expertise.filter((x) => !EXPERTISE_OPTIONS.includes(x))].map((label) => {
                const on = formData.expertise.includes(label);
                return (
                  <Button key={label} type="button" size="sm" variant={on ? 'default' : 'outline'} aria-pressed={on} onClick={() => toggleExpertise(label)}>
                    {label}
                  </Button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <Input
                aria-label="Add another area of expertise"
                placeholder="Add another (e.g. Commodities)"
                value={customExpertise}
                onChange={(e) => setCustomExpertise(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomExpertise(); } }}
                maxLength={40}
              />
              <Button type="button" variant="outline" onClick={addCustomExpertise}>Add</Button>
            </div>
          </div>

          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-subtle mb-2">
              SEBI certificate <span className="text-sell-muted-foreground">*</span>
            </label>
            <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${file ? 'border-buy/30 bg-buy-muted' : 'border-border border-dashed'} rounded-md transition-colors`}>
              <div className="space-y-1 text-center">
                {file ? <FileCheck className="mx-auto h-12 w-12 text-positive" /> : <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />}
                {file && <p className="font-semibold text-buy-muted-foreground text-sm">{file.name}</p>}
                <label htmlFor="file-upload" className="cursor-pointer rounded-md font-medium text-primary hover:underline focus-within:outline-none">
                  <span className="text-sm">{file ? 'Change file' : 'Upload a file'}</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
                </label>
                <p className="text-xs text-muted-foreground">PDF, JPG or PNG, up to 10 MB. Stored privately; only you and our reviewers can open it.</p>
              </div>
            </div>
          </div>

          {formError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-sell/30 bg-sell-muted p-3 text-sm text-sell-muted-foreground">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex gap-3">
            {reapplying && (
              <Button type="button" variant="outline" onClick={() => setReapplying(false)} disabled={isSubmitting}>Cancel</Button>
            )}
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting application...</>) : 'Submit application'}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            By submitting you confirm that the information provided is accurate and that you are authorised to give investment advice in India.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
