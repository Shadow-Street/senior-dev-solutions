import React, { useState, useEffect } from 'react';
import { PMInvoice } from '@/lib/apiClient';
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
      const allInvoices = await PMInvoice.filter({ pm_id: pmProfile.id }, '-created_date');
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
      generated: { color: 'bg-surface-2 text-foreground', label: 'Generated' },
      sent: { color: 'bg-premium-muted text-protocall-blue', label: 'Sent' },
      paid: { color: 'bg-buy-muted text-buy-muted-foreground', label: 'Paid' },
      overdue: { color: 'bg-sell-muted text-sell-muted-foreground', label: 'Overdue' },
      cancelled: { color: 'bg-surface-2 text-foreground', label: 'Cancelled' }
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
        <Card className="bg-buy-soft text-buy-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-protocall-ink/75 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">₹{(stats.totalRevenue / 1000).toFixed(0)}K</p>
              </div>
              <DollarSign className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-protocall-deep to-protocall-blue text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Pending Amount</p>
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
                <p className="text-sm text-subtle">Paid Invoices</p>
                <p className="text-2xl font-bold text-foreground">{stats.paidInvoices}</p>
              </div>
              <FileText className="w-8 h-8 text-buy-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-subtle">Unpaid Invoices</p>
                <p className="text-2xl font-bold text-foreground">{stats.unpaidInvoices}</p>
              </div>
              <FileText className="w-8 h-8 text-hold-muted-foreground" />
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
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p>No invoices generated yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-4 bg-surface-2 rounded-lg hover:bg-surface-2 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-foreground">{invoice.invoice_number}</span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-subtle">
                      {invoice.client_name} • Period: {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Fee: ₹{invoice.performance_fee_amount?.toLocaleString()}</span>
                      <span>GST: ₹{invoice.gst_amount?.toLocaleString()}</span>
                      <span>Profit: ₹{invoice.profit_above_hwm?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-foreground mb-2">₹{invoice.total_amount?.toLocaleString()}</p>
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