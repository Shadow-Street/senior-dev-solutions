import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdsSetting } from '@/lib/apiClient';
import { refreshAdsEnabled, setAdsEnabled, useAdsStatus } from '@/components/hooks/useAdsEnabled';

/**
 * Master "Advertisements" switch (super-admin > Ad Management).
 *
 * The server is the source of truth: the toggle only moves after the PUT
 * succeeds, then the shared store is updated so this tab changes at once.
 * Other tabs and users pick it up on their next poll (<= 45s).
 */
export default function AdsMasterSwitch() {
  const { enabled, known } = useAdsStatus();
  const [pending, setPending] = useState(null); // the value awaiting confirmation
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    if (pending === null) return;
    setSaving(true);
    try {
      const result = await AdsSetting.set(pending);
      setAdsEnabled(result?.enabled === true);
      toast.success(result?.enabled ? 'Advertisements enabled.' : 'Advertisements disabled.');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not update the advertisement setting.');
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-white" data-testid="ads-master-switch">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <Megaphone className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p id="ads-master-label" className="font-semibold text-foreground">Advertisements</p>
            <p className="text-sm text-subtle">
              Master switch for the whole app. When off, no ads or sponsored content are shown to anyone
              (dashboard, polls, chat) and the API stops serving campaigns. Campaigns and billing are kept.
            </p>
            <p className="mt-1 text-xs text-subtle" role="status">
              {known ? (enabled ? 'Currently enabled.' : 'Currently disabled.') : 'Status unavailable.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!known && (
            <Button variant="outline" size="sm" onClick={() => refreshAdsEnabled()}>Retry</Button>
          )}
          <Switch
            checked={enabled}
            disabled={!known || saving}
            onCheckedChange={(next) => setPending(next)}
            aria-labelledby="ads-master-label"
          />
        </div>
      </CardContent>

      <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open && !saving) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending ? 'Enable advertisements?' : 'Disable advertisements?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? 'Ads and sponsored content will start appearing for all users within about a minute.'
                : 'All ads and sponsored content will be hidden for every user, including signed-out visitors, within about a minute. Active campaigns stay as they are.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => { e.preventDefault(); confirm(); }}
            >
              {saving ? 'Saving...' : pending ? 'Enable' : 'Disable'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
