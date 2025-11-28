import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  X,
  Filter,
  Calendar,
  User,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function MessageSearchBar({ onSearch, onFilterChange, users = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    userId: 'all',
    messageType: 'all',
    dateFrom: null,
    dateTo: null
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (value) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      userId: 'all',
      messageType: 'all',
      dateFrom: null,
      dateTo: null
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const activeFilterCount = Object.values(filters).filter(v => 
    v !== 'all' && v !== null
  ).length;

  return (
    <div className="space-y-3">
      {/* Search Bar with enhanced design */}
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-600 transition-colors" />
          <Input
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
          <AnimatePresence>
            {searchTerm && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1 transition-all"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="relative hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              <AnimatePresence>
                {activeFilterCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Badge className="ml-2 bg-blue-600 text-white h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs shadow-md">
                      {activeFilterCount}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 shadow-xl border-2 border-slate-200" align="end">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-slate-900">Filter Messages</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* Filter by User */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Filter by User
                </label>
                <Select
                  value={filters.userId}
                  onValueChange={(value) => handleFilterChange('userId', value)}
                >
                  <SelectTrigger className="hover:border-blue-300 transition-colors">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter by Message Type */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Message Type
                </label>
                <Select
                  value={filters.messageType}
                  onValueChange={(value) => handleFilterChange('messageType', value)}
                >
                  <SelectTrigger className="hover:border-blue-300 transition-colors">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="text">Text Only</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="file">Files</SelectItem>
                    <SelectItem value="bot_insight">Bot Messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-start text-left font-normal hover:border-blue-300 transition-colors">
                        {filters.dateFrom ? format(filters.dateFrom, 'MMM d') : 'From'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => handleFilterChange('dateFrom', date)}
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-start text-left font-normal hover:border-blue-300 transition-colors">
                        {filters.dateTo ? format(filters.dateTo, 'MMM d') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => handleFilterChange('dateTo', date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </motion.div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display with animations */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div 
            className="flex flex-wrap gap-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {filters.userId !== 'all' && (
              <motion.div
                initial={{ scale: 0, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Badge variant="secondary" className="flex items-center gap-1 pr-1 shadow-sm hover:shadow-md transition-shadow">
                  <User className="w-3 h-3" />
                  {users.find(u => u.id === filters.userId)?.display_name || 'User'}
                  <button
                    onClick={() => handleFilterChange('userId', 'all')}
                    className="ml-1 hover:bg-red-100 hover:text-red-600 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              </motion.div>
            )}
            
            {filters.messageType !== 'all' && (
              <motion.div
                initial={{ scale: 0, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Badge variant="secondary" className="flex items-center gap-1 pr-1 shadow-sm hover:shadow-md transition-shadow">
                  {filters.messageType === 'image' ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                  {filters.messageType}
                  <button
                    onClick={() => handleFilterChange('messageType', 'all')}
                    className="ml-1 hover:bg-red-100 hover:text-red-600 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              </motion.div>
            )}
            
            {(filters.dateFrom || filters.dateTo) && (
              <motion.div
                initial={{ scale: 0, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Badge variant="secondary" className="flex items-center gap-1 pr-1 shadow-sm hover:shadow-md transition-shadow">
                  <Calendar className="w-3 h-3" />
                  {filters.dateFrom && format(filters.dateFrom, 'MMM d')}
                  {filters.dateFrom && filters.dateTo && ' - '}
                  {filters.dateTo && format(filters.dateTo, 'MMM d')}
                  <button
                    onClick={() => {
                      handleFilterChange('dateFrom', null);
                      handleFilterChange('dateTo', null);
                    }}
                    className="ml-1 hover:bg-red-100 hover:text-red-600 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}