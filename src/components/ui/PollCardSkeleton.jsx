import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PollCardSkeleton() {
    return (
        <Card className="bg-white">
            <CardContent className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                </div>

                {/* Vote Options */}
                <div className="space-y-3 pt-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                </div>
            </CardContent>
        </Card>
    );
}
