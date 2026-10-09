
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EventCheckIn, EventPromoCode, EventReminder, EventFeedback } from '@/api/entities';
import { QrCode, Ticket, Mail, Star, Calendar, CheckCircle, Clock, TrendingUp, Users, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sendEventReminders } from '@/api/functions';
import { sendFeedbackRequests } from '@/api/functions';

export default function EventManagementTools({ checkIns = [], promoCodes = [], reminders = [], feedbacks = [], tickets = [] }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const handleSendReminders = async () => {
    setIsSendingReminders(true);
    try {
      const response = await sendEventReminders({});
      toast.success(`Sent ${response.data.remindersSent} reminders successfully!`);
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleSendFeedbackRequests = async () => {
    setIsSendingFeedback(true);
    try {
      const response = await sendFeedbackRequests({});
      toast.success(`Sent ${response.data.feedbackRequestsSent} feedback requests!`);
    } catch (error) {
      console.error('Error sending feedback requests:', error);
      toast.error('Failed to send feedback requests');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const stats = {
    totalCheckIns: checkIns.length,
    totalPromoCodes: promoCodes.length,
    activePromoCodes: promoCodes.filter(p => p.is_active).length,
    remindersSent: reminders.filter(r => r.sent).length,
    remindersPending: reminders.filter(r => !r.sent).length,
    feedbackReceived: feedbacks.filter(f => f.status === 'submitted').length,
    feedbackPending: feedbacks.filter(f => f.status === 'pending').length,
    avgFeedbackRating: feedbacks.filter(f => f.status === 'submitted').length > 0
      ? feedbacks.filter(f => f.status === 'submitted').reduce((sum, f) => sum + f.rating, 0) / feedbacks.filter(f => f.status === 'submitted').length
      : 0
  };

  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader className="border-b bg-surface-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Event Management & Automation Tools
          </CardTitle>
          <Badge variant="outline" className="text-subtle">
            Platform-wide oversight
          </Badge>
        </div>
        <p className="text-sm text-subtle">Monitor and manage all event features across the platform</p>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="checkins">Check-Ins</TabsTrigger>
            <TabsTrigger value="promos">Promo Codes</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-buy-muted rounded-lg border border-buy/30">
                <QrCode className="w-6 h-6 text-buy-muted-foreground mb-2" />
                <p className="text-sm text-buy-muted-foreground font-medium">Check-Ins</p>
                <p className="text-2xl font-bold text-buy-muted-foreground">{stats.totalCheckIns}</p>
              </div>

              <div className="p-4 bg-premium-muted rounded-lg border border-protocall-premium-light">
                <Ticket className="w-6 h-6 text-protocall-premium-text mb-2" />
                <p className="text-sm text-protocall-premium-text font-medium">Promo Codes</p>
                <p className="text-2xl font-bold text-protocall-premium-text">{stats.activePromoCodes}/{stats.totalPromoCodes}</p>
              </div>

              <div className="p-4 bg-premium-muted rounded-lg border border-protocall-premium-light">
                <Mail className="w-6 h-6 text-primary mb-2" />
                <p className="text-sm text-primary font-medium">Reminders Sent</p>
                <p className="text-2xl font-bold text-primary">{stats.remindersSent}</p>
              </div>

              <div className="p-4 bg-hold-muted rounded-lg border border-hold/30">
                <Star className="w-6 h-6 text-hold-muted-foreground mb-2" />
                <p className="text-sm text-hold-muted-foreground font-medium">Avg Feedback</p>
                <p className="text-2xl font-bold text-hold-muted-foreground">{stats.avgFeedbackRating.toFixed(1)}⭐</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-surface-2">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-foreground mb-4">Automation Actions</h4>
                  <div className="space-y-3">
                    <Button 
                      onClick={handleSendReminders}
                      disabled={isSendingReminders}
                      className="w-full bg-primary hover:bg-primary"
                    >
                      {isSendingReminders ? 'Sending...' : 'Send Event Reminders Now'}
                    </Button>
                    <Button 
                      onClick={handleSendFeedbackRequests}
                      disabled={isSendingFeedback}
                      className="w-full bg-primary hover:bg-primary"
                    >
                      {isSendingFeedback ? 'Sending...' : 'Send Feedback Requests'}
                    </Button>
                  </div>
                  <p className="text-xs text-subtle mt-3">
                    These functions are normally automated via cron jobs. Use these buttons to manually trigger them.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-surface-2 to-buy-muted">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-foreground mb-4">System Health</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-subtle">Reminder System</span>
                      <Badge className="bg-buy-muted text-buy-muted-foreground">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-subtle">Feedback Automation</span>
                      <Badge className="bg-buy-muted text-buy-muted-foreground">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-subtle">QR Check-In</span>
                      <Badge className="bg-buy-muted text-buy-muted-foreground">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="checkins" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {checkIns.length > 0 ? (
                checkIns.map(checkIn => (
                  <div key={checkIn.id} className="p-4 bg-surface-2 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{checkIn.user_name}</p>
                        <p className="text-sm text-subtle">Event ID: {checkIn.event_id}</p>
                        <p className="text-xs text-muted-foreground">
                          Checked in: {format(new Date(checkIn.checked_in_at), 'PPp')}
                        </p>
                      </div>
                      <Badge className="bg-buy-muted text-buy-muted-foreground">
                        {checkIn.check_in_method}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-subtle">No check-ins recorded yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="promos" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promoCodes.length > 0 ? (
                promoCodes.map(promo => (
                  <Card key={promo.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <code className="text-lg font-bold text-protocall-premium-text bg-premium-muted px-3 py-1 rounded">
                          {promo.code}
                        </code>
                        <Badge className={promo.is_active ? 'bg-buy-muted text-buy-muted-foreground' : 'bg-surface-2 text-foreground'}>
                          {promo.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-subtle mb-2">{promo.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-premium-muted p-2 rounded">
                          <p className="text-primary">Discount</p>
                          <p className="font-semibold text-primary">
                            {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₹${promo.discount_value}`}
                          </p>
                        </div>
                        <div className="bg-buy-muted p-2 rounded">
                          <p className="text-buy-muted-foreground">Usage</p>
                          <p className="font-semibold text-buy-muted-foreground">
                            {promo.current_uses} / {promo.max_uses || '∞'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 text-center py-12">
                  <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-subtle">No promo codes created yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-subtle">
                  {stats.remindersSent} sent, {stats.remindersPending} pending
                </p>
              </div>
              <Button 
                onClick={handleSendReminders}
                disabled={isSendingReminders}
                className="bg-primary hover:bg-primary"
              >
                {isSendingReminders ? 'Sending...' : 'Trigger Reminders Now'}
              </Button>
            </div>

            <div className="space-y-3">
              {reminders.length > 0 ? (
                reminders.slice(0, 50).map(reminder => (
                  <div key={reminder.id} className="p-4 bg-surface-2 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {reminder.reminder_type.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-subtle">Event: {reminder.event_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {reminder.sent 
                            ? `Sent: ${format(new Date(reminder.sent_at), 'PPp')}`
                            : `Scheduled: ${format(new Date(reminder.scheduled_time), 'PPp')}`
                          }
                        </p>
                      </div>
                      <Badge className={reminder.sent ? 'bg-buy-muted text-buy-muted-foreground' : 'bg-hold-muted text-hold-muted-foreground'}>
                        {reminder.sent ? 'Sent' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-subtle">No reminders logged yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-subtle">
                  {stats.feedbackReceived} received, {stats.feedbackPending} pending
                </p>
              </div>
              <Button 
                onClick={handleSendFeedbackRequests}
                disabled={isSendingFeedback}
                className="bg-primary hover:bg-primary"
              >
                {isSendingFeedback ? 'Sending...' : 'Send Feedback Requests'}
              </Button>
            </div>

            <div className="space-y-4">
              {feedbacks.filter(f => f.status === 'submitted').length > 0 ? (
                feedbacks.filter(f => f.status === 'submitted').map(feedback => (
                  <Card key={feedback.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-foreground">{feedback.user_name}</p>
                          <p className="text-sm text-subtle">Event: {feedback.event_id}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star 
                                  key={star} 
                                  className={`w-4 h-4 ${star <= feedback.rating ? 'fill-hold text-hold' : 'text-muted-foreground'}`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-subtle">{feedback.rating}/5</span>
                          </div>
                        </div>
                        <Badge className={feedback.would_recommend ? 'bg-buy-muted text-buy-muted-foreground' : 'bg-surface-2 text-foreground'}>
                          {feedback.would_recommend ? 'Recommends' : 'Neutral'}
                        </Badge>
                      </div>
                      
                      {feedback.feedback_text && (
                        <p className="text-sm text-subtle mb-3 p-3 bg-white rounded border">
                          {feedback.feedback_text}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="bg-premium-muted p-2 rounded text-center">
                          <p className="text-primary">Content</p>
                          <p className="font-bold text-primary">{feedback.content_quality}/5</p>
                        </div>
                        <div className="bg-premium-muted p-2 rounded text-center">
                          <p className="text-protocall-premium-text">Presentation</p>
                          <p className="font-bold text-protocall-premium-text">{feedback.presentation_quality}/5</p>
                        </div>
                        <div className="bg-buy-muted p-2 rounded text-center">
                          <p className="text-buy-muted-foreground">Venue</p>
                          <p className="font-bold text-buy-muted-foreground">{feedback.venue_rating}/5</p>
                        </div>
                        <div className="bg-hold-muted p-2 rounded text-center">
                          <p className="text-hold-muted-foreground">Value</p>
                          <p className="font-bold text-hold-muted-foreground">{feedback.value_for_money}/5</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-subtle">No feedback received yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
