
import React, { useState, useEffect, useCallback } from 'react';
import { EventAttendee, EventTicket, RefundRequest, EventReview } from '@/api/entities';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Crown, 
  Ticket,
  ExternalLink,
  CheckCircle,
  User as UserIcon,
  Receipt,
  CreditCard,
  XCircle,
  Star,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import EventRefundRequestModal from './EventRefundRequestModal';
import EventReviewModal from './EventReviewModal';
import EventReviewsSection from './EventReviewsSection';

export default function EventDetailsModal({ 
  event, 
  user, 
  userAccess, 
  onClose, 
  onTicketPurchase, 
  onUpgradePremium,
  onUpdate 
}) {
  const [isRSVPing, setIsRSVPing] = useState(false);
  const [userRSVP, setUserRSVP] = useState(null);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [userTicket, setUserTicket] = useState(null);
  const [userRefundRequest, setUserRefundRequest] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [eventRating, setEventRating] = useState({ average: 0, count: 0 });

  const loadAttendeeData = useCallback(async () => {
    try {
      const allAttendees = await EventAttendee.filter({ event_id: event.id });
      setTotalAttendees(allAttendees.length);

      if (user?.id) {
        const currentUserRSVP = allAttendees.find(attendee => attendee.user_id === user.id);
        setUserRSVP(currentUserRSVP);

        if (event.is_premium && (event.ticket_price || 0) > 0) {
          const userTickets = await EventTicket.filter({ 
            event_id: event.id, 
            user_id: user.id, 
            status: 'active' 
          });
          setUserTicket(userTickets[0] || null);

          if (userTickets[0]) {
            const refundRequests = await RefundRequest.filter({
              user_id: user.id,
              related_entity_id: userTickets[0].id,
              transaction_type: 'event_ticket'
            });
            
            if (refundRequests.length > 0) {
              const latestRequest = refundRequests.sort((a, b) => 
                new Date(b.created_date) - new Date(a.created_date)
              )[0];
              setUserRefundRequest(latestRequest);
            } else {
              setUserRefundRequest(null);
            }
          } else {
            setUserRefundRequest(null);
          }
        } else {
          setUserTicket(null);
          setUserRefundRequest(null);
        }

        // Load user's review if exists
        const userReviews = await EventReview.filter({
          event_id: event.id,
          user_id: user.id
        });
        setUserReview(userReviews[0] || null);
      } else {
        setUserRSVP(null);
        setUserTicket(null);
        setUserRefundRequest(null);
        setUserReview(null);
      }

      // Load event rating
      const allReviews = await EventReview.filter({ 
        event_id: event.id,
        status: 'approved'
      });
      if (allReviews.length > 0) {
        const sum = allReviews.reduce((acc, review) => acc + review.rating, 0);
        setEventRating({
          average: (sum / allReviews.length).toFixed(1),
          count: allReviews.length
        });
      } else {
        setEventRating({ average: 0, count: 0 });
      }
    } catch (error) {
      console.error('Error loading attendee data:', error);
    }
  }, [event.id, user?.id, event.is_premium, event.ticket_price]);

  useEffect(() => {
    loadAttendeeData();
  }, [loadAttendeeData]);

  const handleRSVP = async (status) => {
    if (!user) {
      toast.error('Please login to RSVP');
      return;
    }

    setIsRSVPing(true);
    try {
      if (userRSVP) {
        await EventAttendee.update(userRSVP.id, { 
          rsvp_status: status,
          user_name: user.display_name || user.full_name,
          confirmed: false
        });
      } else {
        await EventAttendee.create({
          event_id: event.id,
          user_id: user.id,
          user_name: user.display_name || user.full_name,
          rsvp_status: status,
          confirmed: false
        });
      }
      
      toast.success(`RSVP updated to "${status}"`);
      loadAttendeeData();
      onUpdate();
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update RSVP');
    } finally {
      setIsRSVPing(false);
    }
  };

  const getRefundStatusBadge = () => {
    if (!userRefundRequest) return null;

    const statusConfig = {
      'pending': {
        text: 'Refund Requested (Pending Organizer)',
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: '⏳'
      },
      'approved': {
        text: 'Refund Approved (Pending Admin)',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: '⏳'
      },
      'processing': {
        text: 'Refund Processing',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: '🔄'
      },
      'processed': {
        text: 'Refund Processed',
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: '✅'
      },
      'rejected': {
        text: 'Refund Rejected',
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: '❌'
      }
    };

    const config = statusConfig[userRefundRequest.status] || statusConfig['pending'];

    return (
      <Badge className={`${config.color} text-sm font-semibold`}>
        <span className="mr-1">{config.icon}</span>
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const isPastEvent = new Date(event.event_date) < new Date();
  const { date, time } = formatDate(event.event_date);

  const canLeaveReview = () => {
    if (!user || !isPastEvent) return false;
    if (userReview) return false; // Already reviewed
    
    // Can review if:
    // 1. Had RSVP'd yes
    // 2. Or had purchased a ticket
    if (userRSVP && userRSVP.rsvp_status === 'yes') return true;
    if (userTicket) return true;
    
    return false;
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              {event.title}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Event Details
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Reviews ({eventRating.count})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              {/* Event Status & Type */}
              <div className="flex flex-wrap gap-2">
                {event.is_premium && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium Event
                  </Badge>
                )}
                {isPastEvent && (
                  <Badge variant="outline" className="text-gray-500">
                    Past Event
                  </Badge>
                )}
                {userTicket && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <Ticket className="w-3 h-3 mr-1" />
                    Ticket Purchased
                  </Badge>
                )}
                {userRSVP && (
                  <Badge variant="outline" className="text-blue-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Your RSVP: {userRSVP.rsvp_status.toUpperCase()}
                  </Badge>
                )}
                {eventRating.count > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-600 text-yellow-600" />
                    {eventRating.average} ({eventRating.count} reviews)
                  </Badge>
                )}
              </div>

              {/* Ticket Receipt Section */}
              {userTicket && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">Your Ticket Receipt</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-600 font-medium">Ticket ID:</span>
                      <p className="text-green-800">{userTicket.id.slice(-8).toUpperCase()}</p>
                    </div>
                    <div>
                      <span className="text-green-600 font-medium">Amount Paid:</span>
                      <p className="text-green-800">₹{(userTicket.ticket_price || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-green-600 font-medium">Payment Method:</span>
                      <p className="text-green-800 capitalize">{userTicket.payment_method || 'Online'}</p>
                    </div>
                    <div>
                      <span className="text-green-600 font-medium">Purchase Date:</span>
                      <p className="text-green-800">
                        {new Date(userTicket.purchased_date || userTicket.created_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-700">
                    <CreditCard className="w-3 h-3 inline mr-1" />
                    Payment ID: {userTicket.payment_id}
                  </div>
                  
                  {/* Refund Request Section */}
                  {userRSVP && userRSVP.rsvp_status === 'no' && !isPastEvent && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700 mb-3">
                        You've marked "Can't attend". You can request a refund for your ticket before the event starts.
                      </p>
                      
                      {userRefundRequest ? (
                        <div className="flex flex-col gap-2">
                          {getRefundStatusBadge()}
                          {userRefundRequest.status === 'rejected' && userRefundRequest.rejection_reason && (
                            <p className="text-xs text-red-600">
                              <strong>Reason:</strong> {userRefundRequest.rejection_reason}
                            </p>
                          )}
                          {userRefundRequest.status === 'pending' && (
                            <p className="text-xs text-yellow-700">
                              You will be notified once your refund request has been reviewed by the organizer.
                            </p>
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => setShowRefundModal(true)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Request Refund
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Show message if event is past and user had RSVP'd no */}
                  {userRSVP && userRSVP.rsvp_status === 'no' && isPastEvent && userTicket && !userRefundRequest && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 text-center">
                        ⚠️ Refund requests are not available after the event has ended.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Event Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-800">{date}</p>
                    <p className="text-sm text-slate-600">{time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-800">
                      {event.location?.includes('http') ? 'Online Event' : event.location || 'Location TBD'}
                    </p>
                    {event.location?.includes('http') && (
                      <Button variant="link" size="sm" className="p-0 h-auto text-blue-600" asChild>
                        <a href={event.location} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Join Meeting
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-800">Organized by</p>
                    <p className="text-sm text-slate-600">{event.organizer_name || 'Event Organizer'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-800">{totalAttendees} Attendees</p>
                    {event.capacity && (
                      <p className="text-sm text-slate-600">Max capacity: {event.capacity}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Ticket Price */}
              {event.is_premium && (event.ticket_price || 0) > 0 && !userTicket && (
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-800">Premium Event</h3>
                      <p className="text-sm text-blue-600">
                        ₹{(event.ticket_price || 0).toLocaleString()} per ticket
                      </p>
                    </div>
                    <Ticket className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              )}

              {/* Event Description */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3">About This Event</h3>
                <div className="prose prose-sm max-w-none text-slate-600">
                  {event.description ? (
                    <p className="whitespace-pre-wrap">{event.description}</p>
                  ) : (
                    <p className="text-slate-400 italic">No description provided</p>
                  )}
                </div>
              </div>

              {/* RSVP Section */}
              {!isPastEvent && userAccess.canAccess && user && (
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <h3 className="font-semibold text-green-800 mb-3">Your RSVP</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={userRSVP?.rsvp_status === 'yes' ? 'default' : 'outline'}
                      onClick={() => handleRSVP('yes')}
                      disabled={isRSVPing}
                      className={userRSVP?.rsvp_status === 'yes' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Yes, I'll attend
                    </Button>
                    <Button
                      size="sm"
                      variant={userRSVP?.rsvp_status === 'maybe' ? 'default' : 'outline'}
                      onClick={() => handleRSVP('maybe')}
                      disabled={isRSVPing}
                      className={userRSVP?.rsvp_status === 'maybe' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                    >
                      Maybe
                    </Button>
                    <Button
                      size="sm"
                      variant={userRSVP?.rsvp_status === 'no' ? 'default' : 'outline'}
                      onClick={() => handleRSVP('no')}
                      disabled={isRSVPing}
                      className={userRSVP?.rsvp_status === 'no' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      Can't attend
                    </Button>
                  </div>
                </div>
              )}

              {/* Review Button for Past Events */}
              {canLeaveReview() && (
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-800 mb-1">Share Your Experience</h3>
                      <p className="text-sm text-blue-600">
                        Help others by leaving a review for this event
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowReviewModal(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Write Review
                    </Button>
                  </div>
                </div>
              )}

              {/* Show user's existing review */}
              {userReview && (
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-green-800 mb-1">Your Review</h3>
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= userReview.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      {userReview.review_text && (
                        <p className="text-sm text-green-700">{userReview.review_text}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end pt-4 border-t">
                <div className="flex gap-2">
                  {!isPastEvent && !userAccess.canAccess && (
                    <>
                      {event.is_premium && (event.ticket_price || 0) > 0 && (
                        <Button 
                          onClick={() => onTicketPurchase(event)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Ticket className="w-4 h-4 mr-2" />
                          Buy Ticket - ₹{(event.ticket_price || 0).toLocaleString()}
                        </Button>
                      )}
                      <Button 
                        onClick={onUpgradePremium}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade to Premium
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <EventReviewsSection 
                eventId={event.id} 
                currentUser={user}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Refund Request Modal */}
      {showRefundModal && userTicket && (
        <EventRefundRequestModal
          open={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          ticket={userTicket}
          event={event}
          user={user}
          onRefundRequested={() => {
            setShowRefundModal(false);
            loadAttendeeData();
          }}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <EventReviewModal
          open={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          event={event}
          user={user}
          onSuccess={loadAttendeeData}
        />
      )}
    </>
  );
}
