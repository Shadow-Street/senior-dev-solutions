import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = "" 
}) {
  return (
    <Card className={`border-dashed border-2 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        {Icon && <Icon className="w-16 h-16 text-muted-foreground mb-4" />}
        <h3 className="text-xl font-semibold text-subtle mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="bg-primary hover:bg-primary">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}