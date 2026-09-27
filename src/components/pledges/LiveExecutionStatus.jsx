import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Real-time execution status display
 * Shows live updates for pledge execution without changing UI
 */
export default function LiveExecutionStatus({ execution }) {
  if (!execution) return null;

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'bg-surface-2 text-subtle border-border',
          label: 'Pending Execution',
          animate: false
        };
      case 'partial':
        return {
          icon: Loader2,
          color: 'bg-premium-muted text-protocall-blue border-protocall-premium-light',
          label: 'Partially Executed',
          animate: true
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'bg-buy-muted text-buy-muted-foreground border-buy/30',
          label: 'Executed Successfully',
          animate: false
        };
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'bg-sell-muted text-sell-muted-foreground border-sell/30',
          label: 'Execution Failed',
          animate: false
        };
      case 'cancelled':
        return {
          icon: AlertCircle,
          color: 'bg-hold-muted text-hold-muted-foreground border-hold/30',
          label: 'Cancelled',
          animate: false
        };
      default:
        return {
          icon: Clock,
          color: 'bg-surface-2 text-subtle border-border',
          label: status,
          animate: false
        };
    }
  };

  const statusConfig = getStatusConfig(execution.status);
  const StatusIcon = statusConfig.icon;

  const hasProfitLoss = execution.executed_qty && execution.executed_price;
  const profitLoss = hasProfitLoss 
    ? (execution.executed_price - (execution.pledged_price || 0)) * execution.executed_qty
    : 0;
  const isProfitable = profitLoss > 0;

  return (
    <div className="space-y-2">
      {/* Status Badge */}
      <Badge className={`${statusConfig.color} flex items-center gap-1`}>
        <StatusIcon className={`w-3 h-3 ${statusConfig.animate ? 'animate-spin' : ''}`} />
        {statusConfig.label}
      </Badge>

      {/* Execution Details */}
      {execution.status === 'completed' && (
        <div className="bg-buy-muted border border-buy/30 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-subtle">Executed Qty:</span>
            <span className="font-semibold text-foreground">{execution.executed_qty}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-subtle">Execution Price:</span>
            <span className="font-semibold text-foreground">₹{execution.executed_price?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-subtle">Total Value:</span>
            <span className="font-semibold text-foreground">
              ₹{(execution.total_execution_value || 0).toFixed(2)}
            </span>
          </div>
          
          {hasProfitLoss && profitLoss !== 0 && (
            <div className={`flex justify-between items-center text-sm pt-2 border-t ${
              isProfitable ? 'border-buy/30' : 'border-sell/30'
            }`}>
              <span className="text-subtle">P&L:</span>
              <span className={`font-bold flex items-center gap-1 ${
                isProfitable ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'
              }`}>
                {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isProfitable ? '+' : ''}₹{profitLoss.toFixed(2)}
              </span>
            </div>
          )}

          {execution.executed_at && (
            <div className="text-xs text-muted-foreground pt-1">
              Executed: {new Date(execution.executed_at).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Partial Execution */}
      {execution.status === 'partial' && (
        <div className="bg-premium-muted border border-protocall-premium-light rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-protocall-blue mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-medium">Execution in progress...</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-subtle">Executed:</span>
            <span className="font-semibold text-foreground">
              {execution.executed_qty} / {execution.pledged_qty}
            </span>
          </div>
          <div className="w-full bg-protocall-blue rounded-full h-2 mt-2">
            <div
              className="bg-protocall-blue h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${((execution.executed_qty / execution.pledged_qty) * 100)}%` 
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Failed Execution */}
      {execution.status === 'failed' && execution.error_message && (
        <div className="bg-sell-muted border border-sell/30 rounded-lg p-3">
          <p className="text-sm text-sell-muted-foreground font-medium mb-1">Execution Failed</p>
          <p className="text-xs text-sell-muted-foreground">{execution.error_message}</p>
        </div>
      )}

      {/* Broker Order ID */}
      {execution.broker_order_id && (
        <div className="text-xs text-muted-foreground">
          Order ID: <span className="font-mono">{execution.broker_order_id}</span>
        </div>
      )}
    </div>
  );
}