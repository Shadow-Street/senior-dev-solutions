import React, { useState, useEffect } from 'react';
import { FeatureConfig } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Shield, Sparkles, Crown, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FeatureManager({ permissions }) {
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    feature_key: '',
    feature_name: '',
    description: '',
    tier: 'basic',
    status: 'live',
  });

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setIsLoading(true);
      // Load all features sorted by tier and sort_order
      const allFeatures = await FeatureConfig.list('-tier', 100);
      setFeatures(allFeatures);
    } catch (error) {
      console.error('Error loading features:', error);
      toast.error('Failed to load features');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingFeature(null);
    setFormData({
      feature_key: '',
      feature_name: '',
      description: '',
      tier: 'basic',
      status: 'live',
    });
    setShowModal(true);
  };

  const handleEdit = (feature) => {
    setEditingFeature(feature);
    setFormData({
      feature_key: feature.feature_key,
      feature_name: feature.feature_name,
      description: feature.description || '',
      tier: feature.tier,
      status: feature.status || 'live',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!permissions.isSuperAdmin) {
      toast.error('Only Super Admins can manage features');
      return;
    }

    if (!formData.feature_key || !formData.feature_name) {
      toast.error('Feature key and name are required');
      return;
    }

    // Validate feature key format (lowercase, underscores only)
    if (!/^[a-z_]+$/.test(formData.feature_key)) {
      toast.error('Feature key must be lowercase letters and underscores only');
      return;
    }

    setIsSaving(true);
    try {
      if (editingFeature) {
        // Update existing feature
        await FeatureConfig.update(editingFeature.id, {
          feature_name: formData.feature_name,
          description: formData.description,
          tier: formData.tier,
          status: formData.status,
        });
        toast.success('Feature updated successfully!');
      } else {
        // Check if feature key already exists
        const existingFeatures = await FeatureConfig.filter({ 
          feature_key: formData.feature_key 
        });
        
        if (existingFeatures.length > 0) {
          toast.error('Feature key already exists. Please use a unique key.');
          setIsSaving(false);
          return;
        }

        // Create new feature
        await FeatureConfig.create({
          feature_key: formData.feature_key,
          feature_name: formData.feature_name,
          description: formData.description,
          tier: formData.tier,
          status: formData.status,
          module_type: 'feature',
        });
        toast.success('Feature created successfully!');
      }

      setShowModal(false);
      loadFeatures();
    } catch (error) {
      console.error('Error saving feature:', error);
      toast.error('Failed to save feature');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (feature) => {
    if (!permissions.isSuperAdmin) {
      toast.error('Only Super Admins can delete features');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${feature.feature_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await FeatureConfig.delete(feature.id);
      toast.success('Feature deleted successfully');
      loadFeatures();
    } catch (error) {
      console.error('Error deleting feature:', error);
      toast.error('Failed to delete feature');
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'vip': return <Crown className="w-4 h-4" />;
      case 'premium': return <Sparkles className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'vip': return 'bg-hold-muted text-hold-muted-foreground border-hold/30';
      case 'premium': return 'bg-premium-muted text-protocall-premium-text border-protocall-premium-light';
      default: return 'bg-premium-muted text-protocall-blue border-protocall-premium-light';
    }
  };

  if (!permissions.canView) {
    return <div className="text-center p-8">You do not have permission to view features.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-protocall-blue" />
      </div>
    );
  }

  // Group features by tier
  const featuresByTier = {
    basic: features.filter(f => f.tier === 'basic'),
    premium: features.filter(f => f.tier === 'premium'),
    vip: features.filter(f => f.tier === 'vip'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Feature Management</h2>
          <p className="text-sm text-subtle mt-1">
            Create and manage features that appear in subscription plan editors
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-protocall-blue hover:bg-protocall-blue">
          <Plus className="w-4 h-4 mr-2" />
          Add New Feature
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-surface-2 border-protocall-premium-light">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-protocall-blue">{features.length}</div>
            <div className="text-sm text-protocall-blue">Total Features</div>
          </CardContent>
        </Card>
        <Card className="bg-surface-2 border-protocall-premium-light">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-protocall-blue">{featuresByTier.basic.length}</div>
            <div className="text-sm text-protocall-blue">Basic Features</div>
          </CardContent>
        </Card>
        <Card className="bg-surface-2 border-protocall-premium-light">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-protocall-premium-text">{featuresByTier.premium.length}</div>
            <div className="text-sm text-protocall-premium-text">Premium Features</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-surface-2 to-hold-muted border-hold/30">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-hold-muted-foreground">{featuresByTier.vip.length}</div>
            <div className="text-sm text-hold-muted-foreground">VIP Features</div>
          </CardContent>
        </Card>
      </div>

      {/* Feature List by Tier */}
      <div className="space-y-6">
        {/* Basic Features */}
        <Card className="bg-premium-muted border-2 border-protocall-premium-light">
          <CardHeader className="bg-premium-muted border-b border-protocall-premium-light">
            <CardTitle className="flex items-center gap-2 text-protocall-blue">
              <Shield className="w-5 h-5" />
              Basic Tier Features ({featuresByTier.basic.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {featuresByTier.basic.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No basic features yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuresByTier.basic.map(feature => (
                  <div key={feature.id} className="p-4 bg-white rounded-lg border border-protocall-premium-light hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{feature.feature_name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{feature.feature_key}</p>
                        {feature.description && (
                          <p className="text-sm text-subtle mt-2">{feature.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(feature)}
                          className="hover:bg-premium-muted"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(feature)}
                          className="hover:bg-sell-muted text-sell-muted-foreground"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Premium Features */}
        <Card className="bg-premium-muted border-2 border-protocall-premium-light">
          <CardHeader className="bg-premium-muted border-b border-protocall-premium-light">
            <CardTitle className="flex items-center gap-2 text-protocall-premium-text">
              <Sparkles className="w-5 h-5" />
              Premium Tier Features ({featuresByTier.premium.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {featuresByTier.premium.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No premium features yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuresByTier.premium.map(feature => (
                  <div key={feature.id} className="p-4 bg-white rounded-lg border border-protocall-premium-light hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{feature.feature_name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{feature.feature_key}</p>
                        {feature.description && (
                          <p className="text-sm text-subtle mt-2">{feature.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(feature)}
                          className="hover:bg-premium-muted"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(feature)}
                          className="hover:bg-sell-muted text-sell-muted-foreground"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* VIP Features */}
        <Card className="bg-hold-muted border-2 border-hold/30">
          <CardHeader className="bg-hold-muted border-b border-hold/30">
            <CardTitle className="flex items-center gap-2 text-hold-muted-foreground">
              <Crown className="w-5 h-5" />
              VIP Tier Features ({featuresByTier.vip.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {featuresByTier.vip.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No VIP features yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuresByTier.vip.map(feature => (
                  <div key={feature.id} className="p-4 bg-white rounded-lg border border-hold/30 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{feature.feature_name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{feature.feature_key}</p>
                        {feature.description && (
                          <p className="text-sm text-subtle mt-2">{feature.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(feature)}
                          className="hover:bg-hold-muted"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(feature)}
                          className="hover:bg-sell-muted text-sell-muted-foreground"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFeature ? 'Edit Feature' : 'Add New Feature'}
            </DialogTitle>
            <DialogDescription>
              {editingFeature 
                ? 'Update the feature details below' 
                : 'Create a new feature that will appear in subscription plan editors'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="feature-key">
                Feature Key * 
                <span className="text-xs text-muted-foreground ml-2">(lowercase, underscores only)</span>
              </Label>
              <Input
                id="feature-key"
                value={formData.feature_key}
                onChange={(e) => setFormData({ ...formData, feature_key: e.target.value })}
                placeholder="e.g., premium_chat_rooms"
                disabled={!!editingFeature}
                className="font-mono"
              />
              {!editingFeature && (
                <p className="text-xs text-muted-foreground mt-1">
                  This is the unique identifier used in code. Cannot be changed after creation.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="feature-name">Feature Name *</Label>
              <Input
                id="feature-name"
                value={formData.feature_name}
                onChange={(e) => setFormData({ ...formData, feature_name: e.target.value })}
                placeholder="e.g., Premium Chat Rooms"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this feature provides"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="tier">Subscription Tier *</Label>
              <Select
                value={formData.tier}
                onValueChange={(value) => setFormData({ ...formData, tier: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (Free)</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.feature_key || !formData.feature_name}
              className="bg-protocall-blue hover:bg-protocall-blue"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingFeature ? 'Update Feature' : 'Create Feature'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}