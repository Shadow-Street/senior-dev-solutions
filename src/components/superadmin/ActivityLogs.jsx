
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuditLog, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  User as UserIcon,
  Shield,
  Eye,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Action color mapping for visual indicators
const actionColors = {
  'USER_CREATED': 'bg-green-100 text-green-800 border-green-300',
  'USER_UPDATED': 'bg-blue-100 text-blue-800 border-blue-300',
  'USER_DELETED': 'bg-red-100 text-red-800 border-red-300',
  'USER_ROLE_CHANGED': 'bg-purple-100 text-purple-800 border-purple-300',
  'USER_INVITED': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'POLL_CREATED': 'bg-green-100 text-green-800 border-green-300',
  'POLL_UPDATED': 'bg-blue-100 text-blue-800 border-blue-300',
  'POLL_DELETED': 'bg-red-100 text-red-800 border-red-300',
  'POLL_SUSPENDED': 'bg-orange-100 text-orange-800 border-orange-300',
  'CHATROOM_CREATED': 'bg-green-100 text-green-800 border-green-300',
  'CHATROOM_UPDATED': 'bg-blue-100 text-blue-800 border-blue-300',
  'CHATROOM_DELETED': 'bg-red-100 text-red-800 border-red-300',
  'CONTENT_MODERATED': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'SETTING_UPDATED': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  'ROLE_CREATED': 'bg-green-100 text-green-800 border-green-300',
  'ROLE_UPDATED': 'bg-blue-100 text-blue-800 border-blue-300',
  'PERMISSION_GRANTED': 'bg-purple-100 text-purple-800 border-purple-300',
  'PERMISSION_REVOKED': 'bg-red-100 text-red-800 border-red-300',
  'EVENT_APPROVED': 'bg-green-100 text-green-800 border-green-300',
  'EVENT_REJECTED': 'bg-red-100 text-red-800 border-red-300',
  'PAYOUT_APPROVED': 'bg-green-100 text-green-800 border-green-300',
  'PAYOUT_REJECTED': 'bg-red-100 text-red-800 border-red-300',
  'ADVISOR_APPROVED': 'bg-green-100 text-green-800 border-green-300',
  'ADVISOR_REJECTED': 'bg-red-100 text-red-800 border-red-300',
  'FINFLUENCER_APPROVED': 'bg-green-100 text-green-800 border-green-300',
  'FINFLUENCER_REJECTED': 'bg-red-100 text-red-800 border-red-300',
  'DEFAULT': 'bg-gray-100 text-gray-800 border-gray-300'
};

// Entity type icons
const entityIcons = {
  'User': UserIcon,
  'Poll': Activity,
  'ChatRoom': Activity,
  'Setting': Activity,
  'Role': Shield,
  'Event': Calendar,
  'Advisor': Shield,
  'FinInfluencer': Shield,
  'DEFAULT': FileText
};

