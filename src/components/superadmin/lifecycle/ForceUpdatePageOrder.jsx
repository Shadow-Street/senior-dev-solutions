import React, { useState } from 'react';
import { FeatureConfig, EntityConfig } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ForceUpdatePageOrder() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateComplete, setUpdateComplete] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, message]);
    console.log(message);
  };

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    setUpdateComplete(false);
    setLogs([]);

    try {
      addLog('🔄 Starting comprehensive sidebar order update...');

      // STEP 1: Update FeatureConfig pages
      addLog('\n📄 Updating pages...');
      const allPages = await FeatureConfig.list();
      
      const pageOrder = {
        'dashboard': { sort_order: 1, visible_to_users: true },
        'profile': { sort_order: 2, visible_to_users: true },
        'my_portfolio': { sort_order: 3, visible_to_users: true },
        'chat_rooms': { sort_order: 4, visible_to_users: true },
        'polls': { sort_order: 5, visible_to_users: true },
        'events': { sort_order: 6, visible_to_users: true },
        'subscription': { sort_order: 10, visible_to_users: true },
        'feedback': { sort_order: 11, visible_to_users: true },
        'news': { sort_order: 12, visible_to_users: true },
        'pledge_pool': { sort_order: 13, visible_to_users: true },
        'super_admin': { sort_order: 999, visible_to_users: false },
        'refund_management': { sort_order: 999, visible_to_users: false },
      };

      for (const page of allPages) {
        if (pageOrder[page.feature_key]) {
          await FeatureConfig.update(page.id, pageOrder[page.feature_key]);
          addLog(`✅ ${page.feature_name} → order ${pageOrder[page.feature_key].sort_order}`);
        }
      }

      // STEP 2: Update EntityConfig entities
      addLog('\n📊 Updating entity configs...');
      const allEntities = await EntityConfig.list();
      
      const entityOrder = {
        'Advisor': { sort_order: 7, user_visible: true, enabled: true },
        'FinInfluencer': { sort_order: 8, user_visible: true, enabled: true },
        'Educator': { sort_order: 9, user_visible: true, enabled: true },
      };

      for (const entity of allEntities) {
        if (entityOrder[entity.entity_name]) {
          await EntityConfig.update(entity.id, entityOrder[entity.entity_name]);
          addLog(`✅ ${entity.display_name} → order ${entityOrder[entity.entity_name].sort_order}`);
        }
      }

      addLog('\n🎉 All updates completed successfully!');
      addLog('👉 Click "Refresh Page" button below to see changes');
      setUpdateComplete(true);
      toast.success('Sidebar order updated! Click the refresh button below.');
    } catch (error) {
      console.error('Error updating sidebar order:', error);
      addLog(`\n❌ ERROR: ${error.message}`);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Fix Sidebar Order (Run This!)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm font-semibold mb-2 text-red-600">⚠️ Your sidebar is out of order. Click the button below to fix it!</p>
            <p className="text-sm font-semibold mb-2">Correct Order:</p>
            <ol className="text-sm text-gray-700 space-y-1 grid grid-cols-2 gap-2">
              <li>1️⃣ Dashboard</li>
              <li>2️⃣ Profile</li>
              <li>3️⃣ My Portfolio</li>
              <li>4️⃣ Chat Rooms</li>
              <li>5️⃣ Community Polls</li>
              <li>6️⃣ Events</li>
              <li>7️⃣ Advisors</li>
              <li>8️⃣ Finfluencers</li>
              <li>9️⃣ Educators</li>
              <li>🔟 Subscription</li>
              <li>1️⃣1️⃣ Feedback</li>
            </ol>
          </div>
          
          <Button
            onClick={handleForceUpdate}
            disabled={isUpdating || updateComplete}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-6"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Fixing Order... Please Wait
              </>
            ) : updateComplete ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                ✓ Fixed! Now Refresh Page Below
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                🔧 Fix Sidebar Order Now
              </>
            )}
          </Button>

          {updateComplete && (
            <Button
              onClick={() => window.location.reload()}
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6 animate-pulse"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              🔄 REFRESH PAGE TO SEE CHANGES
            </Button>
          )}

          {logs.length > 0 && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}