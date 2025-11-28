import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdvisorPledgeSessionFormModal({ user, advisorProfile, accessRequest, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    stock_symbol: '',
    stock_name: '',
    description: '',
    execution_reason: '',
    session_start: '',
    session_end: '',
    session_mode: 'buy_only',
    convenience_fee_type: 'flat',
    convenience_fee_amount: '',
    min_qty: 1,
    max_qty: '',
    capacity: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.stock_symbol || !formData.stock_name || !formData.session_start || 
        !formData.session_end || !formData.convenience_fee_amount) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create session with advisor information - status pending_approval
      const newSession = await base44.entities.PledgeSession.create({
        created_by_advisor_id: advisorProfile.id,
        stock_symbol: formData.stock_symbol.toUpperCase(),
        stock_name: formData.stock_name,
        description: formData.description,
        execution_reason: formData.execution_reason,
        is_advisor_recommended: true, // Mark as advisor recommended
        session_start: new Date(formData.session_start).toISOString(),
        session_end: new Date(formData.session_end).toISOString(),
        session_mode: formData.session_mode,
        convenience_fee_type: formData.convenience_fee_type,
        convenience_fee_amount: parseFloat(formData.convenience_fee_amount),
        min_qty: parseInt(formData.min_qty),
        max_qty: formData.max_qty ? parseInt(formData.max_qty) : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        status: 'pending_approval', // ✅ Always starts as pending approval
        commission_rate_override: accessRequest?.approved_commission_rate || null
      });

      toast.success('Session created successfully! Waiting for SuperAdmin approval.');
      onSuccess();
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Pledge Session</DialogTitle>
        </DialogHeader>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Note:</strong> Your session will be submitted for SuperAdmin approval before going live.
            You'll be notified once it's approved.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock_symbol">Stock Symbol *</Label>
              <Input
                id="stock_symbol"
                value={formData.stock_symbol}
                onChange={(e) => setFormData({...formData, stock_symbol: e.target.value.toUpperCase()})}
                placeholder="e.g., RELIANCE"
                required
              />
            </div>
            <div>
              <Label htmlFor="stock_name">Company Name *</Label>
              <Input
                id="stock_name"
                value={formData.stock_name}
                onChange={(e) => setFormData({...formData, stock_name: e.target.value})}
                placeholder="e.g., Reliance Industries"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of this pledge session"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="execution_reason">Execution Reason *</Label>
            <Textarea
              id="execution_reason"
              value={formData.execution_reason}
              onChange={(e) => setFormData({...formData, execution_reason: e.target.value})}
              placeholder="Why are you recommending this stock? Market conditions, technical analysis, fundamentals, etc."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="session_start">Session Start *</Label>
              <Input
                id="session_start"
                type="datetime-local"
                value={formData.session_start}
                onChange={(e) => setFormData({...formData, session_start: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="session_end">Session End *</Label>
              <Input
                id="session_end"
                type="datetime-local"
                value={formData.session_end}
                onChange={(e) => setFormData({...formData, session_end: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="session_mode">Session Mode *</Label>
            <Select
              value={formData.session_mode}
              onValueChange={(value) => setFormData({...formData, session_mode: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy_only">Buy Only</SelectItem>
                <SelectItem value="sell_only">Sell Only</SelectItem>
                <SelectItem value="buy_sell_cycle">Buy & Sell Cycle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fee_type">Convenience Fee Type *</Label>
              <Select
                value={formData.convenience_fee_type}
                onValueChange={(value) => setFormData({...formData, convenience_fee_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fee_amount">
                Fee Amount * ({formData.convenience_fee_type === 'flat' ? '₹' : '%'})
              </Label>
              <Input
                id="fee_amount"
                type="number"
                step="0.01"
                value={formData.convenience_fee_amount}
                onChange={(e) => setFormData({...formData, convenience_fee_amount: e.target.value})}
                placeholder={formData.convenience_fee_type === 'flat' ? '100' : '2'}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="min_qty">Min Quantity *</Label>
              <Input
                id="min_qty"
                type="number"
                min="1"
                value={formData.min_qty}
                onChange={(e) => setFormData({...formData, min_qty: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="max_qty">Max Quantity</Label>
              <Input
                id="max_qty"
                type="number"
                value={formData.max_qty}
                onChange={(e) => setFormData({...formData, max_qty: e.target.value})}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="capacity">Max Pledges</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                placeholder="Optional"
              />
            </div>
          </div>

          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-yellow-800 text-sm">
              <strong>Your Commission Rate:</strong> {accessRequest?.approved_commission_rate || 0}%
              <br />
              You'll earn commission on convenience fees and trading profits once this session is executed.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Session'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}