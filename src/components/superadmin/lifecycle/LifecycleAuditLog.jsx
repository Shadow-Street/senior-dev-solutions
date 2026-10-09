import React, { useState, useEffect } from 'react';
import { FeatureConfig } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Calendar, User, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function LifecycleAuditLog({ user }) {
  const [auditEntries, setAuditEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuditLog();
  }, []);

  const loadAuditLog = async () => {
    try {
      setIsLoading(true);
      const allModules = await FeatureConfig.list('-last_status_change_date');
      const entriesWithChanges = allModules.filter(m => m.last_status_change_date);
      setAuditEntries(entriesWithChanges);
    } catch (error) {
      console.error('Error loading audit log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-subtle">Loading audit log...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Product Lifecycle Audit Log
          </CardTitle>
          <p className="text-sm text-subtle">Track all changes made to features, pages, and modules</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditEntries.map((entry) => (
              <div key={entry.id} className="p-4 border border-border rounded-lg hover:bg-surface-2 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold text-foreground">{entry.feature_name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {entry.module_type}
                    </Badge>
                  </div>
                  <Badge className={`text-xs ${
                    entry.status === 'live' ? 'bg-buy-muted text-buy-muted-foreground' :
                    entry.status === 'partial' ? 'bg-hold-muted text-hold-muted-foreground' :
                    entry.status === 'placeholder' ? 'bg-premium-muted text-protocall-premium-text' :
                    'bg-sell-muted text-sell-muted-foreground'
                  }`}>
                    {entry.status}
                  </Badge>
                </div>

                {entry.reason_for_change && (
                  <p className="text-sm text-subtle mb-2">{entry.reason_for_change}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {entry.changed_by_admin_name && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{entry.changed_by_admin_name}</span>
                    </div>
                  )}
                  {entry.last_status_change_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(entry.last_status_change_date), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {auditEntries.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">No audit entries yet</p>
                <p className="text-sm">Changes to features and pages will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}