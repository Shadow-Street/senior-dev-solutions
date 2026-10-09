import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Loader2 } from 'lucide-react';

const AwaitingSellExecutionCard = ({ session, onExecuteSell, isExecuting }) => {
  return (
    <Card className="bg-premium-muted border-protocall-premium-light shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold text-primary">{session.stock_symbol}</CardTitle>
            <p className="text-sm text-primary mt-1">{session.stock_name}</p>
          </div>
          <Badge className="bg-premium-muted text-primary font-semibold">Awaiting Sell</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-primary font-semibold">BUY PLEDGES</p>
            <p className="text-lg font-bold text-primary">{session.buy_pledges_count || 0}</p>
          </div>
          <div>
            <p className="text-xs text-primary font-semibold">BUY VALUE</p>
            <p className="text-lg font-bold text-primary">
              ₹{((session.buy_pledges_value || 0) / 1000).toFixed(1)}K
            </p>
          </div>
           <div>
            <p className="text-xs text-primary font-semibold">PLEDGERS</p>
            <p className="text-lg font-bold text-primary">{session.total_pledges || 0}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4">
        <Button
          onClick={() => onExecuteSell(session.id)}
          disabled={isExecuting}
          className="w-full bg-primary hover:bg-primary text-white shadow-lg"
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <TrendingUp className="w-4 h-4 mr-2" />
          )}
          {isExecuting ? 'Executing Sell Orders...' : 'Execute Sell Orders'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AwaitingSellExecutionCard;