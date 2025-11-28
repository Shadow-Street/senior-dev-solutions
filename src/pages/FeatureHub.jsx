
import React, { useState, useEffect } from 'react';
import { FeatureConfig } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Star, 
  Crown, 
  CheckCircle, 
  Clock, 
  Zap,
  Shield,
  MessageSquare,
  BarChart3,
  Calendar,
  TrendingUp,
  Users,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useSubscription } from '@/components/hooks/useSubscription';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

// Icon mapping
const iconMap = {
  Sparkles, Star, Crown, CheckCircle, Clock, Zap, Shield,
  MessageSquare, BarChart3, Calendar, TrendingUp, Users
};

export default function FeatureHub() {
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { hasFeatureAccess, subscriptionPlan, user } = useSubscription();

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setIsLoading(true);
      // Load only features marked as visible to users
      const allFeatures = await FeatureConfig.filter({ visible_to_users: true });
      setFeatures(allFeatures.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      live: { label: 'Live', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
      partial: { label: 'Beta', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Zap },
      placeholder: { label: 'Coming Soon', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: Clock },
    };
    return badges[status] || badges.placeholder;
  };

  const getTierGradient = (tier) => {
    const gradients = {
      basic: 'from-blue-500 to-cyan-500',
      premium: 'from-purple-500 to-pink-500',
      vip: 'from-yellow-500 to-orange-500',
    };
    return gradients[tier] || gradients.basic;
  };

  const getTierIcon = (tier) => {
    const icons = {
      basic: Shield,
      premium: Star,
      vip: Crown,
    };
    return icons[tier] || Shield;
  };

  const renderFeatureCard = (feature) => {
    const Icon = iconMap[feature.icon_name] || Sparkles;
    const statusBadge = getStatusBadge(feature.status);
    const StatusIcon = statusBadge.icon;
    const TierIcon = getTierIcon(feature.tier);
    const hasAccess = hasFeatureAccess(feature.feature_key);
    const isLocked = !hasAccess && feature.status === 'live';

    return (
      <Card 
        key={feature.id}
        className={`group hover:shadow-xl transition-all duration-300 border-0 overflow-hidden ${
          isLocked ? 'opacity-75' : ''
        }`}
      >
        <div className={`h-2 bg-gradient-to-r ${getTierGradient(feature.tier)}`}></div>
        
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${getTierGradient(feature.tier)} bg-opacity-10`}>
              <Icon className="w-6 h-6 text-gray-700" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={`${statusBadge.color} border`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusBadge.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <TierIcon className="w-3 h-3 mr-1" />
                {feature.tier === 'basic' ? 'Free' : feature.tier === 'premium' ? 'Premium' : 'VIP'}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              {feature.feature_name}
              {isLocked && <Lock className="w-4 h-4 text-gray-400" />}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-3">
              {feature.description || 'Discover amazing features designed to enhance your trading experience.'}
            </p>
          </div>

          {/* Release Info */}
          {(feature.release_quarter || feature.release_date) && feature.status !== 'live' && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 bg-gray-50 rounded-lg p-2">
              <Calendar className="w-3 h-3" />
              <span>Expected: {feature.release_quarter || new Date(feature.release_date).toLocaleDateString()}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-4 border-t">
            {isLocked ? (
              <Link to={createPageUrl('Subscription')} className="w-full">
                <Button className={`w-full bg-gradient-to-r ${getTierGradient(feature.tier)} hover:opacity-90 text-white`}>
                  <Lock className="w-4 h-4 mr-2" />
                  Upgrade to Access
                </Button>
              </Link>
            ) : feature.page_url ? (
              <Link to={feature.page_url} className="w-full">
                <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                  Explore Feature
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                {feature.status === 'placeholder' ? 'Coming Soon' : 'Available'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading amazing features...</p>
        </div>
      </div>
    );
  }

  const featuresByTier = {
    basic: features.filter(f => f.tier === 'basic'),
    premium: features.filter(f => f.tier === 'premium'),
    vip: features.filter(f => f.tier === 'vip'),
  };

  const allFeatures = features;
  const liveFeatures = features.filter(f => f.status === 'live');
  const upcomingFeatures = features.filter(f => f.status === 'placeholder');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block mb-4">
            <Badge className="bg-white/20 text-white border-0 text-sm px-4 py-1">
              <Sparkles className="w-4 h-4 mr-2" />
              Discover Platform Features
            </Badge>
          </div>
          <h1 className="text-5xl font-bold mb-4">
            Explore What's Possible
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Discover powerful features designed to enhance your trading journey. From basic tools to premium capabilities.
          </p>
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold">{liveFeatures.length}</div>
              <div className="text-sm text-blue-100">Live Features</div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="text-center">
              <div className="text-3xl font-bold">{upcomingFeatures.length}</div>
              <div className="text-sm text-blue-100">Coming Soon</div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="text-center">
              <div className="text-3xl font-bold">{featuresByTier.vip.length}</div>
              <div className="text-sm text-blue-100">VIP Exclusive</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Current Plan Info */}
        {user && (
          <Card className="mb-8 border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${getTierGradient(subscriptionPlan?.name?.toLowerCase() || 'basic')}`}>
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Your Current Plan</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {subscriptionPlan?.name || 'Free'}
                    </p>
                  </div>
                </div>
                {(!subscriptionPlan || subscriptionPlan?.name === 'Free') && (
                  <Link to={createPageUrl('Subscription')}>
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white">
                      Upgrade Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feature Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-transparent rounded-xl p-2 gap-2 mb-8">
            <TabsTrigger 
              value="all"
              className="whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 rounded-xl font-semibold shadow-md transition-all duration-300 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              All Features
            </TabsTrigger>
            <TabsTrigger 
              value="basic"
              className="whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 rounded-xl font-semibold shadow-md transition-all duration-300 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Free
            </TabsTrigger>
            <TabsTrigger 
              value="premium"
              className="whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 rounded-xl font-semibold shadow-md transition-all duration-300 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg flex items-center gap-2"
            >
              <Star className="w-4 h-4" />
              Premium
            </TabsTrigger>
            <TabsTrigger 
              value="vip"
              className="whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 rounded-xl font-semibold shadow-md transition-all duration-300 bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-700 hover:bg-gradient-to-r hover:from-yellow-500 hover:to-orange-500 hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              VIP
            </TabsTrigger>
            <TabsTrigger 
              value="upcoming"
              className="whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 rounded-xl font-semibold shadow-md transition-all duration-300 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-blue-500 hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Upcoming
            </TabsTrigger>
          </TabsList>

          {/* All Features */}
          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allFeatures.map(renderFeatureCard)}
            </div>
          </TabsContent>

          {/* Basic Features */}
          <TabsContent value="basic">
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Free Tier Features
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Essential tools available to all community members at no cost.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuresByTier.basic.map(renderFeatureCard)}
            </div>
          </TabsContent>

          {/* Premium Features */}
          <TabsContent value="premium">
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                <Star className="w-5 h-5" />
                Premium Tier Features
              </h3>
              <p className="text-sm text-purple-700 mt-1">
                Advanced features for serious retail traders looking to level up.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuresByTier.premium.map(renderFeatureCard)}
            </div>
          </TabsContent>

          {/* VIP Features */}
          <TabsContent value="vip">
            <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
              <h3 className="font-semibold text-yellow-900 flex items-center gap-2">
                <Crown className="w-5 h-5" />
                VIP Elite Features
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Ultimate package with exclusive tools for professional traders.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuresByTier.vip.map(renderFeatureCard)}
            </div>
          </TabsContent>

          {/* Upcoming Features */}
          <TabsContent value="upcoming">
            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
              <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Coming Soon
              </h3>
              <p className="text-sm text-indigo-700 mt-1">
                Exciting features currently in development. Stay tuned!
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingFeatures.map(renderFeatureCard)}
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA Section */}
        {(!subscriptionPlan || subscriptionPlan?.name === 'Free') && (
          <Card className="mt-12 border-0 shadow-xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 text-white">
            <CardContent className="p-12 text-center">
              <Crown className="w-16 h-16 mx-auto mb-4 animate-bounce" />
              <h2 className="text-3xl font-bold mb-4">Ready to Unlock More?</h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Upgrade to Premium or VIP to access exclusive features and take your trading to the next level.
              </p>
              <Link to={createPageUrl('Subscription')}>
                <Button className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-6">
                  View Pricing Plans
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
