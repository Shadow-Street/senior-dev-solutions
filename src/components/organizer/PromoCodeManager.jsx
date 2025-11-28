
import React, { useState, useEffect } from 'react';
import { EventPromoCode } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Ticket, Plus, Trash2, Copy, CheckCircle, Percent, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PromoCodeManager({ event, events, organizerId, onUpdate }) {
  const [promoCodes, setPromoCodes] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPromoCodes();
  }, [event?.id, organizerId]);

  const loadPromoCodes = async () => {
    try {
      let codes;
      if (event) {
        // Single event mode (from Edit Event modal)
        codes = await EventPromoCode.filter({ event_id: event.id }, '-created_date');
      } else if (organizerId) {
        // Multiple events mode (from dashboard)
        codes = await EventPromoCode.filter({ organizer_id: organizerId }, '-created_date');
      } else {
        codes = [];
      }
      setPromoCodes(codes);
    } catch (error) {
      console.error('Error loading promo codes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (codeId) => {
    if (!confirm('Delete this promo code?')) return;
    
    try {
      await EventPromoCode.delete(codeId);
      toast.success('Promo code deleted');
      loadPromoCodes();
      onUpdate && onUpdate();
    } catch (error) {
      toast.error('Failed to delete promo code');
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const openCreateModal = (eventToUse = null) => {
    if (eventToUse) {
      setSelectedEvent(eventToUse);
    } else if (event) {
      setSelectedEvent(event);
    }
    setShowCreateModal(true);
  };

  // Get event details for displaying in cards (dashboard mode)
  const getEventDetails = (eventId) => {
    if (!events) return null;
    return events.find(e => e.id === eventId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Promo Codes</h3>
          <p className="text-sm text-slate-600">
            {event ? `Manage discount codes for ${event.title}` : 'Manage discount codes for all your events'}
          </p>
        </div>
        {event ? (
          <Button onClick={() => openCreateModal()} className="bg-gradient-to-r from-purple-600 to-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Create Code
          </Button>
        ) : events && events.length > 0 ? (
          <Select onValueChange={(eventId) => {
            const selectedEvt = events.find(e => e.id === eventId);
            if (selectedEvt) openCreateModal(selectedEvt);
          }}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select event to create code" />
            </SelectTrigger>
            <SelectContent>
              {events.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {promoCodes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promoCodes.map(promo => {
            const eventDetails = getEventDetails(promo.event_id);
            
            return (
              <Card key={promo.id} className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  {/* Show event name if in dashboard mode */}
                  {!event && eventDetails && (
                    <div className="mb-3 pb-3 border-b">
                      <p className="text-xs text-slate-500">Event</p>
                      <p className="text-sm font-semibold text-slate-800">{eventDetails.title}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Ticket className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-lg font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded">
                            {promo.code}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyCode(promo.code)}
                            className="h-7 w-7 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{promo.description}</p>
                      </div>
                    </div>
                    <Badge className={promo.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        {promo.discount_type === 'percentage' ? (
                          <Percent className="w-4 h-4 text-blue-600" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-blue-600" />
                        )}
                        <p className="text-xs text-blue-600 font-medium">Discount</p>
                      </div>
                      <p className="text-xl font-bold text-blue-900">
                        {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₹${promo.discount_value}`}
                      </p>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-green-600 font-medium mb-1">Usage</p>
                      <p className="text-xl font-bold text-green-900">
                        {promo.current_uses} / {promo.max_uses || '∞'}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 mb-4">
                    <p>Valid: {format(new Date(promo.valid_from), 'MMM d, yyyy')} - {format(new Date(promo.valid_until), 'MMM d, yyyy')}</p>
                    {promo.minimum_tickets > 1 && (
                      <p>Min tickets: {promo.minimum_tickets}</p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(promo.id)}
                    className="w-full text-red-600 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Delete Code
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No promo codes created yet</p>
            {event ? (
              <Button onClick={() => openCreateModal()} className="mt-4">
                Create Your First Code
              </Button>
            ) : events && events.length > 0 ? (
              <p className="text-sm text-slate-500 mt-2">Select an event above to create a promo code</p>
            ) : (
              <p className="text-sm text-slate-500 mt-2">Create an event first to add promo codes</p>
            )}
          </CardContent>
        </Card>
      )}

      {showCreateModal && selectedEvent && (
        <CreatePromoCodeModal
          event={selectedEvent}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedEvent(null);
          }}
          onSuccess={() => {
            loadPromoCodes();
            setShowCreateModal(false);
            setSelectedEvent(null);
            onUpdate && onUpdate();
          }}
        />
      )}
    </div>
  );
}

function CreatePromoCodeModal({ event, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    max_uses: 50,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(event.event_date).toISOString().split('T')[0],
    minimum_tickets: 1,
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateRandomCode = () => {
    const prefix = event.title.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData({ ...formData, code: `${prefix}${random}` });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await EventPromoCode.create({
        event_id: event.id,
        organizer_id: event.organizer_id,
        ...formData
      });
      toast.success('Promo code created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating promo code:', error);
      toast.error('Failed to create promo code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-purple-600" />
            Create Promo Code
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Promo Code</Label>
            <div className="flex gap-2">
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2025"
                required
              />
              <Button type="button" onClick={generateRandomCode} variant="outline">
                Generate
              </Button>
            </div>
          </div>

          <div>
            <Label>Description (Internal)</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Early bird discount for first 50 customers"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Discount Type</Label>
              <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Off</SelectItem>
                  <SelectItem value="flat">Flat Amount Off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Discount Value</Label>
              <Input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max Uses (0 = unlimited)</Label>
              <Input
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) })}
                min="0"
              />
            </div>

            <div>
              <Label>Minimum Tickets</Label>
              <Input
                type="number"
                value={formData.minimum_tickets}
                onChange={(e) => setFormData({ ...formData, minimum_tickets: parseInt(e.target.value) })}
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valid From</Label>
              <Input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Valid Until</Label>
              <Input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
              {isSubmitting ? 'Creating...' : 'Create Code'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
