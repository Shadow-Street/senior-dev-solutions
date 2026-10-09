import React, { useState, useEffect } from 'react';
import { PMStrategy } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, TrendingUp, Users, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function PMStrategies({ pmProfile }) {
  const [strategies, setStrategies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStrategies();
  }, [pmProfile]);

  const loadStrategies = async () => {
    try {
      const allStrategies = await PMStrategy.filter({ pm_id: pmProfile.id });
      setStrategies(allStrategies);
    } catch (error) {
      console.error('Error loading strategies:', error);
      toast.error('Failed to load strategies');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskBadge = (risk) => {
    const config = {
      low: { color: 'bg-buy-muted text-buy-muted-foreground', label: 'Low Risk' },
      medium: { color: 'bg-hold-muted text-hold-muted-foreground', label: 'Medium Risk' },
      high: { color: 'bg-sell-muted text-sell-muted-foreground', label: 'High Risk' }
    };
    const { color, label } = config[risk] || config.medium;
    return <Badge className={color}>{label}</Badge>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12">Loading strategies...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Investment Strategies</h2>
          <p className="text-subtle">Create and manage your portfolio strategies</p>
        </div>
        <Button className="bg-primary hover:bg-primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Strategy
        </Button>
      </div>

      {/* Strategies Grid */}
      <div className="grid gap-6">
        {strategies.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Strategies Yet</h3>
              <p className="text-subtle">Create your first investment strategy</p>
            </CardContent>
          </Card>
        ) : (
          strategies.map((strategy) => (
            <Card key={strategy.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{strategy.strategy_name}</CardTitle>
                      {strategy.is_active ? (
                        <Badge className="bg-buy-muted text-buy-muted-foreground">Active</Badge>
                      ) : (
                        <Badge className="bg-surface-2 text-foreground">Inactive</Badge>
                      )}
                      {getRiskBadge(strategy.risk_level)}
                    </div>
                    <p className="text-sm text-subtle">{strategy.description}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-premium-muted p-3 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-primary mb-2" />
                    <p className="text-sm text-primary">Target Return</p>
                    <p className="text-xl font-bold text-primary">{strategy.target_return}%</p>
                  </div>
                  <div className="bg-buy-muted p-3 rounded-lg">
                    <Target className="w-5 h-5 text-buy-muted-foreground mb-2" />
                    <p className="text-sm text-buy-muted-foreground">Total AUM</p>
                    <p className="text-xl font-bold text-buy-muted-foreground">
                      ₹{(strategy.total_aum / 100000).toFixed(2)}L
                    </p>
                  </div>
                  <div className="bg-premium-muted p-3 rounded-lg">
                    <Users className="w-5 h-5 text-protocall-premium-text mb-2" />
                    <p className="text-sm text-protocall-premium-text">Clients</p>
                    <p className="text-xl font-bold text-protocall-premium-text">{strategy.client_count || 0}</p>
                  </div>
                  <div className="bg-hold-muted p-3 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-hold-muted-foreground mb-2" />
                    <p className="text-sm text-hold-muted-foreground">Performance</p>
                    <p className="text-xl font-bold text-hold-muted-foreground">{strategy.performance_return || 0}%</p>
                  </div>
                </div>

                {strategy.stock_list && strategy.stock_list.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-subtle mb-2">Stock Allocation:</p>
                    <div className="flex flex-wrap gap-2">
                      {strategy.stock_list.slice(0, 5).map((stock, idx) => (
                        <Badge key={idx} variant="outline">
                          {stock.stock_symbol} ({stock.weight_percentage}%)
                        </Badge>
                      ))}
                      {strategy.stock_list.length > 5 && (
                        <Badge variant="outline">+{strategy.stock_list.length - 5} more</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}