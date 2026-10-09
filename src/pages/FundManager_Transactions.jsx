import React, { useState, useEffect } from 'react';
import FundManagerLayout from '../components/layouts/FundManagerLayout';
import { FundTransactionAPI } from '@/lib/apiClient';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, DollarSign } from 'lucide-react';
import { Loader2 } from 'lucide-react';

function TransactionsContent() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const txns = await FundTransactionAPI.list('-transaction_date', 100);
        setTransactions(txns);
      } catch (error) {
        console.error('Error loading transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, []);

  const filteredTransactions = transactions.filter(txn =>
    txn.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    txn.investor_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fund Transactions</h1>
          <p className="text-subtle mt-2">View all fund transactions</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search by transaction ID or investor ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTransactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-surface-2">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      txn.transaction_type === 'purchase' ? 'bg-buy-muted' :
                      txn.transaction_type === 'redemption' ? 'bg-hold-muted' :
                      'bg-premium-muted'
                    }`}>
                      <DollarSign className={`w-5 h-5 ${
                        txn.transaction_type === 'purchase' ? 'text-buy-muted-foreground' :
                        txn.transaction_type === 'redemption' ? 'text-hold-muted-foreground' :
                        'text-primary'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold capitalize">{txn.transaction_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(txn.transaction_date).toLocaleDateString()} • {txn.units?.toFixed(4)} units
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">₹{txn.amount?.toLocaleString('en-IN')}</p>
                      <Badge className={
                        txn.status === 'completed' ? 'bg-buy-muted text-buy-muted-foreground' :
                        txn.status === 'pending' ? 'bg-hold-muted text-hold-muted-foreground' :
                        'bg-sell-muted text-sell-muted-foreground'
                      }>
                        {txn.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FundManager_Transactions() {
  return (
    <FundManagerLayout activePage="transactions">
      <TransactionsContent />
    </FundManagerLayout>
  );
}