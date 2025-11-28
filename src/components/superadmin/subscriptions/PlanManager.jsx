
import React, { useState, useEffect } from 'react';
import { SubscriptionPlan, FeatureConfig } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Edit, UserCircle, Sparkles, Crown, Shield } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

// ✅ NEW: Load features from database instead of hardcoded
const useFeatures = () => {
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const allFeatures = await FeatureConfig.list();
        // Transform to match the expected format { key, name, description, tier }
        const transformed = allFeatures.map(f => ({
          key: f.feature_key,
          name: f.feature_name,
          description: f.description || `Feature: ${f.feature_name}`,
          tier: f.tier || 'basic' // Default to 'basic' if tier is not specified
        }));
        setFeatures(transformed);
      } catch (error) {
        console.error('Error loading features:', error);
        toast.error('Failed to load available features.');
        // Fallback to empty array if load fails
        setFeatures([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadFeatures();
  }, []);

  return { features, isLoading };
};

// ✅ Feature name mapping for backward compatibility (for keys not found in dynamic features)
const featureNameMap = {
  'premium_chat_rooms': 'Premium Chat Rooms',
  'premium_polls': 'Premium Polls',
  'premium_events': 'Premium Events',
  'advisor_subscriptions': 'Advisor Subscriptions',
  'exclusive_finfluencer_content': 'Exclusive Finfluencer Content',
  'admin_recommendations': 'Admin Recommendations',
  'chat_rooms': 'General Chat Access',
  'community_polls': 'Community Polls Participation',
  'pledge_pool': 'Pledge Pool Access',
  'advisor_picks': 'Advisor Picks',
  'priority_support': 'Priority Support',
  'exclusive_events': 'Exclusive Events',
  'whatsapp_support_group': 'Whatsapp Support Group',
  'premium_research_reports': 'Premium Research Reports',
  'custom_alerts_notifications': 'Custom Alerts Notifications',
  'one_on_one_trading_sessions': 'One On One Trading Sessions',
  'market_insider_insights': 'Market Insider Insights',
  'risk_management_tools': 'Risk Management Tools',
  'basic_stock_discussions': 'Basic Stock Discussions',
  'market_overview_access': 'Market Overview Access',
  'basic_trading_tips': 'Basic Trading Tips',
  'webinar_access': 'Webinar Access',
};

// ✅ NEW: Reverse mapping to convert names back to keys
const featureKeyMap = Object.fromEntries(
  Object.entries(featureNameMap).map(([key, name]) => [name, key])
);

// ✅ NEW: Normalize feature to key using database features
const normalizeFeatureToKey = (feature, allFeatures) => {
  if (typeof feature !== 'string') return null;
  
  // If it's already a key (lowercase with underscores) and exists in dynamically loaded features, return it
  if (allFeatures.some(f => f.key === feature)) {
    return feature;
  }
  
  // Try to find by name in dynamically loaded features
  const foundFeature = allFeatures.find(f => f.name === feature);
  if (foundFeature) {
    return foundFeature.key;
  }
  
  // Try reverse mapping from featureNameMap (if the feature string is a known display name from old mapping)
  if (featureKeyMap[feature]) {
    return featureKeyMap[feature];
  }
  
  // As a last resort, if it's a string, and not found above, return it.
  // This handles cases where a feature might exist in a plan but not in the currently loaded FeatureConfig.
  // This helps prevent data loss on existing plans, though it suggests data inconsistency.
  return feature;
};

