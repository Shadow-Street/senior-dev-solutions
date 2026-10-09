
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Lock, AlertTriangle, CheckCircle, Clock, XCircle, RefreshCw,
  FileText, HelpCircle, CreditCard, Users, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { PledgeAccessRequest } from '@/api/entities';

const brokerOptions = [
  { id: 'zerodha', name: 'Zerodha' },
  { id: 'upstox', name: 'Upstox' },
  { id: 'angel_broking', name: 'Angel One' },
  { id: 'icicidirect', name:'ICICI Direct' },
  { id: 'hdfcsec', name: 'HDFC Securities' },
  { id: 'other', name: 'Other' }
];

export default function PledgeAccessModal({ isOpen, onClose, user, onSuccess }) {
  const [currentStep, setCurrentStep] = useState('loading');
  const [existingRequest, setExistingRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Separate state for form inputs - this prevents re-render issues
  const [dematId, setDematId] = useState('');
  const [selectedBroker, setSelectedBroker] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [tradingExperience, setTradingExperience] = useState('intermediate');
  const [annualIncomeRange, setAnnualIncomeRange] = useState('10l_to_25l');

  // Validation state
  const [dematValidation, setDematValidation] = useState({ isValid: false, message: '' });

  // Check for existing request on load
  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        const requests = await PledgeAccessRequest.filter({ user_id: user.id }, '-created_date', 1);
        const latestRequest = requests[0];

        if (latestRequest) {
          setExistingRequest(latestRequest);
          if (latestRequest.status === 'pending') {
            setCurrentStep('pending');
          } else if (latestRequest.status === 'rejected') {
            setCurrentStep('rejected');
          } else if (latestRequest.status === 'approved') {
            onClose();
          }
        } else {
          setCurrentStep('info');
        }
      } catch (error) {
        console.error('Error checking existing request:', error);
        setCurrentStep('info');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && user) {
      checkExistingRequest();
    }
  }, [isOpen, user, onClose]);

  // FIXED: Enhanced Demat ID validation with broker verification
  const validateDematId = (value) => {
    // Remove spaces and convert to uppercase for validation and internal use
    const cleanValue = value.replace(/\s+/g, '').toUpperCase();

    // Broker-specific validation patterns
    const brokerPatterns = {
      zerodha: /^[A-Z0-9]{16}$/, // 16 char alphanumeric
      upstox: /^[0-9]{6}$/, // 6 digit numeric
      angel_broking: /^[A-Z0-9]{8,16}$/, // 8-16 char alphanumeric
      icicidirect: /^[A-Z]{4}[0-9]{10}$/, // 4 letters + 10 digits
      hdfcsec: /^[0-9]{10,16}$/, // 10-16 digit numeric
      other: /^[A-Z0-9]{10,18}$/ // Generic: 10-18 char alphanumeric
    };

    const pattern = brokerPatterns[selectedBroker] || brokerPatterns.other;
    const isValidFormat = pattern.test(cleanValue);
    const isValidLength = cleanValue.length >= 10 && cleanValue.length <= 18; // Common Demat IDs are between 10-18 chars

    const brokerName = brokerOptions.find(b => b.id === selectedBroker)?.name || 'Demat';

    return {
      isValid: isValidFormat && isValidLength,
      cleanValue, // This cleanValue is what will be submitted
      message: isValidFormat && isValidLength
        ? `Valid ${brokerName} Account ID format`
        : `Please enter a valid ${brokerName} Account ID`
    };
  };

  // Handle demat ID input with stable binding
  const handleDematIdChange = (e) => {
    const rawValue = e.target.value;
    // Clean input: only alphanumeric, max 18 characters
    const cleanInputForState = rawValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 18);
    setDematId(cleanInputForState);

    // Validate the *cleaned* input value
    // This will trigger re-validation based on the current selectedBroker
    const validation = validateDematId(cleanInputForState);
    setDematValidation(validation);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const currentValidation = validateDematId(dematId);
    setDematValidation(currentValidation); // Update validation state for immediate feedback

    if (!currentValidation.isValid) {
      toast.error('Please enter a valid Demat Account ID');
      return;
    }

    if (!selectedBroker) {
      toast.error('Please select your broker');
      return;
    }

    if (!consentGiven) {
      toast.error('Please provide consent to proceed');
      return;
    }

    setIsSubmitting(true);
    try {
      // FIXED: Check for duplicate demat account across all users
      const existingRequests = await PledgeAccessRequest.filter({
        demat_account_id: currentValidation.cleanValue
      });

      if (existingRequests && existingRequests.length > 0) {
        const existingApproved = existingRequests.find(r => r.status === 'approved');
        if (existingApproved && existingApproved.user_id !== user.id) {
          throw new Error("This Demat Account ID is already linked to another user. Each Demat account can only be linked once.");
        }

        const existingPending = existingRequests.find(r => r.status === 'pending' && r.user_id === user.id);
        if (existingPending) {
          throw new Error("You already have a pending request with this Demat Account ID. Please wait for admin approval.");
        }
      }

      // FIXED: Create new access request with enhanced data
      const newRequest = await PledgeAccessRequest.create({
        user_id: user.id,
        user_name: user.display_name || user.full_name,
        user_email: user.email,
        demat_account_id: currentValidation.cleanValue, // Use clean value for submission
        broker: selectedBroker,
        consent_given: consentGiven,
        trading_experience: tradingExperience,
        annual_income_range: annualIncomeRange,
        request_reason: `User requested pledge access through portfolio interface. Broker: ${brokerOptions.find(b => b.id === selectedBroker)?.name}`,
        status: 'pending',
        risk_score: calculateRiskScore(tradingExperience, annualIncomeRange) // Auto-calculate risk
      });

      setExistingRequest(newRequest);
      setCurrentStep('success');

      if (onSuccess) {
        onSuccess(newRequest);
      }

      toast.success('Access request submitted successfully! Admin will review shortly.');

    } catch (error) {
      console.error('Error submitting pledge access request:', error);
      // Ensure specific errors from throws are shown, otherwise a generic one
      toast.error(error.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // FIXED: Calculate risk score based on experience and income
  const calculateRiskScore = (experience, income) => {
    let score = 50; // Base score

    // Experience factor
    if (experience === 'beginner') score -= 15;
    else if (experience === 'intermediate') score += 0;
    else if (experience === 'advanced') score += 15;

    // Income factor
    if (income === 'below_5l') score -= 10;
    else if (income === '5l_to_10l') score -= 5;
    else if (income === '10l_to_25l') score += 5;
    else if (income === '25l_to_50l') score += 10;
    else if (income === 'above_50l') score += 15;

    return Math.max(0, Math.min(100, score)); // Clamp between 0-100
  };

  const handleResubmit = () => {
    // Reset form for resubmission
    if (existingRequest) {
      setDematId(existingRequest.demat_account_id || '');
      setSelectedBroker(existingRequest.broker || '');
      setConsentGiven(true); // Auto-check consent for resubmission for convenience
      setTradingExperience(existingRequest.trading_experience || 'intermediate');
      setAnnualIncomeRange(existingRequest.annual_income_range || '10l_to_25l');

      // Validate the pre-filled demat ID
      const validation = validateDematId(existingRequest.demat_account_id || '');
      setDematValidation(validation);
    }
    setCurrentStep('form');
  };

  const LoadingContent = () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-subtle">Checking your request status...</p>
      </div>
    </div>
  );

  const PendingContent = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 bg-hold-muted rounded-full flex items-center justify-center">
        <Clock className="w-10 h-10 text-hold-muted-foreground" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Request Under Review</h2>
        <p className="text-subtle">
          Your pledge access request is currently being reviewed by our admin team.
        </p>
      </div>

      <div className="bg-hold-muted border border-hold/30 rounded-lg p-4 text-left">
        <h4 className="font-semibold text-hold-muted-foreground mb-2">Request Details</h4>
        <div className="space-y-2 text-sm text-hold-muted-foreground">
          <div className="flex justify-between">
            <span>Demat Account:</span>
            <span className="font-mono">{existingRequest?.demat_account_id}</span>
          </div>
          <div className="flex justify-between">
            <span>Broker:</span>
            <span className="capitalize">{brokerOptions.find(b => b.id === existingRequest?.broker)?.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Submitted:</span>
            <span>{existingRequest?.created_date ? new Date(existingRequest.created_date).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <Badge className="bg-hold-muted text-hold-muted-foreground">Pending Review</Badge>
          </div>
        </div>
      </div>

      <div className="bg-premium-muted border border-protocall-premium-light rounded-lg p-4 text-left">
        <h4 className="font-semibold text-primary mb-2">What's Next?</h4>
        <ul className="text-sm text-primary space-y-1">
          <li>• Our team will verify your Demat account details</li>
          <li>• Review typically takes 24-48 hours</li>
          <li>• You'll receive a notification once approved</li>
          <li>• After approval, the "My Pledges" section will be unlocked</li>
        </ul>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={onClose}
          variant="outline"
          className="bg-surface-2 hover:bg-border border-0 rounded-lg transition-all duration-300"
        >
          Got it, thanks!
        </Button>
      </div>
    </div>
  );

  const RejectedContent = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 bg-sell-muted rounded-full flex items-center justify-center">
        <XCircle className="w-10 h-10 text-sell-muted-foreground" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Request Not Approved</h2>
        <p className="text-subtle">
          Unfortunately, your pledge access request was not approved.
        </p>
      </div>

      <div className="bg-sell-muted border border-sell/30 rounded-lg p-4 text-left">
        <h4 className="font-semibold text-sell-muted-foreground mb-2">Rejection Details</h4>
        <div className="space-y-2 text-sm text-sell-muted-foreground">
          <div className="flex justify-between">
            <span>Reviewed:</span>
            <span>{existingRequest?.reviewed_at ? new Date(existingRequest.reviewed_at).toLocaleDateString() : 'Recently'}</span>
          </div>
          {existingRequest?.rejection_reason && (
            <div>
              <span className="block font-medium mb-1">Reason:</span>
              <p className="bg-white p-2 rounded text-sell-muted-foreground">{existingRequest.rejection_reason}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-premium-muted border border-protocall-premium-light rounded-lg p-4 text-left">
        <h4 className="font-semibold text-primary mb-2">You Can Try Again</h4>
        <p className="text-sm text-primary">
          You can resubmit your request with updated information. Make sure to address the concerns mentioned above.
        </p>
      </div>

      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          className="bg-surface-2 hover:bg-border border-0 rounded-lg transition-all duration-300"
        >
          Close
        </Button>
        <Button
          onClick={handleResubmit}
          className="bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white border-0 rounded-lg shadow-lg transition-all duration-300"
        >
          Resubmit Request
        </Button>
      </div>
    </div>
  );

  const InfoContent = () => (
    <div className="space-y-6">
      <div className="bg-surface-2 p-6 rounded-lg border border-protocall-premium-light">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-protocall-premium-text" />
          <div>
            <h2 className="text-2xl font-bold text-protocall-premium-text">Stock Pledge Trading</h2>
            <p className="text-protocall-premium-text">Professional execution through your Demat account</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
          <TabsTrigger value="risks">Risks & FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <Shield className="w-6 h-6 text-buy-muted-foreground mb-2" />
              <h4 className="font-semibold mb-1">Secure Execution</h4>
              <p className="text-sm text-subtle">All trades execute directly in your own Demat account with full transparency</p>
            </div>
            <div className="p-4 border rounded-lg">
              <Zap className="w-6 h-6 text-primary mb-2" />
              <h4 className="font-semibold mb-1">Coordinated Trading</h4>
              <p className="text-sm text-subtle">Participate in group buy/sell sessions for better market impact</p>
            </div>
            <div className="p-4 border rounded-lg">
              <FileText className="w-6 h-6 text-protocall-premium-text mb-2" />
              <h4 className="font-semibold mb-1">Full Audit Trail</h4>
              <p className="text-sm text-subtle">Complete records of all pledges, payments, and executions</p>
            </div>
            <div className="p-4 border rounded-lg">
              <CreditCard className="w-6 h-6 text-hold-muted-foreground mb-2" />
              <h4 className="font-semibold mb-1">Convenience Fee Model</h4>
              <p className="text-sm text-subtle">Small upfront fee per pledge session (typically ₹10-100)</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="how-it-works" className="space-y-4 mt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-premium-muted rounded-full flex items-center justify-center text-primary font-semibold">1</div>
              <div>
                <h4 className="font-semibold">Link Your Demat Account</h4>
                <p className="text-sm text-subtle">Provide your Demat Account ID and broker details for secure API integration</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-premium-muted rounded-full flex items-center justify-center text-primary font-semibold">2</div>
              <div>
                <h4 className="font-semibold">Join Pledge Sessions</h4>
                <p className="text-sm text-subtle">Participate in time-limited sessions for specific stocks with defined buy/sell targets</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-premium-muted rounded-full flex items-center justify-center text-primary font-semibold">3</div>
              <div>
                <h4 className="font-semibold">Pay Convenience Fee</h4>
                <p className="text-sm text-subtle">Small upfront fee to confirm your pledge commitment</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-premium-muted rounded-full flex items-center justify-center text-primary font-semibold">4</div>
              <div>
                <h4 className="font-semibold">Automated Execution</h4>
                <p className="text-sm text-subtle">Trades execute automatically in your Demat account during the session window</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4 mt-6">
          <div className="bg-sell-muted border border-sell/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-sell-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold text-sell-muted-foreground mb-2">Important Disclaimer</h4>
                <ul className="text-sm text-sell-muted-foreground space-y-1">
                  <li>• Trading in securities involves market risks and potential losses</li>
                  <li>• Pledge execution depends on market conditions and liquidity</li>
                  <li>• Convenience fees are non-refundable once session begins</li>
                  <li>• Past performance does not guarantee future results</li>
                  <li>• You retain full ownership and responsibility for your Demat account</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Frequently Asked Questions</h4>
            <div className="space-y-2">
              <details className="border rounded p-3">
                <summary className="font-medium cursor-pointer">Can I cancel a pledge after payment?</summary>
                <p className="text-sm text-subtle mt-2">Pledges can be cancelled before the execution window starts. Convenience fees may be partially refunded based on session terms.</p>
              </details>
              <details className="border rounded p-3">
                <summary className="font-medium cursor-pointer">How secure is my Demat account?</summary>
                <p className="text-sm text-subtle mt-2">We use read-only API access with encrypted tokens. You maintain full control and ownership. We can only execute pre-approved pledges.</p>
              </details>
              <details className="border rounded p-3">
                <summary className="font-medium cursor-pointer">What are the typical fees?</summary>
                <p className="text-sm text-subtle mt-2">Convenience fees range from ₹10-100 per pledge. Your broker's standard brokerage charges also apply on execution.</p>
              </details>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onClose}
          className="bg-surface-2 hover:bg-border border-0 rounded-lg transition-all duration-300"
        >
          Cancel
        </Button>
        <Button
          onClick={() => setCurrentStep('form')}
          className="bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white border-0 rounded-lg shadow-lg transition-all duration-300"
        >
          Request Activation
        </Button>
      </div>
    </div>
  );

  const SuccessContent = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 bg-buy-muted rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-buy-muted-foreground" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Request Submitted Successfully!</h2>
        <p className="text-subtle">
          Your pledge access request has been sent to our admin team for review.
        </p>
      </div>

      <div className="bg-premium-muted border border-protocall-premium-light rounded-lg p-4 text-left">
        <h4 className="font-semibold text-primary mb-2">What happens next?</h4>
        <ul className="text-sm text-primary space-y-1">
          <li>• Our team will verify your Demat account details</li>
          <li>• You'll receive a notification once approved (usually within 24-48 hours)</li>
          <li>• After approval, the "My Pledges" section will be unlocked</li>
          <li>• You can then participate in pledge trading sessions</li>
        </ul>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={onClose}
          className="bg-gradient-to-r from-buy to-protocall-blue hover:from-buy hover:to-protocall-blue text-white border-0 rounded-lg shadow-lg transition-all duration-300"
        >
          Got it, thanks!
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-protocall-premium-text" />
            {currentStep === 'pending' && 'Request Under Review'}
            {currentStep === 'rejected' && 'Request Not Approved'}
            {(currentStep === 'info' || currentStep === 'form' || currentStep === 'success') && 'Pledge Trading Access'}
          </DialogTitle>
        </DialogHeader>

        {currentStep === 'loading' && <LoadingContent />}
        {currentStep === 'pending' && <PendingContent />}
        {currentStep === 'rejected' && <RejectedContent />}
        {currentStep === 'info' && <InfoContent />}
        {currentStep === 'form' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Request Pledge Access</h2>
              <p className="text-subtle">Please provide your Demat account details for verification</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="broker">Broker <span className="text-sell-muted-foreground">*</span></Label>
                <Select value={selectedBroker} onValueChange={(value) => {
                  setSelectedBroker(value);
                  // Re-validate Demat ID when broker changes, as validation rules might differ
                  const validation = validateDematId(dematId);
                  setDematValidation(validation);
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your broker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {brokerOptions.map(broker => (
                      <SelectItem key={broker.id} value={broker.id}>
                        {broker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="demat_id">Demat Account ID <span className="text-sell-muted-foreground">*</span></Label>
                <Input
                  id="demat_id"
                  type="text"
                  value={dematId}
                  onChange={handleDematIdChange}
                  placeholder="e.g., 1234567890123456"
                  maxLength={18}
                  className={`mt-1 ${
                    dematId
                      ? dematValidation.isValid
                        ? 'border-buy focus:ring-buy'
                        : 'border-sell focus:ring-sell'
                      : 'border-border focus:ring-ring'
                  }`}
                  required
                />
                {dematId && ( // Only show validation message if input has value
                  <div className={`flex items-center gap-2 mt-2 text-sm ${
                    dematValidation.isValid ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'
                  }`}>
                    {dematValidation.isValid ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    <span>{dematValidation.message}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your {selectedBroker ? brokerOptions.find(b => b.id === selectedBroker)?.name + ' ' : ''}
                  Demat Account ID (typically 12-18 characters, alphanumeric).
                  Specific format expected for some brokers.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experience">Trading Experience</Label>
                  <Select
                    value={tradingExperience}
                    onValueChange={setTradingExperience}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (&lt; 1 year)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (1-5 years)</SelectItem>
                      <SelectItem value="advanced">Advanced (&gt; 5 years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="income">Annual Income Range</Label>
                  <Select
                    value={annualIncomeRange}
                    onValueChange={setAnnualIncomeRange}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="below_5l">Below ₹5 Lakh</SelectItem>
                      <SelectItem value="5l_to_10l">₹5-10 Lakh</SelectItem>
                      <SelectItem value="10l_to_25l">₹10-25 Lakh</SelectItem>
                      <SelectItem value="25l_to_50l">₹25-50 Lakh</SelectItem>
                      <SelectItem value="above_50l">Above ₹50 Lakh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-hold-muted border border-hold/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={consentGiven}
                    onCheckedChange={setConsentGiven}
                  />
                  <div className="text-sm">
                    <Label htmlFor="consent" className="text-hold-muted-foreground font-medium cursor-pointer">
                      I authorize the platform to execute pledged buy/sell orders on my behalf through my linked Demat account.
                    </Label>
                    <p className="text-hold-muted-foreground mt-1">
                      By checking this, you consent to automated trade execution based on your pledge commitments. You can revoke this at any time.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep('info')}
                  className="bg-surface-2 hover:bg-border border-0 rounded-lg transition-all duration-300"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !consentGiven || !dematValidation.isValid || !selectedBroker}
                  className="bg-gradient-to-r from-buy to-protocall-blue hover:from-buy hover:to-protocall-blue text-white border-0 rounded-lg shadow-lg transition-all duration-300"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        )}
        {currentStep === 'success' && <SuccessContent />}
      </DialogContent>
    </Dialog>
  );
}
