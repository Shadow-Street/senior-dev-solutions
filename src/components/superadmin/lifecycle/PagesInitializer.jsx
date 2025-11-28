
import React, { useState } from 'react';
import { FeatureConfig } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

// Registry of all existing pages in the application
const defaultPages = [
  {
    feature_key: 'dashboard',
    feature_name: 'Dashboard',
    description: 'Main dashboard with market overview and quick actions',
    module_type: 'page',
    route_path: '/Dashboard',
    icon_name: 'LayoutDashboard',
    tier: 'basic',
    status: 'live',
    visibility_rule: 'authenticated',
    visible_to_users: true,
    release_date: new Date().toISOString().split('T')[0],
    priority: 1,
    sort_order: 1,
  },
  {
    feature_key: 'profile',
    feature_name: 'Profile',
    description: 'Manage your profile, settings, and preferences',
    module_type: 'page',
    route_path: '/Profile',
    icon_name: 'User',
    tier: 'basic',
    status: 'live',
    visibility_rule: 'authenticated',
    visible_to_users: true,
    release_date: new Date().toISOString().split('T')[0],
    priority: 1,
    sort_order: 2,
  },
  {
    feature_key: 'my_portfolio',
    feature_name: 'My Portfolio',
    description: 'Track your investments and portfolio performance',
    module_type: 'page',
    route_path: '/MyPortfolio',
    icon_name: 'Wallet',
    tier: 'basic',
    status: 'live',
    visibility_rule: 'authenticated',
    visible_to_users: true,
    release_date: new Date().toISOString().split('T')[0],
    priority: 1,
    sort_order: 3,
  },
  {
    feature_key: 'chat_rooms',
    feature_name: 'Chat Rooms',
    description: 'Stock-specific chat rooms with live discussions',
    module_type: 'page',
    route_path: '/ChatRooms',
    icon_name: 'MessageSquare',
    tier: 'basic',
    status: 'live',
    visibility_rule: 'authenticated',
    visible_to_users: true,
    release_date: new Date().toISOString().split('T')[0],
    priority: 1,
    sort_order: 4,
  },
  {
    feature_key: 'polls',
    feature_name: 'Community Polls',
    description: 'Vote on stock predictions and market sentiment',
    module_type: 'page',
    route_path: '/Polls',
    icon_name: 'Vote',
    tier: 'basic',
    status: 'live',
    visibility_rule: 'authenticated',
    visible_to_users: true,
    release_date: new Date().toISOString().split('T')[0],
    priority: 1,
    sort_order: 5,
  },
  {
    feature_key: 'events',
    feature_name: 'Events',
    description: 'Join trading workshops, webinars, and community events',
    module_type: 'page',
    route_path: '/Events',
    icon_name: 'Calendar',
    tier: 'basic',
    status: 'live',
    visibility_rule: 'authenticated',
    visible_to_users: true,
    release_date: new Date().toISOString().split('T')[0],
    priority: 1,
    sort_order: 6,
  },
  {
    feature_key: 'subscription',
    feature_name: 'Subscription',
    description: 'Manage your premium subscription and access exclusive features',
    module_type: 'page',
    route_path: '/Subscription',
    icon_name: 'Sparkles',
    tier: 'basic',
    status: 'live',
    visibility_rule: 'authenticated',
    visible_to_users: true,
    release_date: new Date().toISOString().split('T')[0],
    priority: 1,
    sort_order: 10,
  },
  {
    feature_key: 'news',
    feature_name: 'Market News',
    description: 'Latest market news and stock updates',
    module_type: 'page',
    route_path: '/News',
    icon_name: 'Newspaper',
    tier: 'basic',
    status: 'live',
    visibility_rule: 'authenticated',
    visible_to_users: true,
    release_date: new Date().toISOString().split('T')[0],
    priority: 1,
    sort_order: 12,
  },
  {
    feature_key: 'feedback',
    feature_name: 'Feedback',
    description: 'Share your feedback and suggestions',
    module_type: 'page',
    route_path: '/Feedback',
    icon_name: 'MessageCircle',
    tier: 'basic',
    status: 'live',
    visibility_rule: 'authenticated',
    visible_to_users: true,
    release_date: new Date().toISOString().split('T')[0],
    priority: 1,
    sort_order: 11,
  },
  {
    feature_key: 'pledge_pool',
    feature_name: 'Pledge Pool',
    description: 'Participate in group trading sessions with managed execution',
    module_type: 'page',
    route_path: '/PledgePool',
    icon_name: 'Target',
    tier: 'premium',
    status: 'live',
    visibility_rule: 'subscribed_user',
    visible_to_users: true,
    release_date: new Date().toISOString().split('T')[0],
    priority: 2,
    sort_order: 13,
  },
  {
    feature_key: 'super_admin',
    feature_name: 'Super Admin',
    description: 'Super admin control panel',
    module_type: 'page',
    route_path: '/SuperAdmin',
    icon_name: 'Shield',
    tier: 'vip',
    status: 'live',
    visibility_rule: 'super_admin_only',
    visible_to_users: false,
    release_date: new Date().toISOString().split('T')[0],
    priority: 1,
    sort_order: 999,
  },
];

