import React, { useState, useEffect } from 'react';
import { User, Advisor } from '@/lib/apiClient';
import apiClient from '@/lib/apiClient';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { UploadCloud, Loader2, AlertCircle, CheckCircle, FileCheck, Lock } from 'lucide-react';
import { usePlatformSettings } from '../components/hooks/usePlatformSettings';

export default function AdvisorRegistration() {
    const { settings, usingDefaults } = usePlatformSettings();
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        sebiNumber: '',
        bio: '',
    });
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [approvalStatus, setApprovalStatus] = useState(null);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);
    const [existingAdvisor, setExistingAdvisor] = useState(null);

    // Check if user is already an advisor
    useEffect(() => {
        let isMounted = true;

        const checkAdvisorStatus = async () => {
            setIsCheckingStatus(true);
            try {
                const user = await User.me().catch(() => null);

                if (!isMounted) return;

                if (!user) {
                    // User not logged in - redirect to login
                    toast.error("Please log in to register as an advisor.");
                    window.location.href = createPageUrl('Profile');
                    return;
                }

                setCurrentUser(user);

                // ✅ Check if user already has ANY advisor profile (including rejected)
                const advisors = await Advisor.filter({
                    user_id: user.id
                }).catch(() => []);

                if (!isMounted) return;

                if (advisors && advisors.length > 0) {
                    // ✅ User already has an advisor profile (any status)
                    setExistingAdvisor(advisors[0]);
                    setApprovalStatus(advisors[0].status);
                    setRegistrationSuccess(true);
                }
            } catch (error) {
                console.error("Error checking advisor status:", error);
            } finally {
                if (isMounted) {
                    setIsCheckingStatus(false);
                }
            }
        };

        checkAdvisorStatus();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // ✅ CRITICAL: Double-check no existing advisor before submission
        if (existingAdvisor) {
            toast.error("You already have an advisor application. Cannot register twice.");
            return;
        }

        if (!currentUser) {
            toast.error("You must be logged in to register as an advisor.");
            return;
        }

        if (!file || !formData.fullName || !formData.sebiNumber) {
            toast.error("Please fill all required fields and upload your SEBI certificate.");
            return;
        }

        setIsSubmitting(true);
        try {
            // ✅ FINAL CHECK: Verify no advisor profile exists
            const existingCheck = await Advisor.filter({
                user_id: currentUser.id
            }).catch(() => []);

            if (existingCheck && existingCheck.length > 0) {
                toast.error("Duplicate registration detected. You already have an advisor application.");
                setExistingAdvisor(existingCheck[0]);
                setApprovalStatus(existingCheck[0].status);
                setRegistrationSuccess(true);
                setIsSubmitting(false);
                return;
            }

            // Step 1: Upload the SEBI document
            const { file_url } = await UploadFile({ file });

            // Step 2: Create the Advisor record with dynamic approval status
            const advisorData = {
                user_id: currentUser.id,
                display_name: formData.fullName,
                bio: formData.bio,
                sebi_registration_number: formData.sebiNumber,
                sebi_document_url: file_url,
                status: settings.advisorApprovalRequired ? 'pending_approval' : 'approved',
            };

            const newAdvisor = await Advisor.create(advisorData);

            setExistingAdvisor(newAdvisor);
            setRegistrationSuccess(true);
            setApprovalStatus(newAdvisor.status);

            if (settings.advisorApprovalRequired) {
                toast.success("Registration submitted! Your application is under review.");
            } else {
                toast.success("Registration successful! You are now approved as an advisor.");
            }

        } catch (error) {
            console.error("Advisor registration failed:", error);
            toast.error("Registration failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show loading state while checking status
    if (isCheckingStatus) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-2">
                <Card className="w-full max-w-md text-center p-8">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-protocall-blue" />
                    <p className="text-subtle">Checking your advisor status...</p>
                </Card>
            </div>
        );
    }

    // Show success/status screen if already registered
    if (registrationSuccess && existingAdvisor) {
        const statusConfig = {
            'pending_approval': {
                icon: AlertCircle,
                color: 'text-hold-muted-foreground',
                bgColor: 'bg-hold-muted',
                title: 'Application Under Review',
                message: 'Thank you for registering. Our team will review your application and you will be notified via email once it\'s processed. This usually takes 2-3 business days.',
                action: null,
            },
            'approved': {
                icon: CheckCircle,
                color: 'text-buy-muted-foreground',
                bgColor: 'bg-buy-muted',
                title: 'Application Approved!',
                message: 'Congratulations! You are now approved as an advisor and can start providing recommendations immediately.',
                action: 'advisor_dashboard',
            },
            'rejected': {
                icon: AlertCircle,
                color: 'text-sell-muted-foreground',
                bgColor: 'bg-sell-muted',
                title: 'Application Rejected',
                message: 'Unfortunately, your application was not approved. If you believe this was an error, please contact support for assistance.',
                action: null,
            },
            'suspended': {
                icon: AlertCircle,
                color: 'text-hold-muted-foreground',
                bgColor: 'bg-hold-muted',
                title: 'Account Suspended',
                message: 'Your advisor account has been suspended. Please contact support for more information.',
                action: null,
            },
        };

        const config = statusConfig[approvalStatus] || statusConfig['pending_approval'];
        const StatusIcon = config.icon;

        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-2 p-6">
                <Card className="w-full max-w-md text-center p-8">
                    <CardHeader>
                        <div className={`w-16 h-16 rounded-full ${config.bgColor} flex items-center justify-center mx-auto mb-4`}>
                            <StatusIcon className={`w-8 h-8 ${config.color}`} />
                        </div>
                        <CardTitle className={`text-2xl font-bold ${config.color}`}>
                            {config.title}
                        </CardTitle>
                        <CardDescription className="text-subtle mt-3">
                            {config.message}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* ✅ DUPLICATE REGISTRATION WARNING */}
                        <div className="bg-hold-muted border border-hold/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-hold-muted-foreground mt-0.5" />
                                <div className="text-left">
                                    <p className="font-semibold text-hold-muted-foreground text-sm">Cannot Register Again</p>
                                    <p className="text-xs text-hold-muted-foreground mt-1">
                                        You already have an advisor application. Only one application per account is allowed.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Application Details */}
                        <div className="bg-surface-2 rounded-lg p-4 text-left">
                            <h4 className="font-semibold text-foreground mb-3">Your Application Details</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-subtle">Email:</span>
                                    <span className="font-medium text-foreground">{currentUser?.email}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-subtle">Display Name:</span>
                                    <span className="font-medium text-foreground">{existingAdvisor.display_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-subtle">SEBI Number:</span>
                                    <span className="font-medium text-foreground">{existingAdvisor.sebi_registration_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-subtle">Status:</span>
                                    <Badge className={`${config.bgColor} ${config.color} border-0`}>
                                        {approvalStatus.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-subtle">Submitted:</span>
                                    <span className="font-medium text-foreground">
                                        {new Date(existingAdvisor.created_date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3">
                            <Link to={createPageUrl("Dashboard")}>
                                <Button variant="outline" className="w-full">
                                    Return to Dashboard
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show registration form if not registered yet
    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-2 p-6">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center">Become a Stock Advisor</CardTitle>
                    <CardDescription className="text-center">Join our platform as a SEBI Registered Advisor and share your expertise.</CardDescription>

                    {/* Platform Settings Info */}
                    <div className="space-y-2 mt-4">
                        {settings.advisorApprovalRequired ? (
                            <Badge variant="outline" className="bg-hold-muted text-hold-muted-foreground border-hold/30">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pending Admin Approval Required
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-buy-muted text-buy-muted-foreground border-buy/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Auto-Approval Enabled
                            </Badge>
                        )}

                        <div className="text-sm text-subtle bg-premium-muted p-3 rounded-lg">
                            <p className="font-medium">Platform Commission: {settings.commissionRate}%</p>
                            <p>You'll receive {100 - settings.commissionRate}% of your advisor plan revenues.</p>
                        </div>

                        {usingDefaults && (
                            <div className="flex items-center gap-2 text-xs text-hold-muted-foreground bg-hold-muted p-2 rounded-lg">
                                <AlertCircle className="w-3 h-3" />
                                <span>Default settings applied until admin configures values.</span>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* ✅ PRE-FILLED EMAIL (READ-ONLY) */}
                        <div>
                            <label className="block text-sm font-medium text-subtle mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Input
                                    type="email"
                                    value={currentUser?.email || ''}
                                    readOnly
                                    disabled
                                    className="bg-surface-2 cursor-not-allowed"
                                />
                                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                This is your logged-in account email and cannot be changed.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-subtle mb-2">
                                    Full Name <span className="text-sell">*</span>
                                </label>
                                <Input
                                    name="fullName"
                                    placeholder="Your Full Name"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-subtle mb-2">
                                    SEBI Registration Number <span className="text-sell">*</span>
                                </label>
                                <Input
                                    name="sebiNumber"
                                    placeholder="e.g., INA000012346"
                                    value={formData.sebiNumber}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-subtle mb-2">
                                Bio / Advisory Focus
                            </label>
                            <Textarea
                                name="bio"
                                placeholder="Describe your expertise (e.g., Technical Analysis, F&O, Long-term Value Investing)"
                                value={formData.bio}
                                onChange={handleInputChange}
                                rows={3}
                            />
                        </div>

                        {/* Enhanced File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-subtle mb-2">
                                SEBI Certificate <span className="text-sell">*</span>
                            </label>
                            <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${fileName ? 'border-buy/30 bg-buy-muted' : 'border-border border-dashed'} rounded-md transition-colors`}>
                                <div className="space-y-1 text-center">
                                    {fileName ? (
                                        <>
                                            <FileCheck className="mx-auto h-12 w-12 text-positive" />
                                            <div className="text-sm text-subtle">
                                                <p className="font-semibold text-buy-muted-foreground">{fileName}</p>
                                                <p className="text-xs text-muted-foreground mt-1">File uploaded successfully ✓</p>
                                            </div>
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-protocall-blue hover:text-protocall-premium-light">
                                                <span className="text-sm">Change file</span>
                                                <input
                                                    id="file-upload"
                                                    name="file-upload"
                                                    type="file"
                                                    className="sr-only"
                                                    onChange={handleFileChange}
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                />
                                            </label>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                                            <div className="flex text-sm text-subtle">
                                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-protocall-blue hover:text-protocall-premium-light focus-within:outline-none">
                                                    <span>Upload a file</span>
                                                    <input
                                                        id="file-upload"
                                                        name="file-upload"
                                                        type="file"
                                                        className="sr-only"
                                                        onChange={handleFileChange}
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                    />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting Application...
                                </>
                            ) : (
                                'Submit Application'
                            )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            By submitting this application, you agree to our terms and confirm that all information provided is accurate.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}