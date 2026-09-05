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
                <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 shadow-inner">
                    <Lock className="w-8 h-8 text-purple-600" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
                    {title}
                    <Crown className="w-5 h-5 text-purple-500 fill-purple-500" />
                </h3>

                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    {message}
                </p>

                <Link to={createPageUrl("Subscription")} onClick={(e) => e.stopPropagation()}>
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-2 rounded-xl shadow-lg transform transition active:scale-95">
                        {actionLabel}
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default PremiumAccessOverlay;
