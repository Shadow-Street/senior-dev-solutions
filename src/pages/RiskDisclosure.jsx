import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AlertTriangle, Shield, FileText, Home, TrendingDown, AlertCircle } from 'lucide-react';
import PageFooter from '../components/footer/PageFooter';

export default function RiskDisclosure() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white py-12">
        <div className="max-w-5xl mx-auto px-6">
          <Link to={createPageUrl('Landing')}>
            <Button variant="outline" className="mb-6 bg-white/20 border-white/30 text-white hover:bg-white/30">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Risk Disclosure Statement</h1>
          </div>
          <p className="text-orange-100 text-lg">
            Last Updated: January 1, 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Critical Warning Banner */}
        <Card className="mb-8 border-red-300 bg-red-50 p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-red-900 mb-3">IMPORTANT: PLEASE READ CAREFULLY</h3>
              <p className="text-sm text-red-800 leading-relaxed mb-3">
                Trading and investing in securities involves significant risks and is not suitable for everyone. 
                You may lose some or all of your invested capital. Before using any features on Protocall, 
                you must read and understand all the risks outlined in this disclosure.
              </p>
              <p className="text-sm text-red-800 leading-relaxed font-semibold">
                BY USING PROTOCALL, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND ACCEPTED ALL THE RISKS 
                DESCRIBED IN THIS DOCUMENT.
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
              <li><a href="#general" className="hover:underline">1. General Investment Risks</a></li>
              <li><a href="#market" className="hover:underline">2. Market Risks</a></li>
              <li><a href="#platform" className="hover:underline">3. Platform-Specific Risks</a></li>
              <li><a href="#pledge" className="hover:underline">4. Pledge Pool Risks</a></li>
              <li><a href="#advisor" className="hover:underline">5. Advisor Recommendation Risks</a></li>
              <li><a href="#community" className="hover:underline">6. Community Content Risks</a></li>
              <li><a href="#technical" className="hover:underline">7. Technical and Operational Risks</a></li>
              <li><a href="#regulatory" className="hover:underline">8. Regulatory and Legal Risks</a></li>
              <li><a href="#liquidity" className="hover:underline">9. Liquidity Risks</a></li>
              <li><a href="#cyber" className="hover:underline">10. Cybersecurity Risks</a></li>
              <li><a href="#limitation" className="hover:underline">11. Limitation of Liability</a></li>
              <li><a href="#acknowledgment" className="hover:underline">12. Your Acknowledgment</a></li>
            </ol>
          </div>

          {/* Section 1 */}
          <section id="general" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              1. General Investment Risks
            </h2>
            <div className="space-y-4 text-slate-700">
              <Card className="bg-amber-50 border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <TrendingDown className="w-6 h-6 text-amber-700 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-amber-900 mb-2">RISK OF LOSS</p>
                    <p className="text-sm text-amber-800">
                      All investments carry risk. You may lose some or all of your invested capital. 
                      Never invest money you cannot afford to lose.
                    </p>
                  </div>
                </div>
              </Card>

              <h3 className="font-bold text-lg mt-4">1.1 Capital Loss</h3>
              <p>
                Trading in securities, stocks, derivatives, and other financial instruments involves the risk of loss. 
                You may lose your entire investment or more in certain circumstances. The value of securities can:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Decrease due to market conditions, economic factors, or company-specific events</li>
                <li>Fluctuate significantly within short periods</li>
                <li>Become worthless in extreme cases (company bankruptcy, delisting)</li>
                <li>Be affected by factors beyond your control or prediction</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">1.2 No Guaranteed Returns</h3>
              <p className="font-semibold">
                There are no guaranteed returns in trading and investing. Any projections, estimates, or 
                forecasts are speculative and may not materialize.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Past performance is not indicative of future results</li>
                <li>Historical returns do not guarantee similar future performance</li>
                <li>Market conditions change constantly and unpredictably</li>
                <li>Economic cycles, policies, and global events impact returns</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">1.3 Volatility Risk</h3>
              <p>
                Securities markets are subject to significant volatility:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Stock prices can fluctuate dramatically in short time periods</li>
                <li>Individual stocks can move 20-50% or more in a single day</li>
                <li>Volatility can be triggered by news, earnings, economic data, or market sentiment</li>
                <li>High volatility periods increase both profit potential and loss risk</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">1.4 Timing Risk</h3>
              <p>
                Market timing is extremely difficult and uncertain:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Buying at market peaks can result in immediate losses</li>
                <li>Selling at market bottoms locks in losses</li>
                <li>Perfect timing is nearly impossible to achieve consistently</li>
                <li>Emotional decisions often lead to poor timing</li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section id="market" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              2. Market Risks
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">2.1 Systematic Risk (Market Risk)</h3>
              <p>
                Broad market movements affect all securities to varying degrees:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Overall market crashes or corrections can impact your portfolio regardless of individual stock quality</li>
                <li>Economic recessions, inflation, interest rate changes affect all stocks</li>
                <li>Global events (wars, pandemics, natural disasters) create widespread market volatility</li>
                <li>Systematic risk cannot be completely eliminated through diversification</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">2.2 Unsystematic Risk (Company-Specific Risk)</h3>
              <p>
                Individual companies face specific risks that can significantly impact stock prices:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Poor management decisions or corporate governance issues</li>
                <li>Disappointing earnings reports or revenue misses</li>
                <li>Product failures, recalls, or competitive threats</li>
                <li>Legal issues, regulatory actions, or fraud allegations</li>
                <li>Changes in industry dynamics or technological disruption</li>
                <li>Key personnel departures or leadership changes</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">2.3 Sector and Industry Risk</h3>
              <p>
                Entire sectors can face challenges:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Regulatory changes affecting specific industries (e.g., pharma, banking, tech)</li>
                <li>Technological disruption making industries obsolete</li>
                <li>Commodity price changes affecting sector profitability</li>
                <li>Cyclical downturns in specific industries</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">2.4 Currency and Exchange Rate Risk</h3>
              <p>
                For companies with international exposure:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Rupee fluctuations against foreign currencies affect earnings</li>
                <li>Export-oriented companies face currency headwinds</li>
                <li>Import costs increase with rupee depreciation</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">2.5 Interest Rate Risk</h3>
              <p>
                Changes in interest rates impact stock valuations:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Rising interest rates generally lead to lower stock valuations</li>
                <li>Highly leveraged companies are more sensitive to rate changes</li>
                <li>Fixed-income alternatives become more attractive when rates rise</li>
                <li>RBI policy changes can trigger market volatility</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section id="platform" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              3. Platform-Specific Risks
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">3.1 Technology Platform Risks</h3>
              <p>
                As a technology platform, Protocall faces inherent risks:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service interruptions:</strong> Platform downtime may prevent access to features</li>
                <li><strong>Technical glitches:</strong> Bugs or errors may affect functionality</li>
                <li><strong>Data accuracy:</strong> Market data feeds may have delays or inaccuracies</li>
                <li><strong>Integration failures:</strong> Third-party service disruptions (payment gateways, brokers)</li>
                <li><strong>Mobile app issues:</strong> Compatibility problems with devices or operating systems</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">3.2 Third-Party Dependency Risks</h3>
              <p>
                We rely on third-party services that may fail or change:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Payment gateway failures preventing transactions</li>
                <li>Market data provider outages affecting real-time prices</li>
                <li>Broker API changes or disruptions</li>
                <li>Cloud hosting issues affecting availability</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">3.3 Information Accuracy Risks</h3>
              <p className="font-semibold">
                While we strive for accuracy, we cannot guarantee:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Real-time accuracy of stock prices (may have delays)</li>
                <li>Completeness of market data or news</li>
                <li>Accuracy of user-generated content or community discussions</li>
                <li>Correctness of portfolio calculations or P&L tracking</li>
                <li>Timeliness of notifications and alerts</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">3.4 No Investment Advice</h3>
              <p>
                <strong className="text-red-700">CRITICAL DISCLAIMER:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Protocall is a technology platform, not a financial advisor</li>
                <li>We do not provide personalized investment advice or recommendations</li>
                <li>Features like polls, community sentiment, and advisor posts are informational only</li>
                <li>You must make your own independent investment decisions</li>
                <li>We are not responsible for investment outcomes based on Platform features</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section id="pledge" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              4. Pledge Pool Risks
            </h2>
            <div className="space-y-4 text-slate-700">
              <Card className="bg-red-50 border-red-300 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-900 mb-2">HIGH-RISK FEATURE WARNING</p>
                    <p className="text-sm text-red-800">
                      Pledge Pool is a high-risk feature that involves coordinated trading. This section contains 
                      critical risk disclosures you must understand before using Pledge Pool.
                    </p>
                  </div>
                </div>
              </Card>

              <h3 className="font-bold text-lg mt-4">4.1 Execution Risks</h3>
              <p className="font-semibold">Pledge execution is subject to multiple risk factors:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>No guaranteed execution:</strong> Pledges may not be executed if market conditions are unfavorable</li>
                <li><strong>Price slippage:</strong> Actual execution price may differ significantly from target price</li>
                <li><strong>Partial execution:</strong> Only part of your pledge may be filled</li>
                <li><strong>Failed execution:</strong> Technical issues or market conditions may prevent execution entirely</li>
                <li><strong>Timing uncertainty:</strong> Execution timing may not be optimal</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">4.2 Market Impact Risks</h3>
              <p>
                Coordinated trading through Pledge Pool carries specific risks:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Large coordinated orders may move market prices against you</li>
                <li>Other market participants may detect and react to coordinated activity</li>
                <li>Liquidity may be insufficient for large collective orders</li>
                <li>Market volatility may increase during pledge execution windows</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">4.3 Liquidity Risks</h3>
              <p>
                Pledge Pool trades depend on market liquidity:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Illiquid stocks may not support large coordinated orders</li>
                <li>Wide bid-ask spreads can result in poor execution prices</li>
                <li>Circuit breakers may halt trading during execution windows</li>
                <li>Low trading volumes may prevent complete execution</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">4.4 Fee and Cost Risks</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Convenience fees are charged regardless of execution success</li>
                <li>Broker charges and taxes apply to executed trades</li>
                <li>Platform commissions reduce net returns</li>
                <li>Failed executions may still incur costs</li>
                <li>Multiple attempts may multiply costs</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">4.5 Demat Account Risks</h3>
              <p>
                Linking your demat account involves risks:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Unauthorized trades if credentials are compromised</li>
                <li>Broker account limitations may prevent execution</li>
                <li>Account linking errors could cause execution failures</li>
                <li>You remain solely responsible for all demat account activity</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">4.6 Cancellation Risks</h3>
              <p>
                Pledge cancellation has limitations:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Pledges cannot be cancelled once execution has started</li>
                <li>Convenience fees may not be refundable for cancelled pledges</li>
                <li>Cancellation windows are time-limited</li>
                <li>System delays may prevent timely cancellation</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section id="advisor" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              5. Advisor Recommendation Risks
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">5.1 No Guarantee of Accuracy</h3>
              <p>
                SEBI-registered advisors on our Platform provide independent recommendations, but:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Recommendations may not be suitable for your individual circumstances</li>
                <li>Advisors can be wrong in their analysis and predictions</li>
                <li>Historical success rates do not guarantee future accuracy</li>
                <li>Market conditions may change after recommendations are issued</li>
                <li>Recommendations may become outdated quickly</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">5.2 Conflict of Interest</h3>
              <p>
                Advisors may have conflicts of interest:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Advisors may hold positions in stocks they recommend</li>
                <li>Compensation models may influence recommendations</li>
                <li>Advisors may benefit from increased trading volume</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">5.3 Independent Verification Required</h3>
              <p className="font-semibold text-red-700">
                You must independently verify:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Advisor credentials and SEBI registration status</li>
                <li>Track record and success rates claimed by advisors</li>
                <li>Appropriateness of recommendations for your situation</li>
                <li>Accuracy of analysis and research</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">5.4 Platform Not Responsible</h3>
              <p>
                Protocall is not liable for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Accuracy or suitability of advisor recommendations</li>
                <li>Losses from following advisor picks</li>
                <li>Advisor misconduct or negligence</li>
                <li>Changes to advisor recommendations after you act on them</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section id="community" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              6. Community Content Risks
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">6.1 Unverified Information</h3>
              <p>
                Community-generated content carries significant risks:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Chat room discussions, polls, and posts reflect individual opinions only</li>
                <li>Information may be inaccurate, incomplete, or misleading</li>
                <li>Users may have ulterior motives (pump-and-dump schemes)</li>
                <li>Popular opinions are not necessarily correct</li>
                <li>Consensus can change rapidly</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">6.2 Poll and Sentiment Data Limitations</h3>
              <p className="font-semibold">
                Community polls and sentiment indicators are NOT investment advice:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Poll results reflect opinions of participants, not professional analysis</li>
                <li>Participants may have limited knowledge or experience</li>
                <li>Results can be manipulated or skewed</li>
                <li>Majority opinion can be wrong about market direction</li>
                <li>Sentiment can change rapidly with new information</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">6.3 Herd Mentality Risk</h3>
              <p>
                Following community consensus blindly is dangerous:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Herd behavior often leads to market bubbles and crashes</li>
                <li>Popular trades may already be overcrowded</li>
                <li>Community momentum can reverse suddenly</li>
                <li>Confirmation bias can cloud judgment</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">6.4 Misinformation and Fraud</h3>
              <p>
                Despite our moderation efforts:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Users may post false or fraudulent information</li>
                <li>Pump-and-dump schemes may be promoted in disguise</li>
                <li>Insider trading or market manipulation attempts may occur</li>
                <li>Scammers may impersonate credible users or advisors</li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section id="technical" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              7. Technical and Operational Risks
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">7.1 System Downtime</h3>
              <p>
                The Platform may experience downtime due to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Scheduled maintenance (usually announced in advance)</li>
                <li>Unexpected technical failures</li>
                <li>Server overload during high-traffic periods</li>
                <li>DDoS attacks or security incidents</li>
                <li>Internet connectivity issues</li>
              </ul>
              <p className="font-semibold mt-2">
                During downtime, you may be unable to access your account, view portfolios, cancel pledges, 
                or execute critical trading actions.
              </p>

              <h3 className="font-bold text-lg mt-4">7.2 Data Loss Risk</h3>
              <p>
                While we implement robust backup systems:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Data corruption or loss may occur in rare circumstances</li>
                <li>User-generated content may be lost during technical issues</li>
                <li>Portfolio tracking data may need to be re-entered</li>
                <li>We recommend maintaining your own records</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">7.3 Execution Delay Risks</h3>
              <p>
                Trade execution through Pledge Pool may face delays:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Technical delays between pledge submission and execution</li>
                <li>Market conditions may change during delays</li>
                <li>Prices may move significantly against you during delays</li>
                <li>Opportunities may be missed due to processing times</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">7.4 Mobile and Browser Compatibility</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Platform may not work optimally on all devices or browsers</li>
                <li>Mobile internet connectivity issues may affect functionality</li>
                <li>Older devices or browsers may have compatibility problems</li>
                <li>App updates may temporarily cause issues</li>
              </ul>
            </div>
          </section>

          {/* Section 8 */}
          <section id="regulatory" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              8. Regulatory and Legal Risks
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">8.1 SEBI Regulations</h3>
              <p>
                Securities trading is heavily regulated. You must comply with:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>SEBI (Prohibition of Insider Trading) Regulations, 2015</li>
                <li>SEBI (Prohibition of Fraudulent and Unfair Trade Practices) Regulations, 2003</li>
                <li>SEBI disclosure and compliance requirements</li>
                <li>Penalties for violations can be severe (fines, imprisonment)</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">8.2 Tax Obligations</h3>
              <p>
                You are solely responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Calculating and paying capital gains taxes on profits</li>
                <li>Reporting all trading income to tax authorities</li>
                <li>Understanding Short-Term Capital Gains (STCG) and Long-Term Capital Gains (LTCG) tax rules</li>
                <li>Complying with advance tax payment requirements</li>
                <li>Maintaining proper documentation for tax purposes</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">8.3 Regulatory Changes</h3>
              <p>
                Regulations may change, affecting:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Platform features and availability</li>
                <li>Trading rules and restrictions</li>
                <li>Tax treatment of gains and losses</li>
                <li>Disclosure requirements</li>
                <li>Allowed trading practices</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">8.4 Legal Proceedings Risk</h3>
              <p>
                Trading violations can result in:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>SEBI investigations and penalties</li>
                <li>Criminal prosecution for serious violations</li>
                <li>Civil liability to other traders</li>
                <li>Account freezing or trading bans</li>
              </ul>
            </div>
          </section>

          {/* Section 9 */}
          <section id="liquidity" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              9. Liquidity Risks
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">9.1 Stock Liquidity</h3>
              <p>
                Not all stocks are equally liquid:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Small-cap and mid-cap stocks may have limited daily volumes</li>
                <li>You may not be able to sell when you want at acceptable prices</li>
                <li>Large orders may take time to execute</li>
                <li>Illiquid stocks have wider bid-ask spreads, increasing costs</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">9.2 Market Freeze and Circuit Breakers</h3>
              <p>
                Trading may be halted:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Stock-specific circuit breakers during extreme price movements</li>
                <li>Market-wide trading halts during crashes</li>
                <li>Pre-open and post-close session limitations</li>
                <li>Trading suspensions for regulatory reasons</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">9.3 Lock-in Periods</h3>
              <p>
                Certain investments may have restrictions:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>IPO lock-in periods preventing immediate sale</li>
                <li>Pledge Pool session rules limiting cancellations</li>
                <li>Demat account restrictions or pledged shares</li>
              </ul>
            </div>
          </section>

          {/* Section 10 */}
          <section id="cyber" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              10. Cybersecurity Risks
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">10.1 Account Security Risks</h3>
              <p>
                Your account may be vulnerable to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Unauthorized access if credentials are compromised</li>
                <li>Phishing attacks attempting to steal your password</li>
                <li>Social engineering tactics to gain account access</li>
                <li>Device theft or loss exposing account access</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">10.2 Data Breach Risks</h3>
              <p>
                Despite our security measures:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Cyberattacks could compromise user data</li>
                <li>Personal and financial information could be exposed</li>
                <li>Third-party service provider breaches may affect our data</li>
                <li>No system is completely immune to sophisticated attacks</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">10.3 Your Security Responsibilities</h3>
              <p className="font-semibold">
                You must:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use strong, unique passwords</li>
                <li>Enable two-factor authentication</li>
                <li>Never share your credentials</li>
                <li>Log out from shared or public devices</li>
                <li>Keep your contact information updated</li>
                <li>Monitor your account for unauthorized activity</li>
                <li>Report suspicious activity immediately</li>
              </ul>
            </div>
          </section>

          {/* Section 11 */}
          <section id="limitation" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              11. Limitation of Liability
            </h2>
            <div className="space-y-4 text-slate-700">
              <Card className="bg-red-50 border-red-300 p-4">
                <p className="font-bold text-red-900 mb-2">CRITICAL LEGAL NOTICE</p>
                <p className="text-sm text-red-800">
                  This section limits our liability for losses you may incur. Please read carefully.
                </p>
              </Card>

              <h3 className="font-bold text-lg mt-4">11.1 No Liability for Investment Losses</h3>
              <p className="font-semibold uppercase text-red-700">
                PROTOCALL SHALL NOT BE LIABLE FOR ANY TRADING OR INVESTMENT LOSSES YOU INCUR, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Losses from stocks discussed in chat rooms or polls</li>
                <li>Losses from following advisor recommendations</li>
                <li>Losses from Pledge Pool executions</li>
                <li>Losses due to platform downtime or technical issues</li>
                <li>Losses from acting on community sentiment or polls</li>
                <li>Losses from delayed or failed executions</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">11.2 No Liability for Third Parties</h3>
              <p>
                We are not responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Actions or advice of SEBI-registered advisors on the Platform</li>
                <li>Content created by finfluencers, educators, or other users</li>
                <li>Broker actions, errors, or failures</li>
                <li>Payment gateway failures or delays</li>
                <li>Market data provider inaccuracies</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">11.3 Maximum Liability Cap</h3>
              <p>
                Our total liability to you for all claims shall not exceed the amount you paid in subscription 
                fees to Protocall in the 12 months preceding the claim.
              </p>

              <h3 className="font-bold text-lg mt-4">11.4 No Consequential Damages</h3>
              <p>
                We shall not be liable for indirect, incidental, special, consequential, or punitive damages, 
                including lost profits, lost revenue, or business interruption.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section id="acknowledgment" className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              12. Your Acknowledgment
            </h2>
            <div className="space-y-4 text-slate-700">
              <p className="font-bold text-lg">
                By using Protocall, you acknowledge and agree that:
              </p>
              
              <Card className="bg-orange-50 border-orange-300 p-6 mt-4">
                <ul className="space-y-3 text-slate-800">
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>You have read and understood this entire Risk Disclosure Statement</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>You understand that trading involves substantial risk of loss</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>You are financially capable of bearing such losses</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>You will conduct your own research and due diligence before making investment decisions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>You will not rely solely on Platform features, advisor recommendations, or community sentiment</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>You will consult with qualified financial advisors before making significant investment decisions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>You accept full responsibility for your investment decisions and outcomes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>You will comply with all applicable laws, regulations, and tax requirements</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>Protocall is not liable for your trading or investment losses</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>You will only invest money you can afford to lose</span>
                  </li>
                </ul>
              </Card>

              <h3 className="font-bold text-lg mt-6">Important Recommendations</h3>
              <p>Before trading on Protocall, we strongly recommend:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Start with small amounts until you understand how the Platform works</li>
                <li>Educate yourself about stock market basics and trading principles</li>
                <li>Diversify your investments across multiple stocks and sectors</li>
                <li>Set stop-loss limits to manage downside risk</li>
                <li>Never invest borrowed money or emergency funds</li>
                <li>Review and update your risk tolerance regularly</li>
                <li>Seek professional financial advice for significant investments</li>
                <li>Monitor your investments regularly but avoid emotional decisions</li>
              </ul>
            </div>
          </section>

          {/* Additional Disclosures */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              Additional Risk Disclosures
            </h2>
            <div className="space-y-4 text-slate-700">
              <h3 className="font-bold text-lg">Derivatives and Leverage Risk</h3>
              <p>
                If you trade in derivatives (futures, options) or use leverage:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Losses can exceed your initial investment</li>
                <li>You may receive margin calls requiring immediate additional funds</li>
                <li>Leverage magnifies both gains and losses</li>
                <li>Options can expire worthless, resulting in 100% loss</li>
                <li>Derivatives are complex and not suitable for inexperienced traders</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">Penny Stock and Small-Cap Risks</h3>
              <p>
                Trading in penny stocks or small-cap companies involves heightened risks:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Extreme price volatility and speculation</li>
                <li>Very low liquidity making it difficult to exit positions</li>
                <li>Higher risk of fraud, manipulation, and pump-and-dump schemes</li>
                <li>Limited public information and analysis</li>
                <li>Potential for complete loss of investment</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">IPO and New Listing Risks</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Limited trading history and price discovery</li>
                <li>High volatility in initial trading periods</li>
                <li>Lack of established track record</li>
                <li>Potential overvaluation at listing</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">Emotional and Psychological Risks</h3>
              <p>
                Trading can have psychological impacts:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fear and greed can cloud judgment</li>
                <li>Losses can cause emotional distress</li>
                <li>Addiction to trading can develop</li>
                <li>FOMO (fear of missing out) can lead to poor decisions</li>
                <li>Confirmation bias may prevent objective analysis</li>
              </ul>
            </div>
          </section>

          {/* SEBI Standard Disclosure */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              SEBI Standard Risk Disclosure
            </h2>
            <div className="space-y-4 text-slate-700">
              <Card className="bg-slate-50 border-slate-300 p-6">
                <p className="text-sm leading-relaxed mb-4">
                  <strong>Stock Brokers can accept securities as margin from clients only by way of pledge in the 
                  depository system w.e.f. September 1, 2020.</strong>
                </p>
                <p className="text-sm leading-relaxed mb-4">
                  <strong>Update your mobile number and e-mail ID with your stock broker/depository participant 
                  and receive OTP directly from depository on your e-mail ID and/or mobile number to create pledge.</strong>
                </p>
                <p className="text-sm leading-relaxed mb-4">
                  <strong>Pay 20% upfront margin of the transaction value to trade in cash market segment.</strong>
                </p>
                <p className="text-sm leading-relaxed mb-4">
                  <strong>Investors are cautioned that trading in stock exchange is subject to market risks. 
                  Please read all related documents carefully before investing.</strong>
                </p>
                <p className="text-sm leading-relaxed mb-4">
                  <strong>Check your Securities/MF/Bonds in the consolidated account statement issued by NSDL/CDSL 
                  every month.</strong>
                </p>
                <p className="text-sm leading-relaxed">
                  <strong>Investment in securities market are subject to market risks, read all the related 
                  documents carefully before investing. Brokerage will not exceed the SEBI prescribed limit.</strong>
                </p>
              </Card>
            </div>
          </section>

          {/* Contact for Questions */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
              Questions About Risks?
            </h2>
            <div className="space-y-4 text-slate-700">
              <p>
                If you have questions about the risks involved in using Protocall or trading in securities, 
                please contact us:
              </p>

              <Card className="bg-blue-50 p-6 mt-4">
                <h4 className="font-bold mb-3 text-lg">Protocall Support</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> support@protocall.in</p>
                  <p><strong>Phone:</strong> +91-80-4567-8900</p>
                  <p><strong>Risk Management Team:</strong> risk@protocall.in</p>
                </div>
              </Card>

              <p className="text-sm text-slate-600 mt-4">
                We also recommend consulting with a qualified financial advisor or investment consultant 
                who can assess your individual risk tolerance and financial situation.
              </p>
            </div>
          </section>

          {/* Final Acknowledgment */}
          <Card className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 mt-8">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-10 h-10 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-2xl mb-4">Final Risk Acknowledgment</h3>
                <p className="mb-4 leading-relaxed text-lg">
                  BY CLICKING "I UNDERSTAND" OR CONTINUING TO USE PROTOCALL, YOU CONFIRM THAT:
                </p>
                <ul className="space-y-2 text-sm">
                  <li>✓ You have read this entire Risk Disclosure Statement</li>
                  <li>✓ You understand the substantial risks involved in trading and investing</li>
                  <li>✓ You are financially capable of bearing potential losses</li>
                  <li>✓ You will not hold Protocall liable for investment losses</li>
                  <li>✓ You will conduct your own independent research and due diligence</li>
                  <li>✓ You will comply with all applicable laws and regulations</li>
                </ul>
                <p className="text-sm text-orange-100 mt-4 font-semibold">
                  If you do not understand or accept these risks, you should not use the Platform.
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
          <Link to={createPageUrl('Privacy')}>
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer h-full">
              <Shield className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-bold mb-2">Privacy Policy</h3>
              <p className="text-sm text-slate-600">Learn how we protect your data</p>
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