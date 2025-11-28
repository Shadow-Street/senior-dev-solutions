import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Shield, Scale, AlertTriangle, FileText, Home } from 'lucide-react';
import PageFooter from '../components/footer/PageFooter';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-12">
        <div className="max-w-5xl mx-auto px-6">
          <Link to={createPageUrl('Landing')}>
            <Button variant="outline" className="mb-6 bg-white/20 border-white/30 text-white hover:bg-white/30">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <Scale className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Last Updated: January 1, 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Important Notice Banner */}
        <Card className="mb-8 border-orange-200 bg-orange-50 p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-orange-900 mb-2">Important Notice</h3>
              <p className="text-sm text-orange-800 leading-relaxed">
                Please read these Terms of Service carefully before using Protocall. By accessing or using our platform, 
                you agree to be bound by these terms. If you do not agree with any part of these terms, you must not use our services.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-8 mb-8">
          {/* Table of Contents */}
          <div className="mb-8 p-4 bg-slate-50 rounded-lg">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Table of Contents
            </h3>
            <ol className="space-y-1 text-sm text-blue-600">
              <li><a href="#acceptance" className="hover:underline">1. Acceptance of Terms</a></li>
              <li><a href="#platform" className="hover:underline">2. Platform Overview</a></li>
              <li><a href="#accounts" className="hover:underline">3. User Accounts and Registration</a></li>
              <li><a href="#subscription" className="hover:underline">4. Subscription and Payment Terms</a></li>
              <li><a href="#conduct" className="hover:underline">5. User Conduct and Responsibilities</a></li>
              <li><a href="#investment" className="hover:underline">6. Investment and Trading Disclaimers</a></li>
              <li><a href="#sebi" className="hover:underline">7. SEBI Compliance and Regulatory Information</a></li>
              <li><a href="#advisors" className="hover:underline">8. SEBI Registered Advisors</a></li>
              <li><a href="#pledge" className="hover:underline">9. Pledge Pool Feature</a></li>
              <li><a href="#ip" className="hover:underline">10. Intellectual Property</a></li>
              <li><a href="#liability" className="hover:underline">11. Limitation of Liability</a></li>
              <li><a href="#privacy" className="hover:underline">12. Privacy and Data Protection</a></li>
              <li><a href="#termination" className="hover:underline">13. Termination</a></li>
              <li><a href="#disputes" className="hover:underline">14. Dispute Resolution</a></li>
              <li><a href="#changes" className="hover:underline">15. Changes to Terms</a></li>
              <li><a href="#contact" className="hover:underline">16. Contact Information</a></li>
            </ol>
          </div>

          {/* Section 1 */}
          <section id="acceptance" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              1. Acceptance of Terms
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                Welcome to Protocall ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use 
                of the Protocall platform, website, mobile applications, and all related services (collectively, the "Platform").
              </p>
              <p>
                By creating an account, accessing, or using any part of our Platform, you acknowledge that you have read, 
                understood, and agree to be bound by these Terms, along with our Privacy Policy, Risk Disclosure Statement, 
                and any other policies referenced herein.
              </p>
              <p className="font-semibold text-slate-900">
                If you do not agree to these Terms, you must immediately discontinue use of the Platform.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="platform" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              2. Platform Overview
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                Protocall is India's largest retail investor community platform that provides:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Community Features:</strong> Chat rooms, discussion forums, and social networking for traders</li>
                <li><strong>Market Insights:</strong> Community polls, sentiment analysis, and collective wisdom</li>
                <li><strong>Professional Services:</strong> Access to SEBI-registered investment advisors and financial influencers</li>
                <li><strong>Educational Content:</strong> Webinars, workshops, courses, and market analysis</li>
                <li><strong>Trading Features:</strong> Pledge Pool for coordinated trading, portfolio tracking, and alerts</li>
                <li><strong>Events:</strong> Virtual and physical networking events, seminars, and expert sessions</li>
              </ul>
              <p className="font-semibold">
                Protocall is a technology platform and community service. We do not provide investment advice, 
                execute trades, or manage your investments directly.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section id="accounts" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              3. User Accounts and Registration
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">3.1 Eligibility</h3>
              <p>
                You must be at least 18 years old and have the legal capacity to enter into contracts under Indian law 
                to use our Platform. By registering, you represent and warrant that you meet these requirements.
              </p>
              
              <h3 className="font-bold text-lg mt-4">3.2 Account Registration</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must provide accurate, current, and complete information during registration</li>
                <li>You must maintain and promptly update your account information</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You must immediately notify us of any unauthorized use of your account</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">3.3 Account Types</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Trader/Investor:</strong> Individual retail investors and traders</li>
                <li><strong>SEBI Registered Advisor:</strong> Verified investment advisors with valid SEBI registration</li>
                <li><strong>Finfluencer:</strong> Verified financial content creators and educators</li>
                <li><strong>Event Organizer:</strong> Approved organizers for webinars and workshops</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">3.4 One Account Per User</h3>
              <p>
                You may only create one account. Creating multiple accounts may result in suspension or termination 
                of all your accounts without refund.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section id="subscription" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              4. Subscription and Payment Terms
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">4.1 Subscription Plans</h3>
              <p>Protocall offers the following subscription tiers:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Basic (Free):</strong> Access to basic community features</li>
                <li><strong>Premium:</strong> Enhanced features including Pledge Pool, advisor picks, and premium content</li>
                <li><strong>VIP:</strong> All Premium features plus priority support, exclusive events, and advanced analytics</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">4.2 Billing and Payments</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Subscription fees are billed monthly or annually based on your chosen plan</li>
                <li>All payments are processed through secure payment gateways (Razorpay)</li>
                <li>Prices are displayed in Indian Rupees (INR) and include applicable taxes</li>
                <li>Payment is due immediately upon subscription or renewal</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">4.3 Auto-Renewal</h3>
              <p>
                Subscriptions automatically renew at the end of each billing period unless you cancel before the renewal date. 
                You will be charged the then-current subscription fee unless you cancel.
              </p>

              <h3 className="font-bold text-lg mt-4">4.4 Cancellation and Refunds</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>You may cancel your subscription at any time from your Profile settings</li>
                <li>Cancellation takes effect at the end of your current billing period</li>
                <li>You will retain access to paid features until the end of your billing period</li>
                <li>Refunds are generally not provided for partial billing periods, except as required by law</li>
                <li>Refund requests must be submitted within 7 days of purchase for consideration</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">4.5 Price Changes</h3>
              <p>
                We reserve the right to modify subscription pricing at any time. Price changes will not affect your 
                current subscription period but will apply to subsequent renewals. We will notify you of price changes 
                at least 30 days in advance.
              </p>

              <h3 className="font-bold text-lg mt-4">4.6 Promotional Codes</h3>
              <p>
                Promotional codes and discounts are subject to specific terms and conditions. They cannot be combined 
                with other offers unless explicitly stated. We reserve the right to modify or cancel promotional offers at any time.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section id="conduct" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              5. User Conduct and Responsibilities
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">5.1 Acceptable Use</h3>
              <p>You agree to use the Platform only for lawful purposes and in accordance with these Terms. You agree NOT to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate any applicable laws, regulations, or third-party rights</li>
                <li>Post false, misleading, or fraudulent information</li>
                <li>Manipulate or artificially influence poll results or community sentiment</li>
                <li>Engage in market manipulation, pump-and-dump schemes, or insider trading</li>
                <li>Share investment tips that violate SEBI regulations</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Share spam, advertising, or promotional content without authorization</li>
                <li>Impersonate any person or entity</li>
                <li>Attempt to gain unauthorized access to the Platform or other users' accounts</li>
                <li>Use automated systems (bots) without our written permission</li>
                <li>Share your account credentials with others</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">5.2 Content Standards</h3>
              <p>All user-generated content must:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Be respectful and professional</li>
                <li>Not contain hate speech, profanity, or offensive material</li>
                <li>Not infringe on intellectual property rights</li>
                <li>Comply with SEBI guidelines for investment advice and recommendations</li>
                <li>Include appropriate risk disclaimers when discussing investments</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">5.3 Community Guidelines</h3>
              <p>
                We maintain detailed Community Guidelines that supplement these Terms. Violation of Community Guidelines 
                may result in content removal, account restrictions, or permanent ban.
              </p>

              <h3 className="font-bold text-lg mt-4">5.4 Reporting Violations</h3>
              <p>
                If you encounter content or behavior that violates these Terms, please report it immediately using our 
                reporting tools or by contacting support@protocall.in.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section id="investment" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              6. Investment and Trading Disclaimers
            </h2>
            <div className="space-y-4 text-slate-700">
              <Card className="bg-red-50 border-red-200 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-900 mb-2">CRITICAL INVESTMENT RISK DISCLOSURE</p>
                    <p className="text-sm text-red-800">
                      This section contains legally required disclosures about investment risks. 
                      Please read carefully before using any trading or investment features.
                    </p>
                  </div>
                </div>
              </Card>

              <h3 className="font-bold text-lg mt-4">6.1 No Investment Advice</h3>
              <p>
                <strong>Protocall does not provide investment advice, recommendations, or personalized financial guidance.</strong> 
                The Platform is a technology service that facilitates community discussions and connects users with licensed advisors. 
                Any information, opinions, or analysis shared on the Platform:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Is for informational and educational purposes only</li>
                <li>Should not be considered as investment advice or recommendations</li>
                <li>May not be suitable for your individual financial situation</li>
                <li>Has not been verified for accuracy or completeness by Protocall</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">6.2 Market Risks</h3>
              <p className="font-semibold">
                Trading and investing in securities involves substantial risk of loss. You acknowledge that:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Past performance is not indicative of future results</li>
                <li>Stock prices can go down as well as up</li>
                <li>You may lose some or all of your invested capital</li>
                <li>Market conditions can change rapidly and unpredictably</li>
                <li>Leverage and derivatives carry additional risks</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">6.3 Your Responsibility</h3>
              <p>
                You are solely responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Evaluating the suitability of any investment for your circumstances</li>
                <li>Conducting your own due diligence and research</li>
                <li>Consulting with licensed financial advisors before making investment decisions</li>
                <li>Understanding the risks associated with your investments</li>
                <li>Complying with all applicable tax and regulatory requirements</li>
                <li>Any losses incurred from your investment decisions</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">6.4 Community Content Disclaimer</h3>
              <p>
                Content shared by community members, including in chat rooms, polls, and discussions:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Represents the personal opinions of individual users</li>
                <li>Has not been verified or endorsed by Protocall</li>
                <li>May contain errors, inaccuracies, or outdated information</li>
                <li>Should not be relied upon for investment decisions</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">6.5 No Guaranteed Returns</h3>
              <p>
                We do not guarantee any specific returns, profits, or outcomes from using our Platform or following 
                any recommendations, strategies, or analysis shared on the Platform.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section id="sebi" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              7. SEBI Compliance and Regulatory Information
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">7.1 Platform Registration</h3>
              <p>
                Protocall operates as a technology platform under the applicable regulations of the Securities and 
                Exchange Board of India (SEBI) and other regulatory authorities.
              </p>

              <h3 className="font-bold text-lg mt-4">7.2 Compliance with SEBI Regulations</h3>
              <p>
                All investment advisors on our Platform must maintain valid SEBI registration. We verify advisor 
                credentials, but you should independently verify an advisor's registration status before engaging their services.
              </p>

              <h3 className="font-bold text-lg mt-4">7.3 User Obligations</h3>
              <p>You must comply with all applicable SEBI regulations, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>SEBI (Prohibition of Insider Trading) Regulations</li>
                <li>SEBI (Prohibition of Fraudulent and Unfair Trade Practices) Regulations</li>
                <li>Any other applicable securities laws and regulations</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">7.4 KYC Requirements</h3>
              <p>
                Certain features (such as Pledge Pool) may require completion of Know Your Customer (KYC) procedures 
                in accordance with applicable regulations.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section id="advisors" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              8. SEBI Registered Advisors
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">8.1 Advisor Services</h3>
              <p>
                SEBI-registered advisors on our Platform provide independent advisory services. The relationship is 
                directly between you and the advisor. Protocall facilitates this connection but is not party to the advisory relationship.
              </p>

              <h3 className="font-bold text-lg mt-4">8.2 Advisor Verification</h3>
              <p>
                We verify SEBI registration at the time of onboarding, but advisors are responsible for maintaining 
                valid registration and complying with all SEBI requirements.
              </p>

              <h3 className="font-bold text-lg mt-4">8.3 Advisory Fees</h3>
              <p>
                Fees for advisor services are set by individual advisors. Platform commission rates are disclosed 
                in the Platform Settings and may vary by advisor tier.
              </p>

              <h3 className="font-bold text-lg mt-4">8.4 No Liability for Advisor Services</h3>
              <p>
                Protocall is not responsible for the quality, accuracy, or outcomes of advisory services provided 
                by registered advisors. Any disputes should be resolved directly with the advisor.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section id="pledge" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              9. Pledge Pool Feature
            </h2>
            <div className="space-y-4 text-slate-700">
              <Card className="bg-orange-50 border-orange-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-orange-900 mb-2">HIGH-RISK FEATURE</p>
                    <p className="text-sm text-orange-800">
                      Pledge Pool involves coordinated trading and carries significant risks. 
                      Only use this feature if you fully understand the risks involved.
                    </p>
                  </div>
                </div>
              </Card>

              <h3 className="font-bold text-lg mt-4">9.1 Feature Description</h3>
              <p>
                Pledge Pool allows users to coordinate their trading intentions with the community. This is a premium 
                feature available to verified subscribers only.
              </p>

              <h3 className="font-bold text-lg mt-4">9.2 Eligibility and Access</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Must have an active Premium or VIP subscription</li>
                <li>Must complete KYC verification</li>
                <li>Must link a verified demat account</li>
                <li>Must accept additional risk disclosures</li>
                <li>Must be 18+ years of age with legal capacity to trade</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">9.3 How Pledge Pool Works</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Admin creates pledge sessions for specific stocks</li>
                <li>Users pledge their trading intentions (buy/sell) and quantities</li>
                <li>Pledges are executed based on session rules (immediate, at session end, or manual)</li>
                <li>Convenience fees apply per pledge execution</li>
                <li>Platform earns commission on executed trades</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">9.4 Risks and Disclaimers</h3>
              <p className="font-semibold">You acknowledge and accept that:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Pledge Pool does not guarantee execution at desired prices</li>
                <li>Market conditions may change between pledging and execution</li>
                <li>Coordinated trading carries higher risks than individual trading</li>
                <li>You may incur losses on executed trades</li>
                <li>Platform does not provide investment advice through Pledge Pool</li>
                <li>All trading decisions are your sole responsibility</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">9.5 Fees and Charges</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Convenience fees are charged per pledge session</li>
                <li>Fees are non-refundable once pledges are executed</li>
                <li>Broker charges and taxes apply separately</li>
                <li>Fee structure is subject to change with 30 days notice</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">9.6 Cancellation</h3>
              <p>
                You may cancel a pledge before execution begins. Once execution starts, pledges cannot be cancelled. 
                Refunds are provided only for cancelled pledges before execution.
              </p>

              <h3 className="font-bold text-lg mt-4">9.7 No Guaranteed Execution</h3>
              <p>
                We do not guarantee execution of pledges. Execution depends on market conditions, liquidity, 
                and other factors beyond our control.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section id="ip" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              10. Intellectual Property
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">10.1 Platform Ownership</h3>
              <p>
                The Platform, including all content, features, functionality, software, code, design, trademarks, 
                and logos, is owned by Protocall and is protected by copyright, trademark, and other intellectual property laws.
              </p>

              <h3 className="font-bold text-lg mt-4">10.2 Limited License</h3>
              <p>
                We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the 
                Platform for your personal, non-commercial use, subject to these Terms.
              </p>

              <h3 className="font-bold text-lg mt-4">10.3 User Content</h3>
              <p>
                By posting content on the Platform, you grant Protocall a worldwide, non-exclusive, royalty-free, 
                sublicensable license to use, reproduce, modify, and display your content for operating and promoting the Platform.
              </p>

              <h3 className="font-bold text-lg mt-4">10.4 Restrictions</h3>
              <p>You may not:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Copy, modify, or distribute Platform content without authorization</li>
                <li>Reverse engineer or attempt to extract source code</li>
                <li>Remove copyright or proprietary notices</li>
                <li>Use our trademarks without written permission</li>
              </ul>
            </div>
          </section>

          {/* Section 11 */}
          <section id="liability" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              11. Limitation of Liability
            </h2>
            <div className="space-y-4 text-slate-700">
              <Card className="bg-red-50 border-red-200 p-4">
                <p className="font-bold text-red-900 mb-2">IMPORTANT LEGAL NOTICE</p>
                <p className="text-sm text-red-800">
                  This section limits our liability. Please read carefully as it affects your legal rights.
                </p>
              </Card>

              <h3 className="font-bold text-lg mt-4">11.1 No Warranties</h3>
              <p>
                THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, 
                INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
                OR NON-INFRINGEMENT.
              </p>

              <h3 className="font-bold text-lg mt-4">11.2 Limitation of Liability</h3>
              <p className="font-semibold uppercase">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROTOCALL SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Any trading or investment losses</li>
                <li>Loss of profits, revenue, or business opportunities</li>
                <li>Indirect, incidental, consequential, or punitive damages</li>
                <li>Errors or inaccuracies in content or data</li>
                <li>Unauthorized access to your account or data</li>
                <li>Service interruptions or technical issues</li>
                <li>Actions or omissions of third-party advisors or users</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">11.3 Maximum Liability</h3>
              <p>
                Our total liability to you for all claims arising from your use of the Platform shall not exceed 
                the amount you paid to Protocall in subscription fees during the 12 months preceding the claim.
              </p>

              <h3 className="font-bold text-lg mt-4">11.4 Third-Party Services</h3>
              <p>
                We are not responsible for the services, content, or actions of third-party advisors, brokers, 
                payment processors, or other service providers accessible through the Platform.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section id="privacy" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              12. Privacy and Data Protection
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                Your privacy is important to us. Our collection, use, and disclosure of your personal information 
                is governed by our Privacy Policy, which is incorporated into these Terms by reference.
              </p>
              <p>
                By using the Platform, you consent to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Collection and processing of your data as described in our Privacy Policy</li>
                <li>Use of cookies and similar technologies</li>
                <li>Storage and processing of data on servers located in India and abroad</li>
                <li>Sharing of data with service providers and regulatory authorities as required</li>
              </ul>
              <p>
                We implement industry-standard security measures, but cannot guarantee absolute security. 
                You are responsible for maintaining the confidentiality of your account credentials.
              </p>
            </div>
          </section>

          {/* Section 13 */}
          <section id="termination" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              13. Termination
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">13.1 Termination by You</h3>
              <p>
                You may terminate your account at any time by contacting support@protocall.in or using the 
                account deletion feature in your Profile settings.
              </p>

              <h3 className="font-bold text-lg mt-4">13.2 Termination by Us</h3>
              <p>We may suspend or terminate your account immediately, without prior notice, if you:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate these Terms or our policies</li>
                <li>Engage in fraudulent or illegal activities</li>
                <li>Pose a security risk to the Platform or other users</li>
                <li>Fail to pay subscription fees</li>
                <li>Request account deletion</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">13.3 Effect of Termination</h3>
              <p>Upon termination:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your access to the Platform will be revoked</li>
                <li>Your subscription will be cancelled without refund (unless required by law)</li>
                <li>Your content may be deleted or retained as required by law</li>
                <li>Provisions that should survive termination will remain in effect</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">13.4 Survival</h3>
              <p>
                Sections relating to intellectual property, disclaimers, limitation of liability, indemnification, 
                and dispute resolution shall survive termination.
              </p>
            </div>
          </section>

          {/* Section 14 */}
          <section id="disputes" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              14. Dispute Resolution
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">14.1 Governing Law</h3>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India, 
                without regard to conflict of law principles.
              </p>

              <h3 className="font-bold text-lg mt-4">14.2 Jurisdiction</h3>
              <p>
                You agree that any disputes arising from these Terms or your use of the Platform shall be subject 
                to the exclusive jurisdiction of the courts in Bangalore, Karnataka, India.
              </p>

              <h3 className="font-bold text-lg mt-4">14.3 Informal Resolution</h3>
              <p>
                Before initiating legal proceedings, you agree to first contact us at support@protocall.in to 
                attempt to resolve the dispute informally.
              </p>

              <h3 className="font-bold text-lg mt-4">14.4 Arbitration</h3>
              <p>
                If informal resolution fails, disputes shall be resolved through binding arbitration in Bangalore, 
                India, in accordance with the Arbitration and Conciliation Act, 1996.
              </p>

              <h3 className="font-bold text-lg mt-4">14.5 Class Action Waiver</h3>
              <p>
                You agree to resolve disputes individually and waive your right to participate in class actions 
                or representative proceedings.
              </p>
            </div>
          </section>

          {/* Section 15 */}
          <section id="changes" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              15. Changes to Terms
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of material changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Posting the updated Terms on the Platform</li>
                <li>Updating the "Last Updated" date at the top of this document</li>
                <li>Sending an email notification to your registered email address</li>
                <li>Displaying a prominent notice on the Platform</li>
              </ul>
              <p>
                Your continued use of the Platform after changes become effective constitutes acceptance of the modified Terms. 
                If you do not agree to the changes, you must stop using the Platform and cancel your subscription.
              </p>
              <p className="font-semibold">
                Material changes will take effect 30 days after notification, unless otherwise specified or required by law.
              </p>
            </div>
          </section>

          {/* Section 16 */}
          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              16. Contact Information
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                If you have any questions, concerns, or complaints about these Terms or the Platform, please contact us:
              </p>
              <Card className="bg-blue-50 p-6 mt-4">
                <h4 className="font-bold mb-3 text-lg">Protocall Support</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> support@protocall.in</p>
                  <p><strong>Phone:</strong> +91-80-4567-8900 (24/7 Support)</p>
                  <p><strong>Address:</strong> Bangalore, Karnataka, India</p>
                  <p><strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM IST</p>
                </div>
              </Card>
              <p className="text-sm text-slate-600 mt-4">
                For legal notices and formal communications, please send correspondence to the address above, 
                marked "Attention: Legal Department."
              </p>
            </div>
          </section>

          {/* Miscellaneous */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              17. Miscellaneous Provisions
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">17.1 Entire Agreement</h3>
              <p>
                These Terms, along with our Privacy Policy and other referenced policies, constitute the entire 
                agreement between you and Protocall regarding use of the Platform.
              </p>

              <h3 className="font-bold text-lg mt-4">17.2 Severability</h3>
              <p>
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions 
                shall remain in full force and effect.
              </p>

              <h3 className="font-bold text-lg mt-4">17.3 Waiver</h3>
              <p>
                Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such 
                right or provision.
              </p>

              <h3 className="font-bold text-lg mt-4">17.4 Assignment</h3>
              <p>
                You may not assign or transfer these Terms without our written consent. We may assign our rights 
                and obligations without restriction.
              </p>

              <h3 className="font-bold text-lg mt-4">17.5 Force Majeure</h3>
              <p>
                We shall not be liable for any failure to perform due to causes beyond our reasonable control, 
                including natural disasters, war, terrorism, riots, or government actions.
              </p>

              <h3 className="font-bold text-lg mt-4">17.6 Language</h3>
              <p>
                These Terms are written in English. Any translations provided are for convenience only. 
                In case of conflicts, the English version prevails.
              </p>
            </div>
          </section>

          {/* Acknowledgment */}
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 mt-8">
            <h3 className="font-bold text-xl mb-3">Acknowledgment</h3>
            <p className="mb-4">
              BY USING PROTOCALL, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE 
              TERMS OF SERVICE. YOU ALSO ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD OUR PRIVACY POLICY AND 
              RISK DISCLOSURE STATEMENT.
            </p>
            <p className="text-sm text-blue-100">
              If you do not agree to these Terms, you must not access or use the Platform.
            </p>
          </Card>
        </Card>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Link to={createPageUrl('Privacy')}>
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer h-full">
              <Shield className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-bold mb-2">Privacy Policy</h3>
              <p className="text-sm text-slate-600">Learn how we protect your data</p>
            </Card>
          </Link>
          <Link to={createPageUrl('RiskDisclosure')}>
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer h-full">
              <AlertTriangle className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="font-bold mb-2">Risk Disclosure</h3>
              <p className="text-sm text-slate-600">Understand investment risks</p>
            </Card>
          </Link>
          <Link to={createPageUrl('Feedback')}>
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer h-full">
              <FileText className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-bold mb-2">Contact Support</h3>
              <p className="text-sm text-slate-600">Get help with any questions</p>
            </Card>
          </Link>
        </div>
      </div>

      <PageFooter />
    </div>
  );
}