export default function PagesInitializer() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [initResult, setInitResult] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false); // Added as per outline, though not actively used in provided snippet

  const initializePages = async () => {
    setIsInitializing(true);
    setInitResult(null);

    try {
      // Get existing page configs
      const existingConfigs = await FeatureConfig.list();
      const existingKeys = new Map(existingConfigs.map(c => [c.feature_key, c]));

      const created = [];
      const skipped = [];

      for (const page of defaultPages) { // Iterate over the new defaultPages
        if (existingKeys.has(page.feature_key)) { // Use feature_key for checking existence
          skipped.push(page.feature_name); // Use feature_name for display
          continue;
        }

        const payload = {
          feature_key: page.feature_key,
          feature_name: page.feature_name,
          description: page.description,
          module_type: page.module_type,
          route_path: page.route_path,
          icon_name: page.icon_name,
          tier: page.tier,
          status: page.status,
          visibility_rule: page.visibility_rule,
          visible_to_users: page.visible_to_users,
          sort_order: page.sort_order,
          release_date: page.release_date,
          priority: page.priority,
          last_status_change_date: new Date().toISOString(),
          // removed changed_by_admin_id and changed_by_admin_name as `user` prop is no longer available
          reason_for_change: 'Auto-initialized from default pages list'
        };

        await FeatureConfig.create(payload);
        created.push(page.feature_name); // Use feature_name for display
      }

      setInitResult({
        success: true,
        created: created.length,
        skipped: skipped.length,
        createdList: created,
        skippedList: skipped
      });
      setHasInitialized(true); // Mark as initialized

      toast.success(`Initialized ${created.length} pages successfully!`);
    } catch (error) {
      console.error('Error initializing pages:', error);
      setInitResult({
        success: false,
        error: error.message
      });
      toast.error('Failed to initialize pages');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Pages Auto-Initialization
        </CardTitle>
        <p className="text-sm text-slate-600">
          Automatically populate existing application pages into the Product Lifecycle Manager
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">What this does:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Scans all {defaultPages.length} existing pages in the application</li>
                <li>Creates FeatureConfig records for pages not yet registered</li>
                <li>Sets status to "live" and makes them visible to users</li>
                <li>Skips pages that are already configured</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          onClick={initializePages}
          disabled={isInitializing}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {isInitializing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Initializing Pages...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Initialize All Pages
            </>
          )}
        </Button>

        {initResult && (
          <div className={`p-4 rounded-lg border ${
            initResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {initResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                {initResult.success ? (
                  <>
                    <p className="font-semibold text-green-900 mb-2">
                      Initialization Complete!
                    </p>
                    <div className="text-sm text-green-800 space-y-2">
                      <p>✅ Created: {initResult.created} pages</p>
                      <p>⏭️ Skipped: {initResult.skipped} pages (already exist)</p>
                      
                      {initResult.createdList.length > 0 && (
                        <div className="mt-3">
                          <p className="font-semibold mb-1">Created Pages:</p>
                          <ul className="list-disc list-inside pl-2">
                            {initResult.createdList.map((name, idx) => (
                              <li key={idx}>{name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-red-900 mb-2">Initialization Failed</p>
                    <p className="text-sm text-red-800">{initResult.error}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
