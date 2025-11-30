import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
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
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Get all PM clients where this user is the client
      const myPMClients = await base44.entities.PMClient.filter({ user_id: currentUser.id });
      setPMClients(myPMClients);

      // Load holdings for each PM client
      const holdingsMap = {};
      const invoicesMap = {};

      for (const client of myPMClients) {
        const clientHoldings = await base44.entities.PMHolding.filter({ client_id: client.id });
        holdingsMap[client.id] = clientHoldings;

        const clientInvoices = await base44.entities.PMInvoice.filter({ client_id: client.id });
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (pmClients.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No PM Investments Yet</h3>
              <p className="text-gray-600 mb-6">You haven't invested with any Portfolio Managers yet.</p>
              <a href="/PortfolioManagers" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">
                Browse Portfolio Managers
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">My PM Investments</h1>
          <p className="text-blue-100">Track your professionally managed portfolios</p>
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
                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Portfolio Manager</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Managed by: <span className="font-semibold">PM #{client.pm_id.substring(0, 8)}</span>
                      </p>
                    </div>
                    <Badge className={client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
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
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <DollarSign className="w-5 h-5 text-blue-600 mb-2" />
                          <p className="text-sm text-blue-600">Invested</p>
                          <p className="text-2xl font-bold text-blue-900">
                            ₹{(client.invested_amount / 1000).toFixed(0)}K
                          </p>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-purple-600 mb-2" />
                          <p className="text-sm text-purple-600">Current Value</p>
                          <p className="text-2xl font-bold text-purple-900">
                            ₹{(client.current_value / 1000).toFixed(0)}K
                          </p>
                        </div>

                        <div className={`${isProfitable ? 'bg-green-50' : 'bg-red-50'} p-4 rounded-lg`}>
                          {isProfitable ? 
                            <TrendingUp className={`w-5 h-5 ${isProfitable ? 'text-green-600' : 'text-red-600'} mb-2`} /> :
                            <TrendingDown className={`w-5 h-5 ${isProfitable ? 'text-green-600' : 'text-red-600'} mb-2`} />
                          }
                          <p className={`text-sm ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>P&L</p>
                          <p className={`text-2xl font-bold ${isProfitable ? 'text-green-900' : 'text-red-900'}`}>
                            ₹{Math.abs(client.unrealized_pnl / 1000).toFixed(0)}K
                          </p>
                          <p className={`text-xs ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                            {pnlPercent}%
                          </p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <BarChart3 className="w-5 h-5 text-gray-600 mb-2" />
                          <p className="text-sm text-gray-600">Holdings</p>
                          <p className="text-2xl font-bold text-gray-900">{clientHoldings.length}</p>
                          <p className="text-xs text-gray-600">Stocks</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="holdings" className="mt-6">
                      {clientHoldings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No holdings yet
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {clientHoldings.map((holding) => (
                            <div key={holding.id} className="bg-white border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-gray-900">{holding.stock_symbol}</h4>
                                  <p className="text-sm text-gray-600">{holding.stock_name}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900">₹{holding.current_price?.toFixed(2)}</p>
                                  <p className={`text-sm ${holding.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {holding.unrealized_pnl >= 0 ? '+' : ''}₹{holding.unrealized_pnl?.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                                <div>
                                  <p className="text-xs text-gray-500">Qty</p>
                                  <p className="text-sm font-semibold">{holding.quantity}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Avg Price</p>
                                  <p className="text-sm font-semibold">₹{holding.avg_buy_price?.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Current Val</p>
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
                        <div className="text-center py-8 text-gray-500">
                          No invoices yet
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {clientInvoices.map((invoice) => (
                            <div key={invoice.id} className="bg-white border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                  <div>
                                    <h4 className="font-semibold text-gray-900">{invoice.invoice_number}</h4>
                                    <p className="text-sm text-gray-600">
                                      {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900">₹{invoice.total_amount?.toFixed(2)}</p>
                                  <Badge className={
                                    invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                    invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
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