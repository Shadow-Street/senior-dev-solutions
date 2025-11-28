import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
      const allStrategies = await base44.entities.PMStrategy.filter({ pm_id: pmProfile.id });
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
      low: { color: 'bg-green-100 text-green-800', label: 'Low Risk' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium Risk' },
      high: { color: 'bg-red-100 text-red-800', label: 'High Risk' }
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
          <h2 className="text-2xl font-bold text-gray-900">Investment Strategies</h2>
          <p className="text-gray-600">Create and manage your portfolio strategies</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Strategy
        </Button>
      </div>

      {/* Strategies Grid */}
      <div className="grid gap-6">
        {strategies.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Strategies Yet</h3>
              <p className="text-gray-600">Create your first investment strategy</p>
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
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                      )}
                      {getRiskBadge(strategy.risk_level)}
                    </div>
                    <p className="text-sm text-gray-600">{strategy.description}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-sm text-blue-600">Target Return</p>
                    <p className="text-xl font-bold text-blue-900">{strategy.target_return}%</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <Target className="w-5 h-5 text-green-600 mb-2" />
                    <p className="text-sm text-green-600">Total AUM</p>
                    <p className="text-xl font-bold text-green-900">
                      ₹{(strategy.total_aum / 100000).toFixed(2)}L
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600 mb-2" />
                    <p className="text-sm text-purple-600">Clients</p>
                    <p className="text-xl font-bold text-purple-900">{strategy.client_count || 0}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600 mb-2" />
                    <p className="text-sm text-orange-600">Performance</p>
                    <p className="text-xl font-bold text-orange-900">{strategy.performance_return || 0}%</p>
                  </div>
                </div>

                {strategy.stock_list && strategy.stock_list.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Stock Allocation:</p>
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