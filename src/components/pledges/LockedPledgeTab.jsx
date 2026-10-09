
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, HelpCircle, FileText, Shield, AlertTriangle, CheckCircle, Zap, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function LockedPledgeTab({ onOpenModal, accessRequest }) {
  const [showFAQ, setShowFAQ] = useState(false);

  const faqs = [
    {
      question: "What is the Pledge Feature?",
      answer: "The Pledge feature allows you to commit to buying or selling stocks through your existing demat account, with professional execution by our platform. You maintain full control of your demat account while benefiting from coordinated market actions."
    },
    {
      question: "How does execution work?",
      answer: "When you submit a pledge, our system executes the trade directly in your linked demat account via secure broker APIs. You see real-time updates and complete execution records in your portfolio."
    },
    {
      question: "What are the fees?",
      answer: "A small convenience fee is charged when you submit a pledge (typically ₹10-50). Additional broker charges apply as per your demat account's standard rates. Platform commission may apply on successful executions."
    },
    {
      question: "Is my demat account safe?",
      answer: "Absolutely. We use read-only API access with encrypted tokens. You maintain full ownership and control. We can only execute pre-approved pledges - never unauthorized trades."
    },
    {
      question: "Can I cancel a pledge?",
      answer: "Yes, pledges can be cancelled before the execution window. Convenience fees for cancelled pledges may be refunded based on the session terms."
    },
    {
      question: "What are the risks?",
      answer: "Market risks apply as with any trading. Pledge execution depends on market conditions. Always read the terms and ensure you understand the stock and market dynamics before pledging."
    }
  ];

  const benefits = [
    { icon: Shield, title: "Secure Execution", desc: "Direct execution in your own demat account" },
    { icon: Zap, title: "Professional Timing", desc: "Coordinated executions for better market impact" },
    { icon: CheckCircle, title: "Full Transparency", desc: "Complete audit trail and execution records" },
    { icon: FileText, title: "Detailed Reporting", desc: "P&L tracking, commission breakdown, CSV exports" }
  ];
  
  const getBannerContent = () => {
    if (accessRequest?.status === 'pending') {
      return {
        icon: Clock,
        iconColor: 'text-primary',
        bgColor: 'from-surface-2 to-surface-2',
        borderColor: 'border-protocall-premium-light',
        title: 'Your Application is Under Review',
        description: 'We are verifying your details and will notify you upon approval.',
        badgeText: 'Status: Pending',
        badgeColor: 'bg-primary text-white',
      };
    }
    if (accessRequest?.status === 'rejected') {
      return {
        icon: AlertTriangle,
        iconColor: 'text-sell-muted-foreground',
        bgColor: 'from-surface-2 to-hold-muted',
        borderColor: 'border-sell/30',
        title: 'Access Request Rejected',
        description: 'Please review the details and resubmit your application.',
        badgeText: 'Action Required',
        badgeColor: 'bg-protocall-sell-text text-white',
      };
    }
    // Default state
    return {
      icon: Lock,
      iconColor: 'text-protocall-premium-text',
      bgColor: 'from-surface-2 to-surface-2',
      borderColor: 'border-protocall-premium-light',
      title: 'Pledge Portfolio',
      description: 'Professional trading execution through your demat account',
      badgeText: 'Activation Required',
      badgeColor: 'bg-protocall-sell-text text-white',
    };
  };

  const banner = getBannerContent();

  return (
    <>
      {accessRequest?.status === 'pending' && (
        <style>{`
          @keyframes indeterminate-progress {
            0% { left: -35%; right: 100%; }
            60% { left: 100%; right: -90%; }
            100% { left: 100%; right: -90%; }
          }
          .indeterminate-bar {
            animation: indeterminate-progress 2s linear infinite;
          }
        `}</style>
      )}
      <div className="space-y-6">
        {/* Header Banner */}
        <Card className={`bg-gradient-to-r ${banner.bgColor} border ${banner.borderColor} rounded-2xl shadow-lg`}>
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className={`p-4 bg-white rounded-full shadow-inner`}>
                  <banner.icon className={`w-10 h-10 ${banner.iconColor}`} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-foreground">{banner.title}</h2>
                  <p className="text-subtle mt-2 text-lg">{banner.description}</p>
                   {accessRequest?.status === 'pending' && (
                    <div className="mt-4 max-w-md">
                      <div className="relative w-full bg-primary rounded-full h-2 overflow-hidden">
                        <div className="absolute top-0 bottom-0 bg-primary rounded-full indeterminate-bar w-1/4"></div>
                      </div>
                      <p className="text-xs text-primary mt-1.5 font-medium">Verification in progress... (Typically 24-48 hours)</p>
                    </div>
                  )}
                </div>
              </div>
              <Badge className={`${banner.badgeColor} px-4 py-2 text-sm font-semibold uppercase tracking-wide`}>
                {banner.badgeText}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="text-center border-2 border-border hover:border-protocall-premium-light hover:shadow-lg transition-all duration-300 opacity-75 rounded-2xl">
              <CardContent className="p-6">
                <benefit.icon className="w-10 h-10 text-protocall-premium-text mx-auto mb-4" />
                <h3 className="font-bold text-foreground mb-2 text-lg">{benefit.title}</h3>
                <p className="text-sm text-subtle">{benefit.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Info Card */}
        <Card className="border-2 border-hold/30 bg-gradient-to-r from-surface-2 to-hold-muted rounded-2xl shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              <AlertTriangle className="w-8 h-8 text-hold-muted-foreground mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-hold-muted-foreground mb-3 text-xl">Pledge Feature Access Required</h3>
                <p className="text-hold-muted-foreground mb-6 text-lg leading-relaxed">
                  {accessRequest?.status === 'pending'
                    ? "Your request is being reviewed by our team. This usually takes 24-48 hours. You will be notified upon approval and can check the status here."
                    : "The Pledge feature is available by request only. This ensures all users understand the mechanics and risks involved."
                  }
                </p>
                <div className="flex gap-4">
                  <Button 
                    onClick={onOpenModal}
                    className="bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white border-0 rounded-lg shadow-lg px-8 py-3 font-semibold transition-all duration-300"
                    size="lg"
                    disabled={accessRequest?.status === 'pending'}
                  >
                    {accessRequest?.status === 'pending' && <Clock className="w-5 h-5 mr-2" />}
                    {accessRequest?.status === 'pending' ? 'Review Application' : 'Request Access'}
                  </Button>
                  <Dialog open={showFAQ} onOpenChange={setShowFAQ}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="bg-gradient-to-r from-surface-2 to-hold-muted hover:from-hold hover:to-hold border-2 border-hold/30 text-hold-muted-foreground rounded-lg px-8 py-3 font-semibold transition-all duration-300"
                        size="lg"
                      >
                        <HelpCircle className="w-5 h-5 mr-2" />
                        Learn More
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl">
                          <FileText className="w-6 h-6" />
                          Pledge Feature Guide
                        </DialogTitle>
                        <DialogDescription className="text-lg">
                          Complete guide to understanding and using the pledge feature
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-8 mt-6">
                        {faqs.map((faq, index) => (
                          <div key={index} className="border-l-4 border-protocall-premium-light pl-6 py-4">
                            <h4 className="font-bold text-foreground mb-3 text-lg">{faq.question}</h4>
                            <p className="text-subtle leading-relaxed">{faq.answer}</p>
                          </div>
                        ))}
                        <div className="bg-sell-muted border-2 border-sell/30 rounded-lg p-6">
                          <h4 className="font-bold text-sell-muted-foreground mb-3 flex items-center gap-2 text-lg">
                            <AlertTriangle className="w-5 h-5" />
                            Important Disclaimer
                          </h4>
                          <p className="text-sell-muted-foreground leading-relaxed">
                            Trading in securities involves risks. Past performance is not indicative of future results. 
                            Please ensure you understand the risks and consult with financial advisors if needed. 
                            The platform facilitates execution but does not provide investment advice.
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Process Steps */}
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">How the Pledge Process Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center opacity-75">
                <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-protocall-premium-text font-bold text-xl">1</span>
                </div>
                <h4 className="font-bold mb-3 text-lg">Request Access</h4>
                <p className="text-sm text-subtle">Submit application and get approved by our team</p>
              </div>
              <div className="text-center opacity-75">
                <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-protocall-premium-text font-bold text-xl">2</span>
                </div>
                <h4 className="font-bold mb-3 text-lg">Link Demat Account</h4>
                <p className="text-sm text-subtle">Securely connect your existing broker account</p>
              </div>
              <div className="text-center opacity-75">
                <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-protocall-premium-text font-bold text-xl">3</span>
                </div>
                <h4 className="font-bold mb-3 text-lg">Submit Pledges</h4>
                <p className="text-sm text-subtle">Choose stocks, quantities and pay convenience fee</p>
              </div>
              <div className="text-center opacity-75">
                <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-protocall-premium-text font-bold text-xl">4</span>
                </div>
                <h4 className="font-bold mb-3 text-lg">Track Executions</h4>
                <p className="text-sm text-subtle">Monitor real-time execution and P&L in portfolio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
