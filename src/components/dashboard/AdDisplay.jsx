import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

// Static sample ad - NO DATABASE CALLS
const sampleAd = {
  id: 'sample-1',
  title: 'Invest Smart with Zero Brokerage',
  description: 'Open your demat account today and start trading with zero commission.',
  creative_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop',
  cta_link: '#',
};

export default function AdDisplay({ placement = 'dashboard', userContext = null, className = "" }) {
  const handleAdClick = () => {
    window.open(sampleAd.cta_link, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className={`overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          <img 
            src={sampleAd.creative_url} 
            alt={sampleAd.title}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-2 left-2">
            <span className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Sponsored
            </span>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {sampleAd.title}
          </h3>
          {sampleAd.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
              {sampleAd.description}
            </p>
          )}
          
          <Button 
            onClick={handleAdClick}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Learn More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}