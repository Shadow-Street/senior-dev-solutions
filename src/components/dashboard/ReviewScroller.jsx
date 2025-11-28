import React from 'react';
import { Card } from '@/components/ui/card';
import { Star, Facebook, Linkedin, Twitter, Instagram, Youtube } from 'lucide-react';
import { motion } from 'framer-motion';

const iconMap = {
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  youtube: Youtube,
};

const platformColors = {
  facebook: 'hover:text-blue-600',
  linkedin: 'hover:text-blue-700',
  twitter: 'hover:text-blue-400',
  instagram: 'hover:text-pink-600',
  youtube: 'hover:text-red-600',
};

// Static sample reviews - NO DATABASE CALLS
const sampleReviews = [
  {
    id: '1',
    username: 'Rajesh Kumar',
    rating: 5,
    review_text: 'Protocall has transformed my trading experience. The community insights are invaluable!',
    profile_url: 'https://ui-avatars.com/api/?name=Rajesh+Kumar&background=random',
    social_platform: 'linkedin',
    social_url: '#',
    is_public: true,
    is_featured: true
  },
  {
    id: '2',
    username: 'Priya Sharma',
    rating: 5,
    review_text: 'Best platform for retail investors. Love the pledge pool feature and advisor recommendations.',
    profile_url: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=random',
    social_platform: 'twitter',
    social_url: '#',
    is_public: true,
    is_featured: true
  },
  {
    id: '3',
    username: 'Amit Patel',
    rating: 4,
    review_text: 'Great community polls and chat rooms. Really helps with making informed decisions.',
    profile_url: 'https://ui-avatars.com/api/?name=Amit+Patel&background=random',
    social_platform: 'facebook',
    social_url: '#',
    is_public: true,
    is_featured: false
  }
];

const ReviewCard = ({ review }) => {
  const SocialIcon = review.social_platform ? iconMap[review.social_platform] : null;
  const platformColor = review.social_platform ? platformColors[review.social_platform] : '';
  
  return (
    <Card className="w-[350px] h-[180px] flex-shrink-0 bg-gradient-to-r from-blue-50 to-purple-50 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 p-5 relative flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <img
          src={review.profile_url}
          alt={review.username}
          className="w-10 h-10 rounded-full border-2 border-purple-300 object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{review.username}</p>
          <div className="flex mt-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={12}
                className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
              />
            ))}
          </div>
        </div>
        
        {SocialIcon && (
          <div className={`text-gray-600 transition-colors duration-200 ${platformColor} flex-shrink-0`}>
            <SocialIcon size={18} />
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-hidden">
        <p className="text-sm text-gray-700 leading-relaxed italic line-clamp-3">
          "{review.review_text}"
        </p>
      </div>
      
      <div className="absolute bottom-2 right-2 text-purple-200 text-5xl font-serif leading-none pointer-events-none">
        "
      </div>
    </Card>
  );
};

export default function ReviewScroller() {
  const reviews = sampleReviews;
  const firstRowReviews = reviews;
  const duplicatedFirstRow = [...firstRowReviews, ...firstRowReviews, ...firstRowReviews];

  return (
    <div className="w-full py-16 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Star className="w-7 h-7 text-yellow-500 fill-yellow-500" />
          What Our Members Are Saying
        </h2>
      </div>
      
      <div className="w-full">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden h-[180px]">
            <motion.div
              className="flex gap-6"
              animate={{
                x: [0, -(firstRowReviews.length * 374)],
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: firstRowReviews.length * 8,
                  ease: "linear",
                },
              }}
            >
              {duplicatedFirstRow.map((review, index) => (
                <ReviewCard key={`row1-${review.id}-${index}`} review={review} />
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}