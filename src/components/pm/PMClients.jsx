import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Search, Eye, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function PMClients({ pmProfile }) {
  const [clients, setClients] = useState([]);
  const [holdings, setHoldings] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, [pmProfile]);

  const loadClients = async () => {
    try {
      const allClients = await base44.entities.PMClient.filter({ pm_id: pmProfile.id });
      setClients(allClients);

      // Load holdings for each client
      for (const client of allClients) {
        const clientHoldings = await base44.entities.PMHolding.filter({ client_id: client.id });
        setHoldings(prev => ({ ...prev, [client.id]: clientHoldings }));
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending_verification: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      suspended: { color: 'bg-red-100 text-red-800', label: 'Suspended' },
      terminated: { color: 'bg-gray-100 text-gray-800', label: 'Terminated' }
    };
    const { color, label } = config[status] || config.pending_verification;
    return <Badge className={color}>{label}</Badge>;
  };

  const filteredClients = clients.filter(client =>
    client.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center p-12">Loading clients...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Invite Client
        </Button>
      </div>

      {/* Clients Grid */}
      <div className="grid gap-6">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Clients Yet</h3>
              <p className="text-gray-600">Invite your first client to get started</p>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => {
            const clientHoldings = holdings[client.id] || [];
            const pnlPercent = client.invested_amount > 0 
              ? ((client.unrealized_pnl / client.invested_amount) * 100).toFixed(2)
              : 0;
            const isProfitable = client.unrealized_pnl >= 0;

            return (
              <Card key={client.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {client.client_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{client.client_name}</h3>
                          <p className="text-sm text-gray-600">{client.email}</p>
                        </div>
                        {getStatusBadge(client.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-600 mb-1">Invested</p>
                          <p className="text-lg font-bold text-blue-900">
                            ₹{(client.invested_amount / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-xs text-purple-600 mb-1">Current Value</p>
                          <p className="text-lg font-bold text-purple-900">
                            ₹{(client.current_value / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <div className={`${isProfitable ? 'bg-green-50' : 'bg-red-50'} p-3 rounded-lg`}>
                          <p className={`text-xs ${isProfitable ? 'text-green-600' : 'text-red-600'} mb-1`}>P&L</p>
                          <p className={`text-lg font-bold ${isProfitable ? 'text-green-900' : 'text-red-900'} flex items-center gap-1`}>
                            {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            ₹{Math.abs(client.unrealized_pnl / 1000).toFixed(0)}K
                          </p>
                          <p className={`text-xs ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                            {pnlPercent}%
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Holdings</p>
                          <p className="text-lg font-bold text-gray-900">{clientHoldings.length}</p>
                          <p className="text-xs text-gray-600">Stocks</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Broker: <span className="font-semibold">{client.broker_id?.toUpperCase()}</span></span>
                        <span>•</span>
                        <span>Since: {new Date(client.onboarding_date || client.created_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Portfolio
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}