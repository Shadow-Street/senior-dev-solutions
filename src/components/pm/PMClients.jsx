import React, { useState, useEffect } from 'react';
import { PMClient, PMHolding } from '@/lib/apiClient';
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
      const allClients = await PMClient.filter({ pm_id: pmProfile.id });
      setClients(allClients);

      // Load holdings for each client
      for (const client of allClients) {
        const clientHoldings = await PMHolding.filter({ client_id: client.id });
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
      pending_verification: { color: 'bg-hold-muted text-hold-muted-foreground', label: 'Pending' },
      active: { color: 'bg-buy-muted text-buy-muted-foreground', label: 'Active' },
      suspended: { color: 'bg-sell-muted text-sell-muted-foreground', label: 'Suspended' },
      terminated: { color: 'bg-surface-2 text-foreground', label: 'Terminated' }
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        <Button className="bg-primary hover:bg-primary">
          <Plus className="w-4 h-4 mr-2" />
          Invite Client
        </Button>
      </div>

      {/* Clients Grid */}
      <div className="grid gap-6">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Clients Yet</h3>
              <p className="text-subtle">Invite your first client to get started</p>
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
                        <div className="w-12 h-12 bg-gradient-to-br from-protocall-deep to-protocall-blue rounded-full flex items-center justify-center text-white font-bold">
                          {client.client_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{client.client_name}</h3>
                          <p className="text-sm text-subtle">{client.email}</p>
                        </div>
                        {getStatusBadge(client.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-premium-muted p-3 rounded-lg">
                          <p className="text-xs text-primary mb-1">Invested</p>
                          <p className="text-lg font-bold text-primary">
                            ₹{(client.invested_amount / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <div className="bg-premium-muted p-3 rounded-lg">
                          <p className="text-xs text-protocall-premium-text mb-1">Current Value</p>
                          <p className="text-lg font-bold text-protocall-premium-text">
                            ₹{(client.current_value / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <div className={`${isProfitable ? 'bg-buy-muted' : 'bg-sell-muted'} p-3 rounded-lg`}>
                          <p className={`text-xs ${isProfitable ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'} mb-1`}>P&L</p>
                          <p className={`text-lg font-bold ${isProfitable ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'} flex items-center gap-1`}>
                            {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            ₹{Math.abs(client.unrealized_pnl / 1000).toFixed(0)}K
                          </p>
                          <p className={`text-xs ${isProfitable ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}`}>
                            {pnlPercent}%
                          </p>
                        </div>
                        <div className="bg-surface-2 p-3 rounded-lg">
                          <p className="text-xs text-subtle mb-1">Holdings</p>
                          <p className="text-lg font-bold text-foreground">{clientHoldings.length}</p>
                          <p className="text-xs text-subtle">Stocks</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-subtle">
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