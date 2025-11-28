
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logAuditAction, AuditActions } from '@/components/utils/auditLogger';

export default function CreatePollModal({ open, onClose, onCreatePoll }) {
  // Refactored state from formData object to individual state variables
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stockSymbol, setStockSymbol] = useState('');
  const [pollType, setPollType] = useState('buy_sell_hold');
  const [expiresAt, setExpiresAt] = useState(null); // Date object for Calendar
  const [isPremium, setIsPremium] = useState(false);
  const [imageUrl, setImageUrl] = useState(''); // New field for image URL
  const [targetPrice, setTargetPrice] = useState(''); // Kept as string for input
  const [confidenceScore, setConfidenceScore] = useState(3); // Default value from original code
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!title.trim() || !stockSymbol.trim() || !pollType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare data for submission, including type conversions for backend
      const pollData = {
        title,
        description,
        stock_symbol: stockSymbol,
        poll_type: pollType,
        expires_at: expiresAt ? expiresAt.toISOString() : null, // Convert Date object to ISO string
        is_premium: isPremium,
        image_url: imageUrl || null, // Include new image_url field
        target_price: targetPrice ? parseFloat(targetPrice) : null, // Convert to number, use null if empty
        confidence_score: confidenceScore, // Confidence score is already a number
        created_by_role: 'admin', // Fixed value
        created_by_admin: true // Fixed value
      };
      
      await onCreatePoll(pollData);
      
      // Get current admin for audit log - Assuming `User` context/import needed if this were real
      // For this implementation, we pass null as `currentAdmin` to avoid undefined variable error.
      await logAuditAction(
        null, // currentAdmin
        AuditActions.POLL_CREATED,
        'Poll',
        null, // relatedId
        `Created ${isPremium ? 'premium' : 'general'} poll "${title}" for stock ${stockSymbol}`
      );

      // Reset form after successful submission
      setTitle('');
      setDescription('');
      setStockSymbol('');
      setPollType('buy_sell_hold');
      setExpiresAt(null);
      setIsPremium(false);
      setImageUrl('');
      setTargetPrice('');
      setConfidenceScore(3);
      
      onClose(); // Close the modal after successful submission
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error('Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-600" />
            Create New Poll
          </DialogTitle>
          <DialogDescription>
            Create a new community poll for stock sentiment analysis
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Poll Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Should we buy RELIANCE before earnings?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stock_symbol">Stock Symbol *</Label>
              <Input
                id="stock_symbol"
                placeholder="e.g., RELIANCE"
                value={stockSymbol}
                onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Poll Description</Label>
            <Textarea
              id="description"
              placeholder="Provide additional context or analysis for this poll..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* New field: Image URL */}
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              placeholder="e.g., https://example.com/charts/reliance.png"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="poll_type">Poll Type</Label>
              <Select 
                value={pollType} 
                onValueChange={(value) => setPollType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select poll type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy_sell_hold">Buy/Sell/Hold</SelectItem>
                  <SelectItem value="sentiment">Sentiment Analysis</SelectItem>
                  <SelectItem value="price_target">Price Target</SelectItem>
                  <SelectItem value="admin_recommendation">Admin Recommendation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Poll Access</Label>
              <Select 
                value={isPremium ? "premium" : "general"} 
                onValueChange={(value) => setIsPremium(value === "premium")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General (Free)</SelectItem>
                  <SelectItem value="premium">Premium Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Confidence Level</Label>
              <Select 
                value={String(confidenceScore)} 
                onValueChange={(value) => setConfidenceScore(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Low Confidence</SelectItem>
                  <SelectItem value="2">2 - Moderate</SelectItem>
                  <SelectItem value="3">3 - Good</SelectItem>
                  <SelectItem value="4">4 - High</SelectItem>
                  <SelectItem value="5">5 - Very High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_price">Target Price (₹)</Label>
              <Input
                id="target_price"
                type="number"
                step="0.01"
                placeholder="e.g., 2500.00"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Poll Expiry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt ? format(expiresAt, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={(date) => setExpiresAt(date)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Poll'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
