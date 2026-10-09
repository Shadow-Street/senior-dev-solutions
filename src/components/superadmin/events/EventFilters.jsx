import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { format } from 'date-fns';

export default function EventFilters({ onFilterChange, organizers = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    organizer: 'all',
    dateFrom: null,
    dateTo: null,
    isPremium: 'all',
    priceMin: '',
    priceMax: '',
    capacity: 'all'
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      status: 'all',
      organizer: 'all',
      dateFrom: null,
      dateTo: null,
      isPremium: 'all',
      priceMin: '',
      priceMax: '',
      capacity: 'all'
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return value !== '';
    if (key === 'dateFrom' || key === 'dateTo') return value !== null;
    if (key === 'priceMin' || key === 'priceMax') return value !== '';
    return value !== 'all';
  }).length;

  return (
    <Card className="shadow-md border-0 bg-surface-2">
      <CardContent className="p-6">
        {/* Search Bar - Always Visible */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search events by title, organizer, or location..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 pr-4 h-12 border-2 border-border focus:border-primary rounded-xl"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`h-12 px-4 border-2 transition-all duration-300 rounded-xl ${
              isExpanded 
                ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white border-transparent' 
                : 'border-border hover:bg-gradient-to-r hover:from-surface-2 hover:to-surface-2 hover:border-primary'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 bg-white text-primary hover:bg-white">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="h-12 px-4 border-2 border-sell/30 text-sell-muted-foreground hover:bg-gradient-to-r hover:from-surface-2 hover:to-surface-2 hover:border-sell rounded-xl transition-all duration-300"
            >
              <X className="w-5 h-5 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Advanced Filters - Expandable */}
        {isExpanded && (
          <div className="mt-6 space-y-4 animate-in slide-in-from-top-5">
            <div className="h-px bg-gradient-to-r from-transparent via-surface-2 to-transparent"></div>
            
            {/* Row 1: Status, Organizer, Premium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-subtle mb-2 block">Status</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger className="h-11 border-2 border-border hover:border-primary rounded-xl transition-colors">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-subtle mb-2 block">Organizer</label>
                <Select value={filters.organizer} onValueChange={(value) => handleFilterChange('organizer', value)}>
                  <SelectTrigger className="h-11 border-2 border-border hover:border-primary rounded-xl transition-colors">
                    <SelectValue placeholder="All Organizers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizers</SelectItem>
                    {organizers.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-subtle mb-2 block">Event Type</label>
                <Select value={filters.isPremium} onValueChange={(value) => handleFilterChange('isPremium', value)}>
                  <SelectTrigger className="h-11 border-2 border-border hover:border-primary rounded-xl transition-colors">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="true">Premium (Paid)</SelectItem>
                    <SelectItem value="false">Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-subtle mb-2 block">Date From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-11 justify-start text-left font-normal border-2 border-border hover:border-primary rounded-xl transition-colors"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, 'PPP') : 'Select start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => handleFilterChange('dateFrom', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-semibold text-subtle mb-2 block">Date To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-11 justify-start text-left font-normal border-2 border-border hover:border-primary rounded-xl transition-colors"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, 'PPP') : 'Select end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => handleFilterChange('dateTo', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Row 3: Price Range & Capacity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-subtle mb-2 block">Min Ticket Price (₹)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.priceMin}
                  onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                  className="h-11 border-2 border-border focus:border-primary rounded-xl"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-subtle mb-2 block">Max Ticket Price (₹)</label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={filters.priceMax}
                  onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                  className="h-11 border-2 border-border focus:border-primary rounded-xl"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-subtle mb-2 block">Capacity</label>
                <Select value={filters.capacity} onValueChange={(value) => handleFilterChange('capacity', value)}>
                  <SelectTrigger className="h-11 border-2 border-border hover:border-primary rounded-xl transition-colors">
                    <SelectValue placeholder="Any Capacity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Capacity</SelectItem>
                    <SelectItem value="small">Small (1-50)</SelectItem>
                    <SelectItem value="medium">Medium (51-200)</SelectItem>
                    <SelectItem value="large">Large (201-500)</SelectItem>
                    <SelectItem value="xlarge">Extra Large (500+)</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-border">
                <span className="text-sm font-semibold text-subtle">Active Filters:</span>
                
                {filters.search && (
                  <Badge className="bg-surface-2 text-primary border-0">
                    Search: "{filters.search}"
                    <X 
                      className="w-3 h-3 ml-2 cursor-pointer" 
                      onClick={() => handleFilterChange('search', '')}
                    />
                  </Badge>
                )}
                
                {filters.status !== 'all' && (
                  <Badge className="bg-surface-2 text-primary border-0">
                    Status: {filters.status}
                    <X 
                      className="w-3 h-3 ml-2 cursor-pointer" 
                      onClick={() => handleFilterChange('status', 'all')}
                    />
                  </Badge>
                )}
                
                {filters.dateFrom && (
                  <Badge className="bg-surface-2 text-primary border-0">
                    From: {format(filters.dateFrom, 'MMM dd, yyyy')}
                    <X 
                      className="w-3 h-3 ml-2 cursor-pointer" 
                      onClick={() => handleFilterChange('dateFrom', null)}
                    />
                  </Badge>
                )}
                
                {filters.dateTo && (
                  <Badge className="bg-surface-2 text-primary border-0">
                    To: {format(filters.dateTo, 'MMM dd, yyyy')}
                    <X 
                      className="w-3 h-3 ml-2 cursor-pointer" 
                      onClick={() => handleFilterChange('dateTo', null)}
                    />
                  </Badge>
                )}
                
                {filters.isPremium !== 'all' && (
                  <Badge className="bg-surface-2 text-primary border-0">
                    Type: {filters.isPremium === 'true' ? 'Premium' : 'Free'}
                    <X 
                      className="w-3 h-3 ml-2 cursor-pointer" 
                      onClick={() => handleFilterChange('isPremium', 'all')}
                    />
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}