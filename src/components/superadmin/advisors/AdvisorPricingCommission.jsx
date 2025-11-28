import React, { useState, useEffect, useCallback } from 'react';
import { Advisor, User, PlatformSetting, CommissionSettings } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Percent, Save, DollarSign, TrendingUp, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from "sonner";

export default function AdvisorPricingCommission({ refreshEntityConfigs }) {
  const [globalRate, setGlobalRate] = useState(15);
  const [minPayoutThreshold, setMinPayoutThreshold] = useState(500);
  const [advisors, setAdvisors] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [advisorsList, commissionSetting] = await Promise.all([
        Advisor.filter({ status: 'approved' }).catch(() => []),
        CommissionSettings.filter({ entity_type: 'advisor' }).catch(() => [])
      ]);

      setAdvisors(advisorsList);

      if (commissionSetting && commissionSetting.length > 0) {
        const setting = commissionSetting[0];
        setGlobalRate(setting.default_rate || 15);
        setMinPayoutThreshold(setting.minimum_payout_threshold || 500);
        setOverrides(setting.overrides || {});
      }
    } catch (error) {
      console.error('Error loading commission settings:', error);
      toast.error('Failed to load commission settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const existingSetting = await CommissionSettings.filter({ entity_type: 'advisor' });
      
      const settingData = {
        entity_type: 'advisor',
        default_rate: parseFloat(globalRate),
        minimum_payout_threshold: parseFloat(minPayoutThreshold),
        overrides: overrides,
        is_active: true,
        description: 'Global commission settings for SEBI registered advisors'
      };

      if (existingSetting && existingSetting.length > 0) {
        await CommissionSettings.update(existingSetting[0].id, settingData);
      } else {
        await CommissionSettings.create(settingData);
      }

      toast.success('Commission settings saved successfully!');
      
      if (refreshEntityConfigs) {
        refreshEntityConfigs();
      }
    } catch (error) {
      console.error('Error saving commission settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOverrideChange = (advisorId, value) => {
    const newValue = value === '' ? null : parseFloat(value);
    setOverrides(prev => {
      const updated = { ...prev };
      if (newValue === null || isNaN(newValue)) {
        delete updated[advisorId];
      } else {
        updated[advisorId] = newValue;
      }
      return updated;
    });
  };

  const calculateEarnings = (grossAmount, advisorId) => {
    const commissionRate = overrides[advisorId] || globalRate;
    const platformFee = (grossAmount * commissionRate) / 100;
    const advisorPayout = grossAmount - platformFee;
    return { platformFee, advisorPayout, commissionRate };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Settings Card */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Global Commission Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="globalRate" className="text-sm font-semibold">
                Default Commission Rate (%)
              </Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  id="globalRate"
                  type="number"
                  value={globalRate}
                  onChange={(e) => setGlobalRate(e.target.value)}
                  className="pl-10"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <p className="text-xs text-slate-500">
                Platform commission percentage for advisor subscriptions
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minPayout" className="text-sm font-semibold">
                Minimum Payout Threshold (₹)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  id="minPayout"
                  type="number"
                  value={minPayoutThreshold}
                  onChange={(e) => setMinPayoutThreshold(e.target.value)}
                  className="pl-10"
                  min="0"
                  step="100"
                />
              </div>
              <p className="text-xs text-slate-500">
                Minimum amount advisors must earn before requesting payout
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Commission Calculation Example</p>
                <p className="text-xs text-blue-700 mt-1">
                  For a ₹1,000 subscription at {globalRate}% commission:
                  <br />
                  • Platform Fee: ₹{((1000 * globalRate) / 100).toFixed(2)}
                  <br />
                  • Advisor Payout: ₹{(1000 - (1000 * globalRate) / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings} 
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Advisor Override Settings */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Advisor-Specific Commission Overrides
          </CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Set custom commission rates for individual advisors. Leave empty to use global rate ({globalRate}%).
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {advisors.length > 0 ? (
              advisors.map(advisor => {
                const overrideValue = overrides[advisor.id];
                const effectiveRate = overrideValue || globalRate;
                const example = calculateEarnings(1000, advisor.id);

                return (
                  <div key={advisor.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <img
                        src={advisor.profile_image_url || `https://avatar.vercel.sh/${advisor.display_name}.png`}
                        alt={advisor.display_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-800">{advisor.display_name}</h4>
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            SEBI: {advisor.sebi_registration_number}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                          <div className="space-y-2">
                            <Label className="text-xs">Custom Commission Rate (%)</Label>
                            <div className="relative">
                              <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3 h-3" />
                              <Input
                                type="number"
                                value={overrideValue || ''}
                                onChange={(e) => handleOverrideChange(advisor.id, e.target.value)}
                                placeholder={`${globalRate} (default)`}
                                className="pl-9 text-sm"
                                min="0"
                                max="100"
                                step="0.1"
                              />
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-600 mb-1">Effective Rate</p>
                            <div className="flex items-center gap-2">
                              <Badge className={overrideValue ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                                {effectiveRate}%
                              </Badge>
                              {overrideValue ? (
                                <span className="text-xs text-purple-600">Custom</span>
                              ) : (
                                <span className="text-xs text-slate-500">Default</span>
                              )}
                            </div>
                          </div>

                          <div className="bg-green-50 rounded-lg p-3">
                            <p className="text-xs text-green-700 font-medium">Example (₹1,000 subscription):</p>
                            <div className="text-xs text-green-800 mt-1 space-y-0.5">
                              <div>Platform: ₹{example.platformFee.toFixed(2)}</div>
                              <div className="font-semibold">Advisor: ₹{example.advisorPayout.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-8">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No approved advisors to configure</p>
              </div>
            )}
          </div>

          {advisors.length > 0 && (
            <div className="flex justify-end mt-6 pt-6 border-t">
              <Button 
                onClick={handleSaveSettings} 
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save All Overrides
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}