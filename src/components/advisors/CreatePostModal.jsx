import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Lock, Users, Crown } from 'lucide-react';
import { AdvisorPlan } from '@/api/entities';
import { toast } from 'sonner';

export default function CreatePostModal({ open, onClose, onCreatePost, advisorId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    stock_symbol: '',
    recommendation_type: '',
    target_price: '',
    stop_loss: '',
    time_horizon: '',
    required_plan_id: null, // null = all subscribers can see
    post_type: 'recommendation'
  });

  useEffect(() => {
    if (open && advisorId) {
      loadPlans();
    }
  }, [open, advisorId]);

  const loadPlans = async () => {
    try {
      const advisorPlans = await AdvisorPlan.filter({ 
        advisor_id: advisorId, 
        is_active: true 
      });
      setPlans(advisorPlans.sort((a, b) => a.price - b.price)); // Sort by price ascending
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load plans');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast.error('Please fill in title and content');
      return;
    }

    setIsLoading(true);
    try {
      await onCreatePost(formData);
      setFormData({
        title: '',
        content: '',
        stock_symbol: '',
        recommendation_type: '',
        target_price: '',
        stop_loss: '',
        time_horizon: '',
        required_plan_id: null,
        post_type: 'recommendation'
      });
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanBadge = (planId) => {
    if (!planId) {
      return (
        <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
          <Users className="w-3 h-3" />
          All Subscribers
        </Badge>
      );
    }
    
    const plan = plans.find(p => p.id === planId);
    if (!plan) return null;
    
    const isHighTier = plan.price >= 2000;
    
    return (
      <Badge className={`flex items-center gap-1 ${
        isHighTier 
          ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white' 
          : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
      }`}>
        {isHighTier ? <Crown className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
        {plan.name} Only
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Advisory Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plan Access Control - PROMINENT */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
            <Label className="text-base font-semibold text-slate-900 mb-3 block">
              👥 Who Can See This Post?
            </Label>
            <Select
              value={formData.required_plan_id || 'all'}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                required_plan_id: value === 'all' ? null : value 
              })}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>All Subscribers (Any Plan)</span>
                  </div>
                </SelectItem>
                {plans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div className="flex items-center gap-2">
                      {plan.price >= 2000 ? (
                        <Crown className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Lock className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="font-semibold">{plan.name}</span>
                      <span className="text-xs text-slate-500">
                        (₹{plan.price}/{plan.billing_interval})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-600">Selected:</span>
              {getPlanBadge(formData.required_plan_id)}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              💡 <strong>Tip:</strong> Choose "All Subscribers" for general content, or select a specific plan for exclusive premium insights.
            </p>
          </div>

          {/* Post Type */}
          <div>
            <Label htmlFor="post_type">Post Type</Label>
            <Select
              value={formData.post_type}
              onValueChange={(value) => setFormData({ ...formData, post_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommendation">Stock Recommendation</SelectItem>
                <SelectItem value="market_analysis">Market Analysis</SelectItem>
                <SelectItem value="educational">Educational Content</SelectItem>
                <SelectItem value="update">Market Update</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Post Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Strong Buy: RELIANCE - Target ₹3000"
              required
            />
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">Post Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Provide detailed analysis, rationale, and reasoning for your recommendation..."
              rows={6}
              required
            />
          </div>

          {/* Stock Symbol */}
          <div>
            <Label htmlFor="stock_symbol">Stock Symbol</Label>
            <Input
              id="stock_symbol"
              value={formData.stock_symbol}
              onChange={(e) => setFormData({ ...formData, stock_symbol: e.target.value.toUpperCase() })}
              placeholder="e.g., RELIANCE, TCS, INFY"
            />
          </div>

          {/* Recommendation Type */}
          <div>
            <Label htmlFor="recommendation_type">Recommendation</Label>
            <Select
              value={formData.recommendation_type}
              onValueChange={(value) => setFormData({ ...formData, recommendation_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recommendation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="hold">Hold</SelectItem>
                <SelectItem value="watch">Watch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Price & Stop Loss */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target_price">Target Price (₹)</Label>
              <Input
                id="target_price"
                type="number"
                value={formData.target_price}
                onChange={(e) => setFormData({ ...formData, target_price: e.target.value })}
                placeholder="e.g., 3000"
              />
            </div>
            <div>
              <Label htmlFor="stop_loss">Stop Loss (₹)</Label>
              <Input
                id="stop_loss"
                type="number"
                value={formData.stop_loss}
                onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                placeholder="e.g., 2500"
              />
            </div>
          </div>

          {/* Time Horizon */}
          <div>
            <Label htmlFor="time_horizon">Time Horizon</Label>
            <Select
              value={formData.time_horizon}
              onValueChange={(value) => setFormData({ ...formData, time_horizon: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time horizon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short_term">Short Term (1-3 months)</SelectItem>
                <SelectItem value="medium_term">Medium Term (3-12 months)</SelectItem>
                <SelectItem value="long_term">Long Term (1+ years)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Post'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}