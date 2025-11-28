import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Shield, Lock, Eye, FileText, Home, Database, Globe, UserCheck } from 'lucide-react';
import PageFooter from '../components/footer/PageFooter';

export default function Privacy() {
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
            <Lock className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Last Updated: January 1, 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Privacy Commitment Banner */}
        <Card className="mb-8 border-green-200 bg-green-50 p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-green-900 mb-2">Your Privacy is Our Priority</h3>
              <p className="text-sm text-green-800 leading-relaxed">
                At Protocall, we are committed to protecting your personal information and your right to privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
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
              <li><a href="#introduction" className="hover:underline">1. Introduction</a></li>
              <li><a href="#information-collected" className="hover:underline">2. Information We Collect</a></li>
              <li><a href="#how-we-use" className="hover:underline">3. How We Use Your Information</a></li>
              <li><a href="#sharing" className="hover:underline">4. Sharing and Disclosure of Information</a></li>
              <li><a href="#data-security" className="hover:underline">5. Data Security</a></li>
              <li><a href="#data-retention" className="hover:underline">6. Data Retention</a></li>
              <li><a href="#your-rights" className="hover:underline">7. Your Privacy Rights</a></li>
              <li><a href="#cookies" className="hover:underline">8. Cookies and Tracking Technologies</a></li>
              <li><a href="#third-party" className="hover:underline">9. Third-Party Services</a></li>
              <li><a href="#international" className="hover:underline">10. International Data Transfers</a></li>
              <li><a href="#children" className="hover:underline">11. Children's Privacy</a></li>
              <li><a href="#india-laws" className="hover:underline">12. Compliance with Indian Laws</a></li>
              <li><a href="#financial-data" className="hover:underline">13. Financial and Trading Data</a></li>
              <li><a href="#changes" className="hover:underline">14. Changes to This Privacy Policy</a></li>
              <li><a href="#contact" className="hover:underline">15. Contact Us</a></li>
            </ol>
          </div>

          {/* Section 1 */}
          <section id="introduction" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              1. Introduction
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                Welcome to Protocall's Privacy Policy. This policy describes how Protocall ("we," "us," or "our") 
                collects, uses, and shares your personal information when you use our website, mobile applications, 
                and services (collectively, the "Platform").
              </p>
              <p>
                By accessing or using the Platform, you acknowledge that you have read and understood this Privacy Policy 
                and consent to the collection, use, and disclosure of your personal information as described herein.
              </p>
              <p className="font-semibold text-slate-900">
                If you do not agree with our policies and practices, please do not use our Platform.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="information-collected" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              2. Information We Collect
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>We collect several types of information from and about users of our Platform:</p>

              <h3 className="font-bold text-lg mt-4">2.1 Information You Provide to Us</h3>
              <p><strong>Account Registration Information:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Full name and display name</li>
                <li>Email address</li>
                <li>Mobile phone number</li>
                <li>Password (encrypted)</li>
                <li>Profile picture (optional)</li>
                <li>Trading experience level</li>
                <li>Preferred investment sectors</li>
              </ul>

              <p className="mt-4"><strong>Financial Information:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Payment card details (processed securely via payment gateways)</li>
                <li>Bank account information (for payouts and withdrawals)</li>
                <li>Demat account details (for Pledge Pool feature)</li>
                <li>Investment portfolio data you choose to track</li>
                <li>Transaction history</li>
              </ul>

              <p className="mt-4"><strong>KYC and Verification Documents:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>PAN card number and document</li>
                <li>Aadhaar card details (as required by law)</li>
                <li>Bank statements or proof of address</li>
                <li>SEBI registration documents (for advisors)</li>
              </ul>

              <p className="mt-4"><strong>User-Generated Content:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Messages in chat rooms and forums</li>
                <li>Comments, posts, and recommendations</li>
                <li>Poll votes and community feedback</li>
                <li>Reviews and ratings</li>
                <li>Support inquiries and correspondence</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">2.2 Information Collected Automatically</h3>
              <p><strong>Usage Data:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Pages visited, features used, and time spent on the Platform</li>
                <li>Links clicked and actions taken</li>
                <li>Search queries and filters applied</li>
                <li>Device information (type, operating system, browser)</li>
              </ul>

              <p className="mt-4"><strong>Technical Data:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>IP address and location data</li>
                <li>Browser type and version</li>
                <li>Device identifiers and characteristics</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Log files and analytics data</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">2.3 Information from Third Parties</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Social media profile information (if you connect social accounts)</li>
                <li>Payment gateway transaction data</li>
                <li>Market data providers and stock exchanges</li>
                <li>Credit bureaus or financial verification services</li>
                <li>Government databases for KYC verification</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section id="how-we-use" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              3. How We Use Your Information
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>We use the information we collect for the following purposes:</p>

              <h3 className="font-bold text-lg mt-4">3.1 To Provide and Maintain Our Services</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Create and manage your account</li>
                <li>Process transactions and payments</li>
                <li>Execute pledge pool orders and trading activities</li>
                <li>Provide access to chat rooms, polls, and community features</li>
                <li>Deliver personalized content and recommendations</li>
                <li>Track your portfolio and send alerts</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">3.2 To Communicate With You</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Send transactional emails (confirmations, receipts, notifications)</li>
                <li>Respond to your inquiries and support requests</li>
                <li>Send important updates about the Platform</li>
                <li>Notify you about new features, events, and promotions</li>
                <li>Send educational content and market insights</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">3.3 To Ensure Security and Compliance</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Verify your identity and prevent fraud</li>
                <li>Comply with KYC and AML regulations</li>
                <li>Detect and prevent prohibited or illegal activities</li>
                <li>Monitor for security threats and vulnerabilities</li>
                <li>Enforce our Terms of Service and policies</li>
                <li>Comply with legal obligations and regulatory requirements</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">3.4 To Improve Our Platform</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Analyze usage patterns and user behavior</li>
                <li>Conduct research and develop new features</li>
                <li>Test and optimize Platform performance</li>
                <li>Personalize your experience</li>
                <li>Generate analytics and reports</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">3.5 For Marketing and Advertising</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Send promotional communications (with your consent)</li>
                <li>Display relevant advertisements</li>
                <li>Conduct surveys and gather feedback</li>
                <li>Run referral programs and campaigns</li>
              </ul>
              <p className="text-sm italic">You can opt out of marketing communications at any time.</p>
            </div>
          </section>

          {/* Section 4 */}
          <section id="sharing" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              4. Sharing and Disclosure of Information
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>We may share your information in the following circumstances:</p>

              <h3 className="font-bold text-lg mt-4">4.1 Service Providers</h3>
              <p>We share information with third-party service providers who perform services on our behalf:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Payment processors:</strong> Razorpay, Stripe (for payment processing)</li>
                <li><strong>Cloud hosting:</strong> AWS, Google Cloud (for data storage and hosting)</li>
                <li><strong>Email services:</strong> SendGrid, AWS SES (for transactional emails)</li>
                <li><strong>Analytics providers:</strong> Google Analytics (for usage analytics)</li>
                <li><strong>Customer support:</strong> Help desk software providers</li>
                <li><strong>SMS providers:</strong> For OTP and notifications</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">4.2 Business Partners</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>SEBI Registered Advisors:</strong> When you subscribe to advisor services</li>
                <li><strong>Brokers:</strong> For executing trades through Pledge Pool</li>
                <li><strong>Market data providers:</strong> For real-time stock information</li>
                <li><strong>Event organizers:</strong> When you register for events</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">4.3 Legal and Regulatory Requirements</h3>
              <p>We may disclose your information if required by law or to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Comply with legal processes (subpoenas, court orders)</li>
                <li>Respond to government or regulatory requests</li>
                <li>Enforce our Terms of Service</li>
                <li>Protect our rights, property, or safety</li>
                <li>Prevent fraud or illegal activities</li>
                <li>Comply with SEBI, RBI, and other regulatory bodies</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">4.4 Business Transfers</h3>
              <p>
                If Protocall is involved in a merger, acquisition, or sale of assets, your information may be 
                transferred as part of that transaction. We will provide notice before your information becomes 
                subject to a different privacy policy.
              </p>

              <h3 className="font-bold text-lg mt-4">4.5 With Your Consent</h3>
              <p>
                We may share your information with third parties when you give us explicit consent to do so.
              </p>

              <h3 className="font-bold text-lg mt-4">4.6 Aggregated or De-identified Data</h3>
              <p>
                We may share aggregated or de-identified information that cannot reasonably be used to identify 
                you for research, analytics, marketing, or other purposes.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section id="data-security" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              5. Data Security
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                We implement industry-standard security measures to protect your personal information from 
                unauthorized access, disclosure, alteration, and destruction.
              </p>

              <h3 className="font-bold text-lg mt-4">5.1 Security Measures</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Encryption:</strong> We use SSL/TLS encryption for data transmission</li>
                <li><strong>Data encryption at rest:</strong> Sensitive data is encrypted in our databases</li>
                <li><strong>Secure authentication:</strong> Passwords are hashed and salted</li>
                <li><strong>Two-factor authentication:</strong> Available for enhanced account security</li>
                <li><strong>Regular security audits:</strong> We conduct periodic security assessments</li>
                <li><strong>Access controls:</strong> Strict internal policies limit data access</li>
                <li><strong>Firewall protection:</strong> Network-level security measures</li>
                <li><strong>Intrusion detection:</strong> Monitoring for suspicious activities</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">5.2 Payment Security</h3>
              <p>
                Payment information is processed through PCI-DSS compliant payment gateways (Razorpay, Stripe). 
                We do not store complete credit card numbers on our servers.
              </p>

              <h3 className="font-bold text-lg mt-4">5.3 Your Responsibility</h3>
              <p>You are responsible for:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintaining the confidentiality of your password</li>
                <li>Restricting access to your devices</li>
                <li>Logging out after using the Platform on shared devices</li>
                <li>Notifying us immediately of any unauthorized access</li>
              </ul>

              <Card className="bg-orange-50 border-orange-200 p-4 mt-4">
                <p className="text-sm text-orange-800">
                  <strong>Important:</strong> No method of transmission over the internet or electronic storage 
                  is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
                </p>
              </Card>
            </div>
          </section>

          {/* Section 6 */}
          <section id="data-retention" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              6. Data Retention
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes outlined in 
                this Privacy Policy, unless a longer retention period is required or permitted by law.
              </p>

              <h3 className="font-bold text-lg mt-4">6.1 Retention Periods</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account information:</strong> Until you request deletion or close your account</li>
                <li><strong>Transaction records:</strong> 7 years (as required by Indian tax laws)</li>
                <li><strong>KYC documents:</strong> 5 years after account closure (regulatory requirement)</li>
                <li><strong>Communication records:</strong> 3 years for support and dispute resolution</li>
                <li><strong>Usage logs:</strong> 90 days for security and analytics purposes</li>
                <li><strong>Marketing data:</strong> Until you opt out or request deletion</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">6.2 Account Deletion</h3>
              <p>
                When you delete your account, we will delete or anonymize your personal information, except where 
                we are required to retain it for legal, regulatory, or legitimate business purposes.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section id="your-rights" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              7. Your Privacy Rights
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>You have the following rights regarding your personal information:</p>

              <h3 className="font-bold text-lg mt-4">7.1 Right to Access</h3>
              <p>
                You can request a copy of the personal information we hold about you. You can access most of your 
                information directly through your account settings.
              </p>

              <h3 className="font-bold text-lg mt-4">7.2 Right to Correction</h3>
              <p>
                You can update or correct inaccurate personal information through your account settings or by 
                contacting us.
              </p>

              <h3 className="font-bold text-lg mt-4">7.3 Right to Deletion</h3>
              <p>
                You can request deletion of your personal information, subject to certain legal and regulatory 
                exceptions. To delete your account, go to Profile → Settings → Delete Account.
              </p>

              <h3 className="font-bold text-lg mt-4">7.4 Right to Object</h3>
              <p>
                You can object to certain processing of your personal information, such as direct marketing.
              </p>

              <h3 className="font-bold text-lg mt-4">7.5 Right to Data Portability</h3>
              <p>
                You can request a copy of your data in a structured, machine-readable format.
              </p>

              <h3 className="font-bold text-lg mt-4">7.6 Right to Withdraw Consent</h3>
              <p>
                Where we rely on your consent to process your information, you can withdraw consent at any time.
              </p>

              <h3 className="font-bold text-lg mt-4">7.7 How to Exercise Your Rights</h3>
              <p>To exercise any of these rights, you can:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Update your information in Profile settings</li>
                <li>Email us at privacy@protocall.in</li>
                <li>Contact our Data Protection Officer (details in Section 15)</li>
              </ul>
              <p className="text-sm italic mt-2">
                We will respond to your request within 30 days. If we need additional time, we will notify you.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section id="cookies" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              8. Cookies and Tracking Technologies
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                We use cookies and similar tracking technologies to collect information about your browsing 
                activities and to personalize your experience.
              </p>

              <h3 className="font-bold text-lg mt-4">8.1 Types of Cookies We Use</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential cookies:</strong> Required for the Platform to function properly</li>
                <li><strong>Performance cookies:</strong> Help us understand how you use the Platform</li>
                <li><strong>Functionality cookies:</strong> Remember your preferences and settings</li>
                <li><strong>Targeting cookies:</strong> Deliver relevant advertisements and content</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">8.2 Third-Party Cookies</h3>
              <p>We may allow third parties to place cookies for:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Analytics and measurement (Google Analytics)</li>
                <li>Advertising and marketing (Google Ads, Facebook Pixel)</li>
                <li>Social media integration</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">8.3 Managing Cookies</h3>
              <p>
                You can control cookies through your browser settings. However, disabling cookies may affect 
                the functionality of the Platform.
              </p>
              <p>For more information, see our <Link to={createPageUrl('Cookies')} className="text-blue-600 hover:underline">Cookies Policy</Link>.</p>
            </div>
          </section>

          {/* Section 9 */}
          <section id="third-party" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              9. Third-Party Services
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                Our Platform may contain links to third-party websites, services, or applications that are not 
                operated by us.
              </p>

              <h3 className="font-bold text-lg mt-4">9.1 Third-Party Advisors and Services</h3>
              <p>
                When you interact with SEBI-registered advisors or other service providers on our Platform, 
                their own privacy policies and terms will apply to the services they provide.
              </p>

              <h3 className="font-bold text-lg mt-4">9.2 External Links</h3>
              <p>
                We are not responsible for the privacy practices of third-party websites. We encourage you to 
                review their privacy policies before providing any information.
              </p>

              <h3 className="font-bold text-lg mt-4">9.3 Social Media Integration</h3>
              <p>
                If you connect your social media accounts to Protocall, we may collect information from those 
                platforms in accordance with your settings and their privacy policies.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section id="international" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              10. International Data Transfers
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                Your information may be transferred to and processed in countries other than your country of 
                residence, including India and other countries where our service providers operate.
              </p>
              <p>
                We ensure that appropriate safeguards are in place to protect your information when it is 
                transferred internationally, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Standard contractual clauses approved by regulatory authorities</li>
                <li>Privacy Shield certifications (where applicable)</li>
                <li>Ensuring service providers meet adequate data protection standards</li>
              </ul>
              <p>
                By using our Platform, you consent to the transfer of your information to countries that may 
                have different data protection laws than your country of residence.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section id="children" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              11. Children's Privacy
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                Our Platform is not intended for individuals under the age of 18. We do not knowingly collect 
                personal information from children under 18.
              </p>
              <p>
                If you are a parent or guardian and believe your child has provided us with personal information, 
                please contact us at privacy@protocall.in, and we will delete such information from our systems.
              </p>
              <p>
                To use our trading and investment features, you must be at least 18 years old and have the legal 
                capacity to enter into binding contracts under Indian law.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section id="india-laws" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              12. Compliance with Indian Laws
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">12.1 Information Technology Act, 2000</h3>
              <p>
                We comply with the Information Technology Act, 2000, and the Information Technology (Reasonable 
                Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
              </p>

              <h3 className="font-bold text-lg mt-4">12.2 SEBI Regulations</h3>
              <p>
                As a platform facilitating investment-related services, we comply with SEBI regulations regarding 
                the collection and use of investor information.
              </p>

              <h3 className="font-bold text-lg mt-4">12.3 Prevention of Money Laundering Act (PMLA)</h3>
              <p>
                We maintain records and conduct KYC verification as required under the Prevention of Money 
                Laundering Act, 2002, and related rules.
              </p>

              <h3 className="font-bold text-lg mt-4">12.4 Data Localization</h3>
              <p>
                Critical personal data and payment information is stored on servers located in India, in 
                compliance with RBI and data localization requirements.
              </p>

              <h3 className="font-bold text-lg mt-4">12.5 Grievance Officer</h3>
              <p>
                In accordance with the Information Technology Act and Rules, we have appointed a Grievance Officer 
                to address your concerns regarding data privacy. Contact details are provided in Section 15.
              </p>
            </div>
          </section>

          {/* Section 13 */}
          <section id="financial-data" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              13. Financial and Trading Data
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">13.1 Portfolio Data</h3>
              <p>
                Investment portfolio data you enter into our Platform is stored securely and used solely for 
                providing portfolio tracking, analysis, and alert services to you.
              </p>

              <h3 className="font-bold text-lg mt-4">13.2 Trading Activity</h3>
              <p>
                Information about your trading activity through Pledge Pool is recorded for transaction processing, 
                regulatory compliance, and dispute resolution.
              </p>

              <h3 className="font-bold text-lg mt-4">13.3 Market Data</h3>
              <p>
                Real-time market data, stock prices, and financial information displayed on the Platform are 
                sourced from third-party providers and are subject to their terms of use.
              </p>

              <h3 className="font-bold text-lg mt-4">13.4 Payment Information</h3>
              <p>
                Payment card details are processed through PCI-DSS compliant payment gateways. We do not store 
                complete card numbers on our servers. Only tokenized payment information is retained for recurring 
                payments with your consent.
              </p>

              <h3 className="font-bold text-lg mt-4">13.5 Demat Account Information</h3>
              <p>
                Demat account details provided for Pledge Pool are encrypted and stored securely. We use this 
                information solely for facilitating trade execution through authorized brokers.
              </p>
            </div>
          </section>

          {/* Section 14 */}
          <section id="changes" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              14. Changes to This Privacy Policy
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices, 
                technology, legal requirements, or other factors.
              </p>

              <h3 className="font-bold text-lg mt-4">14.1 Notice of Changes</h3>
              <p>We will notify you of material changes by:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Posting the updated Privacy Policy on this page</li>
                <li>Updating the "Last Updated" date at the top</li>
                <li>Sending an email notification to your registered email address</li>
                <li>Displaying a prominent notice on the Platform</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">14.2 Your Continued Use</h3>
              <p>
                Your continued use of the Platform after changes become effective constitutes your acceptance of 
                the revised Privacy Policy. If you do not agree to the changes, you should discontinue using the 
                Platform and close your account.
              </p>

              <h3 className="font-bold text-lg mt-4">14.3 Review Regularly</h3>
              <p>
                We encourage you to review this Privacy Policy periodically to stay informed about how we protect 
                your information.
              </p>
            </div>
          </section>

          {/* Section 15 */}
          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              15. Contact Us
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                If you have questions, concerns, or complaints about this Privacy Policy or our data practices, 
                please contact us:
              </p>

              <Card className="bg-blue-50 p-6 mt-4">
                <h4 className="font-bold mb-4 text-lg">Privacy & Data Protection</h4>
                
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-semibold mb-1">General Privacy Inquiries:</p>
                    <p><strong>Email:</strong> privacy@protocall.in</p>
                    <p><strong>Phone:</strong> +91-80-4567-8900</p>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">Data Protection Officer:</p>
                    <p><strong>Name:</strong> [DPO Name]</p>
                    <p><strong>Email:</strong> dpo@protocall.in</p>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">Grievance Officer (As per IT Act, 2000):</p>
                    <p><strong>Name:</strong> [Grievance Officer Name]</p>
                    <p><strong>Email:</strong> grievance@protocall.in</p>
                    <p><strong>Phone:</strong> +91-80-4567-8901</p>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">Mailing Address:</p>
                    <p>Protocall Technologies Private Limited</p>
                    <p>Bangalore, Karnataka - 560001</p>
                    <p>India</p>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">Response Time:</p>
                    <p>We aim to respond to all privacy-related inquiries within 30 days.</p>
                  </div>
                </div>
              </Card>

              <p className="text-sm text-slate-600 mt-4">
                For urgent security concerns or to report a data breach, please contact security@protocall.in immediately.
              </p>
            </div>
          </section>

          {/* Acknowledgment */}
          <Card className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 mt-8">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-xl mb-3">Your Privacy Matters</h3>
                <p className="mb-4 leading-relaxed">
                  At Protocall, we are committed to protecting your privacy and handling your personal information 
                  with care and transparency. We continuously review and enhance our security measures to keep your 
                  data safe.
                </p>
                <p className="text-sm text-green-100">
                  BY USING PROTOCALL, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS PRIVACY POLICY AND 
                  CONSENT TO THE COLLECTION, USE, AND DISCLOSURE OF YOUR INFORMATION AS DESCRIBED HEREIN.
                </p>
              </div>
            </div>
          </Card>
        </Card>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Link to={createPageUrl('Terms')}>
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer h-full">
              <FileText className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-bold mb-2">Terms of Service</h3>
              <p className="text-sm text-slate-600">Review our terms and conditions</p>
            </Card>
          </Link>
          <Link to={createPageUrl('Cookies')}>
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer h-full">
              <Eye className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-bold mb-2">Cookies Policy</h3>
              <p className="text-sm text-slate-600">Learn about our use of cookies</p>
            </Card>
          </Link>
          <Link to={createPageUrl('Feedback')}>
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer h-full">
              <Database className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-bold mb-2">Contact Support</h3>
              <p className="text-sm text-slate-600">Get help with privacy concerns</p>
            </Card>
          </Link>
        </div>
      </div>

      <PageFooter />
    </div>
  );
}