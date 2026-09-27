
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FundAllocation, 
  FundPlan, 
  Investor, 
  FundTransaction, 
  FundWallet,
  FundNotification
} from '@/api/entities';
import { toast } from 'sonner';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Users, 
  AlertTriangle, 
  Loader2,
  Send,
  History,
  Info,
  Bug,
  Database,
  Trash2,
  RefreshCw,
  Zap // Added Zap icon
} from 'lucide-react';
import { SendEmail } from '@/api/integrations';

export default function ProfitPayoutManager({ onUpdate }) {
  const [allocations, setAllocations] = useState([]);
  const [investors, setInvestors] = useState({});
  const [fundPlans, setFundPlans] = useState({});
  const [payoutTransactions, setPayoutTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [payoutPercentage, setPayoutPercentage] = useState(10);
  const [adminNotes, setAdminNotes] = useState('');
  const [isInitiating, setIsInitiating] = useState(false);
  // Removed showDebugInfo state
  const [isGeneratingSampleData, setIsGeneratingSampleData] = useState(false);

  useEffect(() => {
    toast.success('🔥 PROFIT PAYOUTS UPDATED - VERSION 3.0 LOADED', {
      duration: 5000
    });
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    console.log('🔄 Starting to load Profit Payout data...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('📊 Fetching Allocations, Investors, and Fund Plans...');
      const [allAllocs, allInvs, allPlans] = await Promise.all([
        FundAllocation.list().catch(err => { console.error('❌ Allocations fetch error:', err); return []; }),
        Investor.list().catch(err => { console.error('❌ Investors fetch error:', err); return []; }),
        FundPlan.list().catch(err => { console.error('❌ Fund Plans fetch error:', err); return []; }),
      ]);

      console.log(`✅ Loaded ${allAllocs.length} allocations`);
      console.log(`✅ Loaded ${allInvs.length} investors`);
      console.log(`✅ Loaded ${allPlans.length} fund plans`);

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('📊 Fetching Profit Payout Transactions...');
      const allTxns = await FundTransaction.filter({ transaction_type: 'profit_payout' })
        .catch(err => { console.error('❌ Transactions fetch error:', err); return []; });

      console.log(`✅ Loaded ${allTxns.length} profit payout transactions`);

      const invMap = allInvs.reduce((acc, inv) => ({ ...acc, [inv.id]: inv }), {});
      const planMap = allPlans.reduce((acc, plan) => ({ ...acc, [plan.id]: plan }), {});

      if (allAllocs.length > 0) {
        console.log('📋 Sample Allocation:', allAllocs[0]);
      }
      if (allTxns.length > 0) {
        console.log('📋 Sample Transaction:', allTxns[0]);
      }

      setAllocations(allAllocs);
      setInvestors(invMap);
      setFundPlans(planMap);
      setPayoutTransactions(allTxns);

      console.log('✅ All data loaded successfully!');

    } catch (error) {
      console.error('❌ CRITICAL ERROR loading profit payout data:', error);
      toast.error('Failed to load profit payout data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Generate sample test data
  const generateSampleData = async () => {
    if (!confirm('⚠️ This will create sample investors, fund plans, and allocations for testing.\n\nProceed?')) {
      return;
    }

    setIsGeneratingSampleData(true);
    toast.info('🔧 Generating sample data... Please wait.');

    try {
      // Step 1: Create sample investors
      console.log('👥 Creating sample investors...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const investor1 = await Investor.create({
        user_id: `test_user_${Date.now()}_1`, // Ensure unique user_id
        investor_code: `TEST_INV_${Date.now()}_1`,
        full_name: 'Rajesh Kumar',
        email: `rajesh.kumar.${Date.now()}@test.com`, // Ensure unique email
        mobile_number: '+91-9876543210',
        kyc_status: 'verified',
        risk_profile: 'moderate',
        status: 'active',
        total_invested: 0,
        current_value: 0,
        total_profit_loss: 0
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const investor2 = await Investor.create({
        user_id: `test_user_${Date.now()}_2`, // Ensure unique user_id
        investor_code: `TEST_INV_${Date.now()}_2`,
        full_name: 'Priya Sharma',
        email: `priya.sharma.${Date.now()}@test.com`, // Ensure unique email
        mobile_number: '+91-9876543211',
        kyc_status: 'verified',
        risk_profile: 'aggressive',
        status: 'active',
        total_invested: 0,
        current_value: 0,
        total_profit_loss: 0
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const investor3 = await Investor.create({
        user_id: `test_user_${Date.now()}_3`, // Ensure unique user_id
        investor_code: `TEST_INV_${Date.now()}_3`,
        full_name: 'Amit Patel',
        email: `amit.patel.${Date.now()}@test.com`, // Ensure unique email
        mobile_number: '+91-9876543212',
        kyc_status: 'verified',
        risk_profile: 'conservative',
        status: 'active',
        total_invested: 0,
        current_value: 0,
        total_profit_loss: 0
      });

      console.log('✅ Created 3 sample investors');
      toast.success('✅ Created 3 sample investors');

      // Step 2: Create sample fund plans
      console.log('📊 Creating sample fund plans...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const fundPlan1 = await FundPlan.create({
        plan_name: 'Test Monthly Growth Plan',
        plan_code: `TEST_MGP_${Date.now()}`,
        description: 'Sample monthly growth plan for testing profit payouts',
        fund_type: 'equity',
        risk_level: 'medium',
        profit_payout_frequency: 'monthly',
        investment_period: '1_year',
        expected_return_percent: 10,
        notice_period_days: 30,
        minimum_investment: 50000,
        management_fee_percent: 2.0,
        is_active: true,
        total_aum: 0,
        total_investors: 0,
        nav: 10,
        nav_date: new Date().toISOString().split('T')[0]
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const fundPlan2 = await FundPlan.create({
        plan_name: 'Test Quarterly Income Plan',
        plan_code: `TEST_QIP_${Date.now()}`,
        description: 'Sample quarterly income plan for testing profit payouts',
        fund_type: 'hybrid',
        risk_level: 'low',
        profit_payout_frequency: 'quarterly',
        investment_period: '2_years',
        expected_return_percent: 8,
        notice_period_days: 45,
        minimum_investment: 100000,
        management_fee_percent: 1.5,
        is_active: true,
        total_aum: 0,
        total_investors: 0,
        nav: 10,
        nav_date: new Date().toISOString().split('T')[0]
      });

      console.log('✅ Created 2 sample fund plans');
      toast.success('✅ Created 2 sample fund plans');

      // Step 3: Create sample allocations WITH PROFIT
      console.log('💰 Creating sample allocations with profit...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Allocation 1: Rajesh - Growth Plan - ₹2L invested, now worth ₹2.3L (15% profit)
      await FundAllocation.create({
        investor_id: investor1.id,
        fund_plan_id: fundPlan1.id,
        units_held: 2000,
        average_nav: 10,
        total_invested: 200000,
        current_value: 230000, // ₹30,000 profit
        profit_loss: 30000,
        profit_loss_percent: 15,
        investment_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
        last_transaction_date: new Date().toISOString(),
        status: 'active'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Allocation 2: Priya - Growth Plan - ₹3.5L invested, now worth ₹4L (14.3% profit)
      await FundAllocation.create({
        investor_id: investor2.id,
        fund_plan_id: fundPlan1.id,
        units_held: 3500,
        average_nav: 10,
        total_invested: 350000,
        current_value: 400000, // ₹50,000 profit
        profit_loss: 50000,
        profit_loss_percent: 14.3,
        investment_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 120 days ago
        last_transaction_date: new Date().toISOString(),
        status: 'active'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Allocation 3: Amit - Income Plan - ₹5L invested, now worth ₹5.4L (8% profit)
      await FundAllocation.create({
        investor_id: investor3.id,
        fund_plan_id: fundPlan2.id,
        units_held: 5000,
        average_nav: 10,
        total_invested: 500000,
        current_value: 540000, // ₹40,000 profit
        profit_loss: 40000,
        profit_loss_percent: 8,
        investment_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 180 days ago
        last_transaction_date: new Date().toISOString(),
        status: 'active'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Allocation 4: Rajesh - Income Plan - ₹1.5L invested, now worth ₹1.65L (10% profit)
      await FundAllocation.create({
        investor_id: investor1.id,
        fund_plan_id: fundPlan2.id,
        units_held: 1500,
        average_nav: 10,
        total_invested: 150000,
        current_value: 165000, // ₹15,000 profit
        profit_loss: 15000,
        profit_loss_percent: 10,
        investment_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days ago
        last_transaction_date: new Date().toISOString(),
        status: 'active'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Allocation 5: Priya - Income Plan - ₹2.5L invested, now worth ₹2.7L (8% profit)
      await FundAllocation.create({
        investor_id: investor2.id,
        fund_plan_id: fundPlan2.id,
        units_held: 2500,
        average_nav: 10,
        total_invested: 250000,
        current_value: 270000, // ₹20,000 profit
        profit_loss: 20000,
        profit_loss_percent: 8,
        investment_date: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 150 days ago
        last_transaction_date: new Date().toISOString(),
        status: 'active'
      });

      console.log('✅ Created 5 sample allocations with profit');
      toast.success('✅ Created 5 sample allocations with profit');

      // Step 4: Create wallets for investors
      console.log('💳 Creating wallets...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      await FundWallet.create({
        investor_id: investor1.id,
        available_balance: 0,
        locked_balance: 0,
        total_deposited: 350000, // Sum of Rajesh's investments
        total_withdrawn: 0
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      await FundWallet.create({
        investor_id: investor2.id,
        available_balance: 0,
        locked_balance: 0,
        total_deposited: 600000, // Sum of Priya's investments
        total_withdrawn: 0
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      await FundWallet.create({
        investor_id: investor3.id,
        available_balance: 0,
        locked_balance: 0,
        total_deposited: 500000, // Sum of Amit's investments
        total_withdrawn: 0
      });

      console.log('✅ Created wallets for all investors');

      // Success message
      toast.success('🎉 Sample data generated successfully! Refreshing page...', {
        description: '5 allocations with total ₹1,55,000 distributable profit created',
        duration: 3000
      });

      console.log('🎉 SAMPLE DATA GENERATION COMPLETE!');
      console.log('📊 Summary:');
      console.log('- 3 Investors created');
      console.log('- 2 Fund Plans created');
      console.log('- 5 Active Allocations with profit created');
      console.log('- Total Distributable Profit: ₹1,55,000');

      // Reload data
      setTimeout(() => {
        loadData();
      }, 3000);

    } catch (error) {
      console.error('❌ Error generating sample data:', error);
      toast.error('Failed to generate sample data: ' + error.message);
    } finally {
      setIsGeneratingSampleData(false);
    }
  };

  const calculateEffectiveProfit = (allocation) => {
    const currentValue = allocation.current_value || 0;
    const totalInvested = allocation.total_invested || 0;
    const unrealizedProfit = currentValue - totalInvested;

    if (unrealizedProfit <= 0) {
      return 0;
    }

    const alreadyPaidProfits = payoutTransactions
      .filter(txn => txn.allocation_id === allocation.id && txn.status === 'completed')
      .reduce((sum, txn) => sum + (txn.amount || 0), 0);

    const effectiveProfit = unrealizedProfit - alreadyPaidProfits;
    return Math.max(0, effectiveProfit);
  };

  const eligibleAllocations = allocations.filter(alloc => {
    if (alloc.status !== 'active') return false;
    const effectiveProfit = calculateEffectiveProfit(alloc);
    return effectiveProfit > 0;
  });

  const totalDistributableProfit = eligibleAllocations.reduce((sum, alloc) => {
    return sum + calculateEffectiveProfit(alloc);
  }, 0);

  const totalAmountToPayout = totalDistributableProfit * (payoutPercentage / 100);

  const handleInitiatePayout = () => {
    if (eligibleAllocations.length === 0) {
      toast.error('No active allocations with distributable profit found');
      return;
    }
    setPayoutPercentage(10);
    setAdminNotes('');
    setShowInitiateModal(true);
  };

  const handleConfirmInitiatePayout = async () => {
    if (payoutPercentage <= 0 || payoutPercentage > 100) {
      toast.error('Payout percentage must be between 1 and 100.');
      return;
    }
    if (totalAmountToPayout <= 0) {
      toast.info('No profit to distribute based on the current percentage.');
      return;
    }

    setIsInitiating(true);
    try {
      const payoutPromises = eligibleAllocations.map(async (alloc, index) => {
        // Delay each payout slightly to simulate processing and prevent rate limits if this were a real API
        await new Promise(resolve => setTimeout(resolve, index * 4000));
        
        const effectiveProfit = calculateEffectiveProfit(alloc);
        if (effectiveProfit > 0) {
          const payoutAmount = effectiveProfit * (payoutPercentage / 100);
          const investor = investors[alloc.investor_id];
          const fundPlan = fundPlans[alloc.fund_plan_id];

          // 1. Update Investor Wallet
          const wallets = await FundWallet.filter({ investor_id: alloc.investor_id });
          const wallet = wallets[0];

          if (wallet) {
            await FundWallet.update(wallet.id, {
              available_balance: (wallet.available_balance || 0) + payoutAmount,
              last_transaction_date: new Date().toISOString()
            });
          }

          // 2. Create Fund Transaction
          await FundTransaction.create({
            investor_id: alloc.investor_id,
            fund_plan_id: alloc.fund_plan_id,
            allocation_id: alloc.id,
            transaction_type: 'profit_payout',
            amount: payoutAmount,
            payment_method: 'wallet', // Assuming payout goes to investor wallet
            status: 'completed',
            transaction_date: new Date().toISOString(),
            settlement_date: new Date().toISOString().split('T')[0], // Added settlement date
            notes: adminNotes || `Profit payout - ${payoutPercentage}% of distributable profit`
          });

          // 3. Send Notification & Email
          if (investor && fundPlan) {
            await FundNotification.create({
              investor_id: investor.id,
              notification_type: 'dividend', // Changed to 'dividend'
              title: 'Profit Payout Credited',
              message: `₹${payoutAmount.toLocaleString('en-IN')} profit from ${fundPlan.plan_name} has been credited to your wallet.`,
              status: 'unread',
              related_entity_type: 'allocation',
              related_entity_id: alloc.id
            });

            if (investor.email) {
              await SendEmail({
                to: investor.email,
                subject: `Profit Payout - ${fundPlan.plan_name}`, // Updated subject
                body: `Dear ${investor.full_name},\n\nWe are pleased to inform you that a profit payout of ₹${payoutAmount.toLocaleString('en-IN')} from your investment in ${fundPlan.plan_name} has been credited to your wallet.\n\n${adminNotes ? `Note: ${adminNotes}\n\n` : ''}Thank you for investing with us.\n\nBest Regards,\nProtocol Fund Management Team` // Updated body
              }).catch(err => console.warn('Email send failed:', err));
            }
          }
        }
      });

      await Promise.all(payoutPromises);

      toast.success(`🎉 Profit payout completed! ₹${totalAmountToPayout.toLocaleString('en-IN')} distributed to ${eligibleAllocations.length} allocation(s).`);

      setShowInitiateModal(false);
      setPayoutPercentage(10);
      setAdminNotes('');
      await loadData();
      if (onUpdate) onUpdate();

    } catch (error) {
      console.error('Error processing profit payout:', error);
      toast.error('Failed to complete profit payout: ' + error.message);
    } finally {
      setIsInitiating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-protocall-blue" />
        <p className="text-subtle">Loading profit payout data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🔥 UNMISSABLE VERSION BANNER */}
      <div className="bg-gradient-to-r from-protocall-deep via-protocall-grape to-sell text-white rounded-xl p-6 shadow-2xl border-4 border-hold">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Zap className="w-12 h-12 animate-pulse" />
            <div>
              <h2 className="text-2xl font-bold">🔥 VERSION 3.0 - PROFIT PAYOUTS UPDATED!</h2>
              <p className="text-sm opacity-90 mt-1">Sample Data Generator & Enhanced Debugging Enabled</p>
            </div>
          </div>
          <Badge className="bg-hold text-black text-lg px-4 py-2 font-bold">
            LIVE NOW
          </Badge>
        </div>
      </div>

      {/* Quick Action Buttons - ALWAYS VISIBLE */}
      <Card className="border-2 border-buy bg-gradient-to-r from-surface-2 to-buy-muted">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Database className="w-6 h-6 text-buy-muted-foreground" />
            Quick Actions & Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border-2 border-protocall-premium-light shadow">
              <p className="text-subtle text-sm font-semibold">Total Allocations</p>
              <p className="text-3xl font-bold text-protocall-blue">{allocations.length}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-buy/30 shadow">
              <p className="text-subtle text-sm font-semibold">Active Allocations</p>
              <p className="text-3xl font-bold text-buy-muted-foreground">
                {allocations.filter(a => a.status === 'active').length}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-protocall-premium-light shadow">
              <p className="text-subtle text-sm font-semibold">Past Payouts</p>
              <p className="text-3xl font-bold text-protocall-premium-text">{payoutTransactions.length}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-hold/30 shadow">
              <p className="text-subtle text-sm font-semibold">Eligible Now</p>
              <p className="text-3xl font-bold text-hold-muted-foreground">{eligibleAllocations.length}</p>
            </div>
          </div>

          {/* Diagnostic Messages */}
          {allocations.length === 0 && (
            <div className="bg-hold-muted border-2 border-hold rounded-lg p-4">
              <p className="text-hold-muted-foreground font-bold text-base mb-2">⚠️ No allocations found in database</p>
              <p className="text-hold-muted-foreground text-sm">
                Click the button below to generate sample data for testing.
              </p>
            </div>
          )}

          {allocations.length > 0 && eligibleAllocations.length === 0 && allocations.filter(a => a.status === 'active').length > 0 && (
            <div className="bg-hold-muted border-2 border-hold rounded-lg p-4">
              <p className="text-hold-muted-foreground font-bold text-base mb-2">⚠️ Active allocations have no distributable profit</p>
              <p className="text-hold-muted-foreground text-sm">
                This means all active allocations currently have:<br/>
                • Current Value ≤ Total Invested (no profit), OR<br/>
                • All profits have already been distributed
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={generateSampleData}
              disabled={isGeneratingSampleData}
              size="lg"
              className="flex-1 bg-buy-soft hover:from-buy hover:to-buy text-buy-foreground font-bold text-lg py-6 shadow-xl"
            >
              {isGeneratingSampleData ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  Generating Data...
                </>
              ) : (
                <>
                  <Database className="w-6 h-6 mr-2" />
                  Generate Sample Data Now
                </>
              )}
            </Button>

            <Button
              onClick={loadData}
              variant="outline"
              size="lg"
              className="border-2 border-protocall-blue text-protocall-blue hover:bg-premium-muted font-semibold py-6"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rest of the content */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-protocall-deep to-protocall-blue text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="w-7 h-7" />
              Profit Payouts Management
            </CardTitle>
            <Button
              onClick={handleInitiatePayout}
              disabled={eligibleAllocations.length === 0}
              className="bg-white text-protocall-blue hover:bg-premium-muted font-semibold shadow-lg"
            >
              <Send className="w-5 h-5 mr-2" />
              Initiate New Profit Payout
            </Button>
          </div>
          <p className="text-protocall-blue mt-2">
            Distribute profits to investors from their active fund allocations
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-2 border-protocall-premium-light bg-surface-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-subtle text-sm font-semibold mb-1">Eligible Allocations</p>
                    <p className="text-4xl font-bold text-protocall-blue">{eligibleAllocations.length}</p>
                  </div>
                  <Users className="w-12 h-12 text-protocall-blue opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-buy/30 bg-gradient-to-br from-surface-2 to-buy-muted">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-subtle text-sm font-semibold mb-1">Total Distributable Profit</p>
                    <p className="text-3xl font-bold text-buy-muted-foreground">
                      ₹{totalDistributableProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className="w-12 h-12 text-buy-muted-foreground opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-protocall-premium-light bg-surface-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-subtle text-sm font-semibold mb-1">Past Payouts (All Time)</p>
                    <p className="text-4xl font-bold text-protocall-premium-text">{payoutTransactions.length}</p>
                  </div>
                  <History className="w-12 h-12 text-protocall-premium-text opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Allocations with Distributable Profit */}
          {eligibleAllocations.length > 0 ? (
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-buy-muted-foreground" />
                Active Allocations with Distributable Profit
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-surface-2">
                      <th className="text-left py-3 px-4 font-semibold text-subtle">Investor</th>
                      <th className="text-left py-3 px-4 font-semibold text-subtle">Fund Plan</th>
                      <th className="text-right py-3 px-4 font-semibold text-subtle">Invested</th>
                      <th className="text-right py-3 px-4 font-semibold text-subtle">Current Value</th>
                      <th className="text-right py-3 px-4 font-semibold text-subtle">Distributable Profit</th>
                      <th className="text-center py-3 px-4 font-semibold text-subtle">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleAllocations.map((alloc) => {
                      const investor = investors[alloc.investor_id];
                      const fundPlan = fundPlans[alloc.fund_plan_id];
                      const distributableProfit = calculateEffectiveProfit(alloc);

                      return (
                        <tr key={alloc.id} className="border-b border-border hover:bg-surface-2">
                          <td className="py-4 px-4">
                            <p className="font-medium text-foreground">{investor?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{investor?.investor_code || 'N/A'}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-medium text-foreground">{fundPlan?.plan_name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{fundPlan?.plan_code || 'Unknown'}</p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="font-semibold text-foreground">
                              ₹{(alloc.total_invested || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="font-semibold text-protocall-blue">
                              ₹{(alloc.current_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="font-bold text-buy-muted-foreground text-lg">
                              ₹{distributableProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Badge className="bg-buy-muted text-buy-muted-foreground border border-buy/30">
                              Active
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-surface-2 rounded-lg border-2 border-dashed border-border">
              <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-subtle mb-2">
                No active allocations currently showing a distributable profit.
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Profits are calculated as (Current Value - Total Invested) minus any previously distributed profits for each allocation.
              </p>
            </div>
          )}

          {/* Profit Payout History */}
          <div className="mt-12">
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <History className="w-6 h-6 text-protocall-premium-text" />
              Profit Payout History
            </h3>
            {payoutTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-surface-2">
                      <th className="text-left py-3 px-4 font-semibold text-subtle">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-subtle">Investor</th>
                      <th className="text-left py-3 px-4 font-semibold text-subtle">Fund Plan</th>
                      <th className="text-right py-3 px-4 font-semibold text-subtle">Amount</th>
                      <th className="text-center py-3 px-4 font-semibold text-subtle">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutTransactions.slice(0, 10).map((txn) => { // Displaying only the latest 10 transactions
                      const investor = investors[txn.investor_id];
                      const fundPlan = fundPlans[txn.fund_plan_id];

                      return (
                        <tr key={txn.id} className="border-b border-border hover:bg-surface-2">
                          <td className="py-4 px-4">
                            <p className="text-sm text-subtle">
                              {new Date(txn.transaction_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-medium text-foreground">{investor?.full_name || 'Unknown'}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-foreground">{fundPlan?.plan_name || 'N/A'}</p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="font-bold text-buy-muted-foreground">
                              ₹{(txn.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Badge className="bg-buy-muted text-buy-muted-foreground border border-buy/30">
                              {txn.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-surface-2 rounded-lg border-2 border-dashed border-border">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No profit payout transactions found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Initiate Payout Modal */}
      <Dialog open={showInitiateModal} onOpenChange={setShowInitiateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Initiate Profit Payout</DialogTitle>
            <DialogDescription>
              Distribute a percentage of profits to all eligible investors
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-premium-muted border border-protocall-premium-light rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-subtle">Eligible Allocations:</p>
                  <p className="text-xl font-bold text-protocall-blue">{eligibleAllocations.length}</p>
                </div>
                <div>
                  <p className="text-subtle">Total Distributable:</p>
                  <p className="text-xl font-bold text-buy-muted-foreground">
                    ₹{totalDistributableProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="payoutPercentage">Payout Percentage</Label>
              <Input
                id="payoutPercentage"
                type="number"
                min="1"
                max="100"
                value={payoutPercentage}
                onChange={(e) => setPayoutPercentage(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter percentage of distributable profit to pay out (1-100%)
              </p>
            </div>

            <div className="bg-buy-muted border border-buy/30 rounded-lg p-4">
              <p className="text-sm text-subtle mb-1">Amount to be Distributed:</p>
              <p className="text-3xl font-bold text-buy-muted-foreground">
                ₹{totalAmountToPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div>
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this payout..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="bg-hold-muted border border-hold/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-hold-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-hold-muted-foreground">
                This will credit the profit amount to each investor's wallet and create transaction records.
                This action cannot be undone. Notifications and emails will be sent.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitiateModal(false)} disabled={isInitiating}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmInitiatePayout}
              disabled={isInitiating || payoutPercentage <= 0 || totalAmountToPayout <= 0}
              className="bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue"
            >
              {isInitiating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Confirm Payout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
