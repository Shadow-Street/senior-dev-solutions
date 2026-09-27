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
                        <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center">
                            <Icon className="w-8 h-8 text-protocall-premium-text" />
                        </div>
                    )}

                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-foreground">
                            {title}
                        </h3>
                        <p className="text-sm text-subtle">
                            {description}
                        </p>
                    </div>

                    {action && (
                        <Button
                            onClick={action.onClick}
                            className="mt-4 bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue"
                        >
                            {action.label}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
