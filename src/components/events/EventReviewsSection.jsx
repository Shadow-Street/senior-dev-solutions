import React, { useState, useEffect } from 'react';
import { EventReview } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, User } from 'lucide-react';
import { format } from 'date-fns';

export default function EventReviewsSection({ eventId, currentUser }) {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent'); // recent, highest, lowest

  useEffect(() => {
    loadReviews();
  }, [eventId]);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const allReviews = await EventReview.filter({ 
        event_id: eventId,
        status: 'approved'
      });
      setReviews(allReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedReviews = React.useMemo(() => {
    const sorted = [...reviews];
    switch (sortBy) {
      case 'highest':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return sorted.sort((a, b) => a.rating - b.rating);
      case 'recent':
      default:
        return sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  }, [reviews, sortBy]);

  const averageRating = React.useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const ratingDistribution = React.useMemo(() => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating]++;
    });
    return distribution;
  }, [reviews]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <div className="text-5xl font-bold text-gray-900">{averageRating}</div>
                <div className="flex flex-col">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(averageRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating];
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 w-12">{rating} star</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <>
          {/* Sort Controls */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              All Reviews ({reviews.length})
            </h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={sortBy === 'recent' ? 'default' : 'outline'}
                onClick={() => setSortBy('recent')}
                className={sortBy === 'recent' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : ''}
              >
                Most Recent
              </Button>
              <Button
                size="sm"
                variant={sortBy === 'highest' ? 'default' : 'outline'}
                onClick={() => setSortBy('highest')}
                className={sortBy === 'highest' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : ''}
              >
                Highest
              </Button>
              <Button
                size="sm"
                variant={sortBy === 'lowest' ? 'default' : 'outline'}
                onClick={() => setSortBy('lowest')}
                className={sortBy === 'lowest' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : ''}
              >
                Lowest
              </Button>
            </div>
          </div>

          {/* Reviews */}
          <div className="space-y-4">
            {sortedReviews.map((review) => (
              <Card key={review.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {review.user_name?.charAt(0)?.toUpperCase() || <User className="w-5 h-5" />}
                    </div>

                    {/* Review Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{review.user_name}</h4>
                            {review.is_verified_attendee && (
                              <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                                Verified Attendee
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {format(new Date(review.created_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {review.review_text && (
                        <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                          {review.review_text}
                        </p>
                      )}

                      {/* Helpful Button */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-600 hover:text-blue-600 h-8 px-3"
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Helpful {review.helpful_count > 0 && `(${review.helpful_count})`}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="p-12 text-center">
            <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Reviews Yet
            </h3>
            <p className="text-gray-500">
              Be the first to share your experience!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}