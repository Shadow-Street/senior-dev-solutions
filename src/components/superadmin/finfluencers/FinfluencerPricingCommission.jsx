import React, { useState, useEffect, useCallback } from 'react';
import { FinInfluencer, User, PlatformSetting, RevenueTransaction, CourseEnrollment } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Save,
  AlertCircle,
  Users,
  CheckCircle,
  XCircle,
  Settings,
  BarChart3,
  Info
} from 'lucide-react';
import { toast } from "sonner";

export default function FinfluencerPricingCommission() {
  const [globalCommissionRate, setGlobalCommissionRate] = useState('');
  const [minimumPayoutThreshold, setMinimumPayoutThreshold] = useState('');
  const [finfluencers, setFinfluencers] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [settingsData, finfluencersData, revenuesData, enrollmentsData] = await Promise.all([
        PlatformSetting.list().catch(() => []),
        FinInfluencer.filter({ status: 'approved' }).catch(() => []),
        RevenueTransaction.list('-created_date', 100).catch(() => []),
        CourseEnrollment.list('-created_date', 100).catch(() => [])
      ]);

      const commissionSetting = settingsData.find(s => s.setting_key === 'finfluencer_commission_rate');
      const thresholdSetting = settingsData.find(s => s.setting_key === 'finfluencer_min_payout_threshold');
      
      setGlobalCommissionRate(commissionSetting?.setting_value || '25');
      setMinimumPayoutThreshold(thresholdSetting?.setting_value || '500');
      setFinfluencers(finfluencersData || []);
      setRevenues(revenuesData || []);
      setEnrollments(enrollmentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load commission data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGlobalSettings = async () => {
    setIsSaving(true);
    try {
      const rate = parseFloat(globalCommissionRate);
      const threshold = parseFloat(minimumPayoutThreshold);
      
      if (isNaN(rate) || rate < 0 || rate > 100) {
        toast.error('Please enter a valid commission rate between 0 and 100');
        setIsSaving(false);
        return;
      }

      if (isNaN(threshold) || threshold < 0) {
        toast.error('Please enter a valid minimum payout threshold');
        setIsSaving(false);
        return;
      }

      const existingSettings = await PlatformSetting.list();
      
      // Save commission rate
      const commissionSetting = existingSettings.find(s => s.setting_key === 'finfluencer_commission_rate');
      if (commissionSetting) {
        await PlatformSetting.update(commissionSetting.id, {
          setting_value: rate.toString(),
          description: 'Platform commission percentage for finfluencer course sales'
        });
      } else {
        await PlatformSetting.create({
          setting_key: 'finfluencer_commission_rate',
          setting_value: rate.toString(),
          description: 'Platform commission percentage for finfluencer course sales'
        });
      }

      // Save minimum payout threshold
      const thresholdSettingRecord = existingSettings.find(s => s.setting_key === 'finfluencer_min_payout_threshold');
      if (thresholdSettingRecord) {
        await PlatformSetting.update(thresholdSettingRecord.id, {
          setting_value: threshold.toString(),
          description: 'Minimum amount finfluencers must earn before requesting payout'
        });
      } else {
        await PlatformSetting.create({
          setting_key: 'finfluencer_min_payout_threshold',
          setting_value: threshold.toString(),
          description: 'Minimum amount finfluencers must earn before requesting payout'
        });
      }

      toast.success('Global settings updated successfully');
      loadData();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOverrideRate = async (finfluencerId, overrideRate) => {
    try {
      const rate = overrideRate === '' ? null : parseFloat(overrideRate);
      
      if (rate !== null && (isNaN(rate) || rate < 0 || rate > 100)) {
        toast.error('Please enter a valid commission rate between 0 and 100');
        return;
      }

      await FinInfluencer.update(finfluencerId, {
        commission_override_rate: rate
      });

      toast.success('Override rate saved successfully');
      loadData();
    } catch (error) {
      console.error('Error saving override rate:', error);
      toast.error('Failed to save override rate');
    }
  };

  const calculateFinfluencerStats = useCallback((finfluencer) => {
    const finfluencerRevenues = revenues.filter(r => r.influencer_id === finfluencer.id);
    const finfluencerEnrollments = enrollments.filter(e => 
      finfluencerRevenues.some(r => r.enrollment_id === e.id)
    );

    const totalGross = finfluencerRevenues.reduce((sum, r) => sum + (r.gross_amount || 0), 0);
    const totalCommission = finfluencerRevenues.reduce((sum, r) => sum + (r.platform_commission || 0), 0);
    const totalPayout = finfluencerRevenues.reduce((sum, r) => sum + (r.influencer_payout || 0), 0);
    const totalEnrollments = finfluencerEnrollments.length;

    const effectiveRate = finfluencer.commission_override_rate !== null 
      ? finfluencer.commission_override_rate 
      : parseFloat(globalCommissionRate);

    return {
      totalGross,
      totalCommission,
      totalPayout,
      totalEnrollments,
      effectiveRate
    };
  }, [revenues, enrollments, globalCommissionRate]);

  // Calculate overall stats
  const overallStats = {
    totalGross: revenues.reduce((sum, r) => sum + (r.gross_amount || 0), 0),
    totalCommission: revenues.reduce((sum, r) => sum + (r.platform_commission || 0), 0),
    totalPayout: revenues.reduce((sum, r) => sum + (r.influencer_payout || 0), 0),
    totalEnrollments: enrollments.length,
    activeFinfluencers: finfluencers.length
  };

  const platformFee = (1000 * parseFloat(globalCommissionRate || 0)) / 100;
  const finfluencerPayout = 1000 - platformFee;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Global Commission Settings Card */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-surface-2 border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings className="w-6 h-6 text-protocall-premium-text" />
            Global Commission Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Two Fields in Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Default Commission Rate */}
            <div>
              <Label htmlFor="commission_rate" className="text-base font-semibold mb-2 block">
                Default Commission Rate (%)
              </Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="commission_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={globalCommissionRate}
                  onChange={(e) => setGlobalCommissionRate(e.target.value)}
                  className="pl-10 h-12 text-lg"
                  placeholder="15"
                />
              </div>
              <p className="text-sm text-subtle mt-2">
                Platform commission percentage for course sales
              </p>
            </div>

            {/* Minimum Payout Threshold */}
            <div>
              <Label htmlFor="payout_threshold" className="text-base font-semibold mb-2 block">
                Minimum Payout Threshold (₹)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="payout_threshold"
                  type="number"
                  min="0"
                  step="100"
                  value={minimumPayoutThreshold}
                  onChange={(e) => setMinimumPayoutThreshold(e.target.value)}
                  className="pl-10 h-12 text-lg"
                  placeholder="500"
                />
              </div>
              <p className="text-sm text-subtle mt-2">
                Minimum amount finfluencers must earn before requesting payout
              </p>
            </div>
          </div>

          {/* Commission Calculation Example */}
          <div className="bg-premium-muted border border-protocall-premium-light rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-primary mb-2">Commission Calculation Example</h4>
                <p className="text-sm text-primary mb-2">
                  For a ₹1,000 course sale at {globalCommissionRate}% commission:
                </p>
                <ul className="text-sm text-primary space-y-1">
                  <li>• <span className="font-medium">Platform Fee:</span> ₹{platformFee.toFixed(2)}</li>
                  <li>• <span className="font-medium">Finfluencer Payout:</span> ₹{finfluencerPayout.toFixed(2)}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveGlobalSettings} 
              disabled={isSaving}
              className="bg-primary hover:bg-primary text-white px-8 py-3 h-auto text-base"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSaving ? 'Saving Settings...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-surface-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-primary font-medium mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-primary">₹{overallStats.totalGross.toLocaleString()}</p>
              </div>
              <DollarSign className="w-10 h-10 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-surface-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-protocall-premium-text font-medium mb-1">Platform Commission</p>
                <p className="text-2xl font-bold text-protocall-premium-text">₹{overallStats.totalCommission.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-protocall-premium-text opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-surface-2 to-buy-muted">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-buy-muted-foreground font-medium mb-1">Finfluencer Payouts</p>
                <p className="text-2xl font-bold text-buy-muted-foreground">₹{overallStats.totalPayout.toLocaleString()}</p>
              </div>
              <Users className="w-10 h-10 text-buy-muted-foreground opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-surface-2 to-hold-muted">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-hold-muted-foreground font-medium mb-1">Total Enrollments</p>
                <p className="text-2xl font-bold text-hold-muted-foreground">{overallStats.totalEnrollments}</p>
              </div>
              <BarChart3 className="w-10 h-10 text-hold-muted-foreground opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Finfluencer Overrides */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-surface-2 border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Percent className="w-6 h-6 text-protocall-premium-text" />
            Individual Commission Overrides
          </CardTitle>
          <p className="text-sm text-subtle mt-1">
            Set custom commission rates for specific finfluencers. Leave blank to use the global rate.
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {finfluencers.length > 0 ? (
            <div className="space-y-4">
              {finfluencers.map(finfluencer => {
                const stats = calculateFinfluencerStats(finfluencer);
                return (
                  <FinfluencerOverrideCard
                    key={finfluencer.id}
                    finfluencer={finfluencer}
                    stats={stats}
                    globalRate={parseFloat(globalCommissionRate)}
                    onSave={handleSaveOverrideRate}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No approved finfluencers found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FinfluencerOverrideCard({ finfluencer, stats, globalRate, onSave }) {
  const [overrideRate, setOverrideRate] = useState(
    finfluencer.commission_override_rate !== null ? finfluencer.commission_override_rate.toString() : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(finfluencer.id, overrideRate);
    setIsSaving(false);
  };

  const effectiveRate = overrideRate !== '' ? parseFloat(overrideRate) : globalRate;
  const isOverridden = finfluencer.commission_override_rate !== null;

  return (
    <Card className={isOverridden ? 'border-2 border-protocall-premium-light bg-premium-muted/50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <img
            src={finfluencer.profile_image_url || `https://avatar.vercel.sh/${finfluencer.display_name}.png`}
            alt={finfluencer.display_name}
            className="w-16 h-16 rounded-full object-cover"
          />
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  {finfluencer.display_name}
                  {isOverridden && (
                    <CheckCircle className="w-4 h-4 text-protocall-premium-text" />
                  )}
                </h4>
                <p className="text-sm text-subtle">
                  {stats.totalEnrollments} enrollments • ₹{stats.totalGross.toLocaleString()} revenue
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Effective Rate</p>
                <p className="text-2xl font-bold text-protocall-premium-text">{effectiveRate.toFixed(1)}%</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-premium-muted rounded-lg p-2">
                <p className="text-xs text-primary">Total Revenue</p>
                <p className="font-bold text-primary">₹{stats.totalGross.toLocaleString()}</p>
              </div>
              <div className="bg-premium-muted rounded-lg p-2">
                <p className="text-xs text-protocall-premium-text">Commission</p>
                <p className="font-bold text-protocall-premium-text">₹{stats.totalCommission.toLocaleString()}</p>
              </div>
              <div className="bg-buy-muted rounded-lg p-2">
                <p className="text-xs text-buy-muted-foreground">Payout</p>
                <p className="font-bold text-buy-muted-foreground">₹{stats.totalPayout.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label htmlFor={`override_${finfluencer.id}`} className="text-xs">
                  Override Rate (%) {isOverridden && <span className="text-protocall-premium-text">• Custom Rate Applied</span>}
                </Label>
                <Input
                  id={`override_${finfluencer.id}`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={overrideRate}
                  onChange={(e) => setOverrideRate(e.target.value)}
                  placeholder={`Default: ${globalRate}%`}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              {isOverridden && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOverrideRate('');
                    onSave(finfluencer.id, '');
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}