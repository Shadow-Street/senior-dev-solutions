
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Search, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns'; // This import is still needed if using format elsewhere or if it was intended to remain for `toLocaleString` equivalent flexibility. However, outline explicitly changes to `toLocaleString()`.

export default function AuditLog({ logs }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => {
        const matchesSearch = 
          log.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.details?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesActionFilter = actionFilter === 'all' || log.action === actionFilter;

        return matchesSearch && matchesActionFilter;
      })
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [logs, searchTerm, actionFilter]);

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE_EXPENSE':
        return 'bg-buy-muted text-buy-muted-foreground';
      case 'UPDATE_EXPENSE':
        return 'bg-hold-muted text-hold-muted-foreground';
      case 'DELETE_EXPENSE':
        return 'bg-sell-muted text-sell-muted-foreground';
      default:
        return 'bg-surface-2 text-foreground';
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sell rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl bg-sell bg-clip-text text-transparent">
                Financial Audit Log
              </CardTitle>
              <p className="text-sm text-subtle font-normal mt-0.5">
                Complete audit trail of all financial operations
              </p>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-surface-2 to-sell text-sell-muted-foreground border-0">
            Super Admin Only
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 mt-6 pt-4 border-t">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search audit logs by admin, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-border focus:border-sell focus:ring-sell/30"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px] border-border focus:border-sell focus:ring-sell/30">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="CREATE_EXPENSE">Create Expense</SelectItem>
              <SelectItem value="UPDATE_EXPENSE">Update Expense</SelectItem>
              <SelectItem value="DELETE_EXPENSE">Delete Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface-2">
                <th className="p-4 text-left font-semibold text-subtle">Timestamp</th>
                <th className="p-4 text-left font-semibold text-subtle">Admin</th>
                <th className="p-4 text-left font-semibold text-subtle">Action</th>
                <th className="p-4 text-left font-semibold text-subtle">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? filteredLogs.map(log => (
                <tr key={log.id} className="border-b transition-colors hover:bg-gradient-to-r hover:from-surface-2 hover:to-transparent">
                  <td className="p-4 text-subtle font-mono text-xs">
                    {new Date(log.created_date).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-foreground">{log.admin_name}</div>
                    <div className="text-xs text-muted-foreground">{log.admin_id}</div>
                  </td>
                  <td className="p-4">
                    <Badge className={`${getActionColor(log.action)} border-0`}>
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="p-4 text-subtle max-w-md truncate">
                    {log.details}
                  </td>
                </tr>
              )) : null}
            </tbody>
          </table>
        </div>
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No audit logs found</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
