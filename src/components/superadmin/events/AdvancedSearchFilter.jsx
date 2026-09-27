import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Search,
  Filter,
  X,
  Save,
  Star,
  Calendar as CalendarIcon,
  DollarSign,
  Users,
  MapPin,
  Sparkles,
  Clock,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdvancedSearchFilter({ 
  onFilterChange, 
  onReset,
  totalEvents = 0 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    isPremium: 'all',
    isFeatured: 'all',
    organizer: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    minCapacity: '',
    maxCapacity: '',
    dateFrom: null,
    dateTo: null,
    attendeeMin: '',
    attendeeMax: ''
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState([]);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Quick Filter Presets
  const quickFilters = [
    {
      id: 'upcoming',
      name: 'Upcoming Events',
      icon: Clock,
      color: 'bg-premium-muted text-protocall-blue hover:bg-premium-muted',
      filters: { status: 'approved', dateFrom: new Date() }
    },
    {
      id: 'featured',
      name: 'Featured',
      icon: Star,
      color: 'bg-hold-muted text-hold-muted-foreground hover:bg-hold-muted',
      filters: { isFeatured: 'true' }
    },
    {
      id: 'premium',
      name: 'Premium Events',
      icon: Sparkles,
      color: 'bg-premium-muted text-protocall-premium-text hover:bg-premium-muted',
      filters: { isPremium: 'true' }
    },
    {
      id: 'high-capacity',
      name: 'Large Events',
      icon: Users,
      color: 'bg-buy-muted text-buy-muted-foreground hover:bg-buy-muted',
      filters: { minCapacity: '100' }
    },
    {
      id: 'pending',
      name: 'Pending Approval',
      icon: Clock,
      color: 'bg-hold-muted text-hold-muted-foreground hover:bg-hold-muted',
      filters: { status: 'pending_approval' }
    },
    {
      id: 'popular',
      name: 'Popular (50+ Attendees)',
      icon: TrendingUp,
      color: 'bg-premium-muted text-protocall-blue hover:bg-premium-muted',
      filters: { attendeeMin: '50' }
    }
  ];

  // Load saved presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('eventFilterPresets');
    if (saved) {
      try {
        setSavedPresets(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading presets:', error);
      }
    }
  }, []);

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (searchTerm) count++;
    if (filters.status !== 'all') count++;
    if (filters.isPremium !== 'all') count++;
    if (filters.isFeatured !== 'all') count++;
    if (filters.organizer) count++;
    if (filters.location) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.minCapacity || filters.maxCapacity) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.attendeeMin || filters.attendeeMax) count++;

    setActiveFiltersCount(count);
  }, [searchTerm, filters]);

  // Trigger filter change callback
  useEffect(() => {
    const debounce = setTimeout(() => {
      onFilterChange({ searchTerm, ...filters });
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm, filters, onFilterChange]);

  const handleQuickFilter = (quickFilter) => {
    setFilters(prev => ({
      ...prev,
      ...quickFilter.filters
    }));
    toast.success(`Applied "${quickFilter.name}" filter`);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({
      status: 'all',
      isPremium: 'all',
      isFeatured: 'all',
      organizer: '',
      location: '',
      minPrice: '',
      maxPrice: '',
      minCapacity: '',
      maxCapacity: '',
      dateFrom: null,
      dateTo: null,
      attendeeMin: '',
      attendeeMax: ''
    });
    setShowAdvancedFilters(false);
    onReset();
    toast.info('All filters cleared');
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    const newPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: { searchTerm, ...filters },
      createdAt: new Date().toISOString()
    };

    const updated = [...savedPresets, newPreset];
    setSavedPresets(updated);
    localStorage.setItem('eventFilterPresets', JSON.stringify(updated));

    setShowSavePresetModal(false);
    setPresetName('');
    toast.success(`Preset "${presetName}" saved successfully`);
  };

  const handleLoadPreset = (preset) => {
    setSearchTerm(preset.filters.searchTerm || '');
    setFilters(preset.filters);
    toast.success(`Loaded "${preset.name}" preset`);
  };

  const handleDeletePreset = (presetId) => {
    const updated = savedPresets.filter(p => p.id !== presetId);
    setSavedPresets(updated);
    localStorage.setItem('eventFilterPresets', JSON.stringify(updated));
    toast.success('Preset deleted');
  };

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search events by title, organizer, location, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 pr-10 h-12 text-base"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-subtle"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <Button
              variant={showAdvancedFilters ? 'default' : 'outline'}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="h-12 gap-2 relative"
            >
              <Filter className="w-5 h-5" />
              Advanced
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-protocall-sell-text text-white px-2 py-0.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                className="h-12 gap-2 text-sell-muted-foreground hover:text-sell-muted-foreground hover:bg-sell-muted"
              >
                <X className="w-5 h-5" />
                Clear All
              </Button>
            )}
          </div>

          {/* Search Results Count */}
          {searchTerm && (
            <div className="mt-3 text-sm text-subtle">
              Searching across <span className="font-semibold text-foreground">{totalEvents}</span> events
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-protocall-premium-text" />
            <span className="text-sm font-semibold text-subtle">Quick Filters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((qf) => {
              const Icon = qf.icon;
              return (
                <Button
                  key={qf.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter(qf)}
                  className={`${qf.color} border-0`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {qf.name}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Saved Presets */}
      {savedPresets.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-hold-muted-foreground" />
                <span className="text-sm font-semibold text-subtle">Saved Presets</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedPresets.map((preset) => (
                <div key={preset.id} className="flex items-center gap-1 bg-hold-muted border border-hold/30 rounded-lg px-3 py-1.5">
                  <button
                    onClick={() => handleLoadPreset(preset)}
                    className="text-sm font-medium text-hold-muted-foreground hover:text-hold-muted-foreground"
                  >
                    {preset.name}
                  </button>
                  <button
                    onClick={() => handleDeletePreset(preset.id)}
                    className="text-hold-muted-foreground hover:text-hold-muted-foreground ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <Card className="border-2 border-protocall-premium-light shadow-lg">
          <CardHeader className="bg-surface-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-protocall-blue" />
                Advanced Filters
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSavePresetModal(true)}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Save Preset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Row 1: Status & Flags */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Event Status
                </Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isPremium" className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  Premium Status
                </Label>
                <Select
                  value={filters.isPremium}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, isPremium: value }))}
                >
                  <SelectTrigger id="isPremium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="true">Premium Only</SelectItem>
                    <SelectItem value="false">Free Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isFeatured" className="text-sm font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4 text-muted-foreground" />
                  Featured Status
                </Label>
                <Select
                  value={filters.isFeatured}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, isFeatured: value }))}
                >
                  <SelectTrigger id="isFeatured">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="true">Featured Only</SelectItem>
                    <SelectItem value="false">Non-Featured</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Organizer & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organizer" className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Organizer Name
                </Label>
                <Input
                  id="organizer"
                  placeholder="Search by organizer name..."
                  value={filters.organizer}
                  onChange={(e) => setFilters(prev => ({ ...prev, organizer: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="Search by location..."
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 3: Price Range */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Price Range (₹)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Min Price"
                  value={filters.minPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Max Price"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 4: Capacity Range */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Capacity Range
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Min Capacity"
                  value={filters.minCapacity}
                  onChange={(e) => setFilters(prev => ({ ...prev, minCapacity: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Max Capacity"
                  value={filters.maxCapacity}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxCapacity: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 5: Attendee Count Range */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Current Attendees Range
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Min Attendees"
                  value={filters.attendeeMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, attendeeMin: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Max Attendees"
                  value={filters.attendeeMax}
                  onChange={(e) => setFilters(prev => ({ ...prev, attendeeMax: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 6: Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                Event Date Range
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {filters.dateFrom ? format(filters.dateFrom, 'PPP') : 'From Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {filters.dateTo ? format(filters.dateTo, 'PPP') : 'To Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {(filters.dateFrom || filters.dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, dateFrom: null, dateTo: null }))}
                  className="text-xs mt-2"
                >
                  Clear date range
                </Button>
              )}
            </div>

            {/* Active Filters Summary */}
            {activeFiltersCount > 0 && (
              <div className="bg-premium-muted border border-protocall-premium-light rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-protocall-blue" />
                    <span className="text-sm font-semibold text-protocall-blue">
                      {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="text-sell-muted-foreground hover:text-sell-muted-foreground hover:bg-sell-muted"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Preset Modal */}
      <Dialog open={showSavePresetModal} onOpenChange={setShowSavePresetModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Save your current filters as a preset for quick access later
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="presetName">Preset Name</Label>
              <Input
                id="presetName"
                placeholder="e.g., 'Upcoming Premium Events'"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>

            <div className="bg-surface-2 rounded-lg p-3 text-sm">
              <p className="font-semibold text-subtle mb-2">Current Filters:</p>
              <ul className="space-y-1 text-subtle">
                {searchTerm && <li>• Search: "{searchTerm}"</li>}
                {filters.status !== 'all' && <li>• Status: {filters.status}</li>}
                {filters.isPremium !== 'all' && <li>• Premium: {filters.isPremium === 'true' ? 'Yes' : 'No'}</li>}
                {filters.isFeatured !== 'all' && <li>• Featured: {filters.isFeatured === 'true' ? 'Yes' : 'No'}</li>}
                {filters.organizer && <li>• Organizer: {filters.organizer}</li>}
                {filters.location && <li>• Location: {filters.location}</li>}
                {(filters.minPrice || filters.maxPrice) && (
                  <li>• Price: ₹{filters.minPrice || '0'} - ₹{filters.maxPrice || '∞'}</li>
                )}
                {(filters.dateFrom || filters.dateTo) && (
                  <li>• Date: {filters.dateFrom ? format(filters.dateFrom, 'MMM d') : 'Any'} - {filters.dateTo ? format(filters.dateTo, 'MMM d') : 'Any'}</li>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSavePresetModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} className="gap-2">
              <Save className="w-4 h-4" />
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}