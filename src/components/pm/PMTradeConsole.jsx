import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, TrendingUp, ShoppingCart, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function PMTradeConsole({ pmProfile }) {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Trade form state
  const [tradeForm, setTradeForm] = useState({
    client_id: '',
    stock_symbol: '',
    transaction_type: 'buy',
    order_type: 'market',
    quantity: '',
    price: '',
    order_reason: ''
  });

  useEffect(() => {
    loadData();
  }, [pmProfile]);

  const loadData = async () => {
    try {
      const [clientsData, ordersData] = await Promise.all([
        base44.entities.PMClient.filter({ pm_id: pmProfile.id, status: 'active' }),
        base44.entities.PMTradeOrder.filter({ pm_id: pmProfile.id }, '-created_date', 50)
      ]);
      setClients(clientsData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading trade data:', error);
      toast.error('Failed to load trade data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!tradeForm.client_id || !tradeForm.stock_symbol || !tradeForm.quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const orderData = {
        pm_id: pmProfile.id,
        client_id: tradeForm.client_id,
        stock_symbol: tradeForm.stock_symbol.toUpperCase(),
        transaction_type: tradeForm.transaction_type,
        order_type: tradeForm.order_type,
        quantity: parseInt(tradeForm.quantity),
        price: parseFloat(tradeForm.price) || 0,
        order_value: parseInt(tradeForm.quantity) * (parseFloat(tradeForm.price) || 0),
        order_reason: tradeForm.order_reason,
        status: 'pending'
      };

      await base44.entities.PMTradeOrder.create(orderData);
      toast.success('Order placed successfully');
      
      // Reset form
      setTradeForm({
        client_id: '',
        stock_symbol: '',
        transaction_type: 'buy',
        order_type: 'market',
        quantity: '',
        price: '',
        order_reason: ''
      });
      
      loadData();
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      placed: { color: 'bg-blue-100 text-blue-800', label: 'Placed' },
      executed: { color: 'bg-green-100 text-green-800', label: 'Executed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };
    const { color, label } = config[status] || config.pending;
    return <Badge className={color}>{label}</Badge>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12">Loading trade console...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Trade Form */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Place Trade Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Select Client</label>
              <Select value={tradeForm.client_id} onValueChange={(value) => setTradeForm({...tradeForm, client_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Stock Symbol</label>
              <Input
                placeholder="e.g., RELIANCE"
                value={tradeForm.stock_symbol}
                onChange={(e) => setTradeForm({...tradeForm, stock_symbol: e.target.value})}
                className="uppercase"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Transaction Type</label>
              <Select value={tradeForm.transaction_type} onValueChange={(value) => setTradeForm({...tradeForm, transaction_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Order Type</label>
              <Select value={tradeForm.order_type} onValueChange={(value) => setTradeForm({...tradeForm, order_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                  <SelectItem value="stop_loss">Stop Loss</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Quantity</label>
              <Input
                type="number"
                placeholder="Number of shares"
                value={tradeForm.quantity}
                onChange={(e) => setTradeForm({...tradeForm, quantity: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Price</label>
              <Input
                type="number"
                placeholder="Price per share"
                value={tradeForm.price}
                onChange={(e) => setTradeForm({...tradeForm, price: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Order Reason</label>
            <Input
              placeholder="Why are you placing this trade?"
              value={tradeForm.order_reason}
              onChange={(e) => setTradeForm({...tradeForm, order_reason: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setTradeForm({
              client_id: '',
              stock_symbol: '',
              transaction_type: 'buy',
              order_type: 'market',
              quantity: '',
              price: '',
              order_reason: ''
            })}>
              Clear
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handlePlaceOrder}
            >
              Place Order
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No orders yet</div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const client = clients.find(c => c.id === order.client_id);
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-gray-900">{order.stock_symbol}</span>
                        <Badge className={order.transaction_type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {order.transaction_type.toUpperCase()}
                        </Badge>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {client?.client_name} • {order.quantity} shares @ ₹{order.price}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.created_date).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">₹{order.order_value?.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}