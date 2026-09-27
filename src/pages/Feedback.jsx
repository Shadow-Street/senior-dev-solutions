import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Star, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import FeedbackForm from '../components/feedback/FeedbackForm';
import SubmitReviewModal from '../components/reviews/SubmitReviewModal';

export default function FeedbackPage() {
  const user = null; // Guest mode - no authentication
  const [isLoading, setIsLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const handleFeedbackSubmit = (feedbackData) => {
    toast.info("Feature demo - feedback submission requires login");
  };

  const handleReviewSubmit = () => {
    setShowReviewModal(false);
    toast.info("Feature demo - review submission requires login");
  };

  return (
    <div className="min-h-screen bg-surface-2 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-protocall-deep to-protocall-blue text-white px-4 py-2 rounded-full">
            <MessageSquare className="w-5 h-5" />
            <span className="font-semibold">Your Voice Matters</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            Share Your Feedback
          </h1>
          <p className="text-subtle max-w-2xl mx-auto">
            Help us improve Protocall by sharing your thoughts, suggestions, and ideas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-2 border-protocall-premium-light hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-premium-muted flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-protocall-premium-text" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Submit Feedback</h3>
                  <p className="text-sm text-subtle">
                    Share suggestions, report issues, or request new features
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-2 border-protocall-premium-light hover:border-protocall-blue transition-colors cursor-pointer"
            onClick={() => setShowReviewModal(true)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-premium-muted flex items-center justify-center">
                  <Star className="w-6 h-6 text-protocall-blue" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Write a Review</h3>
                  <p className="text-sm text-subtle">
                    Rate your experience and help others discover Protocall
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <FeedbackForm user={user} onSubmit={handleFeedbackSubmit} />

        <Card className="bg-surface-2 border-protocall-premium-light">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-protocall-blue" />
              What happens to your feedback?
            </h3>
            <div className="space-y-2 text-sm text-subtle">
              <p>✅ All feedback is reviewed by our team</p>
              <p>✅ Popular requests are prioritized for development</p>
              <p>✅ You'll be notified when your suggestion is implemented</p>
              <p>✅ Your input directly shapes the future of Protocall</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <SubmitReviewModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSuccess={handleReviewSubmit}
      />
    </div>
  );
}