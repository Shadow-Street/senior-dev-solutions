
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HandCoins, Eye, Clock, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import PayoutDetailsModal from './PayoutDetailsModal';
import { toast } from 'sonner';

export default function Payouts({ finfluencers, advisors, payoutData, permissions, enrollments, commissions, payoutRequests, onUpdate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const combinedCreators = useMemo(() => {
    return [
      ...finfluencers.map(f => ({ ...f, type: 'Finfluencer' })),
      ...advisors.map(a => ({ ...a, type: 'Advisor' }))
    ].sort((a, b) => (payoutData[b.user_id]?.net || 0) - (payoutData[a.user_id]?.net || 0));
  }, [finfluencers, advisors, payoutData]);

  // Filter for pending/approved requests to be displayed
  const pendingAndApprovedRequests = useMemo(() => {
    if (!payoutRequests) return [];
    return payoutRequests.filter(p => p.status === 'pending' || p.status === 'approved');
  }, [payoutRequests]);

  const handleReviewClick = (request) => {
    // Find the creator by their entity_id, which is the correct link
    const creator = combinedCreators.find(c => c.id === request.entity_id);
    setSelectedRequest({
      ...request,
      userName: creator?.display_name || 'Unknown User'
    });
    setIsModalOpen(true);
  };
  
  const statusConfig = {
    pending: { icon: Clock, color: 'bg-hold-muted text-hold-muted-foreground' },
    approved: { icon: CheckCircle, color: 'bg-premium-muted text-protocall-blue' },
    rejected: { icon: XCircle, color: 'bg-sell-muted text-sell-muted-foreground' },
    processed: { icon: CheckCircle, color: 'bg-buy-muted text-buy-muted-foreground' },
  };

  return (
    <Tabs defaultValue="pending">
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HandCoins className="w-6 h-6 text-protocall-premium-text" />
                Creator & Advisor Payouts
              </CardTitle>
              <CardDescription className="mt-1">
                Manage payout requests, view balances, and process payments.
              </CardDescription>
            </div>
            <TabsList className="grid grid-cols-2 bg-transparent p-1 rounded-xl gap-2">
              <TabsTrigger value="pending" className="whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary hover:bg-primary/90 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-md">
                <Clock className="w-4 h-4 mr-2" /> Pending Requests
              </TabsTrigger>
              <TabsTrigger value="analytics" className="whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary hover:bg-primary/90 h-10 px-4 w-full text-sm rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-md">
                <BarChart3 className="w-4 h-4 mr-2" /> Payout Analytics
              </TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        <CardContent>
          
          <TabsContent value="pending" className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-subtle uppercase bg-surface-2">
                  <tr>
                    <th scope="col" className="px-6 py-3">Creator</th>
                    <th scope="col" className="px-6 py-3">Amount</th>
                    <th scope="col" className="px-6 py-3">Method</th>
                    <th scope="col" className="px-6 py-3">Date</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAndApprovedRequests && pendingAndApprovedRequests.length > 0 ? (
                    pendingAndApprovedRequests.map(request => {
                      const creator = combinedCreators.find(c => c.id === request.entity_id);
                      const status = statusConfig[request.status] || {};
                      const StatusIcon = status.icon;
                      return (
                        <tr key={request.id} className="bg-white border-b hover:bg-surface-2">
                          <td className="px-6 py-4 font-medium text-foreground">
                            {creator?.display_name || 'N/A'}
                            <div className="text-xs text-muted-foreground">{creator?.type}</div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-buy-muted-foreground">
                            ₹{request.requested_amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 capitalize">
                            {request.payout_method?.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4">
                            {format(new Date(request.created_date), 'dd MMM yyyy')}
                          </td>
                          <td className="px-6 py-4">
                             <Badge className={`${status.color} border-0`}>
                                {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                                {request.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="outline" size="sm" onClick={() => handleReviewClick(request)}>
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-muted-foreground">
                        No pending payout requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-subtle uppercase bg-surface-2">
                  <tr>
                    <th scope="col" className="px-6 py-3">Creator</th>
                    <th scope="col" className="px-6 py-3">Type</th>
                    <th scope="col" className="px-6 py-3">Gross Revenue</th>
                    <th scope="col" className="px-6 py-3">Platform Fees</th>
                    <th scope="col" className="px-6 py-3">Net Earnings</th>
                    <th scope="col" className="px-6 py-3">Pending Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedCreators.map(creator => {
                    const data = payoutData[creator.user_id] || { gross: 0, commission: 0, net: 0, pending: 0 };
                    return (
                      <tr key={creator.id} className="bg-white border-b hover:bg-surface-2">
                        <td className="px-6 py-4 flex items-center gap-3">
                            <img src={creator.profile_image_url || `https://avatar.vercel.sh/${creator.user_id}.png`} alt={creator.display_name} className="w-8 h-8 rounded-full"/>
                            <span className="font-medium">{creator.display_name}</span>
                        </td>
                        <td className="px-6 py-4"><Badge variant={creator.type === 'Advisor' ? 'secondary' : 'outline'}>{creator.type}</Badge></td>
                        <td className="px-6 py-4">₹{data.gross.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4 text-sell">₹{data.commission.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4 font-semibold text-buy-muted-foreground">₹{data.net.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4 text-hold-muted-foreground">₹{data.pending.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </CardContent>

        <PayoutDetailsModal
          request={selectedRequest}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdate={onUpdate}
        />
      </Card>
    </Tabs>
  );
}
