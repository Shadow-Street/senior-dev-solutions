import React, { useState, useEffect } from 'react';
import { FeatureConfig, EntityConfig, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function FixSidebarOrderPage() {
  const [user, setUser] = useState(null);
  const [currentPages, setCurrentPages] = useState([]);
  const [currentEntities, setCurrentEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const [isFixed, setIsFixed] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [currentUser, pages, entities] = await Promise.all([
        User.me(),
        FeatureConfig.list(),
        EntityConfig.list()
      ]);

      setUser(currentUser);
      setCurrentPages(pages.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999)));
      setCurrentEntities(entities.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999)));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load sidebar configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFix = async () => {
    setIsFixing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Define correct orders
      const correctPageOrder = {
        'dashboard': 1,
        'profile': 2,
        'my_portfolio': 3,
        'chat_rooms': 4,
        'polls': 5,
        'events': 6,
        'subscription': 10,
        'feedback': 11,
      };

      const correctEntityOrder = {
        'Advisor': 7,
        'FinInfluencer': 8,
        'Educator': 9,
      };

      // Update pages
      toast.info('Updating pages...');
      for (const page of currentPages) {
        if (correctPageOrder[page.feature_key] !== undefined) {
          try {
            await FeatureConfig.update(page.id, {
              sort_order: correctPageOrder[page.feature_key],
              visible_to_users: true
            });
            successCount++;
            console.log(`✅ Updated ${page.feature_name} to position ${correctPageOrder[page.feature_key]}`);
          } catch (error) {
            errorCount++;
            console.error(`❌ Failed to update ${page.feature_name}:`, error);
          }
        }
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update entities
      toast.info('Updating entities...');
      for (const entity of currentEntities) {
        if (correctEntityOrder[entity.entity_name] !== undefined) {
          try {
            await EntityConfig.update(entity.id, {
              sort_order: correctEntityOrder[entity.entity_name],
              user_visible: true,
              enabled: true
            });
            successCount++;
            console.log(`✅ Updated ${entity.display_name} to position ${correctEntityOrder[entity.entity_name]}`);
          } catch (error) {
            errorCount++;
            console.error(`❌ Failed to update ${entity.display_name}:`, error);
          }
        }
      }

      if (errorCount === 0) {
        toast.success(`✅ Fixed ${successCount} items! Refreshing page...`);
        setIsFixed(true);
        
        // Auto refresh after 2 seconds
        setTimeout(() => {
          window.location.href = createPageUrl('Dashboard');
        }, 2000);
      } else {
        toast.warning(`⚠️ Updated ${successCount} items with ${errorCount} errors. Please try again.`);
        await loadData(); // Reload to show current state
      }
    } catch (error) {
      console.error('Error fixing sidebar:', error);
      toast.error('Failed to fix sidebar order');
    } finally {
      setIsFixing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-2 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user is admin
  if (user && !['admin', 'super_admin'].includes(user.app_role)) {
    return (
      <div className="min-h-screen bg-surface-2 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <AlertTriangle className="w-12 h-12 text-sell mx-auto mb-4" />
            <h2 className="text-xl font-bold text-center mb-2">Access Denied</h2>
            <p className="text-subtle text-center">This page is for administrators only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Combine and sort all items as they would appear in sidebar
  const combinedItems = [
    ...currentPages
      .filter(p => p.visible_to_users && !['super_admin', 'refund_management'].includes(p.feature_key))
      .map(p => ({ ...p, type: 'page', name: p.feature_name, key: p.feature_key })),
    ...currentEntities
      .filter(e => e.user_visible && e.enabled)
      .map(e => ({ ...e, type: 'entity', name: e.display_name, key: e.entity_name }))
  ].sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));

  const targetOrder = [
    'Dashboard', 'Profile', 'My Portfolio', 'Chat Rooms', 'Community Polls', 
    'Events', 'Advisors', 'Finfluencers', 'Educators', 'Subscription', 'Feedback'
  ];

  const isCorrectOrder = combinedItems.slice(0, 11).every((item, index) => 
    item.name.toLowerCase().includes(targetOrder[index].toLowerCase()) || 
    targetOrder[index].toLowerCase().includes(item.name.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface-2 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-2 border-protocall-premium-light">
          <CardHeader className="bg-gradient-to-r from-protocall-deep to-protocall-blue text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <RefreshCw className="w-6 h-6" />
              Fix Sidebar Order
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Status */}
              <div className={`p-4 rounded-lg flex items-center gap-3 ${isCorrectOrder ? 'bg-buy-muted border-2 border-buy/30' : 'bg-sell-muted border-2 border-sell/30'}`}>
                {isCorrectOrder ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-buy-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-buy-muted-foreground">✅ Sidebar is in correct order!</p>
                      <p className="text-sm text-buy-muted-foreground">No action needed.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-6 h-6 text-sell-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sell-muted-foreground">❌ Sidebar is out of order!</p>
                      <p className="text-sm text-sell-muted-foreground">Click the button below to fix it automatically.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Current vs Target Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-semibold mb-3 text-sell-muted-foreground">❌ Current Order:</h3>
                  <ol className="space-y-1 text-sm">
                    {combinedItems.slice(0, 11).map((item, index) => (
                      <li key={item.id} className="flex items-center gap-2">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <span>{item.name}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {item.sort_order || '?'}
                        </Badge>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-white p-4 rounded-lg border border-buy/30">
                  <h3 className="font-semibold mb-3 text-buy-muted-foreground">✅ Target Order:</h3>
                  <ol className="space-y-1 text-sm">
                    {targetOrder.map((name, index) => (
                      <li key={name} className="flex items-center gap-2">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <span className="font-medium">{name}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Fix Button */}
              {!isCorrectOrder && (
                <Button
                  onClick={handleFix}
                  disabled={isFixing || isFixed}
                  className="w-full bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white py-6 text-lg"
                >
                  {isFixing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Fixing Sidebar Order...
                    </>
                  ) : isFixed ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Fixed! Redirecting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Fix Sidebar Order Now
                    </>
                  )}
                </Button>
              )}

              {isCorrectOrder && (
                <Button
                  onClick={() => window.location.href = createPageUrl('Dashboard')}
                  variant="outline"
                  className="w-full"
                >
                  ← Back to Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}