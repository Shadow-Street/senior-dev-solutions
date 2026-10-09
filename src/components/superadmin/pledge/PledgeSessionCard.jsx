
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Edit,
  Copy,
  Trash2,
  Play,
  StopCircle,
  Eye,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Moon,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  ShoppingCart,
  ShoppingBag,
  Repeat,
  AlertTriangle,
  RefreshCw,
  FileText,
  Loader2,
  PlayCircle,
  BarChart,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function PledgeSessionCard({
  session,
  pledges = [],
  onEdit,
  onClone,
  onDelete,
  onActivate,
  onClose,
  onExecute,
  onRecalculateStats,
  isExecuting, // Prop preserved as per existing code
}) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-surface-2 text-foreground', icon: <FileText className="w-3 h-3 mr-1" /> },
    active: { label: 'Active', color: 'bg-buy-muted text-buy-muted-foreground', icon: <Activity className="w-3 h-3 mr-1" /> },
    closed: { label: 'Closed', color: 'bg-hold-muted text-hold-muted-foreground', icon: <Clock className="w-3 h-3 mr-1" /> },
    executing: { label: 'Executing', color: 'bg-premium-muted text-primary', icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" /> },
    // CHANGED: icon for awaiting_sell_execution from TrendingUp to Clock as per outline
    awaiting_sell_execution: { label: 'Awaiting Sell', color: 'bg-premium-muted text-primary', icon: <Clock className="w-3 h-3 mr-1" /> },
    completed: { label: 'Completed', color: 'bg-premium-muted text-protocall-premium-text', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
    cancelled: { label: 'Cancelled', color: 'bg-sell-muted text-sell-muted-foreground', icon: <XCircle className="w-3 h-3 mr-1" /> },
  };

  // Session Mode Configuration
  const sessionModeConfig = {
    buy_only: {
      color: 'bg-buy-muted text-buy-muted-foreground border-buy/30',
      icon: ShoppingCart,
      label: 'BUY ONLY'
    },
    sell_only: {
      color: 'bg-sell-muted text-sell-muted-foreground border-sell/30',
      icon: ShoppingBag,
      label: 'SELL ONLY'
    },
    buy_sell_cycle: {
      color: 'bg-premium-muted text-primary border-protocall-premium-light',
      icon: Repeat,
      label: 'BUY & SELL'
    },
  };

  const sessionStatus = statusConfig[session.status] || statusConfig.draft;

  const modeConfig = sessionModeConfig[session.session_mode] || sessionModeConfig.buy_only;
  const ModeIcon = modeConfig.icon;

  // Mock stock price change (in production, fetch from real API)
  const mockPriceChange = Math.random() > 0.5 ? 1 : -1;
  const mockPricePercent = (Math.random() * 5).toFixed(2);

  const readyPledges = pledges.filter(p => p.status === 'ready_for_execution');
  const executedPledges = pledges.filter(p => p.status === 'executed');

  // Check if execution rule is session_end to highlight it
  const isSessionEndRule = session.execution_rule === 'session_end';

  return (
    <>
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        {/* Card Header with Gradient */}
        <div className="bg-gradient-to-r from-protocall-deep to-protocall-blue p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{session.stock_symbol}</h3>
                  {/* Stock Price Indicator */}
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${mockPriceChange > 0 ? 'bg-buy/20' : 'bg-sell/20'}`}>
                    {mockPriceChange > 0 ? (
                      <TrendingUp className="w-3 h-3 text-positive" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-sell" />
                    )}
                    <span className={`text-xs font-semibold ${mockPriceChange > 0 ? 'text-positive' : 'text-sell-muted-foreground'}`}>
                      {mockPriceChange > 0 ? '+' : '-'}{mockPricePercent}%
                    </span>
                  </div>
                </div>

                {/* Session Mode Badge */}
                <Badge className={`${modeConfig.color} border`}>
                  <ModeIcon className="w-3 h-3 mr-1" />
                  {modeConfig.label}
                </Badge>

                <Badge className={`${sessionStatus.color} border-0`}>
                  {sessionStatus.icon}
                  {sessionStatus.label}
                </Badge>

                {session.allow_amo && (
                  <Badge className="bg-premium-muted text-primary border-0">
                    <Moon className="w-3 h-3 mr-1" />
                    AMO
                  </Badge>
                )}
              </div>
              <p className="text-sm text-white/90">{session.stock_name}</p>
            </div>

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowDetailsModal(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Session
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onClone}>
                  <Copy className="w-4 h-4 mr-2" />
                  Clone Session
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {session.status === 'draft' && (
                  <DropdownMenuItem onClick={onActivate}>
                    <Play className="w-4 h-4 mr-2 text-buy-muted-foreground" />
                    <span className="text-buy-muted-foreground">Activate Session</span>
                  </DropdownMenuItem>
                )}

                {session.status === 'active' && (
                  <>
                    <DropdownMenuItem onClick={() => onExecute(session)}>
                      <Play className="w-4 h-4 mr-2 text-primary" />
                      <span className="text-primary">Execute Now</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onClose}>
                      <StopCircle className="w-4 h-4 mr-2 text-hold-muted-foreground" />
                      <span className="text-hold-muted-foreground">Close Session</span>
                    </DropdownMenuItem>
                  </>
                )}

                {/* NEW: Dropdown menu item for 'Execute Sell Orders' */}
                {session.status === 'awaiting_sell_execution' && (
                  <DropdownMenuItem onClick={() => onExecute(session)}>
                    <TrendingDown className="w-4 h-4 mr-2 text-sell-muted-foreground" />
                    <span className="text-sell-muted-foreground">Execute Sell Orders</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-sell-muted-foreground">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          {/* Display stock symbol and status badge pair in CardContent */}
          <div className="flex justify-between items-center text-sm">
            <Badge variant="outline" className="font-mono text-primary bg-premium-muted border-protocall-premium-light">
              {session.stock_symbol}
            </Badge>
            <Badge variant="outline" className={cn("font-semibold text-xs", sessionStatus.color)}>
              {sessionStatus.icon}
              <span className="ml-1">{sessionStatus.label}</span>
            </Badge>
          </div>

          {/* Special highlighted panel for 'awaiting_sell_execution' status */}
          {session.status === 'awaiting_sell_execution' && (
            <div className="p-3 bg-premium-muted border border-protocall-premium-light rounded-lg">
              <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Sell Phase Active
              </h4>
              <p className="text-xs text-primary mt-1">
                Buy orders are complete and positions are now live. You can monitor and manage sell executions from the <b className="font-bold">"Executions"</b> tab.
              </p>
            </div>
          )}

          {/* Session Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-premium-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-xs text-primary font-semibold">TOTAL</span>
              </div>
              <p className="text-2xl font-bold text-primary">{session.total_pledges || 0}</p>
              <p className="text-xs text-primary">Total Pledges</p>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="text-buy-muted-foreground">Buy: {session.buy_pledges_count || 0}</span>
                <span className="text-sell-muted-foreground">Sell: {session.sell_pledges_count || 0}</span>
              </div>
            </div>

            <div className="bg-buy-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-buy-muted-foreground" />
                <span className="text-xs text-buy-muted-foreground font-semibold">VALUE</span>
              </div>
              <p className="text-2xl font-bold text-buy-muted-foreground">
                ₹{((session.total_pledge_value || 0) / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-buy-muted-foreground">Total Value</p>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="text-buy-muted-foreground">Buy: ₹{((session.buy_pledges_value || 0) / 1000).toFixed(1)}k</span>
                <span className="text-sell-muted-foreground">Sell: ₹{((session.sell_pledges_value || 0) / 1000).toFixed(1)}k</span>
              </div>
            </div>

            <div className="bg-premium-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-protocall-premium-text" />
                <span className="text-xs text-protocall-premium-text font-semibold">READY</span>
              </div>
              <p className="text-2xl font-bold text-protocall-premium-text">{readyPledges.length}</p>
              <p className="text-xs text-protocall-premium-text">Ready to Execute</p>
            </div>

            <div className="bg-hold-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-hold-muted-foreground" />
                <span className="text-xs text-hold-muted-foreground font-semibold">EXECUTED</span>
              </div>
              <p className="text-2xl font-bold text-hold-muted-foreground">{executedPledges.length}</p>
              <p className="text-xs text-hold-muted-foreground">Completed</p>
            </div>
          </div>

          {/* Recalculate Stats Button */}
          {(session.total_pledges === 0 && pledges.length > 0) && (
            <div className="p-3 bg-hold-muted border border-hold/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-hold-muted-foreground" />
                  <span className="text-sm text-hold-muted-foreground">Stats may be out of sync</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRecalculateStats}
                  className="text-hold-muted-foreground border-hold/30 hover:bg-hold-muted"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Recalculate
                </Button>
              </div>
            </div>
          )}

          {/* Session Timeline */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-subtle">
              <Calendar className="w-4 h-4" />
              <span>Start: {format(new Date(session.session_start), 'PPp')}</span>
            </div>
            <div className="flex items-center gap-2 text-subtle">
              <Clock className="w-4 h-4" />
              <span>End: {format(new Date(session.session_end), 'PPp')}</span>
            </div>
          </div>

          {/* Session Info Tags */}
          <div className="flex flex-wrap gap-2">
            {/* Highlight session_end execution rule */}
            <Badge
              variant="outline"
              className={`text-xs ${isSessionEndRule ? 'bg-hold-muted text-hold-muted-foreground border-hold/30 font-semibold' : ''}`}
            >
              {isSessionEndRule && <Clock className="w-3 h-3 mr-1" />}
              {session.execution_rule}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Fee: ₹{session.convenience_fee_amount}
            </Badge>
          </div>

          {/* Action Buttons */}
          {/* Consolidated existing and new buttons here */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowDetailsModal(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Details
            </Button>

            {/* Changed icon to PlayCircle for active session execution as per outline */}
            {session.status === 'active' && (
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue"
                onClick={() => onExecute(session)}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Execute
              </Button>
            )}

            {/* NEW: Button for awaiting_sell_execution status */}
            {session.status === 'awaiting_sell_execution' && (
              <Button
                size="sm"
                className="flex-1 bg-sell hover:bg-sell"
                onClick={() => onExecute(session)}
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Execute Sell Orders
              </Button>
            )}

            {session.status === 'draft' && (
              <Button
                size="sm"
                className="flex-1 bg-buy-soft text-buy-foreground hover:bg-buy"
                onClick={onActivate}
              >
                <Play className="w-4 h-4 mr-2" />
                Activate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              {session.stock_symbol}
              <Badge className={`${sessionStatus.color} border-0`}>
                {sessionStatus.label}
              </Badge>
            </DialogTitle>
            <DialogDescription>{session.stock_name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Description */}
            {session.description && (
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-subtle">{session.description}</p>
              </div>
            )}

            {/* Execution Reason */}
            {session.execution_reason && (
              <div>
                <h4 className="font-semibold mb-2">Execution Rationale</h4>
                <p className="text-sm text-subtle">{session.execution_reason}</p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-premium-muted p-4 rounded-lg">
                <p className="text-xs text-primary mb-1">Total Pledges</p>
                <p className="text-2xl font-bold text-primary">{session.total_pledges || 0}</p>
              </div>
              <div className="bg-buy-muted p-4 rounded-lg">
                <p className="text-xs text-buy-muted-foreground mb-1">Total Value</p>
                <p className="text-2xl font-bold text-buy-muted-foreground">₹{((session.total_pledge_value || 0) / 1000).toFixed(1)}k</p>
              </div>
              <div className="bg-premium-muted p-4 rounded-lg">
                <p className="text-xs text-protocall-premium-text mb-1">Buy Pledges</p>
                <p className="text-2xl font-bold text-protocall-premium-text">{session.buy_pledges_count || 0}</p>
              </div>
              <div className="bg-hold-muted p-4 rounded-lg">
                <p className="text-xs text-hold-muted-foreground mb-1">Sell Pledges</p>
                <p className="text-2xl font-bold text-hold-muted-foreground">{session.sell_pledges_count || 0}</p>
              </div>
            </div>

            {/* Configuration Details */}
            <div className="space-y-3">
              <h4 className="font-semibold">Configuration</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Session Mode</p>
                  <p className="font-medium">{session.session_mode?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Execution Rule</p>
                  {/* Highlight session_end in modal too */}
                  <p className={`font-medium ${isSessionEndRule ? 'text-hold-muted-foreground font-semibold' : ''}`}>
                    {session.execution_rule}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">AMO Enabled</p>
                  <p className="font-medium">{session.allow_amo ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Convenience Fee</p>
                  <p className="font-medium">
                    {session.convenience_fee_type === 'flat' ? '₹' : ''}{session.convenience_fee_amount}{session.convenience_fee_type === 'percent' ? '%' : ''}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Min Quantity</p>
                  <p className="font-medium">{session.min_qty || 1}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Quantity</p>
                  <p className="font-medium">{session.max_qty || 'Unlimited'}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              <h4 className="font-semibold">Timeline</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session Start</span>
                  <span className="font-medium">{format(new Date(session.session_start), 'PPp')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session End</span>
                  <span className="font-medium">{format(new Date(session.session_end), 'PPp')}</span>
                </div>
                {session.last_executed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Executed</span>
                    <span className="font-medium">{format(new Date(session.last_executed_at), 'PPp')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {session.is_advisor_recommended && (
                <Badge className="bg-premium-muted text-primary">SEBI Advisor Recommended</Badge>
              )}
              {session.is_analyst_certified && (
                <Badge className="bg-buy-muted text-buy-muted-foreground">Analyst Certified</Badge>
              )}
              {session.allow_amo && (
                <Badge className="bg-premium-muted text-primary">
                  <Moon className="w-3 h-3 mr-1" />
                  AMO Enabled
                </Badge>
              )}
            </div>

            {/* Action Buttons for Modal */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onEdit} className="flex-1">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={onClone} className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Clone
              </Button>
              {session.status === 'active' && (
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    onExecute(session);
                  }}
                  className="flex-1 bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Execute
                </Button>
              )}
              {/* NEW: Button for awaiting_sell_execution status in modal */}
              {session.status === 'awaiting_sell_execution' && (
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    onExecute(session);
                  }}
                  className="flex-1 bg-sell hover:bg-sell"
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Execute Sell Orders
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
