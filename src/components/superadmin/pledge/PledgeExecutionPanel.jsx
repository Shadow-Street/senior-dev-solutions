import React, { useState, useEffect } from 'react';
import { Pledge, PledgeSession, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Play, Pause, TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  Users, Target, Clock, Activity, RefreshCw, Edit, X
} from 'lucide-react';
import { toast } from 'sonner';
import { stockAPI } from '../../stocks/LiveStockAPI';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

export default function PledgeExecutionPanel() {
  const [activePositions, setActivePositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [livePrices, setLivePrices] = useState({});
  const [selectedPledge, setSelectedPledge] = useState(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideAction, setOverrideAction] = useState(null);
  const [newTargetPrice, setNewTargetPrice] = useState('');

  useEffect(() => {
    loadActivePositions();
    const interval = setInterval(loadActivePositions, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activePositions.length > 0) {
      fetchLivePrices();
      const priceInterval = setInterval(fetchLivePrices, 60000); // Update prices every minute
      return () => clearInterval(priceInterval);
    }
  }, [activePositions]);

  const loadActivePositions = async () => {
    try {
      const positions = await Pledge.filter({
        status: 'executing' // Buy done, waiting for sell
      }, '-created_date');

      setActivePositions(positions);
    } catch (error) {
      console.error('Error loading active positions:', error);
      toast.error('Failed to load active positions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLivePrices = async () => {
    const uniqueSymbols = [...new Set(activePositions.map(p => p.stock_symbol))];
    const prices = {};

    for (const symbol of uniqueSymbols) {
      try {
        const stockData = await stockAPI.getStockPrice(symbol);
        if (stockData) {
          prices[symbol] = stockData.current_price;
        }
      } catch (error) {
        console.warn(`Error fetching price for ${symbol}:`, error);
      }
    }

    setLivePrices(prices);
  };

  const handlePauseAutoExecution = async (pledge) => {
    try {
      await Pledge.update(pledge.id, {
        auto_sell_paused: true,
        paused_at: new Date().toISOString(),
        admin_notes: `Auto-execution paused by admin at ${new Date().toLocaleString()}`
      });

      toast.success('Auto-execution paused');
      loadActivePositions();
    } catch (error) {
      console.error('Error pausing auto-execution:', error);
      toast.error('Failed to pause auto-execution');
    }
  };

  const handleResumeAutoExecution = async (pledge) => {
    try {
      await Pledge.update(pledge.id, {
        auto_sell_paused: false,
        admin_notes: `Auto-execution resumed by admin at ${new Date().toLocaleString()}`
      });

      toast.success('Auto-execution resumed');
      loadActivePositions();
    } catch (error) {
      console.error('Error resuming auto-execution:', error);
      toast.error('Failed to resume auto-execution');
    }
  };

  const handleManualExecute = (pledge) => {
    setSelectedPledge(pledge);
    setOverrideAction('execute');
    setShowOverrideModal(true);
  };

  const handleChangeTarget = (pledge) => {
    const config = JSON.parse(pledge.auto_sell_config || '{}');
    setNewTargetPrice(config.sell_price || '');
    setSelectedPledge(pledge);
    setOverrideAction('change_target');
    setShowOverrideModal(true);
  };

  const handleCancelAutoSell = (pledge) => {
    setSelectedPledge(pledge);
    setOverrideAction('cancel_auto');
    setShowOverrideModal(true);
  };

  const executeOverrideAction = async () => {
    if (!selectedPledge) return;

    try {
      if (overrideAction === 'execute') {
        // Manual sell execution
        const currentPrice = livePrices[selectedPledge.stock_symbol] || 0;
        
        await Pledge.update(selectedPledge.id, {
          status: 'executed',
          sell_price: currentPrice,
          sell_executed_at: new Date().toISOString(),
          admin_notes: `Manually executed by admin at ₹${currentPrice}`
        });

        toast.success(`Sell executed at ₹${currentPrice}`);
      } else if (overrideAction === 'change_target') {
        // Change target price
        const config = JSON.parse(selectedPledge.auto_sell_config || '{}');
        config.sell_price = parseFloat(newTargetPrice);

        await Pledge.update(selectedPledge.id, {
          auto_sell_config: JSON.stringify(config),
          admin_notes: `Target price changed to ₹${newTargetPrice} by admin`
        });

        toast.success(`Target price updated to ₹${newTargetPrice}`);
      } else if (overrideAction === 'cancel_auto') {
        // Convert to admin-managed
        const config = JSON.parse(selectedPledge.auto_sell_config || '{}');
        config.execution_type = 'admin_managed';
        config.has_target = false;
        config.sell_price = null;

        await Pledge.update(selectedPledge.id, {
          auto_sell_config: JSON.stringify(config),
          admin_notes: `Converted to admin-managed position`
        });

        toast.success('Converted to admin-managed position');
      }

      setShowOverrideModal(false);
      setSelectedPledge(null);
      setOverrideAction(null);
      loadActivePositions();
    } catch (error) {
      console.error('Error executing override action:', error);
      toast.error('Failed to execute action');
    }
  };

  const calculatePL = (pledge, currentPrice) => {
    const buyPrice = pledge.price_target || 0;
    const qty = pledge.qty || 0;
    const pl = (currentPrice - buyPrice) * qty;
    const plPercent = ((currentPrice - buyPrice) / buyPrice) * 100;
    return { pl, plPercent };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-protocall-blue" />
            <span className="ml-2">Loading active positions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const autoTargetPositions = activePositions.filter(p => {
    const config = JSON.parse(p.auto_sell_config || '{}');
    return config.has_target && config.execution_type === 'auto_target';
  });

  const adminManagedPositions = activePositions.filter(p => {
    const config = JSON.parse(p.auto_sell_config || '{}');
    return !config.has_target || config.execution_type === 'admin_managed';
  });

  return (
    <div className="space-y-6">
      {/* Auto-Target Positions */}
      {autoTargetPositions.length > 0 && (
        <Card>
          <CardHeader className="bg-surface-2">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-buy-muted-foreground" />
              🤖 Auto-Target Positions ({autoTargetPositions.length})
            </CardTitle>
            <p className="text-sm text-subtle">System monitoring for target prices - Admin can override anytime</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {autoTargetPositions.map(pledge => {
                const config = JSON.parse(pledge.auto_sell_config || '{}');
                const currentPrice = livePrices[pledge.stock_symbol] || 0;
                const { pl, plPercent } = calculatePL(pledge, currentPrice);
                const isPaused = pledge.auto_sell_paused;
                const targetReached = currentPrice >= config.sell_price;

                return (
                  <div key={pledge.id} className="p-4 rounded-lg border-2 border-buy/30 bg-gradient-to-br from-surface-2 to-white">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg">{pledge.stock_symbol}</h4>
                          {isPaused && (
                            <Badge className="bg-hold-muted text-hold-muted-foreground border-hold/30">
                              <Pause className="w-3 h-3 mr-1" />
                              Paused
                            </Badge>
                          )}
                          {targetReached && !isPaused && (
                            <Badge className="bg-buy text-buy-foreground animate-pulse">
                              🎯 Target Reached!
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-subtle">User ID: {pledge.user_id}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${pl >= 0 ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}`}>
                          {pl >= 0 ? '+' : ''}₹{pl.toFixed(2)}
                        </p>
                        <p className={`text-sm ${plPercent >= 0 ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}`}>
                          {plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Buy Price</p>
                        <p className="font-semibold">₹{pledge.price_target}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Target Price</p>
                        <p className="font-semibold text-buy-muted-foreground">₹{config.sell_price}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Price</p>
                        <p className="font-semibold">₹{currentPrice.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {isPaused ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResumeAutoExecution(pledge)}
                          className="flex-1"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Resume Auto-Sell
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePauseAutoExecution(pledge)}
                          className="flex-1"
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pause Auto-Sell
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleManualExecute(pledge)}
                        className="flex-1 bg-protocall-blue hover:bg-protocall-blue"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Execute Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChangeTarget(pledge)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Change Target
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelAutoSell(pledge)}
                        className="text-sell-muted-foreground hover:bg-sell-muted"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel Auto
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin-Managed Positions */}
      {adminManagedPositions.length > 0 && (
        <Card>
          <CardHeader className="bg-surface-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-protocall-blue" />
              👨‍💼 Admin-Managed Positions ({adminManagedPositions.length})
            </CardTitle>
            <p className="text-sm text-subtle">No target set - Admin decides when to sell</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {adminManagedPositions.map(pledge => {
                const currentPrice = livePrices[pledge.stock_symbol] || 0;
                const { pl, plPercent } = calculatePL(pledge, currentPrice);
                const daysHeld = Math.floor((Date.now() - new Date(pledge.created_date)) / (1000 * 60 * 60 * 24));

                return (
                  <div key={pledge.id} className="p-4 rounded-lg border-2 border-protocall-premium-light bg-gradient-to-br from-surface-2 to-white">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg">{pledge.stock_symbol}</h4>
                          <Badge variant="outline" className="bg-premium-muted text-protocall-blue">
                            <Clock className="w-3 h-3 mr-1" />
                            {daysHeld} days
                          </Badge>
                        </div>
                        <p className="text-sm text-subtle">User ID: {pledge.user_id}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${pl >= 0 ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}`}>
                          {pl >= 0 ? '+' : ''}₹{pl.toFixed(2)}
                        </p>
                        <p className={`text-sm ${plPercent >= 0 ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}`}>
                          {plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Buy Price</p>
                        <p className="font-semibold">₹{pledge.price_target}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Target</p>
                        <p className="font-semibold text-muted-foreground">Not Set</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Price</p>
                        <p className="font-semibold">₹{currentPrice.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleManualExecute(pledge)}
                        className="flex-1 bg-buy hover:bg-buy"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Execute Sell Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChangeTarget(pledge)}
                      >
                        <Target className="w-4 h-4 mr-1" />
                        Set Auto-Target
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {activePositions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-subtle mb-2">No Active Positions</h3>
            <p className="text-muted-foreground">All buy-sell cycle positions have been completed</p>
          </CardContent>
        </Card>
      )}

      {/* Override Action Modal */}
      <Dialog open={showOverrideModal} onOpenChange={setShowOverrideModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {overrideAction === 'execute' && 'Manual Sell Execution'}
              {overrideAction === 'change_target' && 'Change Target Price'}
              {overrideAction === 'cancel_auto' && 'Cancel Auto-Sell'}
            </DialogTitle>
            <DialogDescription>
              {selectedPledge && (
                <div className="mt-4 space-y-2">
                  <p><strong>Stock:</strong> {selectedPledge.stock_symbol}</p>
                  <p><strong>Quantity:</strong> {selectedPledge.qty}</p>
                  <p><strong>Buy Price:</strong> ₹{selectedPledge.price_target}</p>
                  <p><strong>Current Price:</strong> ₹{livePrices[selectedPledge.stock_symbol]?.toFixed(2)}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {overrideAction === 'execute' && (
            <div className="space-y-4">
              <div className="p-4 bg-hold-muted border border-hold/30 rounded-lg">
                <p className="text-sm text-hold-muted-foreground">
                  This will execute the sell order immediately at current market price.
                  User will be notified of the execution.
                </p>
              </div>
            </div>
          )}

          {overrideAction === 'change_target' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="new_target">New Target Price</Label>
                <Input
                  id="new_target"
                  type="number"
                  step="0.01"
                  value={newTargetPrice}
                  onChange={(e) => setNewTargetPrice(e.target.value)}
                  placeholder="Enter new target price"
                  className="mt-2"
                />
              </div>
              <div className="p-4 bg-premium-muted border border-protocall-premium-light rounded-lg">
                <p className="text-sm text-protocall-blue">
                  System will monitor and auto-execute when the new target price is reached.
                  User will be notified of the change.
                </p>
              </div>
            </div>
          )}

          {overrideAction === 'cancel_auto' && (
            <div className="space-y-4">
              <div className="p-4 bg-hold-muted border border-hold/30 rounded-lg">
                <p className="text-sm text-hold-muted-foreground">
                  This will convert the position to admin-managed. Auto-execution will be disabled,
                  and you will need to manually execute the sell order.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideModal(false)}>
              Cancel
            </Button>
            <Button onClick={executeOverrideAction} className="bg-protocall-blue hover:bg-protocall-blue">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}