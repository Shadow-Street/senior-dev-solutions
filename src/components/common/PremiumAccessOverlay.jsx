import React from 'react';
import { Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const PremiumAccessOverlay = ({
    title = "Premium Content",
    message = "This content is exclusive to premium members.",
    actionLabel = "Upgrade to Premium",
    className = ""
}) => {
    return (
        <div className={`absolute inset-0 z-50 flex items-center justify-center rounded-xl overflow-hidden ${className}`}>
            {/* Blurred Background Overlay */}
            <div className="absolute inset-0 bg-white/40 backdrop-blur-md pointer-events-none"></div>

            {/* Content Center */}
            <div className="relative z-10 p-6 text-center max-w-[280px] animate-in fade-in zoom-in duration-300">
                <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-premium-muted shadow-inner">
                    <Lock className="w-8 h-8 text-protocall-premium-text" />
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                    {title}
                    <Crown className="w-5 h-5 text-protocall-premium-light fill-primary" />
                </h3>

                <p className="text-sm text-subtle mb-6 leading-relaxed">
                    {message}
                </p>

                <Link to={createPageUrl("Subscription")} onClick={(e) => e.stopPropagation()}>
                    <Button className="w-full bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white font-bold py-2 rounded-xl shadow-lg transform transition active:scale-95">
                        {actionLabel}
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default PremiumAccessOverlay;
