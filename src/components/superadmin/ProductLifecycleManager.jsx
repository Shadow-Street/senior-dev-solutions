import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText, Boxes, Plug, Shield, TrendingUp, Activity } from 'lucide-react';

// Import existing Feature Hub content (keep 100% unchanged)
import FeatureHubContent from './FeatureHubContent';

// Import new module managers (to be created)
import PagesManager from './lifecycle/PagesManager';
import IntegrationsManager from './lifecycle/IntegrationsManager';
import LifecycleAuditLog from './lifecycle/LifecycleAuditLog';
import LifecycleAnalytics from './lifecycle/LifecycleAnalytics';
import ApprovalWorkflow from './lifecycle/ApprovalWorkflow';

export default function ProductLifecycleManager({ user }) {
  const [activeTab, setActiveTab] = useState('pages');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Lifecycle Manager</h2>
          <p className="text-gray-600 mt-1">Manage pages, features, and integrations lifecycle</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-8 bg-transparent p-1 rounded-xl gap-2">
              <TabsTrigger 
                value="features" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Feature Hub</span>
                <span className="sm:hidden">Features</span>
              </TabsTrigger>

              <TabsTrigger 
                value="pages" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Pages</span>
              </TabsTrigger>

              <TabsTrigger 
                value="integrations" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg"
              >
                <Plug className="w-4 h-4" />
                <span className="hidden sm:inline">Integrations</span>
              </TabsTrigger>

              <TabsTrigger 
                value="approvals" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Approvals</span>
              </TabsTrigger>

              <TabsTrigger 
                value="audit" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg"
              >
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Audit Log</span>
              </TabsTrigger>

              <TabsTrigger 
                value="analytics" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
            </TabsList>

            {/* Feature Hub Tab - Keep 100% Unchanged */}
            <TabsContent value="features" className="space-y-6">
              <FeatureHubContent user={user} />
            </TabsContent>

            {/* Pages Manager Tab */}
            <TabsContent value="pages" className="space-y-6">
              <PagesManager user={user} />
            </TabsContent>

            {/* Integrations Manager Tab */}
            <TabsContent value="integrations" className="space-y-6">
              <IntegrationsManager user={user} />
            </TabsContent>

            {/* Approvals Tab */}
            <TabsContent value="approvals" className="space-y-6">
              <ApprovalWorkflow user={user} />
            </TabsContent>

            {/* Audit Log Tab */}
            <TabsContent value="audit" className="space-y-6">
              <LifecycleAuditLog user={user} />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <LifecycleAnalytics user={user} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}