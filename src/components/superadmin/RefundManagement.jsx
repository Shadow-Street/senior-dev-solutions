import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw } from 'lucide-react';
import Refunds from './financials/Refunds';

/**
 * Super Admin > Refund Management. The same refund workflow as Financials >
 * Refunds: requests are reviewed here, approved refunds are sent through
 * Razorpay by the server, and every decision is audited.
 *
 * The previous screen changed refund status from the browser and called a
 * client-side "payment service" that never reached Razorpay, so "Processed"
 * refunds were never actually paid back. That path is gone.
 */
export default function RefundManagement() {
  return (
    <div className="space-y-6">
      <Card className="shadow-sm border bg-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-2xl">Refund Management</CardTitle>
              <p className="text-sm text-subtle mt-1">Review, process and track refunds of Razorpay payments.</p>
            </div>
          </div>
        </CardHeader>
      </Card>
      <Refunds />
    </div>
  );
}
