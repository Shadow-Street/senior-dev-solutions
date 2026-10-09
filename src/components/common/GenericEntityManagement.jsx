import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Eye, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import EntityCard from './EntityCard';

export default function GenericEntityManagement({ 
  entityConfig, 
  entities = [], 
  users = [],
  onLoadData,
  onStatusChange,
  onViewDetails,
  onAction,
  isLoading = false,
  permissions = {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards');

  // Enrich entities with user data
  const enrichedEntities = useMemo(() => {
    const usersMap = new Map(users.map(u => [u.id, u]));
    
    return entities.map(entity => ({
      ...entity,
      user: usersMap.get(entity.user_id),
      display_name: entity.display_name || 
                   entity.user?.display_name || 
                   usersMap.get(entity.user_id)?.display_name ||
                   `${entityConfig?.entity_name} ${entity.id?.slice(-6) || 'Unknown'}`
    }));
  }, [entities, users, entityConfig]);

  // Filter entities
  const filteredEntities = useMemo(() => {
    let filtered = enrichedEntities;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entity =>
        entity.display_name?.toLowerCase().includes(term) ||
        entity.user?.email?.toLowerCase().includes(term) ||
        entity.bio?.toLowerCase().includes(term) ||
        entity.specialization?.some(spec => spec.toLowerCase().includes(term))
      );
    }
    
    if (statusFilter !== 'all') {
      const statusField = entityConfig?.status_field || 'status';
      filtered = filtered.filter(entity => entity[statusField] === statusFilter);
    }
    
    return filtered;
  }, [enrichedEntities, searchTerm, statusFilter, entityConfig]);

  // Calculate stats
  const stats = useMemo(() => {
    const statusField = entityConfig?.status_field || 'status';
    return {
      total: enrichedEntities.length,
      pending: enrichedEntities.filter(e => ['pending', 'pending_approval'].includes(e[statusField])).length,
      active: enrichedEntities.filter(e => ['active', 'approved'].includes(e[statusField])).length,
      suspended: enrichedEntities.filter(e => e[statusField] === 'suspended').length,
      rejected: enrichedEntities.filter(e => e[statusField] === 'rejected').length
    };
  }, [enrichedEntities, entityConfig]);

  useEffect(() => {
    if (onLoadData) {
      onLoadData();
    }
  }, [onLoadData]);

  const handleStatusChange = async (entityId, newStatus) => {
    try {
      if (onStatusChange) {
        await onStatusChange(entityId, newStatus);
        toast.success(`${entityConfig?.entity_name} status updated successfully`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'active', label: 'Active' },
    { value: 'approved', label: 'Approved' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'rejected', label: 'Rejected' }
  ];

  if (!entityConfig) {
    return (
      <div className="text-center p-12">
        <p className="text-subtle">Entity configuration not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {entityConfig.display_name} Management
          </CardTitle>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <div className="bg-premium-muted p-3 rounded-lg">
              <p className="text-xs text-primary">Total</p>
              <p className="text-xl font-bold text-primary">{stats.total}</p>
            </div>
            <div className="bg-hold-muted p-3 rounded-lg">
              <p className="text-xs text-hold-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-hold-muted-foreground">{stats.pending}</p>
            </div>
            <div className="bg-buy-muted p-3 rounded-lg">
              <p className="text-xs text-buy-muted-foreground">Active</p>
              <p className="text-xl font-bold text-buy-muted-foreground">{stats.active}</p>
            </div>
            <div className="bg-sell-muted p-3 rounded-lg">
              <p className="text-xs text-sell-muted-foreground">Rejected</p>
              <p className="text-xl font-bold text-sell-muted-foreground">{stats.rejected}</p>
            </div>
            <div className="bg-surface-2 p-3 rounded-lg">
              <p className="text-xs text-subtle">Suspended</p>
              <p className="text-xl font-bold text-foreground">{stats.suspended}</p>
            </div>
          </div>
          
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={`Search ${entityConfig.display_name.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cards">Card View</TabsTrigger>
              <TabsTrigger value="table">Table View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cards" className="space-y-4">
              {isLoading ? (
                <div className="text-center p-12">Loading {entityConfig.display_name.toLowerCase()}...</div>
              ) : filteredEntities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEntities.map(entity => (
                    <EntityCard
                      key={entity.id}
                      entity={entity}
                      entityType={entityConfig.entity_name}
                      onView={onViewDetails}
                      onAction={onAction}
                      actionButtonLabel={entityConfig.action_button_label || 'View'}
                      statusField={entityConfig.status_field || 'status'}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-muted-foreground mb-2">No {entityConfig.display_name.toLowerCase()} found</div>
                  <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="table" className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-subtle uppercase bg-surface-2">
                    <tr>
                      <th scope="col" className="px-6 py-3">Name</th>
                      <th scope="col" className="px-6 py-3">Status</th>
                      <th scope="col" className="px-6 py-3">Created</th>
                      <th scope="col" className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan="4" className="text-center p-8">Loading...</td></tr>
                    ) : filteredEntities.map(entity => {
                      const statusField = entityConfig.status_field || 'status';
                      const status = entity[statusField] || 'unknown';
                      
                      return (
                        <tr key={entity.id} className="bg-white border-b hover:bg-surface-2">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={entity.profile_image_url || entity.user?.profile_image_url || `https://avatar.vercel.sh/${entity.display_name}.png`}
                                alt={entity.display_name}
                                className="w-10 h-10 rounded-full"
                              />
                              <div>
                                <div className="font-medium">{entity.display_name}</div>
                                <div className="text-xs text-muted-foreground">{entity.user?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={
                              status === 'approved' || status === 'active' ? 'bg-buy-muted text-buy-muted-foreground' :
                              status === 'pending' || status === 'pending_approval' ? 'bg-hold-muted text-hold-muted-foreground' :
                              status === 'rejected' ? 'bg-sell-muted text-sell-muted-foreground' :
                              'bg-surface-2 text-foreground'
                            }>
                              {status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {new Date(entity.created_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewDetails?.(entity)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}