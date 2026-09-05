import React, { useState } from 'react';
import { Settings, ToggleLeft, ToggleRight, DollarSign, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { PlatformSetting } from '@/lib/apiClient';

export default function PlatformSettings({ settings = {}, onSettingsUpdated }) {
    const [commissionRate, setCommissionRate] = useState(settings.commissionRate || '20');
    const [pledgesEnabled, setPledgesEnabled] = useState(settings.pledgesEnabled || false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSaveCommission = async () => {
        setIsLoading(true);
        try {
            // Logic mirrored from AdminPanel
            const foundSettings = await PlatformSetting.filter({ setting_key: 'global_commission_rate' });
            if (foundSettings.length > 0) {
                await PlatformSetting.update(foundSettings[0].id, { setting_value: commissionRate });
            } else {
                await PlatformSetting.create({ setting_key: 'global_commission_rate', setting_value: commissionRate });
            }
            toast.success("Commission rate updated!");
            onSettingsUpdated();
        } catch (error) {
            console.error("Failed to update commission:", error);
            toast.error("Update failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePledges = async (checked) => {
        try {
            const foundSettings = await PlatformSetting.filter({ setting_key: 'pledges_enabled' });
            if (foundSettings.length > 0) {
                await PlatformSetting.update(foundSettings[0].id, { setting_value: checked.toString() });
            } else {
                await PlatformSetting.create({ setting_key: 'pledges_enabled', setting_value: checked.toString() });
            }
            setPledgesEnabled(checked);
            toast.success(`Pledges ${checked ? 'Enabled' : 'Disabled'}`);
            onSettingsUpdated();
        } catch (error) {
            console.error("Failed to toggle pledges:", error);
            toast.error("Toggle failed.");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        Financial Settings
                    </CardTitle>
                    <CardDescription>Configure global fees and financial switches.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Global Commission Rate (%)</label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                value={commissionRate}
                                onChange={(e) => setCommissionRate(e.target.value)}
                                placeholder="20"
                            />
                            <Button onClick={handleSaveCommission} disabled={isLoading}>
                                <Save className="w-4 h-4 mr-2" /> Save
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Percentage taken from advisor subscriptions.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-600" />
                        Feature Toggles
                    </CardTitle>
                    <CardDescription>Enable or disable major platform features.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h4 className="font-medium text-slate-900">Pledge System</h4>
                            <p className="text-sm text-slate-500">Allow users to pledge amounts on polls.</p>
                        </div>
                        <Switch
                            checked={pledgesEnabled}
                            onCheckedChange={handleTogglePledges}
                        />
                    </div>
                    {/* Add more toggles here as needed */}
                </CardContent>
            </Card>
        </div>
    );
}
