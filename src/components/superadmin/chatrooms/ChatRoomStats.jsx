import React from 'react';
import AdvancedAnalyticsDashboard from './AdvancedAnalyticsDashboard';

export default function ChatRoomStats({ chatRooms, messages, users }) {
  return (
    <div className="space-y-6">
      <AdvancedAnalyticsDashboard />
    </div>
  );
}