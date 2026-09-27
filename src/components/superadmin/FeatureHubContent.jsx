
import React, { useState, useEffect } from 'react';
import { FeatureConfig } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Star, Users, CheckCircle, Lock, Sparkles, AlertCircle, Shield, Plus, Edit, Trash2, Eye, EyeOff, Calendar, Flag, Gem } from 'lucide-react'; // Added Gem import
import { toast } from 'sonner';
import { FEATURE_REGISTRY } from '../features/FeatureRegistry';
import FeatureEditModal from './features/FeatureEditModal';
import FeatureDetailModal from './features/FeatureDetailModal';

export default function FeatureHubContent({ user }) {
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFeature, setEditingFeature] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [activeTab, setActiveTab] = useState('basic'); // New state for active tab

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setIsLoading(true);
      let fetchedFeatures = await FeatureConfig.list();
      
      // If no features in database, initialize from FeatureRegistry
      if (fetchedFeatures.length === 0) {
        console.log('Initializing features from registry...');
        const registryFeatures = Object.values(FEATURE_REGISTRY).map(f => ({
          feature_key: f.key,
          feature_name: f.name,
          description: f.description,
          icon_name: f.icon.name || 'Star',
          tier: f.tier,
          status: f.status,
          visible_to_users: false,
          sort_order: 0
        }));
        
        await FeatureConfig.bulkCreate(registryFeatures);
        fetchedFeatures = await FeatureConfig.list();
      }
      
      setFeatures(fetchedFeatures.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    } catch (error) {
      console.error('Error loading features:', error);
      toast.error('Failed to load features');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeatureClick = (feature) => {
    setSelectedFeature(feature);
    setShowDetailModal(true);
  };

  const handleEditClick = (e, feature) => {
    e.stopPropagation();
    setEditingFeature(feature);
    setShowEditModal(true);
  };

  const handleDeleteClick = async (e, feature) => {
    e.stopPropagation();
    
    const confirmed = window.confirm(`Are you sure you want to delete the feature "${feature.feature_name}"?`);
    if (!confirmed) return;

    try {
      await FeatureConfig.delete(feature.id);
      setFeatures(features.filter(f => f.id !== feature.id));
      toast.success('Feature deleted successfully');
    } catch (error) {
      console.error('Error deleting feature:', error);
      toast.error('Failed to delete feature');
    }
  };

  const handleToggleVisibility = async (e, feature) => {
    e.stopPropagation();
    
    try {
      // Create clean payload - only include editable fields
      const cleanPayload = {
        feature_key: feature.feature_key,
        feature_name: feature.feature_name,
        description: feature.description,
        icon_name: feature.icon_name,
        tier: feature.tier,
        status: feature.status,
        release_date: feature.release_date || null,
        release_quarter: feature.release_quarter || null,
        visible_to_users: !feature.visible_to_users, // Toggle visibility
        page_url: feature.page_url || null,
        documentation_url: feature.documentation_url || null,
        priority: feature.priority || 0,
        developer_notes: feature.developer_notes || null,
        sort_order: feature.sort_order || 0
      };

      await FeatureConfig.update(feature.id, cleanPayload);
      
      // Update local state
      const updatedFeature = { ...feature, ...cleanPayload };
      setFeatures(features.map(f => f.id === feature.id ? updatedFeature : f));
      
      toast.success(`Feature ${updatedFeature.visible_to_users ? 'shown' : 'hidden'} to users`);
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  const handleSaveFeature = async (featureData) => {
    try {
      // Create clean payload - strip built-in fields that should not be sent
      const cleanPayload = {
        feature_key: featureData.feature_key,
        feature_name: featureData.feature_name,
        description: featureData.description || null,
        icon_name: featureData.icon_name || 'Star',
        tier: featureData.tier,
        status: featureData.status,
        release_date: featureData.release_date || null,
        release_quarter: featureData.release_quarter || null,
        visible_to_users: featureData.visible_to_users || false,
        page_url: featureData.page_url || null,
        documentation_url: featureData.documentation_url || null,
        priority: featureData.priority || 0,
        developer_notes: featureData.developer_notes || null,
        sort_order: featureData.sort_order || 0
      };

      if (editingFeature && editingFeature.id) { // Check for editingFeature.id to distinguish update from create
        // Update existing feature
        await FeatureConfig.update(editingFeature.id, cleanPayload);
        setFeatures(features.map(f => f.id === editingFeature.id ? { ...f, ...cleanPayload } : f));
        toast.success('Feature updated successfully');
      } else {
        // Create new feature
        const newFeature = await FeatureConfig.create(cleanPayload);
        setFeatures([...features, newFeature]);
        toast.success('Feature created successfully');
      }
      
      setShowEditModal(false);
      setEditingFeature(null);
    } catch (error) {
      console.error('Error saving feature:', error);
      toast.error('Failed to save feature');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'live': return 'bg-buy-muted text-buy-muted-foreground border-buy/30';
      case 'partial': return 'bg-hold-muted text-hold-muted-foreground border-hold/30';
      case 'placeholder': return 'bg-premium-muted text-protocall-premium-text border-protocall-premium-light';
      case 'deprecated': return 'bg-sell-muted text-sell-muted-foreground border-sell/30';
      default: return 'bg-surface-2 text-foreground border-border';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'live': return 'Live';
      case 'partial': return 'Partial';
      case 'placeholder': return 'Coming Soon';
      case 'deprecated': return 'Deprecated';
      default: return status;
    }
  };

  const renderFeatureCard = (feature) => {
    const IconComponent = FEATURE_REGISTRY[feature.feature_key]?.icon || Star;
    
    return (
      <Card 
        key={feature.id}
        className="relative cursor-pointer hover:shadow-lg transition-all border-2"
        onClick={() => handleFeatureClick(feature)}
      >
        <CardContent className="p-6">
          {/* Status Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Badge className={`${getStatusColor(feature.status)} border`}>
              {getStatusLabel(feature.status)}
            </Badge>
            {feature.visible_to_users && (
              <Badge variant="outline" className="bg-premium-muted text-protocall-blue border-protocall-premium-light">
                <Eye className="w-3 h-3 mr-1" />
                Visible
              </Badge>
            )}
          </div>

          {/* Feature Icon & Info */}
          <div className="mb-4 mt-6">
            <div className="w-12 h-12 bg-surface-2 rounded-xl flex items-center justify-center mb-3">
              <IconComponent className="w-6 h-6 text-protocall-premium-text" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-1">{feature.feature_name}</h3>
            <p className="text-sm text-subtle line-clamp-2">{feature.description}</p>
          </div>

          {/* Release Info */}
          {(feature.release_quarter || feature.release_date) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Calendar className="w-3 h-3" />
              <span>{feature.release_quarter || feature.release_date}</span>
            </div>
          )}

          {/* Priority Badge */}
          {feature.priority > 0 && (
            <div className="flex items-center gap-2 text-xs text-hold-muted-foreground mb-3">
              <Flag className="w-3 h-3" />
              <span>Priority: {feature.priority}</span>
            </div>
          )}

          {/* Admin Actions */}
          <div className="flex items-center gap-2 pt-3 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => handleEditClick(e, feature)}
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => handleToggleVisibility(e, feature)}
            >
              {feature.visible_to_users ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-sell-muted-foreground hover:bg-sell-muted"
              onClick={(e) => handleDeleteClick(e, feature)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFeatureGrid = (tier) => {
    const tierFeatures = features.filter(f => f.tier === tier);
    
    if (tierFeatures.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No features defined for this tier yet.</p>
          <Button
            onClick={() => {
              setEditingFeature({ tier });
              setShowEditModal(true);
            }}
            className="mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Feature
          </Button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tierFeatures.map(renderFeatureCard)}
      </div>
    );
  };

  const renderDisabledFeaturesGrid = () => {
    const disabledFeatures = features.filter(f => !f.visible_to_users);

    if (disabledFeatures.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No features are currently hidden from users.</p>
          <Button
            onClick={() => {
              setEditingFeature({ visible_to_users: false });
              setShowEditModal(true);
            }}
            className="mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Hidden Feature
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {disabledFeatures.map(renderFeatureCard)}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-subtle">Loading features...</p>
        </div>
      </div>
    );
  }

  const stats = {
    live: features.filter(f => f.status === 'live').length,
    comingSoon: features.filter(f => f.status === 'placeholder').length,
    partial: features.filter(f => f.status === 'partial').length,
    total: features.length
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-protocall-deep to-protocall-blue text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-6 h-6" />
                <Badge className="bg-hold text-hold-foreground border-0">
                  SuperAdmin Only
                </Badge>
              </div>
              <CardTitle className="text-3xl font-bold mb-2">Feature Hub & Roadmap Manager</CardTitle>
              <p className="text-white/80">Manage and visualize all platform features across subscription tiers</p>
            </div>
            <Button
              onClick={() => {
                setEditingFeature(null);
                setShowEditModal(true);
              }}
              className="bg-white text-protocall-premium-text hover:bg-premium-muted"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Feature
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Feature Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Features</p>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              </div>
              <Sparkles className="w-12 h-12 text-protocall-premium-text" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Live Features</p>
                <p className="text-3xl font-bold text-buy-muted-foreground">{stats.live}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-buy-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Coming Soon</p>
                <p className="text-3xl font-bold text-protocall-premium-text">{stats.comingSoon}</p>
              </div>
              <Sparkles className="w-12 h-12 text-protocall-premium-text" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Partial</p>
                <p className="text-3xl font-bold text-hold-muted-foreground">{stats.partial}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-hold-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Management Tabs */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-protocall-premium-text" />
            Feature & Module Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-transparent p-1 rounded-xl gap-2 mb-6">
              <TabsTrigger
                value="basic"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                <Users className="w-4 h-4" />
                Basic Features
              </TabsTrigger>

              <TabsTrigger
                value="premium"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                <Crown className="w-4 h-4" /> {/* Changed from Star to Crown as per outline */}
                Premium Features
              </TabsTrigger>

              <TabsTrigger
                value="vip"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                <Gem className="w-4 h-4" /> {/* Changed from Crown to Gem as per outline */}
                VIP Elite Features
              </TabsTrigger>

              <TabsTrigger
                value="disabled"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                <EyeOff className="w-4 h-4" />
                Disabled
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Basic Features</h3>
                  <p className="text-subtle">Core features available to all community members</p>
                </div>
                <Button
                  onClick={() => {
                    setEditingFeature({ tier: 'basic' });
                    setShowEditModal(true);
                  }}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Basic Feature
                </Button>
              </div>
              {renderFeatureGrid('basic')}
            </TabsContent>

            <TabsContent value="premium" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Premium Features</h3>
                  <p className="text-subtle">Advanced features for serious retail traders</p>
                </div>
                <Button
                  onClick={() => {
                    setEditingFeature({ tier: 'premium' });
                    setShowEditModal(true);
                  }}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Premium Feature
                </Button>
              </div>
              {renderFeatureGrid('premium')}
            </TabsContent>

            <TabsContent value="vip" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">VIP Elite Features</h3>
                  <p className="text-subtle">Ultimate package for professional traders</p>
                </div>
                <Button
                  onClick={() => {
                    setEditingFeature({ tier: 'vip' });
                    setShowEditModal(true);
                  }}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add VIP Feature
                </Button>
              </div>
              {renderFeatureGrid('vip')}
            </TabsContent>

            <TabsContent value="disabled" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Disabled Features</h3>
                  <p className="text-subtle">Features currently hidden from users</p>
                </div>
                <Button
                  onClick={() => {
                    setEditingFeature({ visible_to_users: false });
                    setShowEditModal(true);
                  }}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Disabled Feature
                </Button>
              </div>
              {renderDisabledFeaturesGrid()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modals */}
      {showEditModal && (
        <FeatureEditModal
          feature={editingFeature}
          onClose={() => {
            setShowEditModal(false);
            setEditingFeature(null);
          }}
          onSave={handleSaveFeature}
        />
      )}

      {showDetailModal && selectedFeature && (
        <FeatureDetailModal
          feature={selectedFeature}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedFeature(null);
          }}
          onEdit={() => {
            setEditingFeature(selectedFeature);
            setShowDetailModal(false);
            setShowEditModal(true);
          }}
        />
      )}
    </div>
  );
}
