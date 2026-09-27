
import React, { useState, useEffect, useCallback } from 'react';
import { AlertLog, AlertConfiguration, Poll, Notification, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Settings,
  TrendingUp,
  Bell,
  X,
  Filter,
  BellRing,
  History
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Define AlertsTable component to be reusable for both active and history views
const AlertsTable = ({ alerts, onViewDetails, isLoading, severityConfig, statusConfig, alertTypeLabels, emptyMessage, loadingMessage }) => {
    if (isLoading) {
        return <div className="text-center p-8">{loadingMessage}</div>;
    }

    if (!alerts || alerts.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">{emptyMessage}</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-subtle uppercase bg-surface-2">
                    <tr>
                        <th className="px-6 py-3">Alert Details</th>
                        <th className="px-6 py-3">Type & Entity</th>
                        <th className="px-6 py-3">Severity</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Triggered</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {alerts.map(alert => {
                        const severityStyle = severityConfig[alert.severity] || {};
                        const StatusIcon = statusConfig[alert.status]?.icon || Clock;
                        
                        return (
                            <tr key={alert.id} className="bg-white border-b hover:bg-surface-2">
                                <td className="px-6 py-4">
                                    <div>
                                        <div className="font-semibold">{alert.title}</div>
                                        <div className="text-xs text-muted-foreground mt-1">{alert.stock_symbol}</div>
                                        <div className="text-xs text-subtle mt-1 max-w-xs">
                                            {alert.message.substring(0, 100)}{alert.message.length > 100 ? '...' : ''}
                                        </div>
                                    </div>
                                </td>
                                
                                <td className="px-6 py-4">
                                    <Badge variant="outline" className="mr-2">
                                        {alert.entity_type}
                                    </Badge>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {alertTypeLabels[alert.alert_type]}
                                    </div>
                                </td>
                                
                                <td className="px-6 py-4">
                                    <Badge className={severityStyle.color}>
                                        {severityStyle.icon} {alert.severity}
                                    </Badge>
                                </td>
                                
                                <td className="px-6 py-4">
                                    <Badge className={statusConfig[alert.status]?.color || 'bg-surface-2'}>
                                        <StatusIcon className="w-3 h-3 mr-1" />
                                        {alert.status}
                                    </Badge>
                                </td>
                                
                                <td className="px-6 py-4 text-muted-foreground">
                                    {new Date(alert.created_date).toLocaleDateString()}
                                    <div className="text-xs">
                                        {new Date(alert.created_date).toLocaleTimeString()}
                                    </div>
                                </td>
                                
                                <td className="px-6 py-4 text-right">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onViewDetails(alert)}
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        Review
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default function AlertsManagement({ user }) {
  const [alerts, setAlerts] = useState([]);
  const [displayedActiveAlerts, setDisplayedActiveAlerts] = useState([]);
  const [displayedResolvedAlerts, setDisplayedResolvedAlerts] = useState([]);

  const [alertConfigs, setAlertConfigs] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('none');
  
  const [activeTab, setActiveTab] = useState('active');
  const [canConfigureAlerts, setCanConfigureAlerts] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    critical: 0,
    resolved: 0
  });

  useEffect(() => {
    if (user) {
      setCanConfigureAlerts(['super_admin', 'admin'].includes(user.app_role));
    }
  }, [user]);

  const loadData = useCallback(async () => {
    try {
      const [configs, logs] = await Promise.all([
        AlertConfiguration.list().catch(err => {
          if (err.message !== 'Request aborted') toast.error("Failed to load configurations.");
          return [];
        }),
        AlertLog.list('-created_date').catch(err => {
          if (err.message !== 'Request aborted') toast.error("Failed to load alert logs.");
          return [];
        }),
      ]);
      return { configs, logs };
    } catch (error) {
      console.error("Error loading alert data:", error);
      toast.error('Failed to load alerts data'); // General error toast
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const fetchData = async () => {
        const data = await loadData();
        if (isMounted && data) {
            setAlertConfigs(data.configs);
            setAlerts(data.logs);
            
            setStats({
              total: data.logs.length,
              pending: data.logs.filter(a => a.status === 'pending' || a.status === 'acknowledged').length,
              critical: data.logs.filter(a => a.severity === 'critical' && (a.status === 'pending' || a.status === 'acknowledged')).length,
              resolved: data.logs.filter(a => a.status === 'resolved' || a.status === 'dismissed').length
            });

            setIsLoading(false);
        } else if (isMounted && !data) {
            // If data is null due to a general error, still stop loading
            setIsLoading(false);
        }
    };
    
    fetchData();

    return () => {
      isMounted = false;
    };
  }, [loadData]);

  const filterAlerts = useCallback(() => {
    let tempAlerts = alerts;

    if (severityFilter !== 'all') {
        tempAlerts = tempAlerts.filter(a => a.severity === severityFilter);
    }

    if (typeFilter !== 'all') {
        tempAlerts = tempAlerts.filter(a => a.entity_type === typeFilter);
    }

    const baseActive = tempAlerts.filter(a => a.status === 'pending' || a.status === 'acknowledged');
    const baseHistory = tempAlerts.filter(a => a.status === 'resolved' || a.status === 'dismissed');

    let finalActive = baseActive;
    let finalHistory = baseHistory;

    if (activeTab === 'active') {
        if (statusFilter !== 'all') {
            finalActive = baseActive.filter(a => a.status === statusFilter);
        }
    } else { // activeTab === 'history'
        if (statusFilter !== 'all') {
            finalHistory = baseHistory.filter(a => a.status === statusFilter);
        }
    }
    
    setDisplayedActiveAlerts(finalActive);
    setDisplayedResolvedAlerts(finalHistory);

  }, [alerts, statusFilter, severityFilter, typeFilter, activeTab]);

  useEffect(() => {
    filterAlerts();
  }, [filterAlerts]);

  const handleResolveAlert = async (alertId, status) => {
    try {
      await AlertLog.update(alertId, {
        status,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        admin_notes: adminNotes,
        action_taken: actionTaken
      });

      if (status === 'resolved') {
        const alertToResolve = alerts.find(a => a.id === alertId);
        if (alertToResolve) {
          await Notification.create({
            user_id: user.id,
            title: 'Alert Resolved',
            message: `Alert "${alertToResolve.title}" has been resolved`,
            priority: 'informational',
            category: 'admin_action'
          });
        }
      }

      toast.success(`Alert ${status} successfully`);
      setShowDetailsModal(false);
      setAdminNotes('');
      setActionTaken('none');
      loadData();
      
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const openDetailsModal = (alert) => {
    setSelectedAlert(alert);
    setAdminNotes(alert.admin_notes || '');
    setActionTaken(alert.action_taken || 'none');
    setShowDetailsModal(true);
  };

  const handleViewDetails = openDetailsModal;

  const alertTypeLabels = {
    poll_high_engagement: 'High Engagement',
    poll_anomaly: 'Vote Anomaly',
    poll_premium_conversion: 'Premium Conversion',
    poll_flagged: 'Flagged Content',
    pledge_near_target: 'Near Target',
    pledge_target_achieved: 'Target Achieved',
    pledge_low_participation: 'Low Participation',
    pledge_expired: 'Expired Pledge'
  };

  const severityConfig = {
    info: { color: 'bg-premium-muted text-protocall-blue', icon: '🔵' },
    warning: { color: 'bg-hold-muted text-hold-muted-foreground', icon: '⚠️' },
    critical: { color: 'bg-sell-muted text-sell-muted-foreground', icon: '🔴' }
  };

  const statusConfig = {
    pending: { color: 'bg-hold-muted text-hold-muted-foreground', icon: Clock },
    acknowledged: { color: 'bg-premium-muted text-protocall-blue', icon: Eye },
    resolved: { color: 'bg-buy-muted text-buy-muted-foreground', icon: CheckCircle },
    dismissed: { color: 'bg-surface-2 text-foreground', icon: X }
  };

  const alertsByType = Object.entries(
    alerts.reduce((acc, alert) => {
      acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
      return acc;
    }, {})
  ).map(([type, count]) => ({
    name: alertTypeLabels[type] || type,
    count
  }));

  const alertsBySeverity = Object.entries(
    alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {})
  ).map(([severity, count]) => ({
    name: severity.charAt(0).toUpperCase() + severity.slice(1),
    count,
    color: severityConfig[severity]?.color.split(' ')[0].replace('bg-', '#') || '#gray'
  }));

  const canResolveAlerts = user && ['super_admin', 'admin'].includes(user.app_role);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <AlertTriangle className="w-6 h-6 text-hold-muted-foreground" />
                System Alert Center
              </CardTitle>
              <p className="text-sm text-subtle mt-1">
                Monitor and manage automated system alerts and configurations.
              </p>
            </div>
            {canConfigureAlerts && (
              <Button onClick={() => setShowConfigModal(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Configure Alerts
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-premium-muted p-4 rounded-lg">
              <p className="text-sm text-protocall-blue">Total Alerts</p>
              <p className="text-2xl font-bold text-protocall-blue">{stats.total}</p>
            </div>
            <div className="bg-hold-muted p-4 rounded-lg">
              <p className="text-sm text-hold-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-hold-muted-foreground">{stats.pending}</p>
            </div>
            <div className="bg-sell-muted p-4 rounded-lg">
              <p className="text-sm text-sell-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-sell-muted-foreground">{stats.critical}</p>
            </div>
            <div className="bg-buy-muted p-4 rounded-lg">
              <p className="text-sm text-buy-muted-foreground">Resolved</p>
              <p className="text-2xl font-bold text-buy-muted-foreground">{stats.resolved}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-lg border-0 bg-white">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="poll">Polls</SelectItem>
                <SelectItem value="pledge">Pledges</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Alerts by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={alertsByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={alertsBySeverity}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, count }) => `${name}: ${count}`}
                >
                  {alertsBySeverity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-transparent p-1 rounded-xl gap-2">
          <TabsTrigger value="active" className="whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary hover:bg-primary/90 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-md">
            <BellRing className="w-4 h-4" /> Active Alerts ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="history" className="whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary hover:bg-primary/90 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-md">
            <History className="w-4 h-4" /> Alert History ({stats.resolved})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
            <Card className="shadow-lg border-0 bg-white">
                <CardHeader>
                    <CardTitle>Active Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                    <AlertsTable 
                        alerts={displayedActiveAlerts} 
                        onViewDetails={handleViewDetails}
                        isLoading={isLoading}
                        severityConfig={severityConfig}
                        statusConfig={statusConfig}
                        alertTypeLabels={alertTypeLabels}
                        emptyMessage="No active alerts found."
                        loadingMessage="Loading active alerts..."
                    />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="history" className="mt-6">
            <Card className="shadow-lg border-0 bg-white">
                <CardHeader>
                    <CardTitle>Alert History</CardTitle>
                </CardHeader>
                <CardContent>
                    <AlertsTable 
                        alerts={displayedResolvedAlerts}
                        onViewDetails={handleViewDetails}
                        isLoading={isLoading}
                        severityConfig={severityConfig}
                        statusConfig={statusConfig}
                        alertTypeLabels={alertTypeLabels}
                        emptyMessage="No alert history found."
                        loadingMessage="Loading alert history..."
                    />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alert Details & Resolution</DialogTitle>
            <DialogDescription>
              Review and take action on this alert
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              <div className="bg-surface-2 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">{selectedAlert.title}</h3>
                <p className="text-sm text-subtle mb-2">{selectedAlert.message}</p>
                <div className="flex gap-2 text-xs">
                  <Badge className={severityConfig[selectedAlert.severity]?.color}>
                    {selectedAlert.severity}
                  </Badge>
                  <Badge variant="outline">{selectedAlert.entity_type}</Badge>
                  <Badge variant="outline">{selectedAlert.stock_symbol}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Triggered Value</p>
                  <p className="text-lg">{selectedAlert.triggered_value}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Threshold</p>
                  <p className="text-lg">{selectedAlert.threshold_value}</p>
                </div>
              </div>

              {canResolveAlerts && (
                <>
                  <div>
                    <label className="text-sm font-medium">Action Taken</label>
                    <Select value={actionTaken} onValueChange={setActionTaken}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Action Required</SelectItem>
                        <SelectItem value="extended_deadline">Extended Deadline</SelectItem>
                        <SelectItem value="closed_poll">Closed Poll</SelectItem>
                        <SelectItem value="suspended_poll">Suspended Poll</SelectItem>
                        <SelectItem value="contacted_user">Contacted User</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Admin Notes</label>
                    <Textarea
                      placeholder="Add notes about your investigation and resolution..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowDetailsModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-subtle"
                      onClick={() => handleResolveAlert(selectedAlert.id, 'dismissed')}
                    >
                      Dismiss
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-protocall-blue"
                      onClick={() => handleResolveAlert(selectedAlert.id, 'acknowledged')}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      className="bg-buy hover:bg-buy"
                      onClick={() => handleResolveAlert(selectedAlert.id, 'resolved')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Resolve
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Alerts</DialogTitle>
            <DialogDescription>
              This is a placeholder for the alert configuration settings.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 text-center text-muted-foreground">
            Alert configuration settings will be managed here.
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowConfigModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
