
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Building, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Youtube, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import DisableContentCreatorsPage from '../lifecycle/DisableContentCreatorsPage';

export default function ManageSite({ settings, onChange }) {
  const [localSettings, setLocalSettings] = useState({
    site_name: settings?.site_name || 'Protocol',
    site_description: settings?.site_description || 'Advanced Financial Trading Platform',
    contact_email: settings?.contact_email || 'hello@protocol.com',
    contact_phone: settings?.contact_phone || '+91 98765 43210',
    company_address: settings?.company_address || 'Mumbai, India',
    facebook_url: settings?.facebook_url || '',
    twitter_url: settings?.twitter_url || '',
    instagram_url: settings?.instagram_url || '',
    linkedin_url: settings?.linkedin_url || '',
    youtube_url: settings?.youtube_url || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalSettings({
      site_name: settings?.site_name || 'Protocol',
      site_description: settings?.site_description || 'Advanced Financial Trading Platform',
      contact_email: settings?.contact_email || 'hello@protocol.com',
      contact_phone: settings?.contact_phone || '+91 98765 43210',
      company_address: settings?.company_address || 'Mumbai, India',
      facebook_url: settings?.facebook_url || '',
      twitter_url: settings?.twitter_url || '',
      instagram_url: settings?.instagram_url || '',
      linkedin_url: settings?.linkedin_url || '',
      youtube_url: settings?.youtube_url || ''
    });
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onChange(localSettings);
      toast.success('Site settings updated successfully!');
    } catch (error) {
      console.error('Error saving site settings:', error);
      toast.error('Failed to save site settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Add the helper component at the top */}
      <DisableContentCreatorsPage />

      {/* Info Banner */}
      <div className="bg-premium-muted border border-protocall-premium-light rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-primary">Site Configuration</h4>
            <p className="text-sm text-primary mt-1">
              Configure your platform's basic information and social media presence. These settings appear across your application.
            </p>
          </div>
        </div>
      </div>

      {/* Combined Site Settings Card */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="bg-surface-2 border-b"> {/* Retaining original header style */}
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-protocall-deep to-protocall-blue rounded-lg">
              <Globe className="w-5 h-5 text-white" /> {/* Outline specified Globe icon */}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Site Settings</h3> {/* Outline specified Site Settings title */}
              <p className="text-sm text-subtle mt-1">Manage your platform's core details and online presence</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-8"> {/* Increased space-y for sections */}
          {/* Basic Information Section */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              Platform Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="site_name" className="text-sm font-semibold text-subtle flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Platform Name
                </Label>
                <Input
                  id="site_name"
                  value={localSettings.site_name}
                  onChange={(e) => handleInputChange('site_name', e.target.value)}
                  placeholder="Enter platform name"
                  className="border-border focus:border-primary focus:ring-2 focus:ring-protocall-premium-light rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email" className="text-sm font-semibold text-subtle flex items-center gap-2">
                  <Mail className="w-4 h-4 text-buy-muted-foreground" />
                  Contact Email
                </Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={localSettings.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  placeholder="support@yourplatform.com"
                  className="border-border focus:border-buy focus:ring-2 focus:ring-buy/30 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone" className="text-sm font-semibold text-subtle flex items-center gap-2">
                  <Phone className="w-4 h-4 text-protocall-premium-text" />
                  Contact Phone
                </Label>
                <Input
                  id="contact_phone"
                  value={localSettings.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="border-border focus:border-primary focus:ring-2 focus:ring-protocall-premium-light rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_address" className="text-sm font-semibold text-subtle flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sell-muted-foreground" />
                  Company Address
                </Label>
                <Input
                  id="company_address"
                  value={localSettings.company_address}
                  onChange={(e) => handleInputChange('company_address', e.target.value)}
                  placeholder="Mumbai, India"
                  className="border-border focus:border-sell focus:ring-2 focus:ring-sell/30 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2 mt-6"> {/* Added top margin for description to separate from other inputs */}
              <Label htmlFor="site_description" className="text-sm font-semibold text-subtle flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" />
                Platform Description
              </Label>
              <Textarea
                id="site_description"
                value={localSettings.site_description}
                onChange={(e) => handleInputChange('site_description', e.target.value)}
                placeholder="Brief description of your platform"
                rows={3}
                className="border-border focus:border-primary focus:ring-2 focus:ring-protocall-premium-light rounded-lg resize-none"
              />
            </div>
          </div>

          {/* Social Media Links Section */}
          <div className="pt-6 border-t border-divider"> {/* Added top border for visual separation */}
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-protocall-premium-text" />
              Social Media Presence
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="facebook_url" className="text-sm font-semibold text-subtle flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-primary" />
                  Facebook Page
                </Label>
                <Input
                  id="facebook_url"
                  value={localSettings.facebook_url}
                  onChange={(e) => handleInputChange('facebook_url', e.target.value)}
                  placeholder="https://facebook.com/yourpage"
                  className="border-border focus:border-primary focus:ring-2 focus:ring-protocall-premium-light rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter_url" className="text-sm font-semibold text-subtle flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-protocall-premium-light" />
                  Twitter/X Profile
                </Label>
                <Input
                  id="twitter_url"
                  value={localSettings.twitter_url}
                  onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                  placeholder="https://twitter.com/yourhandle"
                  className="border-border focus:border-primary focus:ring-2 focus:ring-protocall-premium-light rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram_url" className="text-sm font-semibold text-subtle flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-protocall-premium-text" />
                  Instagram Profile
                </Label>
                <Input
                  id="instagram_url"
                  value={localSettings.instagram_url}
                  onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                  placeholder="https://instagram.com/yourhandle"
                  className="border-border focus:border-primary focus:ring-2 focus:ring-protocall-premium-light rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin_url" className="text-sm font-semibold text-subtle flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-primary" />
                  LinkedIn Company Page
                </Label>
                <Input
                  id="linkedin_url"
                  value={localSettings.linkedin_url}
                  onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/company/yourcompany"
                  className="border-border focus:border-primary focus:ring-2 focus:ring-protocall-premium-light rounded-lg"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="youtube_url" className="text-sm font-semibold text-subtle flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-sell-muted-foreground" />
                  YouTube Channel
                </Label>
                <Input
                  id="youtube_url"
                  value={localSettings.youtube_url}
                  onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                  placeholder="https://youtube.com/channel/yourchannelid"
                  className="border-border focus:border-sell focus:ring-2 focus:ring-sell/30 rounded-lg"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="px-8 py-2 bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
        >
          {isSaving ? 'Saving...' : 'Save Site Settings'}
        </Button>
      </div>
    </div>
  );
}