export default function ActivityLogs({ user }) {
  const [logs, setLogs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    byAction: {},
    byEntity: {}
  });

  const isMounted = useRef(true);
  const pollingInterval = useRef(null);

  const loadData = useCallback(async () => {
    try {
      if (!isMounted.current) return;
      setIsLoading(true);

      const [allLogs, allAdmins] = await Promise.all([
        AuditLog.list('-created_date', 1000).catch(() => []),
        User.filter({ app_role: { '$in': ['admin', 'super_admin'] } }).catch(() => [])
      ]);

      if (!isMounted.current) return;

      // Calculate stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      monthAgo.setHours(0, 0, 0, 0);

      const todayLogs = allLogs.filter(log => new Date(log.created_date) >= today);
      const weekLogs = allLogs.filter(log => new Date(log.created_date) >= weekAgo);
      const monthLogs = allLogs.filter(log => new Date(log.created_date) >= monthAgo);

      // Count by action type
      const byAction = {};
      allLogs.forEach(log => {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
      });

      // Count by entity type
      const byEntity = {};
      allLogs.forEach(log => {
        byEntity[log.entity_type] = (byEntity[log.entity_type] || 0) + 1;
      });

      setStats({
        total: allLogs.length,
        today: todayLogs.length,
        thisWeek: weekLogs.length,
        thisMonth: monthLogs.length,
        byAction,
        byEntity
      });

      setLogs(allLogs);
      setAdmins(allAdmins);
    } catch (error) {
      if (isMounted.current) {
        console.error('Error loading audit logs:', error);
        toast.error('Failed to load activity logs');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => {
      if (isMounted.current) {
        setIsRefreshing(false);
        toast.success('Activity logs refreshed');
      }
    }, 500);
  };

  useEffect(() => {
    isMounted.current = true;
    loadData();

    // Set up polling instead of subscriptions (every 30 seconds)
    pollingInterval.current = setInterval(() => {
      if (isMounted.current) {
        loadData();
      }
    }, 30000);

    return () => {
      isMounted.current = false;
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [loadData]);

  const filteredLogs = logs.filter(log => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    // Action filter
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    // Entity filter
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;

    // Admin filter
    const matchesAdmin = adminFilter === 'all' || log.admin_id === adminFilter;

    // Date filter
    const logDate = new Date(log.created_date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);

    const matchesDate = dateFilter === 'all' ||
      (dateFilter === 'today' && logDate >= today) ||
      (dateFilter === 'week' && logDate >= weekAgo) ||
      (dateFilter === 'month' && logDate >= monthAgo);

    return matchesSearch && matchesAction && matchesEntity && matchesAdmin && matchesDate;
  });

  const exportLogs = () => {
    const csvData = filteredLogs.map(log => ({
      'Timestamp': new Date(log.created_date).toLocaleString(),
      'Admin': log.admin_name,
      'Action': log.action,
      'Entity Type': log.entity_type,
      'Entity ID': log.entity_id || 'N/A',
      'Details': log.details
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvString = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Activity logs exported successfully');
  };

  const toggleRowExpansion = (logId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  const openDetailsModal = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  // Get unique action types and entity types for filters
  const uniqueActions = [...new Set(logs.map(log => log.action))].sort();
  const uniqueEntities = [...new Set(logs.map(log => log.entity_type))].sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading Activity Logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Activity Logs</h2>
          <p className="text-slate-600">Complete audit trail of all administrative actions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleRefresh} 
            variant="outline"
            disabled={isRefreshing}
            className="bg-white hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportLogs} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm opacity-90">Total Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              <div>
                <p className="text-2xl font-bold">{stats.today}</p>
                <p className="text-sm opacity-90">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8" />
              <div>
                <p className="text-2xl font-bold">{stats.thisWeek}</p>
                <p className="text-sm opacity-90">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
                <p className="text-sm opacity-90">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by action, admin, entity type, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap gap-3">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {uniqueEntities.map(entity => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={adminFilter} onValueChange={setAdminFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by Admin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Admins</SelectItem>
                  {admins.map(admin => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm || actionFilter !== 'all' || entityFilter !== 'all' || adminFilter !== 'all' || dateFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setActionFilter('all');
                    setEntityFilter('all');
                    setAdminFilter('all');
                    setDateFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Log ({filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Admin</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Entity</th>
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium">No activity logs found</p>
                      <p className="text-slate-500 text-sm">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => {
                    const isExpanded = expandedRows.has(log.id);
                    const EntityIcon = entityIcons[log.entity_type] || entityIcons.DEFAULT;
                    const actionColor = actionColors[log.action] || actionColors.DEFAULT;

                    return (
                      <React.Fragment key={log.id}>
                        <tr className="border-b hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-600">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {new Date(log.created_date).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(log.created_date).toLocaleTimeString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{log.admin_name}</div>
                                <div className="text-xs text-slate-500">Admin ID: {log.admin_id.slice(-6)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`${actionColor} border`}>
                              {log.action.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <EntityIcon className="w-4 h-4 text-slate-500" />
                              <span className="font-medium text-slate-700">{log.entity_type}</span>
                            </div>
                            {log.entity_id && (
                              <div className="text-xs text-slate-500 mt-1">
                                ID: {log.entity_id.slice(-8)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-md">
                            <p className="text-slate-600 truncate">
                              {log.details}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRowExpansion(log.id)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetailsModal(log)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan="6" className="px-4 py-4 bg-slate-50">
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-slate-600 mb-1">Admin Information</p>
                                    <p className="text-sm text-slate-700">Name: {log.admin_name}</p>
                                    <p className="text-sm text-slate-700">ID: {log.admin_id}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-slate-600 mb-1">Entity Information</p>
                                    <p className="text-sm text-slate-700">Type: {log.entity_type}</p>
                                    {log.entity_id && (
                                      <p className="text-sm text-slate-700">ID: {log.entity_id}</p>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-600 mb-1">Full Details</p>
                                  <p className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-200">
                                    {log.details}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Activity Log Details</DialogTitle>
            <DialogDescription>
              Complete information about this administrative action
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Timestamp</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(selectedLog.created_date).toLocaleString()}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Action Type</p>
                  <Badge className={`${actionColors[selectedLog.action] || actionColors.DEFAULT} border`}>
                    {selectedLog.action.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-slate-600 mb-2">Admin Information</p>
                <div className="space-y-1">
                  <p className="text-sm text-slate-700"><span className="font-medium">Name:</span> {selectedLog.admin_name}</p>
                  <p className="text-sm text-slate-700"><span className="font-medium">Admin ID:</span> {selectedLog.admin_id}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-slate-600 mb-2">Entity Information</p>
                <div className="space-y-1">
                  <p className="text-sm text-slate-700"><span className="font-medium">Entity Type:</span> {selectedLog.entity_type}</p>
                  {selectedLog.entity_id && (
                    <p className="text-sm text-slate-700"><span className="font-medium">Entity ID:</span> {selectedLog.entity_id}</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-slate-600 mb-2">Action Details</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedLog.details}</p>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
