import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, CreditCard, Users, ListOrdered, RotateCcw, LineChart, ShieldCheck, Landmark, HandCoins, Receipt, ScrollText, IndianRupee,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/context/AuthContext';
import { Expense } from '@/api/entities';
import { apiErrorMessage, presetRange } from '@/lib/financialsApi';

import Overview from './financials/Overview';
import SubscriptionRevenue from './financials/SubscriptionRevenue';
import AdvisorRevenue from './financials/AdvisorRevenue';
import Transactions from './financials/Transactions';
import Refunds from './financials/Refunds';
import Reports from './financials/Reports';
import Reconciliation from './financials/Reconciliation';
import AdvisorWithdrawalsReview from './financials/AdvisorWithdrawalsReview';
import Payouts from './financials/Payouts';
import ExpenseManager from './financials/ExpenseManager';
import AuditLog from './financials/AuditLog';
import { DataView, DateRangeBar, useFinanceData } from './financials/shared';

/**
 * Super Admin > Financials (client slide 11). Every figure comes from the
 * server (backend/src/routes/financial.routes.js), computed from recorded
 * payments; nothing is summed in the browser.
 */
const TABS = [
  { id: 'overview', name: 'Overview', icon: BarChart3, ranged: true },
  { id: 'subscription', name: 'Subscription Revenue', icon: CreditCard, ranged: true },
  { id: 'advisor', name: 'Advisor Revenue', icon: Users, ranged: true },
  { id: 'transactions', name: 'Transactions', icon: ListOrdered, ranged: true },
  { id: 'refunds', name: 'Refunds', icon: RotateCcw },
  { id: 'reports', name: 'Analytics & Reports', icon: LineChart, ranged: true },
  { id: 'reconciliation', name: 'Reconciliation', icon: ShieldCheck, ranged: true },
  { id: 'advisor-withdrawals', name: 'Advisor Withdrawals', icon: Landmark },
  { id: 'payouts', name: 'Creator Payouts', icon: HandCoins },
  { id: 'expenses', name: 'Expenses', icon: Receipt },
  { id: 'audit', name: 'Audit Log', icon: ScrollText },
];

const triggerClass = 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary bg-surface-2 hover:bg-premium-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Platform expenses, saved through the admin-only API (which also writes the audit trail). */
function ExpensesTab({ currentUser }) {
  const query = useFinanceData(() => Expense.list(), []);
  const save = useCallback(async (expense) => {
    const payload = {
      category: expense.category,
      description: expense.description,
      vendor: expense.vendor || undefined,
      amount: String(expense.amount),
      expense_date: expense.expense_date,
    };
    try {
      if (expense.id) await Expense.update(expense.id, payload);
      else await Expense.create(payload);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save the expense'));
      throw error; // keeps the form open with what was typed
    }
    toast.success(expense.id ? 'Expense updated' : 'Expense added');
    query.reload();
  }, [query]);
  const remove = useCallback(async (id) => {
    try {
      await Expense.delete(id);
      query.reload();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not delete the expense'));
      throw error;
    }
  }, [query]);
  return (
    <DataView query={query} loadingLabel="Loading expenses…">
      {(expenses) => (
        <ExpenseManager
          expenses={(Array.isArray(expenses) ? expenses : []).map((e) => ({ ...e, description: e.description || '', category: e.category || 'Miscellaneous' }))}
          onSave={save}
          onDelete={remove}
          currentUser={currentUser}
          canEdit
          canManage
        />
      )}
    </DataView>
  );
}

ExpensesTab.propTypes = { currentUser: PropTypes.object };

export default function Financials() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState(() => ({ preset: 'this_month', ...presetRange('this_month') }));
  const range = { from: period.from, to: period.to };
  const current = TABS.find((t) => t.id === activeTab);
  const role = user?.app_role || user?.role;

  if (role !== 'super_admin' && role !== 'admin') {
    return <div className="text-center p-12">You do not have permission to view Financials.</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Card className="shadow-sm border bg-white">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-2xl text-foreground">Financial Management</CardTitle>
                <p className="text-sm text-subtle mt-1">Revenue, subscriptions, advisors, transactions, refunds and reconciliation, from recorded Razorpay payments.</p>
              </div>
            </div>
            <TabsList aria-label="Financials sections" className="flex flex-wrap h-auto justify-start gap-2 bg-transparent p-0">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className={triggerClass}>
                  <tab.icon className="w-4 h-4" aria-hidden="true" />
                  {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </CardHeader>
          {current?.ranged && (
            <CardContent className="border-t pt-4">
              <DateRangeBar value={period} onChange={setPeriod} idPrefix="financials" />
            </CardContent>
          )}
        </Card>

        <TabsContent value="overview" className="mt-6"><Overview range={range} /></TabsContent>
        <TabsContent value="subscription" className="mt-6"><SubscriptionRevenue range={range} /></TabsContent>
        <TabsContent value="advisor" className="mt-6"><AdvisorRevenue range={range} /></TabsContent>
        <TabsContent value="transactions" className="mt-6"><Transactions range={range} /></TabsContent>
        <TabsContent value="refunds" className="mt-6"><Refunds /></TabsContent>
        <TabsContent value="reports" className="mt-6"><Reports range={range} /></TabsContent>
        <TabsContent value="reconciliation" className="mt-6"><Reconciliation range={range} /></TabsContent>
        <TabsContent value="advisor-withdrawals" className="mt-6"><AdvisorWithdrawalsReview /></TabsContent>
        <TabsContent value="payouts" className="mt-6"><Payouts /></TabsContent>
        <TabsContent value="expenses" className="mt-6"><ExpensesTab currentUser={user} /></TabsContent>
        <TabsContent value="audit" className="mt-6"><AuditLog /></TabsContent>
      </Tabs>
    </div>
  );
}
