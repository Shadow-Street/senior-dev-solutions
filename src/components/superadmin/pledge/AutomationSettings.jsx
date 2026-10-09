import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Zap, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AutomationSettings({ enabled, onToggle }) {
  return (
    <Card className="border-0 shadow-lg bg-gradient-to-r from-surface-2 to-white">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${enabled ? 'bg-buy-muted' : 'bg-surface-2'}`}>
              <Zap className={`w-5 h-5 ${enabled ? 'text-buy-muted-foreground' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <CardTitle className="text-lg">Automated Execution Engine</CardTitle>
              <p className="text-sm text-subtle mt-1">
                Automatically execute sessions when they reach end time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge 
              variant={enabled ? "default" : "secondary"}
              className={enabled ? 'bg-buy-muted text-buy-muted-foreground' : 'bg-surface-2 text-subtle'}
            >
              {enabled ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Paused
                </>
              )}
            </Badge>
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              className="data-[state=checked]:bg-buy"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-3 bg-premium-muted rounded-lg">
            <RefreshCw className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary">Check Interval</p>
              <p className="text-xs text-primary mt-1">Every 30 seconds</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-premium-muted rounded-lg">
            <Zap className="w-5 h-5 text-protocall-premium-text mt-0.5" />
            <div>
              <p className="text-sm font-medium text-protocall-premium-text">Auto-Execute</p>
              <p className="text-xs text-protocall-premium-text mt-1">Sessions past end time</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-buy-muted rounded-lg">
            <CheckCircle className="w-5 h-5 text-buy-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-buy-muted-foreground">Status Updates</p>
              <p className="text-xs text-buy-muted-foreground mt-1">Real-time notifications</p>
            </div>
          </div>
        </div>

        {enabled && (
          <div className="mt-4 p-3 bg-hold-muted border border-hold/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-hold-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-hold-muted-foreground">
                <strong>Note:</strong> Automated execution will process all pledges marked as "ready_for_execution" 
                when the session reaches its end time. Monitor the Executions tab for real-time updates.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}