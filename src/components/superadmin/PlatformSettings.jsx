import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity, AlertCircle, BarChartHorizontal, Bell, BellRing, Cog, CreditCard, DollarSign, FileText, Gift, Globe,
  KeyRound, LifeBuoy, PanelLeft, RefreshCw, Settings, Shield, ShieldAlert,
} from 'lucide-react';
import { platformSettingsApi, settingsErrorMessage } from '@/lib/platformSettingsApi';
import { invalidatePlatformSettingsCache } from '@/components/hooks/usePlatformSettings';
import ManageApiCredentials from './settings/ManageApiCredentials';
import ManagePaymentGateway from './settings/ManagePaymentGateway';
import ManageMarketData from './settings/ManageMarketData';
import ManageLocalization from './settings/ManageLocalization';
import ManageSite from './settings/ManageSite';
import ManageMonetization from './settings/ManageMonetization';
import ManageReferrals from './settings/ManageReferrals';
import ManageMetas from './settings/ManageMetas';
import ManageSupport from './settings/ManageSupport';
import ManageStaticPages from './settings/ManageStaticPages';
import ManageRoles from './settings/ManageRoles';
import ManageAlertSettings from './settings/ManageAlertSettings';
import ManageEntityConfig from './settings/ManageEntityConfig';
import ManageAccessSecurity from './settings/ManageAccessSecurity';
import ManageNotifications from './settings/ManageNotifications';

/**
 * Platform Settings.
 *
 * Every section here either saves through the validated, audited settings API
 * (PUT /platform/settings/managed) and is read where it takes effect, or is an
 * honest status / explanation screen. `managed: true` sections share the
 * definitions and values loaded once below.
 */
const CATEGORIES = [
  { id: 'site', name: 'Site Setting', component: ManageSite, icon: Cog, managed: true },
  { id: 'security', name: 'Access & Security', component: ManageAccessSecurity, icon: ShieldAlert, managed: true },
  { id: 'notifications', name: 'Notifications', component: ManageNotifications, icon: BellRing, managed: true },
  { id: 'api', name: 'API Credentials', component: ManageApiCredentials, icon: KeyRound },
  { id: 'market-data', name: 'Market Data (Dhan)', component: ManageMarketData, icon: Activity },
  { id: 'payments', name: 'Payment Gateway', component: ManagePaymentGateway, icon: CreditCard },
  { id: 'monetization', name: 'Monetization Settings', component: ManageMonetization, icon: DollarSign, managed: true },
  { id: 'roles', name: 'Role Management', component: ManageRoles, icon: Shield },
  { id: 'navigation', name: 'Sidebar & Navigation', component: ManageEntityConfig, icon: PanelLeft, managed: true },
  { id: 'alerts', name: 'Alert Settings', component: ManageAlertSettings, icon: Bell, managed: true },
  { id: 'localization', name: 'Localization', component: ManageLocalization, icon: Globe },
  { id: 'referrals', name: 'Referral Settings', component: ManageReferrals, icon: Gift, managed: true },
  { id: 'seo', name: 'Metas (SEO)', component: ManageMetas, icon: BarChartHorizontal, managed: true },
  { id: 'static-pages', name: 'Static Pages', component: ManageStaticPages, icon: FileText },
  { id: 'support', name: 'Support', component: ManageSupport, icon: LifeBuoy, managed: true },
];

const UNSAVED_PROMPT = 'You have unsaved changes in this section. Leave without saving?';

export default function PlatformSettings() {
  const [activeId, setActiveId] = useState('site');
  const [managed, setManaged] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setManaged(await platformSettingsApi.managed());
    } catch (error) {
      setLoadError(settingsErrorMessage(error, 'Could not load platform settings.'));
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Browser-level guard (reload, close tab, external link) while edits are pending.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const selectCategory = (id) => {
    if (id === activeId) return;
    if (dirtyRef.current && !window.confirm(UNSAVED_PROMPT)) return;
    setDirty(false);
    setActiveId(id);
  };

  const onSaved = useCallback((values) => {
    setManaged((m) => (m ? { ...m, values: { ...m.values, ...(values || {}) } } : m));
    setDirty(false);
    // Footer / contact pages read the legacy settings hook; drop its cache too.
    invalidatePlatformSettingsCache();
  }, []);
  const onDirtyChange = useCallback((d) => setDirty(Boolean(d)), []);

  const active = useMemo(() => CATEGORIES.find((c) => c.id === activeId) || CATEGORIES[0], [activeId]);
  const ActiveComponent = active.component;

  const renderContent = () => {
    if (!active.managed) return <ActiveComponent onDirtyChange={onDirtyChange} settings={{}} onChange={() => {}} />;
    if (isLoading) return <div className="p-12 text-center text-muted-foreground" role="status">Loading settings...</div>;
    if (loadError) {
      return (
        <div className="space-y-3 p-8 text-center" role="alert">
          <AlertCircle className="mx-auto h-8 w-8 text-sell" aria-hidden="true" />
          <p className="text-sell">{loadError}</p>
          <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Try again</Button>
        </div>
      );
    }
    return <ActiveComponent key={active.id} managed={managed} onSaved={onSaved} onDirtyChange={onDirtyChange} />;
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-white shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Settings className="h-6 w-6 text-subtle" aria-hidden="true" />
          <CardTitle>Global Platform Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-r-lg border-l-4 border-hold bg-hold-muted p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 h-5 w-5 text-hold-muted-foreground" aria-hidden="true" />
              <div>
                <h4 className="font-semibold text-hold-muted-foreground">Master Control Panel</h4>
                <p className="text-sm text-hold-muted-foreground">
                  Changes here apply across the platform as soon as they are saved, and every change is recorded in
                  Activity Logs. Each section saves on its own. Access &amp; Security can only be changed by a super admin.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Card className="border-0 bg-white p-4 shadow-lg">
            <nav aria-label="Settings sections" className="space-y-1">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => selectCategory(cat.id)}
                    className={`group flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-md' : 'text-subtle hover:bg-surface-2'}`}
                  >
                    <Icon className={`mr-3 h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-muted-foreground'}`} aria-hidden="true" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="border-0 bg-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xl">{active.name}</CardTitle>
              {dirty && <span className="text-sm font-medium text-hold-muted-foreground" role="status">Unsaved changes</span>}
            </CardHeader>
            <CardContent>{renderContent()}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