const formatFeatureName = (feature, allFeatures) => {
  if (typeof feature !== 'string') return 'Feature';
  
  // Try to find in dynamically loaded features first
  const dbFeature = allFeatures.find(f => f.key === feature);
  if (dbFeature) return dbFeature.name;
  
  // Fallback to compatibility mapping
  if (featureNameMap[feature]) return featureNameMap[feature];
  
  // If it's already a space-separated name, return it
  if (feature.includes(' ')) return feature;

  // Fallback to title casing if not found anywhere else
  return feature.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// ✅ Plan tier hierarchy
const planTierHierarchy = {
  'basic': { order: 1, name: 'Free', parent: null },
  'free': { order: 1, name: 'Free', parent: null },
  'premium': { order: 2, name: 'Premium', parent: 'Free' },
  'vip': { order: 3, name: 'VIP', parent: 'Premium' },
  'elite': { order: 3, name: 'Elite', parent: 'Premium' }
};

// ✅ Admin Plan Card Component (matching reference image)
function AdminPlanCard({ plan, onEdit, allPlans, availableFeatures }) { // Added availableFeatures prop
  const getPlanIcon = () => {
    const planName = plan.name.toLowerCase();
    if (planName.includes('vip') || planName.includes('elite')) {
      return <Crown className="w-5 h-5" />;
    }
    if (planName.includes('premium')) {
      return <Sparkles className="w-5 h-5" />;
    }
    return <UserCircle className="w-5 h-5" />;
  };

  const getPlanColor = () => {
    const planName = plan.name.toLowerCase();
    if (planName.includes('vip') || planName.includes('elite')) {
      return 'text-yellow-600';
    }
    if (planName.includes('premium')) {
      return 'text-purple-600';
    }
    return 'text-blue-600';
  };

  const getCardBackground = () => {
    const planName = plan.name.toLowerCase();
    if (planName.includes('vip') || planName.includes('elite')) {
      return 'bg-gradient-to-br from-yellow-50 to-orange-50';
    }
    if (planName.includes('premium')) {
      return 'bg-gradient-to-br from-purple-50 to-pink-50';
    }
    return 'bg-gradient-to-br from-blue-50 to-cyan-50';
  };

  const monthlyPrice = plan.price_monthly || 0;
  const annualPrice = plan.price_annually || 0;
  const monthlySavings = monthlyPrice > 0 ? Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100) : 0;
  const isFree = monthlyPrice === 0 && annualPrice === 0;

  // Get parent plan info
  const thisTierInfo = planTierHierarchy[plan.name.toLowerCase()] || { order: 0 };
  const parentPlanName = thisTierInfo.parent;

  return (
    <Card className={`relative overflow-hidden border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 ${getCardBackground()}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={getPlanColor()}>
              {getPlanIcon()}
            </span>
            <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">System</Badge>
            {plan.is_active && (
              <Badge className="bg-gray-900 text-white text-xs">Active</Badge>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-gray-900">
              ₹{monthlyPrice}
            </span>
            <span className="text-gray-500">/month</span>
          </div>
          {!isFree && annualPrice > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              or ₹{annualPrice}/year
              {monthlySavings > 0 && (
                <Badge className="ml-2 bg-green-100 text-green-700 text-xs border-0">
                  Save {monthlySavings}%
                </Badge>
              )}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {isFree ? 'Basic platform access' : plan.description || 'Access to premium features'}
          </p>
        </div>

        {/* Features Section */}
        <div className="mb-6">
          {/* Parent Plan Inclusion */}
          {parentPlanName && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg mb-3 border border-blue-100">
              <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-900">
                Includes All {parentPlanName} Features
              </span>
            </div>
          )}

          {/* Features Header */}
          {plan.features && plan.features.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-900">
                {parentPlanName ? `Additional ${plan.name} Features:` : 'Features:'}
              </h4>
            </div>
          )}

          {/* Features List */}
          {plan.features && plan.features.length > 0 ? (
            <div className="space-y-2">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">
                    {formatFeatureName(feature, availableFeatures)}
                  </span>
                </div>
              ))}
            </div>
          ) : parentPlanName ? (
            <p className="text-sm text-gray-500 italic">No additional unique features</p>
          ) : null}
        </div>

        {/* Edit Button */}
        <Button
          onClick={() => onEdit(plan)}
          variant="outline"
          className="w-full hover:bg-gray-50"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PlanManager({ plans, setPlans, permissions }) {
  // ✅ Load features from database
  const { features: AVAILABLE_FEATURES, isLoading: featuresLoading } = useFeatures();
  
  const [editingPlan, setEditingPlan] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: 0,
    price_annually: 0,
    is_active: true,
    features: [],
  });

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    
    // ✅ FIXED: Normalize all features to keys
    const existingFeatures = Array.isArray(plan.features) ? plan.features : [];
    const normalizedFeatures = existingFeatures
      .map(f => normalizeFeatureToKey(f, AVAILABLE_FEATURES))
      .filter(f => f !== null); // Filter out any features that couldn't be normalized (or were null after normalization)
    
    // console.log('Editing plan:', plan.name);
    // console.log('Original features:', existingFeatures);
    // console.log('Normalized features:', normalizedFeatures);
    
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price_monthly: plan.price_monthly || 0,
      price_annually: plan.price_annually || 0,
      is_active: plan.is_active !== false,
      features: normalizedFeatures,
    });
    setShowEditModal(true);
  };

  // ✅ Toggle feature selection
  const handleFeatureToggle = (featureKey) => {
    setFormData(prev => {
      const currentFeatures = prev.features || [];
      const isSelected = currentFeatures.includes(featureKey);
      
      const newFeatures = isSelected
        ? currentFeatures.filter(f => f !== featureKey)
        : [...currentFeatures, featureKey];
      
      // console.log('Toggle feature:', featureKey, 'isSelected:', isSelected, 'New features:', newFeatures);
      
      return {
        ...prev,
        features: newFeatures
      };
    });
  };

  // ✅ Check if feature is selected
  const isFeatureSelected = (featureKey) => {
    return formData.features?.includes(featureKey) || false;
  };

  const handleSave = async () => {
    if (!permissions.isSuperAdmin) {
      toast.error("Only Super Admins can edit plans.");
      return;
    }

    if (!editingPlan) return;

    setIsSaving(true);
    try {
      // ✅ Ensure we're saving with normalized keys only
      const updateData = {
        name: formData.name,
        description: formData.description,
        price_monthly: parseFloat(formData.price_monthly) || 0,
        price_annually: parseFloat(formData.price_annually) || 0,
        is_active: formData.is_active,
        features: formData.features, // Already normalized by handleEdit and handleFeatureToggle
      };

      // console.log('Saving plan with features:', updateData.features);

      await SubscriptionPlan.update(editingPlan.id, updateData);

      const updatedPlans = plans.map(p =>
        p.id === editingPlan.id ? { ...p, ...updateData } : p
      );
      setPlans(updatedPlans);

      toast.success(`"${formData.name}" updated successfully!`);
      setShowEditModal(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (planId) => {
    if (!permissions.isSuperAdmin) {
      toast.error("Only Super Admins can delete plans.");
      return;
    }

    const planToDelete = plans.find(p => p.id === planId);
    
    if (planToDelete?.is_system_plan) {
      toast.error("System plans (Free, Premium, VIP) cannot be deleted.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${planToDelete?.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await SubscriptionPlan.delete(planId);
      setPlans(plans.filter(p => p.id !== planId));
      toast.success(`"${planToDelete?.name}" deleted successfully.`);
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan.');
    }
  };

  if (!permissions.canView) {
    return <div className="text-center p-8">You do not have permission to view plans.</div>;
  }

  // ✅ Show loading state while features are loading
  if (featuresLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-700">Loading features...</p>
      </div>
    );
  }

  // ✅ Group features by tier for better organization
  const featuresByTier = {
    basic: AVAILABLE_FEATURES.filter(f => f.tier === 'basic'),
    premium: AVAILABLE_FEATURES.filter(f => f.tier === 'premium'),
    vip: AVAILABLE_FEATURES.filter(f => f.tier === 'vip'),
  };

  return (
    <div className="space-y-6">
      {/* ✅ Show warning if no features exist */}
      {AVAILABLE_FEATURES.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ No features available. Please add features in the Feature Management tab first, or ensure they are properly configured.
          </p>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <AdminPlanCard
            key={plan.id}
            plan={plan}
            onEdit={handleEdit}
            allPlans={plans}
            availableFeatures={AVAILABLE_FEATURES} // Pass dynamically loaded features
          />
        ))}
      </div>

      {/* Edit Modal - ✅ ENHANCED with checkboxes */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan: {editingPlan?.name}</DialogTitle>
            <DialogDescription>
              Update plan details, pricing, and select features using checkboxes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Premium, VIP"
                disabled={editingPlan?.is_system_plan}
              />
              {editingPlan?.is_system_plan && (
                <p className="text-xs text-amber-600 mt-1">System plan names cannot be changed</p>
              )}
            </div>

            <div>
              <Label htmlFor="plan-description">Description</Label>
              <Textarea
                id="plan-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the plan"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price-monthly">Monthly Price (₹)</Label>
                <Input
                  id="price-monthly"
                  type="number"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                  placeholder="499"
                />
              </div>

              <div>
                <Label htmlFor="price-annually">Annual Price (₹)</Label>
                <Input
                  id="price-annually"
                  type="number"
                  value={formData.price_annually}
                  onChange={(e) => setFormData({ ...formData, price_annually: e.target.value })}
                  placeholder="4999"
                />
              </div>
            </div>

            {/* ✅ Feature Selection with Checkboxes - DYNAMICALLY LOADED */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Plan Features</Label>
              <p className="text-sm text-gray-500 mb-4">
                Choose which features should be included in this subscription plan
              </p>

              <div className="space-y-6">
                {/* Basic Features */}
                {featuresByTier.basic.length > 0 && (
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <UserCircle className="w-4 h-4" />
                      Basic Tier Features
                    </h4>
                    <div className="space-y-3">
                      {featuresByTier.basic.map((feature) => (
                        <div key={feature.key} className="flex items-start gap-3 p-2 rounded hover:bg-blue-100 transition-colors">
                          <Checkbox
                            id={feature.key}
                            checked={isFeatureSelected(feature.key)}
                            onCheckedChange={() => handleFeatureToggle(feature.key)}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={feature.key}
                              className="text-sm font-medium text-gray-900 cursor-pointer"
                            >
                              {feature.name}
                            </label>
                            <p className="text-xs text-gray-600 mt-0.5">{feature.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Premium Features */}
                {featuresByTier.premium.length > 0 && (
                  <div className="border rounded-lg p-4 bg-purple-50">
                    <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Premium Tier Features
                    </h4>
                    <div className="space-y-3">
                      {featuresByTier.premium.map((feature) => (
                        <div key={feature.key} className="flex items-start gap-3 p-2 rounded hover:bg-purple-100 transition-colors">
                          <Checkbox
                            id={feature.key}
                            checked={isFeatureSelected(feature.key)}
                            onCheckedChange={() => handleFeatureToggle(feature.key)}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={feature.key}
                              className="text-sm font-medium text-gray-900 cursor-pointer"
                            >
                              {feature.name}
                            </label>
                            <p className="text-xs text-gray-600 mt-0.5">{feature.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* VIP Features */}
                {featuresByTier.vip.length > 0 && (
                  <div className="border rounded-lg p-4 bg-yellow-50">
                    <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      VIP Tier Features
                    </h4>
                    <div className="space-y-3">
                      {featuresByTier.vip.map((feature) => (
                        <div key={feature.key} className="flex items-start gap-3 p-2 rounded hover:bg-yellow-100 transition-colors">
                          <Checkbox
                            id={feature.key}
                            checked={isFeatureSelected(feature.key)}
                            onCheckedChange={() => handleFeatureToggle(feature.key)}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={feature.key}
                              className="text-sm font-medium text-gray-900 cursor-pointer"
                            >
                              {feature.name}
                            </label>
                            <p className="text-xs text-gray-600 mt-0.5">{feature.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Features Summary */}
              {formData.features?.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected Features ({formData.features.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((featureKey) => {
                      const feature = AVAILABLE_FEATURES.find(f => f.key === featureKey);
                      return (
                        <Badge key={featureKey} variant="outline" className="text-xs">
                          {feature?.name || formatFeatureName(featureKey, AVAILABLE_FEATURES)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is-active">Plan is Active</Label>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            {!editingPlan?.is_system_plan && (
              <Button
                variant="destructive"
                onClick={() => {
                  setShowEditModal(false);
                  handleDelete(editingPlan.id);
                }}
              >
                Delete Plan
              </Button>
            )}
            <div className="flex gap-3 ml-auto">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim()}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
