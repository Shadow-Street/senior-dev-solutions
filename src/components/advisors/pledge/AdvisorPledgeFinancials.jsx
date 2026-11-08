import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Wallet, TrendingUp, Landmark } from 'lucide-react';
import FinancialStatement from '../../entity/FinancialStatement';
import AdvisorWithdrawals from '../finance/AdvisorWithdrawals';
import AdvisorBankAccounts from '../finance/AdvisorBankAccounts';

// Payouts now go through the advisor withdrawal flow (bank account -> admin
// review -> paid). The balance is computed by the server; this view no longer
// sums commission fields itself (BE-9: it sent requested_amount, the column is
// amount).
export default function AdvisorPledgeFinancials({ advisorProfile }) {
  const [financialTab, setFinancialTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Sub-Navigation with Full Rounded Buttons */}
      <div className="flex gap-3 w-full">
        <Button
          onClick={() => setFinancialTab('overview')}
          className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${financialTab === 'overview'
            ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-lg hover:shadow-xl hover:scale-105'
            : 'bg-surface-2 text-subtle hover:from-surface-2 hover:to-surface-2 hover:shadow-md border border-protocall-premium-light'
            }`}
        >
          <DollarSign className="w-5 h-5 mr-2 inline-block" />
          Financials
        </Button>
        <Button
          onClick={() => setFinancialTab('payouts')}
          className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${financialTab === 'payouts'
            ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-lg hover:shadow-xl hover:scale-105'
            : 'bg-surface-2 text-subtle hover:from-surface-2 hover:to-surface-2 hover:shadow-md border border-protocall-premium-light'
            }`}
        >
          <Wallet className="w-5 h-5 mr-2 inline-block" />
          Withdrawals
        </Button>
        <Button
          onClick={() => setFinancialTab('bank')}
          className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${financialTab === 'bank'
            ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-lg hover:shadow-xl hover:scale-105'
            : 'bg-surface-2 text-subtle hover:from-surface-2 hover:to-surface-2 hover:shadow-md border border-protocall-premium-light'
            }`}
        >
          <Landmark className="w-5 h-5 mr-2 inline-block" />
          Bank Accounts
        </Button>
        <Button
          onClick={() => setFinancialTab('refunds')}
          className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${financialTab === 'refunds'
            ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-lg hover:shadow-xl hover:scale-105'
            : 'bg-surface-2 text-subtle hover:from-surface-2 hover:to-surface-2 hover:shadow-md border border-protocall-premium-light'
            }`}
        >
          <TrendingUp className="w-5 h-5 mr-2 inline-block" />
          Refund Management
        </Button>
      </div>

      {financialTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-foreground">Financial Overview</h2>
            <Button
              onClick={() => setFinancialTab('payouts')}
              className="bg-buy text-buy-foreground hover:bg-buy-soft"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Request Payout
            </Button>
          </div>

          <FinancialStatement
            entityType="advisor"
            entityId={advisorProfile?.id}
            entityName={advisorProfile?.display_name || 'Advisor'}
          />
        </div>
      )}

      {financialTab === 'payouts' && <AdvisorWithdrawals />}

      {financialTab === 'bank' && <AdvisorBankAccounts />}

      {financialTab === 'refunds' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Refund Management</h2>
          <Card>
            <CardContent className="p-8 text-center">
              <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-subtle">No refund requests for pledge trading</p>
              <p className="text-sm text-muted-foreground mt-2">Pledge trading refunds are managed through the convenience fee system</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
