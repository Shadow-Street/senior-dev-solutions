
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Users,
  Clock,
  Calendar,
  Star,
  Shield,
  Play,
  Award,
  TrendingUp,
  IndianRupee,
  Lock, // Added by outline
  Crown // Added by outline
} from 'lucide-react';
import { format } from 'date-fns';
import { useFeatureAccess } from '../hooks/useFeatureAccess'; // Added by outline
import { Link } from 'react-router-dom'; // Added by outline
import { createPageUrl } from '@/utils'; // Added by outline

// Removed EnrollmentModal import as its functionality is moved out by the onEnroll prop
// import EnrollmentModal from './EnrollmentModal'; 

// Updated component signature as per outline, removing canAccessPremium and adding onEnroll
export default function CourseCard({ course, influencer, onEnroll }) {
  // Removed showEnrollModal state as enrollment logic is externalized via onEnroll prop
  // const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Added by outline: Feature access check for premium content
  const { hasFeatureAccess } = useFeatureAccess('exclusive_finfluencer_content');
  // Added by outline: Logic to determine if the course is locked
  const isLocked = course.is_premium && !hasFeatureAccess;

  const difficultyColors = {
    beginner: 'bg-buy-muted text-buy-muted-foreground border-buy/30',
    intermediate: 'bg-hold-muted text-hold-muted-foreground border-hold/30',
    advanced: 'bg-sell-muted text-sell-muted-foreground border-sell/30'
  };

  const categoryColors = {
    technical_analysis: 'bg-premium-muted text-protocall-blue border-protocall-premium-light',
    fundamental_analysis: 'bg-premium-muted text-protocall-premium-text border-protocall-premium-light',
    options_trading: 'bg-premium-muted text-protocall-blue border-protocall-premium-light',
    mutual_funds: 'bg-buy-muted text-buy-muted-foreground border-buy/30',
    crypto: 'bg-hold-muted text-hold-muted-foreground border-hold/30',
    portfolio_management: 'bg-premium-muted text-protocall-premium-text border-protocall-premium-light'
  };

  // Removed handleEnroll as enrollment is handled via onEnroll prop
  // const handleEnroll = () => {
  //   setShowEnrollModal(true);
  // };

  return (
    <>
      {/* Updated Card className based on isLocked state */}
      <Card className={`group shadow-xl border-0 bg-white flex flex-col overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${
        isLocked ? 'opacity-90 border-2 border-protocall-premium-light' : ''
      }`}>
        {/* Course Type Header with Gradient - Modified to include h-48 and overflow-hidden, and the lock overlay */}
        <div className="relative bg-gradient-to-br from-protocall-deep via-protocall-grape to-protocall-blue p-6 text-white h-48 overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Badge className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 text-xs font-bold border-white/30 shadow-lg">
                {course.course_type.replace('_', ' ').toUpperCase()}
              </Badge>
              {course.course_type === 'live_session' && (
                <Badge className="bg-buy text-buy-foreground px-3 py-1 text-xs font-bold animate-pulse shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-ping absolute" />
                  <div className="w-2 h-2 bg-white rounded-full mr-1.5" />
                  LIVE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <Badge variant="outline" className={`${categoryColors[course.category]} border shadow-sm`}>
                  {course.category.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>

          {/* ✅ Lock Overlay for Premium Courses - Added by outline */}
          {isLocked && (
            <div className="absolute inset-0 bg-gradient-to-t from-protocall-deep/90 via-protocall-grape/70 to-transparent flex items-center justify-center">
              <div className="text-center text-white">
                <Lock className="w-10 h-10 mx-auto mb-2" />
                <p className="font-bold">Premium Course</p>
                <p className="text-xs opacity-90">VIP Only</p>
              </div>
            </div>
          )}
        </div>

        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-xl leading-tight font-bold text-foreground group-hover:text-protocall-blue transition-colors line-clamp-2">
            {course.title}
          </CardTitle>

          {/* Influencer Info */}
          {influencer && (
            <div className="flex items-center gap-2.5 mt-3 p-2.5 bg-surface-2 rounded-lg">
              <img
                src={influencer.profile_image_url}
                alt={influencer.display_name}
                className="w-9 h-9 rounded-full ring-2 ring-white shadow-md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{influencer.display_name}</p>
                {influencer.sebi_registered && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Shield className="w-3 h-3 text-buy-muted-foreground" />
                    <span className="text-xs text-buy-muted-foreground font-medium">SEBI Registered</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4 flex-1 flex flex-col">
          <p className="text-sm text-subtle leading-relaxed line-clamp-3">{course.description}</p>

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm bg-premium-muted p-2.5 rounded-lg">
              <Clock className="w-4 h-4 text-protocall-blue" />
              <span className="text-subtle font-medium">{course.duration_hours}h</span>
            </div>
            <div className="flex items-center gap-2 text-sm bg-premium-muted p-2.5 rounded-lg">
              <Users className="w-4 h-4 text-protocall-premium-text" />
              <span className="text-subtle font-medium">{course.current_enrollments} enrolled</span>
            </div>
          </div>

          {/* Live Session Date */}
          {course.course_type === 'live_session' && course.scheduled_date && (
            <div className="flex items-center gap-2 text-sm bg-surface-2 p-3 rounded-lg border border-protocall-premium-light">
              <Calendar className="w-4 h-4 text-protocall-blue" />
              <span className="text-protocall-blue font-semibold">
                {format(new Date(course.scheduled_date), 'MMM d, yyyy • h:mm a')}
              </span>
            </div>
          )}

          {/* Badges Row */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`${difficultyColors[course.difficulty_level]} font-semibold`}>
              {course.difficulty_level}
            </Badge>
            <Badge variant="outline" className="border-border text-subtle">
              <Award className="w-3 h-3 mr-1" />
              Certificate
            </Badge>
          </div>

          {/* Capacity Progress for Live Sessions */}
          {course.course_type === 'live_session' && course.max_participants && (
            <div className="bg-surface-2 p-3 rounded-lg border border-border">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-subtle font-medium">Seats Available</span>
                <span className="font-bold text-foreground">
                  {course.max_participants - course.current_enrollments} / {course.max_participants}
                </span>
              </div>
              <div className="bg-border rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-protocall-deep to-protocall-blue h-2.5 rounded-full transition-all duration-500 shadow-sm"
                  style={{ 
                    width: `${(course.current_enrollments / course.max_participants) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Price and CTA - Modified based on isLocked state */}
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-divider">
            <div>
              <p className="text-3xl font-bold bg-gradient-to-r from-protocall-deep to-protocall-blue bg-clip-text text-transparent">
                ₹{course.price?.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">One-time payment</p>
            </div>
            {/* ✅ Enhanced Enroll Button - Added by outline */}
            {isLocked ? (
              <Link to={createPageUrl('Subscription')}>
                <Button className="w-full bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to VIP
                </Button>
              </Link>
            ) : (
              <Button 
                onClick={() => onEnroll(course)} // Changed to use onEnroll prop
                className="w-full bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white hover:shadow-xl hover:scale-105 transition-all duration-300 px-6 py-2.5 font-semibold" // Updated styling as per outline
              >
                Enroll Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Removed EnrollmentModal component as its functionality is externalized via onEnroll prop */}
      {/* {showEnrollModal && (
        <EnrollmentModal
          open={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          course={course}
          influencer={influencer}
        />
      )} */}
    </>
  );
}
