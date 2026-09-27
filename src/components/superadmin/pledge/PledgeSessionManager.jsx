
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, Target, CheckCircle, FileText, Activity, XCircle, Zap, Repeat, Ban, HelpCircle, Loader2, TrendingUp, MoreVertical, Edit, Trash2, Play, Shield } from 'lucide-react';
import { PledgeSession, Pledge, PledgeExecutionRecord, PledgeAuditLog } from '@/api/entities';
import { toast } from 'sonner';
import PledgeSessionFormModal from './PledgeSessionFormModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';


// A simple utility function for confirmation, assuming a browser-native confirm.
// If a custom modal is preferred, this would be replaced with state management
// for a confirmation dialog component.
const confirm = async ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
  return window.confirm(`${title}\n\n${message}`);
};

export default function PledgeSessionManager({ user }) { // Kept user prop for audit logs and created_by
  const [sessions, setSessions] = useState([]); // ✅ Initialize as empty array
  const [pledges, setPledges] = useState([]);   // Now local state, needed for recalculateSessionStats
  const [isLoading, setIsLoading] = useState(true); // Initial loading state set to true
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // State for tracking session execution
  const [isExecuting, setIsExecuting] = useState(null);

  // --- Data Loading Functions ---
  const loadPledges = async () => {
    try {
      const allPledges = await Pledge.list();
      setPledges(Array.isArray(allPledges) ? allPledges : []); // ✅ Safety check
    } catch (error) {
      console.error('Error loading pledges:', error);
      toast.error('Failed to load pledges');
      setPledges([]); // ✅ Set empty array on error
    }
  };

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const allSessions = await PledgeSession.list('-created_date');
      setSessions(Array.isArray(allSessions) ? allSessions : []); // ✅ Safety check
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load sessions');
      setSessions([]); // ✅ Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    loadPledges();
  }, []); // Run once on component mount

  // --- Status Info & Badge Functions ---
  const getStatusInfo = (status) => {
    switch (status) {
      case 'draft':
        return { text: 'Draft', icon: FileText, color: 'text-muted-foreground' };
      case 'pending_approval':
        return { text: 'Pending Approval', icon: HelpCircle, color: 'text-hold-muted-foreground' };
      case 'approved':
        return { text: 'Approved', icon: CheckCircle, color: 'text-positive' };
      case 'active':
        return { text: 'Active', icon: Activity, color: 'text-buy-muted-foreground' };
      case 'closed':
        return { text: 'Closed', icon: XCircle, color: 'text-hold-muted-foreground' };
      case 'executing':
        return { text: 'Executing', icon: Zap, color: 'text-protocall-blue' };
      case 'awaiting_sell_execution':
        return { text: 'Awaiting Sell', icon: Repeat, color: 'text-protocall-blue' };
      case 'completed':
        return { text: 'Completed', icon: CheckCircle, color: 'text-buy-muted-foreground' };
      case 'cancelled':
        return { text: 'Cancelled', icon: Ban, color: 'text-sell-muted-foreground' };
      case 'rejected':
        return { text: 'Rejected', icon: Ban, color: 'text-sell' };
      default:
        return { text: 'Unknown', icon: HelpCircle, color: 'text-muted-foreground' };
    }
  };

  const getStatusBadge = (status) => {
    const statusClassMap = {
      'draft': 'bg-surface-2 text-foreground border-border',
      'pending_approval': 'bg-hold-muted text-hold-muted-foreground border-hold/30',
      'approved': 'bg-buy-muted text-buy-muted-foreground border-buy/30',
      'active': 'bg-buy-muted text-buy-muted-foreground border-buy/30',
      'closed': 'bg-hold-muted text-hold-muted-foreground border-hold/30',
      'executing': 'bg-premium-muted text-protocall-blue border-protocall-premium-light',
      'awaiting_sell_execution': 'bg-premium-muted text-protocall-blue border-protocall-premium-light',
      'completed': 'bg-buy-muted text-buy-muted-foreground border-buy/30',
      'cancelled': 'bg-sell-muted text-sell-muted-foreground border-sell/30',
      'rejected': 'bg-sell-muted text-sell-muted-foreground border-sell/30',
    };
    const info = getStatusInfo(status);
    const classes = statusClassMap[status] || 'bg-surface-2 text-foreground border-border';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
        {info.icon && React.createElement(info.icon, { className: 'w-3 h-3 mr-1' })}
        {info.text}
      </span>
    );
  };

  // --- Session Management Functions ---

  const handleUpdateSession = async (sessionId, updates) => {
    try {
      await PledgeSession.update(sessionId, updates);
      toast.success('Session updated successfully');
      
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === sessionId ? { ...session, ...updates } : session
        )
      );
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
      loadSessions(); // Fallback to full reload on error
    }
  };

  const recalculateSessionStats = async (sessionId) => {
    try {
      const sessionPledges = (pledges || []).filter(p => 
        p.session_id === sessionId && 
        (p.status === 'ready_for_execution' || p.status === 'executed')
      );

      let updates = {};

      if (sessionPledges.length === 0) {
        updates = {
          total_pledges: 0,
          total_pledge_value: 0,
          buy_pledges_count: 0,
          sell_pledges_count: 0,
          buy_pledges_value: 0,
          sell_pledges_value: 0,
        };
        toast.info('No relevant pledges found for session. Stats reset.');
      } else {
        let totalPledges = sessionPledges.length;
        let totalValue = 0;
        let buyCount = 0;
        let sellCount = 0;
        let buyValue = 0;
        let sellValue = 0;

        sessionPledges.forEach(pledge => {
          const pledgeValue = pledge.qty * (pledge.price_target || 0);
          totalValue += pledgeValue;

          if (pledge.side === 'buy') {
            buyCount++;
            buyValue += pledgeValue;
          } else if (pledge.side === 'sell') {
            sellCount++;
            sellValue += pledgeValue;
          }
        });

        updates = {
          total_pledges: totalPledges,
          total_pledge_value: totalValue,
          buy_pledges_count: buyCount,
          sell_pledges_count: sellCount,
          buy_pledges_value: buyValue,
          sell_pledges_value: sellValue,
        };
      }
      
      await handleUpdateSession(sessionId, updates);
      console.log(`✅ Recalculated stats for session ${sessionId}:`, updates);
      toast.success('Session statistics updated successfully');

    } catch (error) {
      console.error('Error recalculating session stats:', error);
      toast.error('Failed to update session statistics');
    }
  };

  const filteredSessions = useMemo(() => {
    // ✅ Double safety check for sessions
    let filtered = Array.isArray(sessions) ? sessions : [];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.stock_symbol?.toLowerCase().includes(term) ||
        s.stock_name?.toLowerCase().includes(term) ||
        s.description?.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      const statusOrder = { 
        'executing': 0,
        'active': 1, 
        'awaiting_sell_execution': 2,
        'approved': 3,
        'pending_approval': 4,
        'draft': 5,
        'closed': 6,
        'completed': 7,
        'rejected': 8,
        'cancelled': 9
      };
      
      const orderA = statusOrder[a.status] ?? 99;
      const orderB = statusOrder[b.status] ?? 99;
      
      if (orderA !== orderB) return orderA - orderB;
      
      return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    });

    return filtered;
  }, [sessions, statusFilter, searchTerm]);

  const handleCreateSession = async (sessionData) => {
    setIsCreating(true);
    try {
      await PledgeSession.create(sessionData);
      toast.success('Session created successfully');
      setShowCreateModal(false);
      loadSessions(); // Refresh all sessions after creation
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditSession = (session) => {
    setEditingSession(session);
    setShowCreateModal(true);
  };

  const handleCloneSession = async (session) => {
    try {
      const clonedData = {
        ...session,
        stock_symbol: `${session.stock_symbol}_COPY`,
        stock_name: `${session.stock_name} (Copy)`,
        status: 'draft',
        total_pledges: 0,
        total_pledge_value: 0,
        buy_pledges_count: 0,
        sell_pledges_count: 0,
        buy_pledges_value: 0,
        sell_pledges_value: 0,
        created_by: user.id,
      };

      delete clonedData.id;
      delete clonedData.created_date;
      delete clonedData.updated_date;
      delete clonedData.last_executed_at;

      await PledgeSession.create(clonedData);
      toast.success('Session cloned successfully');
      loadSessions();
    } catch (error) {
      console.error('Error cloning session:', error);
      toast.error('Failed to clone session');
    }
  };

  const handleDeleteSession = async (session) => {
    const confirmed = await confirm({
      title: 'Delete Session?',
      message: `Are you sure you want to delete session "${session.stock_symbol}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      await PledgeSession.delete(session.id);
      toast.success('Session deleted successfully');
      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const handleApproveSession = async (session) => {
    try {
      await PledgeSession.update(session.id, {
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      });
      
      toast.success('Session approved successfully!');
      loadSessions();
    } catch (error) {
      console.error('Error approving session:', error);
      toast.error('Failed to approve session');
    }
  };

  const handleRejectSession = async (session, reason) => {
    try {
      await PledgeSession.update(session.id, {
        status: 'rejected',
        rejected_reason: reason,
        admin_notes: reason
      });
      
      toast.success('Session rejected');
      loadSessions();
    } catch (error) {
      console.error('Error rejecting session:', error);
      toast.error('Failed to reject session');
    }
  };

  const handleActivateSession = async (session) => {
    try {
      await PledgeSession.update(session.id, {
        status: 'active',
        notification_sent: false
      });
      toast.success('Session activated successfully! Users can now pledge.');
      loadSessions();
    } catch (error) {
      console.error('Error activating session:', error);
      toast.error('Failed to activate session');
    }
  };

  const handleCloseSession = async (sessionId) => {
    const confirmed = await confirm({
      title: 'Close Session?',
      message: 'Are you sure you want to close this session? No new pledges will be accepted.',
      confirmText: 'Yes, Close Session'
    });

    if (!confirmed) return;

    try {
      await handleUpdateSession(sessionId, { status: 'closed' });
      toast.success('Session closed successfully');
      loadSessions(); // Refresh after status change
    } catch (error) {
      console.error('Error closing session:', error);
      toast.error('Failed to close session');
    }
  };

  const handleExecuteSession = async (session) => {
    if (!session) return;

    const confirmation = await confirm({
      title: `Execute ${session.status === 'awaiting_sell_execution' ? 'SELL' : 'BUY'} Orders?`,
      message: `This will trigger the ${session.status === 'awaiting_sell_execution' ? 'sell' : 'buy'} execution for the session "${session.stock_symbol}". This action cannot be undone.`,
      confirmText: `Yes, Execute ${session.status === 'awaiting_sell_execution' ? 'Sell' : 'Buy'}`,
    });

    if (!confirmation) return;

    setIsExecuting(session.id);
    const toastId = toast.loading(`Executing ${session.status === 'awaiting_sell_execution' ? 'sell' : 'buy'} orders for ${session.stock_symbol}...`);

    try {
      if (session.session_mode === 'buy_sell_cycle' && session.status === 'awaiting_sell_execution') {
        console.log(`🚀 Starting SELL execution for session: ${session.id}`);

        const pledgesToSell = (await Pledge.filter({
          session_id: session.id,
          status: 'executed',
        }));

        if (pledgesToSell.length === 0) {
          toast.warning('No pledges found that are ready to be sold in this session.', { id: toastId });
          await handleUpdateSession(session.id, { status: 'completed', last_executed_at: new Date().toISOString() });
          loadSessions();
          return;
        }

        const buyExecutions = await PledgeExecutionRecord.filter({
          session_id: session.id,
          side: 'buy',
          status: 'completed'
        });
        const buyExecutionsMap = new Map(buyExecutions.map(e => [e.pledge_id, e]));

        let sellSuccessCount = 0;
        let sellFailCount = 0;

        for (const pledge of pledgesToSell) {
          try {
            const buyExec = buyExecutionsMap.get(pledge.id);
            if (!buyExec) {
              console.warn(`No corresponding BUY execution record found for pledge ${pledge.id}. Skipping SELL.`);
              sellFailCount++;
              await PledgeAuditLog.create({
                actor_id: user.id,
                actor_role: 'system',
                action: 'sell_execution_skipped',
                target_type: 'pledge',
                target_pledge_id: pledge.id,
                target_session_id: session.id,
                payload_json: JSON.stringify({ reason: 'No corresponding BUY execution record found' }),
                success: false
              });
              continue;
            }

            console.log(`⚡ Executing SELL for pledge ${pledge.id}...`);
            const executedPrice = session.stock_price || pledge.price_target || 0;
            const totalExecutionValue = pledge.qty * executedPrice;

            await PledgeExecutionRecord.create({
              pledge_id: pledge.id,
              session_id: session.id,
              user_id: pledge.user_id,
              demat_account_id: pledge.demat_account_id,
              stock_symbol: session.stock_symbol,
              side: 'sell',
              pledged_qty: pledge.qty,
              executed_qty: pledge.qty,
              executed_price: executedPrice,
              total_execution_value: totalExecutionValue,
              platform_commission: 0,
              commission_rate: 0,
              broker_commission: 0,
              net_amount: totalExecutionValue,
              status: 'completed',
              executed_at: new Date().toISOString(),
              settlement_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });
            
            await PledgeAuditLog.create({
              actor_id: user.id,
              actor_role: 'admin',
              action: 'sell_execution_completed',
              target_type: 'pledge',
              target_pledge_id: pledge.id,
              target_session_id: session.id,
              payload_json: JSON.stringify({
                execution_record_id: 'newly_created_id',
                executed_qty: pledge.qty,
                executed_price: executedPrice
              }),
              success: true
            });
            sellSuccessCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`❌ Failed to execute SELL for pledge ${pledge.id}:`, error);
            sellFailCount++;
            await PledgeExecutionRecord.create({
              pledge_id: pledge.id,
              session_id: session.id,
              user_id: pledge.user_id,
              demat_account_id: pledge.demat_account_id,
              stock_symbol: session.stock_symbol,
              side: 'sell',
              pledged_qty: pledge.qty,
              executed_qty: 0,
              status: 'failed',
              error_message: error.message || 'Sell execution failed',
              executed_at: new Date().toISOString(),
            });
            await PledgeAuditLog.create({
              actor_id: user.id,
              actor_role: 'admin',
              action: 'sell_execution_failed',
              target_type: 'pledge',
              target_pledge_id: pledge.id,
              target_session_id: session.id,
              payload_json: JSON.stringify({ error: error.message }),
              success: false
            });
          }
        }
        
        await handleUpdateSession(session.id, {
          status: 'completed',
          last_executed_at: new Date().toISOString()
        });
        
        toast.success(
          `Executed ${sellSuccessCount} sell orders for ${session.stock_symbol}.` +
          (sellFailCount > 0 ? ` ${sellFailCount} failed.` : ''),
          { id: toastId, duration: 5000 }
        );

      } else {
        console.log('🚀 Starting BUY execution for session:', session.id);
        
        await handleUpdateSession(session.id, {
          status: 'executing',
          last_executed_at: new Date().toISOString()
        });

        const pledgesToExecute = (await Pledge.filter({
          session_id: session.id,
          status: 'ready_for_execution',
        }));

        console.log(`📊 Found ${pledgesToExecute.length} pledges ready for BUY execution`);

        if (pledgesToExecute.length === 0) {
          toast.warning('No pledges ready for BUY execution in this session.', { id: toastId });
          const nextStatusIfNoPledges = session.session_mode === 'buy_sell_cycle' ? 'awaiting_sell_execution' : 'completed';
          await handleUpdateSession(session.id, { status: nextStatusIfNoPledges, last_executed_at: new Date().toISOString() });
          loadSessions();
          return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const pledge of pledgesToExecute) {
          try {
            console.log(`⚡ Executing BUY for pledge ${pledge.id}...`);
            
            const executedPrice = pledge.price_target || session.stock_price || 0;
            const totalExecutionValue = pledge.qty * executedPrice;
            
            const executionRecord = await PledgeExecutionRecord.create({
              pledge_id: pledge.id,
              session_id: session.id,
              user_id: pledge.user_id,
              demat_account_id: pledge.demat_account_id,
              stock_symbol: pledge.stock_symbol,
              side: 'buy',
              pledged_qty: pledge.qty,
              executed_qty: pledge.qty,
              executed_price: executedPrice,
              total_execution_value: totalExecutionValue,
              platform_commission: 0,
              commission_rate: 0,
              broker_commission: 0,
              net_amount: totalExecutionValue,
              status: 'completed',
              executed_at: new Date().toISOString(),
              settlement_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });

            console.log(`✅ Created BUY execution record: ${executionRecord.id}`);

            await Pledge.update(pledge.id, {
              status: 'executed'
            });

            await PledgeAuditLog.create({
              actor_id: user.id,
              actor_role: 'admin',
              action: 'buy_execution_completed',
              target_type: 'pledge',
              target_pledge_id: pledge.id,
              target_session_id: session.id,
              payload_json: JSON.stringify({
                execution_record_id: executionRecord.id,
                executed_qty: pledge.qty,
                executed_price: executedPrice
              }),
              success: true
            });

            successCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`❌ Failed to execute BUY for pledge ${pledge.id}:`, error);
            failCount++;
            
            await PledgeExecutionRecord.create({
              pledge_id: pledge.id,
              session_id: session.id,
              user_id: pledge.user_id,
              demat_account_id: pledge.demat_account_id,
              stock_symbol: pledge.stock_symbol,
              side: 'buy',
              pledged_qty: pledge.qty,
              executed_qty: 0,
              status: 'failed',
              error_message: error.message || 'Execution failed',
              executed_at: new Date().toISOString(),
            });

            await PledgeAuditLog.create({
              actor_id: user.id,
              actor_role: 'admin',
              action: 'buy_execution_failed',
              target_type: 'pledge',
              target_pledge_id: pledge.id,
              target_session_id: session.id,
              payload_json: JSON.stringify({ error: error.message }),
              success: false
            });
          }
        }

        const nextStatus = session.session_mode === 'buy_sell_cycle' ? 'awaiting_sell_execution' : 'completed';
        console.log(`✅ Updating session ${session.id} to status: ${nextStatus}`);
        await handleUpdateSession(session.id, {
          status: nextStatus,
          last_executed_at: new Date().toISOString(),
          notification_sent: true,
        });

        toast.success(
          `Executed ${successCount} buy orders for ${session.stock_symbol}.` +
          (failCount > 0 ? ` ${failCount} failed.` : ''),
          { id: toastId, duration: 5000 }
        );
      }

      console.log('🔄 Triggering data refresh after execution...');
      loadSessions();

    } catch (error) {
      console.error('❌ Error during session execution:', error);
      toast.error(`Failed to execute session: ${error.message}`, { id: toastId });
      
      if (session.status === 'executing' || session.status === 'awaiting_sell_execution') {
        try {
          await handleUpdateSession(session.id, {
            status: 'active'
          });
          loadSessions();
        } catch (revertError) {
          console.error('Failed to revert session status after execution error:', revertError);
        }
      }
    } finally {
      setIsExecuting(null);
    }
  };

  const handleRecalculateStats = async (sessionId) => {
    await recalculateSessionStats(sessionId);
  };

  const handleFormSuccess = () => {
    setShowCreateModal(false);
    setEditingSession(null);
  };

  const canCreateSessions = !!user;

  return (
    <div className="space-y-6">
      {/* Top Header with Title, Search, and Create Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-grow">
          <h2 className="text-2xl font-bold text-foreground">Pledge Sessions</h2>
          <p className="text-subtle">Manage all pledge trading sessions</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0 flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-auto"> {/* Added w-full for small screens */}
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search stock symbol, name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          {canCreateSessions && (
            <Button
              onClick={() => {
                setEditingSession(null);
                setShowCreateModal(true);
              }}
              className="bg-protocall-blue hover:bg-protocall-blue w-full sm:w-auto" // Added w-full for small screens
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : <> <Plus className="w-4 h-4 mr-2" /> Create Session </>}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'pending_approval', 'approved', 'active', 'executing', 'awaiting_sell_execution', 'completed', 'rejected', 'cancelled'].map((filterStatus) => (
          <Button
            key={filterStatus}
            variant={statusFilter === filterStatus ? 'default' : 'outline'}
            onClick={() => setStatusFilter(filterStatus)}
            className="capitalize"
          >
            {filterStatus.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-protocall-blue" />
        </div>
      ) : (filteredSessions || []).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Sessions Found</h3>
            <p className="text-subtle">Create a new session to get started</p>
            {canCreateSessions && (
              <Button 
                onClick={() => {
                  setEditingSession(null);
                  setShowCreateModal(true);
                }} 
                className="mt-4"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Your First Session'}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {(filteredSessions || []).map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{session.stock_symbol}</CardTitle>
                      {getStatusBadge(session.status)}
                      {session.created_by_advisor_id && (
                        <Badge className="bg-premium-muted text-protocall-premium-text">
                          <Shield className="w-3 h-3 mr-1" />
                          Advisor Created
                        </Badge>
                      )}
                    </div>
                    <p className="text-subtle text-sm">{session.stock_name}</p>
                    {session.description && (
                      <p className="text-subtle text-sm mt-2">{session.description}</p>
                    )}
                    {session.execution_reason && (
                      <div className="mt-2 p-2 bg-premium-muted rounded text-sm">
                        <strong className="text-protocall-blue">Reason:</strong> {session.execution_reason}
                      </div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditSession(session)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {session.status === 'pending_approval' && (
                        <>
                          <DropdownMenuItem onClick={() => handleApproveSession(session)}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              const reason = prompt('Reason for rejection:');
                              if (reason) handleRejectSession(session, reason);
                            }}
                            className="text-sell-muted-foreground"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </DropdownMenuItem>
                        </>
                      )}
                      {session.status === 'approved' && (
                        <DropdownMenuItem onClick={() => handleActivateSession(session)}>
                          <Play className="w-4 h-4 mr-2" />
                          Activate Session
                        </DropdownMenuItem>
                      )}
                      {session.status === 'active' && (
                        <>
                          <DropdownMenuItem onClick={() => handleExecuteSession(session)} disabled={isExecuting === session.id}>
                            <Zap className="w-4 h-4 mr-2" />
                            {isExecuting === session.id ? 'Executing...' : 'Execute Now'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCloseSession(session.id)}>
                            <XCircle className="w-4 h-4 mr-2" />
                            Close Session
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRecalculateStats(session.id)}>
                            <Repeat className="w-4 h-4 mr-2" />
                            Recalculate Stats
                          </DropdownMenuItem>
                        </>
                      )}
                      {session.status === 'awaiting_sell_execution' && (
                        <DropdownMenuItem onClick={() => handleExecuteSession(session)} disabled={isExecuting === session.id}>
                          <Zap className="w-4 h-4 mr-2" />
                          {isExecuting === session.id ? 'Executing Sell...' : 'Execute Sell'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleCloneSession(session)}>
                        <Repeat className="w-4 h-4 mr-2" />
                        Clone Session
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteSession(session)}
                        className="text-sell-muted-foreground"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-subtle">Session Mode</p>
                    <p className="font-semibold">{session.session_mode?.replace(/_/g, ' ').toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-subtle">Total Pledges</p>
                    <p className="font-semibold">{session.total_pledges || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-subtle">Total Value</p>
                    <p className="font-semibold">₹{(session.total_pledge_value || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-subtle">Fee</p>
                    <p className="font-semibold">
                      {session.convenience_fee_type === 'flat' 
                        ? `₹${session.convenience_fee_amount}` 
                        : `${session.convenience_fee_amount}%`}
                    </p>
                  </div>
                </div>

                {session.status === 'rejected' && session.rejected_reason && (
                  <div className="mt-4 p-3 bg-sell-muted border border-sell/30 rounded-lg">
                    <p className="text-sm text-sell-muted-foreground">
                      <strong>Rejection Reason:</strong> {session.rejected_reason}
                    </p>
                  </div>
                )}

                {session.approved_by && (
                  <div className="mt-4 text-xs text-muted-foreground">
                    Approved on {new Date(session.approved_at).toLocaleString()} by {session.approved_by}
                  </div>
                )}
                {session.created_date && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Created on {new Date(session.created_date).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <PledgeSessionFormModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingSession(null);
        }}
        onSuccess={handleFormSuccess}
        sessionToEdit={editingSession}
        onCreate={handleCreateSession}
        onUpdate={handleUpdateSession}
        isSaving={isCreating}
      />
    </div>
  );
}
