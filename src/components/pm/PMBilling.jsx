import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, Download, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function PMBilling({ pmProfile }) {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    paidInvoices: 0,
    unpaidInvoices: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, [pmProfile]);

  const loadInvoices = async () => {
    try {
      const allInvoices = await base44.entities.PMInvoice.filter({ pm_id: pmProfile.id }, '-created_date');
      setInvoices(allInvoices);

      const totalRevenue = allInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0);
      const pendingAmount = allInvoices.filter(i => i.status === 'sent' || i.status === 'generated').reduce((sum, i) => sum + i.total_amount, 0);
      
      setStats({
        totalRevenue,
        pendingAmount,
        paidInvoices: allInvoices.filter(i => i.status === 'paid').length,
        unpaidInvoices: allInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length
      });
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      generated: { color: 'bg-gray-100 text-gray-800', label: 'Generated' },
      sent: { color: 'bg-blue-100 text-blue-800', label: 'Sent' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      overdue: { color: 'bg-red-100 text-red-800', label: 'Overdue' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' }
    };
    const { color, label } = config[status] || config.generated;
    return <Badge className={color}>{label}</Badge>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12">Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">₹{(stats.totalRevenue / 1000).toFixed(0)}K</p>
              </div>
              <DollarSign className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Pending Amount</p>
                <p className="text-3xl font-bold mt-2">₹{(stats.pendingAmount / 1000).toFixed(0)}K</p>
              </div>
              <TrendingUp className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{stats.paidInvoices}</p>
              </div>
              <FileText className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unpaid Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{stats.unpaidInvoices}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Fee Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p>No invoices generated yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-gray-900">{invoice.invoice_number}</span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {invoice.client_name} • Period: {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>Fee: ₹{invoice.performance_fee_amount?.toLocaleString()}</span>
                      <span>GST: ₹{invoice.gst_amount?.toLocaleString()}</span>
                      <span>Profit: ₹{invoice.profit_above_hwm?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900 mb-2">₹{invoice.total_amount?.toLocaleString()}</p>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}