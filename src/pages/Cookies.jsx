import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Cookie, Shield, Eye, FileText, Home, Settings, Globe } from 'lucide-react';
import PageFooter from '../components/footer/PageFooter';

export default function Cookies() {
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
            <Cookie className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Cookies Policy</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Last Updated: January 1, 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Cookie Notice Banner */}
        <Card className="mb-8 border-blue-200 bg-blue-50 p-6">
          <div className="flex items-start gap-4">
            <Cookie className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-blue-900 mb-2">What Are Cookies?</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                Cookies are small text files that are placed on your device when you visit our website. 
                They help us provide you with a better experience by remembering your preferences and understanding 
                how you use our platform.
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
              <li><a href="#what-are-cookies" className="hover:underline">2. What Are Cookies?</a></li>
              <li><a href="#types-we-use" className="hover:underline">3. Types of Cookies We Use</a></li>
              <li><a href="#first-vs-third" className="hover:underline">4. First-Party vs. Third-Party Cookies</a></li>
              <li><a href="#why-we-use" className="hover:underline">5. Why We Use Cookies</a></li>
              <li><a href="#specific-cookies" className="hover:underline">6. Specific Cookies Used on Protocall</a></li>
              <li><a href="#third-party-services" className="hover:underline">7. Third-Party Cookies and Services</a></li>
              <li><a href="#manage-cookies" className="hover:underline">8. How to Manage Cookies</a></li>
              <li><a href="#disable-cookies" className="hover:underline">9. What Happens If You Disable Cookies?</a></li>
              <li><a href="#tracking-tech" className="hover:underline">10. Other Tracking Technologies</a></li>
              <li><a href="#updates" className="hover:underline">11. Updates to This Policy</a></li>
              <li><a href="#contact" className="hover:underline">12. Contact Us</a></li>
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
                This Cookies Policy explains how Protocall ("we," "us," or "our") uses cookies and similar 
                tracking technologies on our website and platform (collectively, the "Platform").
              </p>
              <p>
                This policy should be read together with our <Link to={createPageUrl('Privacy')} className="text-blue-600 hover:underline font-semibold">Privacy Policy</Link>, 
                which provides more information about how we collect, use, and protect your personal information.
              </p>
              <p>
                By continuing to use our Platform, you consent to our use of cookies as described in this policy. 
                If you do not agree with our use of cookies, you should adjust your browser settings or stop using our Platform.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="what-are-cookies" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              2. What Are Cookies?
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                Cookies are small text files that are stored on your computer or mobile device when you visit a website. 
                They are widely used to make websites work more efficiently and provide a better user experience.
              </p>
              
              <h3 className="font-bold text-lg mt-4">How Cookies Work</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>When you visit our Platform, our server sends a cookie to your device</li>
                <li>Your browser stores the cookie in a dedicated file</li>
                <li>Each time you visit the Platform again, your browser sends the cookie back to our server</li>
                <li>This allows us to recognize your device and remember your preferences</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">Types Based on Duration</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Session Cookies:</strong> Temporary cookies that expire when you close your browser. 
                  They are essential for the Platform to function properly.
                </li>
                <li>
                  <strong>Persistent Cookies:</strong> Remain on your device for a set period or until you delete them. 
                  They help us remember your preferences and settings.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section id="types-we-use" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              3. Types of Cookies We Use
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>We use the following categories of cookies on our Platform:</p>

              <Card className="bg-green-50 border-green-200 p-4 mt-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-lg text-green-900 mb-2">3.1 Strictly Necessary Cookies</h4>
                    <p className="text-sm text-green-800 mb-2">
                      <strong>Required for the Platform to function.</strong> These cookies cannot be disabled.
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm text-green-800">
                      <li>Authentication and security</li>
                      <li>Session management</li>
                      <li>Load balancing</li>
                      <li>Form submission and validation</li>
                      <li>Shopping cart functionality (for event tickets, courses)</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="bg-blue-50 border-blue-200 p-4 mt-4">
                <div className="flex items-start gap-3">
                  <Settings className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-lg text-blue-900 mb-2">3.2 Performance and Analytics Cookies</h4>
                    <p className="text-sm text-blue-800 mb-2">
                      Help us understand how visitors use our Platform so we can improve it.
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm text-blue-800">
                      <li>Number of visitors and page views</li>
                      <li>How users navigate through the Platform</li>
                      <li>Which features are most popular</li>
                      <li>Error tracking and performance monitoring</li>
                      <li>A/B testing and optimization</li>
                    </ul>
                    <p className="text-xs text-blue-700 mt-2 italic">
                      These cookies do not collect information that identifies you personally. 
                      All information is aggregated and anonymous.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-purple-50 border-purple-200 p-4 mt-4">
                <div className="flex items-start gap-3">
                  <Eye className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-lg text-purple-900 mb-2">3.3 Functionality Cookies</h4>
                    <p className="text-sm text-purple-800 mb-2">
                      Allow the Platform to remember your choices and provide enhanced, personalized features.
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm text-purple-800">
                      <li>Language preferences</li>
                      <li>Theme and display settings (dark mode, font size)</li>
                      <li>Remembering your login status</li>
                      <li>Saved watchlists and portfolios</li>
                      <li>Chat room preferences</li>
                      <li>Video playback settings</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="bg-orange-50 border-orange-200 p-4 mt-4">
                <div className="flex items-start gap-3">
                  <Globe className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-lg text-orange-900 mb-2">3.4 Targeting and Advertising Cookies</h4>
                    <p className="text-sm text-orange-800 mb-2">
                      Used to deliver advertisements relevant to you and your interests.
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm text-orange-800">
                      <li>Deliver targeted advertisements based on your interests</li>
                      <li>Limit the number of times you see an ad</li>
                      <li>Measure advertising campaign effectiveness</li>
                      <li>Track conversions from ads to sign-ups</li>
                      <li>Build profiles of user interests</li>
                    </ul>
                    <p className="text-xs text-orange-700 mt-2 italic">
                      You can opt out of targeted advertising. See Section 8 for details.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-pink-50 border-pink-200 p-4 mt-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-6 h-6 text-pink-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-lg text-pink-900 mb-2">3.5 Social Media Cookies</h4>
                    <p className="text-sm text-pink-800 mb-2">
                      Allow you to share content on social networks and see social content on our Platform.
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm text-pink-800">
                      <li>Social media sharing buttons</li>
                      <li>Login with social media accounts</li>
                      <li>Embedded social media content</li>
                      <li>Social media analytics</li>
                    </ul>
                    <p className="text-xs text-pink-700 mt-2 italic">
                      These cookies are controlled by third-party social media platforms.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Section 4 */}
          <section id="first-vs-third" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              4. First-Party vs. Third-Party Cookies
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">4.1 First-Party Cookies</h3>
              <p>
                First-party cookies are set directly by Protocall when you visit our Platform. We use these cookies to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintain your session and keep you logged in</li>
                <li>Remember your preferences and settings</li>
                <li>Store items in your cart (event tickets, course enrollments)</li>
                <li>Improve Platform performance and functionality</li>
                <li>Analyze how you use our Platform</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">4.2 Third-Party Cookies</h3>
              <p>
                Third-party cookies are set by external services we use to enhance our Platform. These include:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Google Analytics:</strong> Website analytics and user behavior tracking</li>
                <li><strong>Google Ads:</strong> Advertising and remarketing campaigns</li>
                <li><strong>Facebook Pixel:</strong> Social media advertising and conversion tracking</li>
                <li><strong>Payment Gateways:</strong> Razorpay, Stripe for secure payment processing</li>
                <li><strong>YouTube:</strong> Embedded video content and analytics</li>
                <li><strong>Social Media Platforms:</strong> LinkedIn, Twitter, Instagram for sharing and login</li>
              </ul>
              <p className="text-sm italic mt-2">
                Third-party cookies are subject to the privacy policies of those third-party providers.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section id="why-we-use" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              5. Why We Use Cookies
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>We use cookies for the following purposes:</p>

              <h3 className="font-bold text-lg mt-4">5.1 Essential Platform Functionality</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Keep you logged in as you navigate between pages</li>
                <li>Remember your subscription status and access levels</li>
                <li>Enable core features like chat rooms, polls, and portfolio tracking</li>
                <li>Process payments and transactions securely</li>
                <li>Prevent fraudulent activity and enhance security</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">5.2 Personalization and User Experience</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Remember your display preferences (theme, language, layout)</li>
                <li>Provide personalized stock recommendations based on your interests</li>
                <li>Show relevant content and advisor suggestions</li>
                <li>Customize your dashboard and feed</li>
                <li>Remember your favorite sectors and watchlists</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">5.3 Performance and Analytics</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Understand how users interact with the Platform</li>
                <li>Identify and fix technical issues</li>
                <li>Optimize page load times and performance</li>
                <li>Analyze feature usage and user engagement</li>
                <li>Conduct A/B testing to improve user experience</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">5.4 Advertising and Marketing</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Show you relevant advertisements based on your interests</li>
                <li>Measure the effectiveness of our marketing campaigns</li>
                <li>Prevent you from seeing the same ad repeatedly</li>
                <li>Track conversions from ads to subscriptions or sign-ups</li>
                <li>Build audience segments for targeted marketing</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">5.5 Security and Fraud Prevention</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Detect and prevent fraudulent activities</li>
                <li>Identify suspicious login attempts</li>
                <li>Protect against automated attacks (bots, scrapers)</li>
                <li>Verify legitimate users and transactions</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section id="specific-cookies" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              6. Specific Cookies Used on Protocall
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>Below is a detailed list of cookies we use on our Platform:</p>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-slate-300 mt-4 text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 px-4 py-2 text-left font-bold">Cookie Name</th>
                      <th className="border border-slate-300 px-4 py-2 text-left font-bold">Purpose</th>
                      <th className="border border-slate-300 px-4 py-2 text-left font-bold">Type</th>
                      <th className="border border-slate-300 px-4 py-2 text-left font-bold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 px-4 py-2 font-mono text-xs">session_id</td>
                      <td className="border border-slate-300 px-4 py-2">Maintains your login session</td>
                      <td className="border border-slate-300 px-4 py-2">Necessary</td>
                      <td className="border border-slate-300 px-4 py-2">Session</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-300 px-4 py-2 font-mono text-xs">auth_token</td>
                      <td className="border border-slate-300 px-4 py-2">Authenticates your requests</td>
                      <td className="border border-slate-300 px-4 py-2">Necessary</td>
                      <td className="border border-slate-300 px-4 py-2">7 days</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-4 py-2 font-mono text-xs">user_preferences</td>
                      <td className="border border-slate-300 px-4 py-2">Stores your display settings and preferences</td>
                      <td className="border border-slate-300 px-4 py-2">Functional</td>
                      <td className="border border-slate-300 px-4 py-2">1 year</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-300 px-4 py-2 font-mono text-xs">theme</td>
                      <td className="border border-slate-300 px-4 py-2">Remembers your theme choice (light/dark)</td>
                      <td className="border border-slate-300 px-4 py-2">Functional</td>
                      <td className="border border-slate-300 px-4 py-2">1 year</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-4 py-2 font-mono text-xs">_ga</td>
                      <td className="border border-slate-300 px-4 py-2">Google Analytics - distinguishes users</td>
                      <td className="border border-slate-300 px-4 py-2">Analytics</td>
                      <td className="border border-slate-300 px-4 py-2">2 years</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-300 px-4 py-2 font-mono text-xs">_gid</td>
                      <td className="border border-slate-300 px-4 py-2">Google Analytics - distinguishes users</td>
                      <td className="border border-slate-300 px-4 py-2">Analytics</td>
                      <td className="border border-slate-300 px-4 py-2">24 hours</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-4 py-2 font-mono text-xs">_gat</td>
                      <td className="border border-slate-300 px-4 py-2">Google Analytics - throttles request rate</td>
                      <td className="border border-slate-300 px-4 py-2">Analytics</td>
                      <td className="border border-slate-300 px-4 py-2">1 minute</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-300 px-4 py-2 font-mono text-xs">_fbp</td>
                      <td className="border border-slate-300 px-4 py-2">Facebook Pixel - tracks user behavior</td>
                      <td className="border border-slate-300 px-4 py-2">Advertising</td>
                      <td className="border border-slate-300 px-4 py-2">3 months</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-4 py-2 font-mono text-xs">__cf_bm</td>
                      <td className="border border-slate-300 px-4 py-2">Cloudflare - bot management</td>
                      <td className="border border-slate-300 px-4 py-2">Security</td>
                      <td className="border border-slate-300 px-4 py-2">30 minutes</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-300 px-4 py-2 font-mono text-xs">cart_id</td>
                      <td className="border border-slate-300 px-4 py-2">Stores event tickets and course selections</td>
                      <td className="border border-slate-300 px-4 py-2">Necessary</td>
                      <td className="border border-slate-300 px-4 py-2">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm italic mt-4">
                This list may be updated as we add new features or integrate new services. 
                The most current information is always available on this page.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section id="third-party-services" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              7. Third-Party Cookies and Services
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                We use the following third-party services that may set cookies on your device:
              </p>

              <h3 className="font-bold text-lg mt-4">7.1 Analytics Services</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Google Analytics:</strong> Tracks website traffic and user behavior
                  <br />
                  <span className="text-sm text-slate-600">
                    Privacy Policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://policies.google.com/privacy</a>
                  </span>
                </li>
              </ul>

              <h3 className="font-bold text-lg mt-4">7.2 Advertising Services</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Google Ads:</strong> Delivers targeted advertisements
                  <br />
                  <span className="text-sm text-slate-600">
                    Opt-out: <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://adssettings.google.com</a>
                  </span>
                </li>
                <li>
                  <strong>Facebook Pixel:</strong> Tracks conversions and delivers targeted ads
                  <br />
                  <span className="text-sm text-slate-600">
                    Privacy Policy: <a href="https://www.facebook.com/privacy/explanation" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://www.facebook.com/privacy/explanation</a>
                  </span>
                </li>
              </ul>

              <h3 className="font-bold text-lg mt-4">7.3 Payment Processing</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Razorpay:</strong> Secure payment processing for subscriptions and purchases
                  <br />
                  <span className="text-sm text-slate-600">
                    Privacy Policy: <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://razorpay.com/privacy/</a>
                  </span>
                </li>
                <li>
                  <strong>Stripe:</strong> Alternative payment gateway
                  <br />
                  <span className="text-sm text-slate-600">
                    Privacy Policy: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://stripe.com/privacy</a>
                  </span>
                </li>
              </ul>

              <h3 className="font-bold text-lg mt-4">7.4 Content Delivery</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Cloudflare:</strong> Content delivery network and DDoS protection
                  <br />
                  <span className="text-sm text-slate-600">
                    Privacy Policy: <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://www.cloudflare.com/privacypolicy/</a>
                  </span>
                </li>
              </ul>

              <h3 className="font-bold text-lg mt-4">7.5 Social Media Integration</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>LinkedIn:</strong> Professional networking and content sharing</li>
                <li><strong>Twitter:</strong> Social sharing and discussions</li>
                <li><strong>Instagram:</strong> Visual content sharing</li>
                <li><strong>YouTube:</strong> Embedded educational videos and webinars</li>
              </ul>

              <p className="mt-4">
                <strong>Important:</strong> We do not control third-party cookies. Please refer to the respective 
                third-party privacy policies for more information about how they use cookies.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section id="manage-cookies" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              8. How to Manage Cookies
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                You have the right to decide whether to accept or reject cookies. You can manage your cookie 
                preferences through your browser settings or our cookie consent tool.
              </p>

              <h3 className="font-bold text-lg mt-4">8.1 Browser Settings</h3>
              <p>Most web browsers allow you to control cookies through their settings. Here's how:</p>
              
              <div className="space-y-3 mt-4">
                <Card className="p-4 bg-slate-50">
                  <h4 className="font-bold mb-2">Google Chrome</h4>
                  <p className="text-sm">
                    Settings → Privacy and security → Cookies and other site data
                  </p>
                  <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    Learn more →
                  </a>
                </Card>

                <Card className="p-4 bg-slate-50">
                  <h4 className="font-bold mb-2">Mozilla Firefox</h4>
                  <p className="text-sm">
                    Settings → Privacy & Security → Cookies and Site Data
                  </p>
                  <a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    Learn more →
                  </a>
                </Card>

                <Card className="p-4 bg-slate-50">
                  <h4 className="font-bold mb-2">Safari</h4>
                  <p className="text-sm">
                    Preferences → Privacy → Cookies and website data
                  </p>
                  <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    Learn more →
                  </a>
                </Card>

                <Card className="p-4 bg-slate-50">
                  <h4 className="font-bold mb-2">Microsoft Edge</h4>
                  <p className="text-sm">
                    Settings → Privacy, search, and services → Cookies and site permissions
                  </p>
                  <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    Learn more →
                  </a>
                </Card>
              </div>

              <h3 className="font-bold text-lg mt-4">8.2 Mobile Devices</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>iOS:</strong> Settings → Safari → Block All Cookies</li>
                <li><strong>Android:</strong> Settings → Site settings → Cookies</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">8.3 Opt-Out of Targeted Advertising</h3>
              <p>To opt out of targeted advertising from participating companies:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Network Advertising Initiative (NAI):</strong>{' '}
                  <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    https://optout.networkadvertising.org/
                  </a>
                </li>
                <li>
                  <strong>Digital Advertising Alliance (DAA):</strong>{' '}
                  <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    https://optout.aboutads.info/
                  </a>
                </li>
                <li>
                  <strong>European Interactive Digital Advertising Alliance (EDAA):</strong>{' '}
                  <a href="https://www.youronlinechoices.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    https://www.youronlinechoices.com/
                  </a>
                </li>
              </ul>

              <h3 className="font-bold text-lg mt-4">8.4 Google Analytics Opt-Out</h3>
              <p>
                You can prevent Google Analytics from tracking your activity by installing the 
                Google Analytics Opt-out Browser Add-on:
              </p>
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                https://tools.google.com/dlpage/gaoptout
              </a>
            </div>
          </section>

          {/* Section 9 */}
          <section id="disable-cookies" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              9. What Happens If You Disable Cookies?
            </h2>
            <div className="space-y-4 text-slate-700">
              <Card className="bg-orange-50 border-orange-200 p-4">
                <p className="text-sm text-orange-800">
                  <strong>Warning:</strong> Disabling cookies may significantly affect your ability to use the Platform.
                </p>
              </Card>

              <p className="mt-4">If you disable cookies, you may experience the following limitations:</p>

              <h3 className="font-bold text-lg mt-4">9.1 Essential Features May Not Work</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>You may not be able to log in or stay logged in</li>
                <li>Shopping cart functionality will not work (event tickets, courses)</li>
                <li>Form submissions may fail</li>
                <li>Security features may not function properly</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">9.2 Personalization Will Be Lost</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your preferences and settings won't be saved</li>
                <li>You'll see default theme and language settings</li>
                <li>Content won't be personalized to your interests</li>
                <li>Watchlists and portfolios won't persist across sessions</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">9.3 Performance May Degrade</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Pages may load slower</li>
                <li>Features may not work as smoothly</li>
                <li>We can't optimize your experience</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">9.4 You May See Irrelevant Ads</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Advertisements won't be tailored to your interests</li>
                <li>You may see the same ads repeatedly</li>
                <li>Ad frequency capping won't work</li>
              </ul>

              <p className="mt-4 font-semibold">
                We recommend enabling at least essential and functional cookies for the best experience on Protocall.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section id="tracking-tech" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              10. Other Tracking Technologies
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                In addition to cookies, we may use other tracking technologies:
              </p>

              <h3 className="font-bold text-lg mt-4">10.1 Web Beacons (Pixels)</h3>
              <p>
                Small graphics embedded in web pages or emails to track page views, email opens, and user actions. 
                We use pixels from:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Google Ads for conversion tracking</li>
                <li>Facebook for advertising campaign measurement</li>
                <li>Email service providers for delivery and open rate tracking</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">10.2 Local Storage</h3>
              <p>
                HTML5 local storage allows us to store data locally on your browser for faster access and 
                better offline functionality. We use local storage for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Caching frequently accessed data</li>
                <li>Storing user preferences and settings</li>
                <li>Enabling offline features</li>
                <li>Reducing server requests for better performance</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">10.3 Session Storage</h3>
              <p>
                Similar to local storage but data is cleared when you close your browser tab. Used for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Temporary form data to prevent loss during navigation</li>
                <li>Session-specific state management</li>
                <li>Multi-step form progress</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">10.4 Device Fingerprinting</h3>
              <p>
                We may collect information about your device (browser type, screen resolution, installed plugins) 
                to identify and prevent fraudulent activities. This data is used only for security purposes.
              </p>

              <h3 className="font-bold text-lg mt-4">10.5 Server Logs</h3>
              <p>
                Our servers automatically log information when you access the Platform, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>IP address and geographic location</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Referrer URL (how you found us)</li>
                <li>Pages visited and time spent</li>
                <li>Date and time of access</li>
              </ul>
            </div>
          </section>

          {/* Section 11 */}
          <section id="updates" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              11. Updates to This Policy
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                We may update this Cookies Policy from time to time to reflect changes in our practices, 
                technology, or legal requirements.
              </p>

              <h3 className="font-bold text-lg mt-4">11.1 How We Notify You</h3>
              <p>When we make changes, we will:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Update the "Last Updated" date at the top of this page</li>
                <li>Post a notice on our Platform</li>
                <li>Send an email notification for material changes (if you're subscribed)</li>
                <li>Update our cookie consent banner if applicable</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">11.2 Your Continued Use</h3>
              <p>
                Your continued use of the Platform after changes become effective constitutes your acceptance of 
                the revised Cookies Policy.
              </p>

              <h3 className="font-bold text-lg mt-4">11.3 Review Regularly</h3>
              <p>
                We encourage you to review this Cookies Policy periodically to stay informed about how we use cookies.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              12. Contact Us
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                If you have questions or concerns about our use of cookies, please contact us:
              </p>

              <Card className="bg-blue-50 p-6 mt-4">
                <h4 className="font-bold mb-4 text-lg">Cookies & Privacy Inquiries</h4>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold mb-1">General Cookie Questions:</p>
                    <p><strong>Email:</strong> privacy@protocall.in</p>
                    <p><strong>Phone:</strong> +91-80-4567-8900</p>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">Data Protection Officer:</p>
                    <p><strong>Email:</strong> dpo@protocall.in</p>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">Mailing Address:</p>
                    <p>Protocall Technologies Private Limited</p>
                    <p>Bangalore, Karnataka - 560001</p>
                    <p>India</p>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">Response Time:</p>
                    <p>We aim to respond to all cookie and privacy inquiries within 7 business days.</p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Additional Resources */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              Additional Resources
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>For more information about cookies and online privacy:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <a href="https://www.allaboutcookies.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    All About Cookies
                  </a> - Comprehensive information about cookies
                </li>
                <li>
                  <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Your Online Choices
                  </a> - Control behavioral advertising
                </li>
                <li>
                  <a href="https://ico.org.uk/for-the-public/online/cookies/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    ICO Cookies Guidance
                  </a> - UK Information Commissioner's Office guidance
                </li>
              </ul>
            </div>
          </section>

          {/* Acknowledgment */}
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 mt-8">
            <div className="flex items-start gap-4">
              <Cookie className="w-8 h-8 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-xl mb-3">Your Cookie Preferences</h3>
                <p className="mb-4 leading-relaxed">
                  We respect your right to privacy and control over your data. You can manage your cookie preferences 
                  at any time through your browser settings. We're committed to transparency about how we use cookies 
                  to enhance your experience on Protocall.
                </p>
                <p className="text-sm text-blue-100">
                  BY USING PROTOCALL, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS COOKIES POLICY AND 
                  CONSENT TO THE USE OF COOKIES AS DESCRIBED HEREIN.
                </p>
              </div>
            </div>
          </Card>
        </Card>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Link to={createPageUrl('Privacy')}>
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer h-full">
              <Shield className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-bold mb-2">Privacy Policy</h3>
              <p className="text-sm text-slate-600">Learn how we protect your data</p>
            </Card>
          </Link>
          <Link to={createPageUrl('Terms')}>
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer h-full">
              <FileText className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-bold mb-2">Terms of Service</h3>
              <p className="text-sm text-slate-600">Review our terms and conditions</p>
            </Card>
          </Link>
          <Link to={createPageUrl('Feedback')}>
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer h-full">
              <Settings className="w-8 h-8 text-purple-600 mb-3" />
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