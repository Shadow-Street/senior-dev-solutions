import React, { useEffect, useState, useRef } from 'react';
import { PledgeSession, Pledge, PledgeExecutionRecord } from '@/api/entities';

export default function AutomatedExecutionEngine({ enabled, user, onExecutionComplete }) {
  const [isExecuting, setIsExecuting] = useState(false);
  const isMountedRef = useRef(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || !user) {
      return;
    }

    const checkAndExecuteSessions = async () => {
      if (isExecuting || !isMountedRef.current) return;

      try {
        setIsExecuting(true);
        
        const sessions = await PledgeSession.filter({ 
          status: 'active',
          execution_rule: 'session_end'
        }).catch(error => {
          // ✅ Ignore aborted requests
          if (error.code === 'ERR_CANCELED' || error.message?.includes('aborted')) {
            console.log('⏹️ Request cancelled, ignoring...');
            return [];
          }
          throw error;
        });

        if (!isMountedRef.current) return;

        const now = new Date();

        for (const session of sessions) {
          if (!isMountedRef.current) break;

          const sessionEnd = new Date(session.session_end);
          
          if (sessionEnd <= now) {
            console.log(`🤖 Auto-executing session: ${session.id}`);
            
            try {
              await executeSession(session, user);
              
              if (isMountedRef.current && onExecutionComplete) {
                onExecutionComplete(session.id, 'success');
              }
            } catch (error) {
              // ✅ Ignore aborted requests during execution
              if (error.code === 'ERR_CANCELED' || error.message?.includes('aborted')) {
                console.log('⏹️ Execution cancelled, ignoring...');
                continue;
              }
              console.error('❌ Error executing session:', error);
            }
          }
        }
      } catch (error) {
        // ✅ Ignore aborted requests
        if (error.code === 'ERR_CANCELED' || error.message?.includes('aborted')) {
          console.log('⏹️ Request cancelled, ignoring...');
          return;
        }
        console.error('❌ Error in automated execution:', error);
      } finally {
        if (isMountedRef.current) {
          setIsExecuting(false);
        }
      }
    };

    // Run check immediately
    checkAndExecuteSessions();

    // Then set up interval
    intervalRef.current = setInterval(checkAndExecuteSessions, 60000);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, user, onExecutionComplete]);

  const executeSession = async (session, executingUser) => {
    if (!executingUser) {
      console.error('❌ Error during session execution: - user is undefined');
      throw new Error('User is required for execution');
    }

    if (!isMountedRef.current) {
      console.log('⏹️ Component unmounted, aborting execution');
      return;
    }

    try {
      const pledges = await Pledge.filter({ 
        session_id: session.id,
        status: 'paid'
      }).catch(error => {
        // ✅ Ignore aborted requests
        if (error.code === 'ERR_CANCELED' || error.message?.includes('aborted')) {
          console.log('⏹️ Pledge fetch cancelled');
          return [];
        }
        throw error;
      });

      if (!isMountedRef.current) return;

      for (const pledge of pledges) {
        if (!isMountedRef.current) break;

        try {
          if (!executingUser || !executingUser.id) {
            console.error(`❌ Failed to execute ${pledge.side.toUpperCase()} for pledge ${pledge.id}: - user is undefined`);
            continue;
          }

          const executionRecord = await PledgeExecutionRecord.create({
            pledge_id: pledge.id,
            session_id: session.id,
            user_id: pledge.user_id,
            demat_account_id: pledge.demat_account_id,
            stock_symbol: pledge.stock_symbol,
            side: pledge.side,
            pledged_qty: pledge.qty,
            executed_qty: pledge.qty,
            executed_price: pledge.price_target,
            total_execution_value: pledge.qty * pledge.price_target,
            platform_commission: (pledge.qty * pledge.price_target * 0.02),
            commission_rate: 2,
            status: 'completed',
            executed_at: new Date().toISOString(),
          }).catch(error => {
            // ✅ Ignore aborted requests
            if (error.code === 'ERR_CANCELED' || error.message?.includes('aborted')) {
              console.log('⏹️ Execution record creation cancelled');
              return null;
            }
            throw error;
          });

          if (!isMountedRef.current || !executionRecord) continue;

          await Pledge.update(pledge.id, { status: 'executed' }).catch(error => {
            // ✅ Ignore aborted requests
            if (error.code === 'ERR_CANCELED' || error.message?.includes('aborted')) {
              console.log('⏹️ Pledge update cancelled');
              return;
            }
            throw error;
          });

          console.log(`✅ Executed ${pledge.side.toUpperCase()} pledge ${pledge.id}`);
        } catch (error) {
          // ✅ Ignore aborted requests
          if (error.code === 'ERR_CANCELED' || error.message?.includes('aborted')) {
            console.log('⏹️ Pledge execution cancelled');
            continue;
          }
          console.error(`❌ Failed to execute ${pledge.side?.toUpperCase()} for pledge ${pledge.id}:`, error);
        }
      }

      if (!isMountedRef.current) return;

      await PledgeSession.update(session.id, {
        status: 'completed',
        last_executed_at: new Date().toISOString()
      }).catch(error => {
        // ✅ Ignore aborted requests
        if (error.code === 'ERR_CANCELED' || error.message?.includes('aborted')) {
          console.log('⏹️ Session update cancelled');
          return;
        }
        throw error;
      });

      console.log(`✅ Session ${session.id} execution completed`);
    } catch (error) {
      // ✅ Ignore aborted requests
      if (error.code === 'ERR_CANCELED' || error.message?.includes('aborted')) {
        console.log('⏹️ Session execution cancelled');
        return;
      }
      console.error(`❌ Error during session execution:`, error);
      throw error;
    }
  };

  return null;
}