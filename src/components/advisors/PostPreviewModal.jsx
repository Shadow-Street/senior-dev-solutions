import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ShieldCheck, 
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { format } from 'date-fns';

export default function PostPreviewModal({ open, onClose, post, advisor }) {
  if (!post || !advisor) return null;

  const getRecommendationIcon = (type) => {
    switch(type) {
      case 'buy': return <ArrowUp className="w-4 h-4" />;
      case 'sell': return <ArrowDown className="w-4 h-4" />;
      case 'hold': return <Minus className="w-4 h-4" />;
      default: return null;
    }
  };

  const getCardBackgroundColor = (type) => {
    switch(type) {
      case 'buy': return 'bg-gradient-to-br from-blue-50 to-white';
      case 'sell': return 'bg-gradient-to-br from-red-50 to-white';
      case 'hold': return 'bg-gradient-to-br from-yellow-50 to-white';
      default: return 'bg-white';
    }
  };

  const getBorderColor = (type) => {
    switch(type) {
      case 'buy': return 'border-blue-200';
      case 'sell': return 'border-red-200';
      case 'hold': return 'border-yellow-200';
      default: return 'border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advisory Preview - User View</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Advisor Info */}
          <Card className="border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-purple-300">
                  <AvatarImage src={advisor.profile_image_url} />
                  <AvatarFallback className="bg-purple-600 text-white">
                    {advisor.display_name?.charAt(0)?.toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">{advisor.display_name}</h3>
                    <Badge className="bg-green-100 text-green-700 border-green-200 border text-xs">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      SEBI
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {format(new Date(post.created_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Card - Matching Reference Design with Color Coding */}
          <Card className={`shadow-sm border-2 ${getBorderColor(post.recommendation_type)} ${getCardBackgroundColor(post.recommendation_type)} hover:shadow-md transition-shadow`}>
            <CardContent className="p-5">
              {/* Stock Symbol and Recommendation Badge */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-slate-900">{post.stock_symbol || 'N/A'}</h3>
                {post.recommendation_type && (
                  <Badge 
                    className={`px-3 py-1 font-semibold border flex items-center gap-1.5 ${
                      post.recommendation_type === 'buy' ? 'bg-green-50 text-green-700 border-green-300' :
                      post.recommendation_type === 'sell' ? 'bg-red-50 text-red-700 border-red-300' :
                      post.recommendation_type === 'hold' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                      'bg-blue-50 text-blue-700 border-blue-300'
                    }`}
                  >
                    {getRecommendationIcon(post.recommendation_type)}
                    {post.recommendation_type?.charAt(0).toUpperCase() + post.recommendation_type?.slice(1)}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h4 className="text-base font-semibold text-slate-800 mb-4 leading-snug">
                {post.title}
              </h4>

              {/* Target, Risk, and Time Horizon Row */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  {post.target_price && (
                    <div>
                      <span className="text-slate-600">Target:</span>
                      <span className="ml-2 font-bold text-green-700">₹{post.target_price}</span>
                    </div>
                  )}
                  {post.recommendation_type && (
                    <Badge className={`text-xs font-medium px-2 py-0.5 ${
                      post.recommendation_type === 'buy' ? 'bg-yellow-50 text-yellow-700' :
                      post.recommendation_type === 'sell' ? 'bg-orange-50 text-orange-700' :
                      'bg-green-50 text-green-700'
                    }`}>
                      {post.recommendation_type === 'buy' ? 'medium risk' :
                       post.recommendation_type === 'sell' ? 'high risk' : 'low risk'}
                    </Badge>
                  )}
                </div>
                {post.time_horizon && (
                  <span className="text-slate-700 font-medium">
                    {post.time_horizon === 'short_term' ? 'Short Term' :
                     post.time_horizon === 'medium_term' ? 'Medium Term' :
                     post.time_horizon === 'long_term' ? 'Long Term' : post.time_horizon}
                  </span>
                )}
              </div>

              {/* Stop Loss (if exists) */}
              {post.stop_loss && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm text-slate-600">Stop Loss:</span>
                  <span className="ml-2 font-bold text-red-700">₹{post.stop_loss}</span>
                </div>
              )}

              {/* Content Preview */}
              {post.content && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
                    {post.content}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Full Analysis (Expandable) */}
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-slate-800 mb-3">Detailed Analysis</h3>
              <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                {post.content}
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-xs text-yellow-800 leading-relaxed">
              <strong>Disclaimer:</strong> This is a professional advisory from a SEBI registered advisor. 
              Please do your own research and consult with your financial advisor before making investment decisions. 
              Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}