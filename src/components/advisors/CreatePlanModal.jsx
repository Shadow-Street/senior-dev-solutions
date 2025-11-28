import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign, AlertCircle, Sparkles, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function CreatePlanModal({ open, onClose, onSubmit, editingPlan = null }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    billing_interval: 'monthly',
    features: [''],
    monthly_post_limit: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingPlan) {
      setFormData({
        name: editingPlan.name || '',
        description: editingPlan.description || '',
        price: editingPlan.price?.toString() || '',
        billing_interval: editingPlan.billing_interval || 'monthly',
        features: editingPlan.features && editingPlan.features.length > 0 ? editingPlan.features : [''],
        monthly_post_limit: editingPlan.monthly_post_limit?.toString() || ''
      });
    } else {
      // Reset form for new plan
      setFormData({
        name: '',
        description: '',
        price: '',
        billing_interval: 'monthly',
        features: [''],
        monthly_post_limit: ''
      });
    }
  }, [editingPlan, open]);

  const suggestedPlans = [
    { 
      name: 'Basic', 
      description: 'Essential advisory services for beginners',
      icon: '📊',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      name: 'Premium', 
      description: 'Advanced insights and priority support',
      icon: '⭐',
      color: 'from-purple-500 to-pink-500'
    },
    { 
      name: 'VIP', 
      description: 'Exclusive research and personalized guidance',
      icon: '👑',
      color: 'from-amber-500 to-orange-500'
    }
  ];

  const handleSuggestedPlanClick = (planName) => {
    setFormData(prev => ({
      ...prev,
      name: planName
    }));
  };

  const handleAddFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleFeatureChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    const filteredFeatures = formData.features.filter(f => f.trim() !== '');
    
    if (filteredFeatures.length === 0) {
      toast.error('Please add at least one feature');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        price: parseFloat(formData.price),
        features: filteredFeatures,
        monthly_post_limit: formData.monthly_post_limit ? parseInt(formData.monthly_post_limit) : null,
        is_active: editingPlan ? editingPlan.is_active : true
      }, editingPlan?.id);
    } catch (error) {
      console.error('Error saving plan:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditMode = !!editingPlan;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Edit className="w-5 h-5 text-blue-600" />
                Edit Subscription Plan
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5 text-green-600" />
                Create Subscription Plan
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Suggested Plan Names - Only show when creating */}
          {!isEditMode && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <Label className="text-base font-semibold text-slate-900">Quick Start - Choose a Plan Name</Label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {suggestedPlans.map((plan) => (
                  <button
                    key={plan.name}
                    type="button"
                    onClick={() => handleSuggestedPlanClick(plan.name)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                      formData.name === plan.name
                        ? 'bg-gradient-to-r ' + plan.color + ' text-white border-transparent shadow-lg'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-2xl mb-1">{plan.icon}</div>
                    <div className={`font-bold text-sm ${formData.name === plan.name ? 'text-white' : 'text-slate-900'}`}>
                      {plan.name}
                    </div>
                    <div className={`text-xs mt-1 ${formData.name === plan.name ? 'text-white/90' : 'text-slate-500'}`}>
                      {plan.description}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-2">
                💡 Click a suggested plan or enter your own custom name below
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
              placeholder="e.g., Basic, Premium, VIP, or custom name"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              placeholder="Describe what subscribers get with this plan..."
              className="h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
                placeholder="999"
                required
              />
            </div>
            <div>
              <Label htmlFor="billing_interval">Billing Cycle *</Label>
              <Select 
                value={formData.billing_interval} 
                onValueChange={(value) => setFormData(prev => ({...prev, billing_interval: value}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <Label htmlFor="monthly_post_limit" className="text-base font-semibold text-slate-900 mb-2 block">
              📅 Monthly Post Limit
            </Label>
            <Input
              id="monthly_post_limit"
              type="number"
              min="0"
              value={formData.monthly_post_limit}
              onChange={(e) => setFormData(prev => ({...prev, monthly_post_limit: e.target.value}))}
              placeholder="e.g., 5 (leave empty for unlimited)"
              className="mb-2"
            />
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Set how many exclusive posts you'll publish for this plan per month. 
                Leave empty for unlimited posts. This helps you track your commitment to subscribers.
              </p>
            </div>
          </div>

          <div>
            <Label>Features *</Label>
            <div className="space-y-2 mt-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    placeholder="e.g., Daily stock recommendations"
                  />
                  {formData.features.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRemoveFeature(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddFeature}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Feature
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> {isEditMode 
                ? 'Changes will be applied immediately. Existing subscribers will see the updated plan details.' 
                : 'This plan will be immediately available for users to subscribe. You can deactivate it anytime from the plans list.'}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className={isEditMode ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}
            >
              {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Plan' : 'Create Plan')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}