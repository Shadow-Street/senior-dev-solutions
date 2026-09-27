
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card'; // CardContent is not directly used, only Card
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Shield, 
  Star, 
  Crown,
  CalendarDays,
  Target,
  ArrowRight,
  BarChart3,
  Lightbulb,
  Wallet,
  Rocket
} from 'lucide-react';
import PageFooter from '../components/footer/PageFooter';
import ReviewScroller from '../components/dashboard/ReviewScroller';
import FAQSection from '../components/landing/FAQSection';
import PricingPreview from '../components/landing/PricingPreview';

// Trust Badges Component
const TrustBadges = () => (
  <section className="py-20 px-6 bg-white">
    <div className="max-w-7xl mx-auto text-center">
      <h2 className="text-3xl md::text-4xl font-bold mb-10">
        Trusted by thousands of retail investors
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex flex-col items-center p-6 bg-premium-muted rounded-lg shadow-sm">
          <Shield className="w-12 h-12 text-protocall-blue mb-4" />
          <h3 className="text-xl font-semibold mb-2">SEBI Registered Advisors</h3>
          <p className="text-subtle">
            Access advice only from verified and regulated professionals.
          </p>
        </div>
        <div className="flex flex-col items-center p-6 bg-premium-muted rounded-lg shadow-sm">
          <Users className="w-12 h-12 text-protocall-premium-text mb-4" />
          <h3 className="text-xl font-semibold mb-2">Vibrant Community</h3>
          <p className="text-subtle">
            Join over 10,000 active traders sharing insights and strategies.
          </p>
        </div>
        <div className="flex flex-col items-center p-6 bg-buy-muted rounded-lg shadow-sm">
          <Star className="w-12 h-12 text-hold fill-hold mb-4" />
          <h3 className="text-xl font-semibold mb-2">High Satisfaction</h3>
          <p className="text-subtle">
            Consistently rated 4.8/5 by our user base for reliability and value.
          </p>
        </div>
      </div>
    </div>
  </section>
);

// How It Works Section
const HowItWorks = () => (
  <section className="py-20 px-6 bg-surface-2">
    <div className="max-w-7xl mx-auto text-center">
      <h2 className="text-4xl md:text-5xl font-bold mb-16">
        <span className="bg-gradient-to-r from-protocall-deep to-protocall-blue bg-clip-text text-transparent">
          How Protocall Works
        </span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="flex flex-col items-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="w-20 h-20 rounded-full bg-premium-muted flex items-center justify-center mb-6">
            <Lightbulb className="w-10 h-10 text-protocall-blue" />
          </div>
          <h3 className="text-2xl font-bold mb-3">1. Discover</h3>
          <p className="text-subtle leading-relaxed">
            Explore community polls, advisor recommendations, and live chat rooms to find new opportunities.
          </p>
        </div>
        <div className="flex flex-col items-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="w-20 h-20 rounded-full bg-premium-muted flex items-center justify-center mb-6">
            <Wallet className="w-10 h-10 text-protocall-premium-text" />
          </div>
          <h3 className="text-2xl font-bold mb-3">2. Invest</h3>
          <p className="text-subtle leading-relaxed">
            Invest smarter with the power of community. Join forces with thousands of retail traders sharing insights, strategies, and real-time market intelligence.
          </p>
        </div>
        <div className="flex flex-col items-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="w-20 h-20 rounded-full bg-buy-muted flex items-center justify-center mb-6">
            <Rocket className="w-10 h-10 text-buy-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold mb-3">3. Grow</h3>
          <p className="text-subtle leading-relaxed">
            Track your portfolio, participate in expert events, and continuously grow your wealth with confidence.
          </p>
        </div>
      </div>
    </div>
  </section>
);


export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-protocall-deep to-protocall-blue flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-protocall-deep to-protocall-blue bg-clip-text text-transparent">
              Protocall
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('ContactSupport')}>
              <Button variant="outline" className="border-protocall-blue text-protocall-blue hover:bg-premium-muted rounded-full">
                Contact Support
              </Button>
            </Link>
            <Link to={createPageUrl('Dashboard')}>
              <Button className="bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white shadow-lg rounded-full">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-surface-2 relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-protocall-blue rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-premium-muted text-protocall-blue hover:bg-premium-muted px-4 py-2 text-sm font-semibold">
              🚀 India's Largest Retail Investor Community
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Trade Smarter,
              <span className="block bg-gradient-to-r from-protocall-deep via-protocall-grape to-protocall-blue bg-clip-text text-transparent py-2">
                Grow Together
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-subtle mb-10 leading-relaxed">
              Join thousands of traders, connect with SEBI-registered advisors, participate in community polls, 
              and leverage collective wisdom for smarter investment decisions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to={createPageUrl('Dashboard')}>
                <Button className="bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all rounded-full">
                  Start Trading Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" className="px-8 py-6 text-lg border-2 border-protocall-blue text-protocall-blue hover:bg-premium-muted rounded-full">
                  Explore Features
                </Button>
              </a>
            </div>
            
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-subtle flex-wrap">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-buy-muted-foreground" />
                <span>SEBI Registered</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-protocall-blue" />
                <span>10,000+ Active Traders</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-hold fill-hold" />
                <span>4.8/5 Rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges Section */}
      <TrustBadges />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-protocall-deep to-protocall-blue bg-clip-text text-transparent">
                A stronger community builds smarter traders.
              </span>
            </h2>
            <p className="text-xl text-subtle max-w-3xl mx-auto">
              Comprehensive tools and features designed for retail investors to make informed decisions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-surface-2 to-white">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-protocall-deep to-protocall-blue flex items-center justify-center mb-6">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Live Chat Rooms</h3>
              <p className="text-subtle leading-relaxed">
                Join stock-specific discussions, get real-time insights, and collaborate with fellow traders in premium chat rooms.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-surface-2 to-white">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-protocall-deep to-protocall-blue flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Community Polls</h3>
              <p className="text-subtle leading-relaxed">
                Vote on stock sentiment, see community consensus, and make data-driven decisions based on collective wisdom.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-surface-2 to-white">
              <div className="w-14 h-14 rounded-xl bg-buy-soft flex items-center justify-center mb-6">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Pledge Pool</h3>
              <p className="text-subtle leading-relaxed">
                Pool buying power with community members for bulk orders at optimal prices. Premium feature with guaranteed execution.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-surface-2 to-white">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-hold to-sell flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">SEBI Advisors</h3>
              <p className="text-subtle leading-relaxed">
                Get recommendations from verified SEBI-registered advisors. Subscribe to expert picks and analysis.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-surface-2 to-white">
              <div className="w-14 h-14 rounded-xl bg-hold flex items-center justify-center mb-6">
                <CalendarDays className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Expert Events</h3>
              <p className="text-subtle leading-relaxed">
                Attend webinars, workshops, and live sessions by industry experts. Network and learn from the best.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-surface-2 to-white">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-protocall-deep to-sell flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Portfolio Tracking</h3>
              <p className="text-subtle leading-relaxed">
                Track investments, monitor P&L, set alerts, and analyze performance with real-time market data integration.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-20 bg-surface-2">
        <ReviewScroller />
      </section>

      {/* FAQ Section */}
      <section id="faq">
        <FAQSection />
      </section>

      {/* Footer */}
      <PageFooter />

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
