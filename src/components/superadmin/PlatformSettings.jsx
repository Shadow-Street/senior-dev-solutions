
import React, { useState, useEffect, useCallback } from 'react';
import { PlatformSetting } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Save, AlertCircle, Globe, Euro, Languages, FileText, KeyRound, CreditCard, Cog, Share2, Gift, BarChartHorizontal, LifeBuoy, Shield, Bell, Database, DollarSign } from 'lucide-react';
import { toast } from "sonner";
import ManageApiCredentials from './settings/ManageApiCredentials';
import ManagePaymentGateway from './settings/ManagePaymentGateway';
import ManageLocalization from './settings/ManageLocalization';
import ManageSite from './settings/ManageSite';
import ManageMonetization from './settings/ManageMonetization';
import ManagePlans from '../superadmin/subscriptions/PlanManager'; // Added this import
import ManageReferrals from './settings/ManageReferrals';
import ManageMetas from './settings/ManageMetas';
import ManageSupport from './settings/ManageSupport';
import ManageStaticPages from './settings/ManageStaticPages';
import ManageRoles from './settings/ManageRoles';
import ManageAlertSettings from './settings/ManageAlertSettings';
import ManageEntityConfig from './settings/ManageEntityConfig';
import RefundManagement from '../superadmin/RefundManagement'; // Added this import


const settingCategories = [
  { name: 'API Credentials', component: ManageApiCredentials, icon: KeyRound },
  { name: 'Payment Gateway', component: ManagePaymentGateway, icon: CreditCard },
  { name: 'Site Setting', component: ManageSite, icon: Cog },
  { name: 'Monetization Settings', component: ManageMonetization, icon: DollarSign },
  { name: 'Role Management', component: ManageRoles, icon: Shield },
  { name: 'Entity Configuration', component: ManageEntityConfig, icon: Database },
  { name: 'Alert Settings', component: ManageAlertSettings, icon: Bell },
  { name: 'Localization', component: ManageLocalization, icon: Globe },
  { name: 'Referral Settings', component: ManageReferrals, icon: Gift },
  { name: 'Metas (SEO)', component: ManageMetas, icon: BarChartHorizontal },
  { name: 'Static Pages', component: ManageStaticPages, icon: FileText },
  { name: 'Support', component: ManageSupport, icon: LifeBuoy }
];


export default function PlatformSettings({ refreshEntityConfigs }) {
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Entity Configuration'); // DEFAULT TO ENTITY CONFIGURATION

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedSettings = await PlatformSetting.list();
      const settingsMap = fetchedSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
      setSettings(settingsMap);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load platform settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSettingsChange = (newValues) => {
    setSettings((prev) => ({ ...prev, ...newValues }));
  };

  const handleSaveSettings = async (newSettingsToSave) => {
    setIsSaving(true);
    try {
      // Fetch all existing settings to find their IDs
      const existingSettings = await PlatformSetting.list();
      const existingSettingsMap = new Map(existingSettings.map((s) => [s.key, s.id]));

      const promises = Object.entries(newSettingsToSave).map(([key, value]) => {
        // Only save if the value is defined and not null
        if (value !== undefined && value !== null) {
          const payload = { key: key, value: String(value) };
          const existingId = existingSettingsMap.get(key);

          if (existingId) {
            // Update existing setting
            return PlatformSetting.update(existingId, payload);
          } else {
            // Create new setting
            return PlatformSetting.create({
              ...payload,
              description: `Setting for ${key}` // Add a description for new settings
            });
          }
        }
        return Promise.resolve(); // Resolve immediately for undefined/null values
      });

      await Promise.all(promises);
      toast.success("Settings saved successfully!");
      await loadSettings(); // Reload all settings to sync parent component's state
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const existingSettings = await PlatformSetting.list();
      const existingSettingsMap = new Map(existingSettings.map((s) => [s.key, s.id]));

      const promises = Object.entries(settings).map(([key, value]) => {
        if (value !== undefined && value !== null) {
          const payload = { key: key, value: String(value) };
          const existingId = existingSettingsMap.get(key);

          if (existingId) {
            return PlatformSetting.update(existingId, payload);
          } else {
            return PlatformSetting.create(payload);
          }
        }
        return Promise.resolve();
      });

      const written = (await Promise.all(promises)).filter(Boolean).length;
      // "Saved successfully" with nothing written is worse than an error: the
      // edit is lost and the screen says it is safe. This fires only when the
      // panel in view has lifted its values up; otherwise it says so.
      if (written === 0) {
        toast.info("Nothing to save — use the Save button inside the section first.");
      } else {
        toast.success(`Saved ${written} setting${written === 1 ? "" : "s"}.`);
      }
      await loadSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Force re-render when activeCategory changes
  const ActiveComponent = React.useMemo(() => {
    const category = settingCategories.find((c) => c.name === activeCategory);
    return category?.component || null;
  }, [activeCategory]);

  console.log('Current active category:', activeCategory); // Debug log
  console.log('Available categories:', settingCategories.map((c) => c.name)); // Debug log

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-subtle" />
            <CardTitle>Global Platform Settings</CardTitle>
          </div>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save All Settings'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="bg-hold-muted border-l-4 border-hold p-4 rounded-r-lg mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-hold-muted-foreground mt-1" />
              <div>
                <h4 className="font-semibold text-hold-muted-foreground">Master Control Panel</h4>
                <p className="text-sm text-hold-muted-foreground">Changes made here affect the entire platform. API keys and payment settings are sensitive. Proceed with caution.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <Card className="shadow-lg border-0 bg-white p-4">
            <nav className="space-y-1">
              {settingCategories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      console.log('Clicking category:', cat.name); // Debug log
                      setActiveCategory(cat.name);
                    }}
                    className={`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive ?
                        'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-md' :
                        'hover:bg-surface-2 text-subtle'}`
                    }>

                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                    <span className="text-right text-justify">{cat.name}</span>
                  </button>
                );

              })}
            </nav>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader>
              <CardTitle className="text-xl">{activeCategory}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ?
                <div className="text-center p-12">Loading settings...</div> :
                ActiveComponent ?
                  <ActiveComponent
                    settings={settings}
                    onChange={handleSettingsChange}
                    onSaveSpecificSettings={handleSaveSettings} // Pass the new save function to children
                    refreshEntityConfigs={refreshEntityConfigs} /> :
                  <div className="p-8 text-center">
                    <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-subtle">Component Not Found</h3>
                    <p className="text-subtle">The component for "{activeCategory}" could not be loaded.</p>
                  </div>
              }
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
