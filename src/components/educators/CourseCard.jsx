import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Users,
  Clock,
  Star,
  CheckCircle,
  Play,
  Award,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

export default function CourseCard({ course, educator, canAccessPremium }) {
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  const difficultyColors = {
    beginner: 'bg-buy-muted text-buy-muted-foreground border-buy/30',
    intermediate: 'bg-hold-muted text-hold-muted-foreground border-hold/30',
    advanced: 'bg-sell-muted text-sell-muted-foreground border-sell/30'
  };

  const handleEnroll = () => {
    if (canAccessPremium) {
      alert(`Enrolling in ${course.title} by ${educator?.display_name}`);
    } else {
      alert("Please subscribe to Premium to enroll in courses.");
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-white flex flex-col">
      {/* Course Header */}
      <div className="relative bg-gradient-to-r from-protocall-deep to-protocall-blue p-4 text-white">
        <div className="flex items-center justify-between">
          <Badge className="bg-white/20 text-white border-white/30">
            {course.course_type.replace('_', ' ').toUpperCase()}
          </Badge>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-hold" />
            <span className="font-medium">{course.rating}</span>
          </div>
        </div>
        
        {course.thumbnail_url && (
          <div className="mt-3 rounded-lg overflow-hidden">
            <img 
              src={course.thumbnail_url} 
              alt={course.title}
              className="w-full h-32 object-cover"
            />
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="space-y-2">
          <Badge variant="outline" className="border-protocall-premium-light bg-premium-muted text-protocall-blue">
            {course.category.replace('_', ' ')}
          </Badge>
          <CardTitle className="text-lg leading-tight">{course.title}</CardTitle>
        </div>

        {/* Educator */}
        {educator && (
          <div className="flex items-center gap-2 text-sm text-subtle">
            <img
              src={educator.profile_image_url}
              alt={educator.display_name}
              className="w-6 h-6 rounded-full"
            />
            <span className="font-medium">{educator.display_name}</span>
            {educator.verified && (
              <CheckCircle className="w-4 h-4 text-positive" />
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        <p className="text-sm text-subtle line-clamp-2">{course.description}</p>

        {/* Key Info */}
        <div className="flex justify-between items-center text-sm text-subtle">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-hold" />
            <span>{course.rating} ({course.current_enrollments} reviews)</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-protocall-premium-light" />
            <span>{course.current_enrollments} students</span>
          </div>
        </div>

        {/* Live Course Date */}
        {course.course_type === 'live_workshop' && course.scheduled_date && (
          <div className="flex items-center gap-2 text-sm bg-premium-muted p-2 rounded-lg">
            <Calendar className="w-4 h-4 text-protocall-blue" />
            <span className="text-protocall-blue font-medium">
              {format(new Date(course.scheduled_date), 'MMM d, yyyy • h:mm a')}
            </span>
          </div>
        )}

        {/* Course Details */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={difficultyColors[course.difficulty_level]}>
            {course.difficulty_level}
          </Badge>
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            {course.duration_hours} hours
          </Badge>
        </div>

        {/* Capacity Check for Live Courses */}
        {course.course_type === 'live_workshop' && course.max_participants && (
          <div className="bg-surface-2 p-3 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-subtle">Capacity:</span>
              <span className="font-semibold">
                {course.current_enrollments} / {course.max_participants}
              </span>
            </div>
            <div className="mt-2 bg-border rounded-full h-2">
              <div 
                className="bg-protocall-blue h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(course.current_enrollments / course.max_participants) * 100}%` 
                }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-4">
          <p className="text-2xl font-bold text-foreground">₹{course.price}</p>
          <Button 
            onClick={handleEnroll} 
            className="bg-gradient-to-r from-protocall-deep to-protocall-blue text-white"
            disabled={!canAccessPremium}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Enroll Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}