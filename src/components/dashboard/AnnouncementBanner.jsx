import React from 'react';

// Simple static announcement banner - no API calls
export default function AnnouncementBanner() {
  return (
    <div className="bg-brand-gradient text-white px-6 py-2">
      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl">✨</span>
        <p className="text-sm font-medium">
          Welcome to Protocall - India's Premier Trading Community Platform
        </p>
      </div>
    </div>
  );
}