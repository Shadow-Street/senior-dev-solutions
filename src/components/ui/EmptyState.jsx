import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EmptyState({
    icon: Icon,
    title,
    description,
    action
}) {
    return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
            <Card className="max-w-md w-full">
                <CardContent className="flex flex-col items-center text-center p-12 space-y-4">
                    {Icon && (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                            <Icon className="w-8 h-8 text-purple-600" />
                        </div>
                    )}

                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-slate-900">
                            {title}
                        </h3>
                        <p className="text-sm text-slate-600">
                            {description}
                        </p>
                    </div>

                    {action && (
                        <Button
                            onClick={action.onClick}
                            className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        >
                            {action.label}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
