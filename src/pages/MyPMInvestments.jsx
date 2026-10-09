import React, { useState, useEffect } from 'react';
import { authAPI, PMClient, PMHolding, PMInvoice } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, DollarSign, BarChart3, Activity, Briefcase, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function MyPMInvestments() {
  const [user, setUser] = useState(null);
  const [pmClients, setPMClients] = useState([]);
  const [holdings, setHoldings] = useState({});
  const [invoices, setInvoices] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await authAPI.me();
      setUser(currentUser);

      // Get all PM clients where this user is the client
      const myPMClients = await PMClient.filter({ user_id: currentUser.id });
      setPMClients(myPMClients);

      // Load holdings for each PM client
      const holdingsMap = {};
      const invoicesMap = {};

      for (const client of myPMClients) {
        const clientHoldings = await PMHolding.filter({ client_id: client.id });
        holdingsMap[client.id] = clientHoldings;

        const clientInvoices = await PMInvoice.filter({ client_id: client.id });
        invoicesMap[client.id] = clientInvoices;
      }

      setHoldings(holdingsMap);
      setInvoices(invoicesMap);

    } catch (error) {
      console.error('Error loading PM investments:', error);
      toast.error('Failed to load PM investments');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (pmClients.length === 0) {
    return (
      <div className="min-h-screen bg-surface-2 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-foreground mb-2">No PM Investments Yet</h3>
              <p className="text-subtle mb-6">You haven't invested with any Portfolio Managers yet.</p>
              <a href="/PortfolioManagers" className="inline-block bg-primary hover:bg-primary text-white px-6 py-3 rounded-lg font-semibold">
                Browse Portfolio Managers
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-2 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-protocall-deep to-protocall-blue rounded-xl p-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">My PM Investments</h1>
          <p className="text-primary">Track your professionally managed portfolios</p>
        </div>

        {/* PM Clients List */}
        <div className="space-y-6">
          {pmClients.map((client) => {
            const clientHoldings = holdings[client.id] || [];
            const clientInvoices = invoices[client.id] || [];
            const isProfitable = (client.unrealized_pnl || 0) >= 0;
            const pnlPercent = client.invested_amount > 0
              ? ((client.unrealized_pnl / client.invested_amount) * 100).toFixed(2)
              : 0;

            return (
              <Card key={client.id} className="shadow-lg">
                <CardHeader className="border-b bg-surface-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Portfolio Manager</CardTitle>
                      <p className="text-sm text-subtle mt-1">
                        Managed by: <span className="font-semibold">PM #{client.pm_id.substring(0, 8)}</span>
                      </p>
                    </div>
                    <Badge className={client.status === 'active' ? 'bg-buy-muted text-buy-muted-foreground' : 'bg-surface-2 text-foreground'}>
                      {client.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <Tabs defaultValue="overview">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="holdings">Holdings</TabsTrigger>
                      <TabsTrigger value="invoices">Invoices</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-premium-muted p-4 rounded-lg">
                          <DollarSign className="w-5 h-5 text-primary mb-2" />
                          <p className="text-sm text-primary">Invested</p>
                          <p className="text-2xl font-bold text-primary">
                            ₹{(client.invested_amount / 1000).toFixed(0)}K
                          </p>
                        </div>

                        <div className="bg-premium-muted p-4 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-protocall-premium-text mb-2" />
                          <p className="text-sm text-protocall-premium-text">Current Value</p>
                          <p className="text-2xl font-bold text-protocall-premium-text">
                            ₹{(client.current_value / 1000).toFixed(0)}K
                          </p>
                        </div>

                        <div className={`${isProfitable ? 'bg-buy-muted' : 'bg-sell-muted'} p-4 rounded-lg`}>
                          {isProfitable ?
                            <TrendingUp className={`w-5 h-5 ${isProfitable ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'} mb-2`} /> :
                            <TrendingDown className={`w-5 h-5 ${isProfitable ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'} mb-2`} />
                          }
                          <p className={`text-sm ${isProfitable ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}`}>P&L</p>
                          <p className={`text-2xl font-bold ${isProfitable ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}`}>
                            ₹{Math.abs(client.unrealized_pnl / 1000).toFixed(0)}K
                          </p>
                          <p className={`text-xs ${isProfitable ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}`}>
                            {pnlPercent}%
                          </p>
                        </div>

                        <div className="bg-surface-2 p-4 rounded-lg">
                          <BarChart3 className="w-5 h-5 text-subtle mb-2" />
                          <p className="text-sm text-subtle">Holdings</p>
                          <p className="text-2xl font-bold text-foreground">{clientHoldings.length}</p>
                          <p className="text-xs text-subtle">Stocks</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="holdings" className="mt-6">
                      {clientHoldings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No holdings yet
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {clientHoldings.map((holding) => (
                            <div key={holding.id} className="bg-white border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-foreground">{holding.stock_symbol}</h4>
                                  <p className="text-sm text-subtle">{holding.stock_name}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-foreground">₹{holding.current_price?.toFixed(2)}</p>
                                  <p className={`text-sm ${holding.unrealized_pnl >= 0 ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}`}>
                                    {holding.unrealized_pnl >= 0 ? '+' : ''}₹{holding.unrealized_pnl?.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                                <div>
                                  <p className="text-xs text-muted-foreground">Qty</p>
                                  <p className="text-sm font-semibold">{holding.quantity}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Avg Price</p>
                                  <p className="text-sm font-semibold">₹{holding.avg_buy_price?.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Current Val</p>
                                  <p className="text-sm font-semibold">₹{holding.current_value?.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="invoices" className="mt-6">
                      {clientInvoices.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No invoices yet
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {clientInvoices.map((invoice) => (
                            <div key={invoice.id} className="bg-white border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-primary" />
                                  <div>
                                    <h4 className="font-semibold text-foreground">{invoice.invoice_number}</h4>
                                    <p className="text-sm text-subtle">
                                      {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-foreground">₹{invoice.total_amount?.toFixed(2)}</p>
                                  <Badge className={
                                    invoice.status === 'paid' ? 'bg-buy-muted text-buy-muted-foreground' :
                                      invoice.status === 'overdue' ? 'bg-sell-muted text-sell-muted-foreground' :
                                        'bg-hold-muted text-hold-muted-foreground'
                                  }>
                                    {invoice.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}