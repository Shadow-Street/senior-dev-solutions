
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BookUser, UserPlus, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdvisorCard from '../components/advisors/AdvisorCard';
import { useFeatureAccess } from '../components/hooks/useFeatureAccess';
import { Lock, Crown } from 'lucide-react';
import toast from 'react-hot-toast'; // Assuming react-hot-toast is used for notifications

// Sample advisor data for guest mode or fallback
const sampleAdvisors = [
    {
        id: 'sample-1',
        display_name: 'Growth Guru',
        profile_image_url: 'https://res.cloudinary.com/dtkrz40t9/image/upload/v1714571900/advisors/dummy-advisor-1.webp',
        bio: 'Specializes in identifying high-growth stocks through in-depth fundamental analysis and sector trends. Offers long-term investment strategies.',
        specialization: ['fundamental', 'wealth'],
        rating: 4.7,
        follower_count: 1850,
        fee: 1499,
        status: 'approved',
    },
    {
        id: 'sample-2',
        display_name: 'Market Maverick',
        profile_image_url: 'https://res.cloudinary.com/dtkrz40t9/image/upload/v1714571900/advisors/dummy-advisor-2.webp',
        bio: 'A master of technical charts and price action, providing precise entry and exit points for swing trading and short-term gains.',
        specialization: ['technical', 'intraday'],
        rating: 4.5,
        follower_count: 1620,
        fee: 1299,
        status: 'approved',
    },
    {
        id: 'sample-3',
        display_name: 'Options Oracle',
        profile_image_url: 'https://res.cloudinary.com/dtkrz40t9/image/upload/v1714571900/advisors/dummy-advisor-3.webp',
        bio: 'Expert in options strategies, including hedging, income generation, and directional bets. Focuses on risk-adjusted returns.',
        specialization: ['options'],
        rating: 4.8,
        follower_count: 2100,
        fee: 1699,
        status: 'approved',
    },
    {
        id: 'sample-4',
        display_name: 'Dividend Dynamo',
        profile_image_url: 'https://res.cloudinary.com/dtkrz40t9/image/upload/v1714571900/advisors/dummy-advisor-4.webp',
        bio: 'Helps build a robust portfolio of dividend-paying stocks for consistent passive income and long-term capital appreciation.',
        specialization: ['fundamental', 'wealth', 'mutual'],
        rating: 4.6,
        follower_count: 1400,
        fee: 1199,
        status: 'approved',
    },
    {
        id: 'sample-5',
        display_name: 'Futures Fanatic',
        profile_image_url: 'https://res.cloudinary.com/dtkrz40t9/image/upload/v1714571900/advisors/dummy-advisor-5.webp',
        bio: 'Specializes in futures trading with a focus on commodities and indices. Uses quantitative models for high-probability setups.',
        specialization: ['technical', 'intraday'],
        rating: 4.3,
        follower_count: 1050,
        fee: 1399,
        status: 'approved',
    },
    {
        id: 'sample-6',
        display_name: 'Balanced Investor',
        profile_image_url: 'https://res.cloudinary.com/dtkrz40t9/image/upload/v1714571900/advisors/dummy-advisor-6.webp',
        bio: 'Provides comprehensive financial planning, blending equity, debt, and mutual fund investments to achieve personalized financial goals.',
        specialization: ['wealth', 'mutual', 'fundamental'],
        rating: 4.9,
        follower_count: 2300,
        fee: 1599,
        status: 'approved',
    },
];

export default function Advisors() {
    const [advisors, setAdvisors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [specializationFilter, setSpecializationFilter] = useState('all');
    const [hasSubscription, setHasSubscription] = useState(false);
    const [selectedAdvisor, setSelectedAdvisor] = useState(null);
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);

    const { hasFeatureAccess } = useFeatureAccess('advisor_subscriptions');

    useEffect(() => {
        let isMounted = true;
        let loadingTimeout = null;

        const loadData = async () => {
            await new Promise(resolve => {
                loadingTimeout = setTimeout(resolve, 500);
            });

            if (!isMounted) return;

            setIsLoading(true);
            
            try {
                let user = null;
                try {
                    user = await base44.auth.me().catch((error) => {
                        if (error?.name === 'AbortError' || error?.message?.toLowerCase().includes('abort')) {
                            return null;
                        }
                        throw error;
                    });
                } catch (error) {
                    if (!error?.name?.includes('AbortError') && !error?.message?.toLowerCase().includes('abort')) {
                        console.log('User not authenticated:', error.message);
                    }
                    user = null;
                }
                
                if (!isMounted) return;
                setCurrentUser(user);

                await new Promise(resolve => setTimeout(resolve, 600));
                if (!isMounted) return;

                let loadedAdvisors = [];
                try {
                    loadedAdvisors = await base44.entities.Advisor.filter({ 
                        status: 'approved' 
                    }, '-follower_count', 50).catch((error) => {
                        if (error?.name === 'AbortError' || error?.message?.toLowerCase().includes('abort')) {
                            return [];
                        }
                        throw error;
                    });
                } catch (error) {
                    if (!error?.name?.includes('AbortError') && !error?.message?.toLowerCase().includes('abort')) {
                        console.log('Using sample advisors due to API error:', error.message);
                    }
                    loadedAdvisors = [];
                }

                if (!isMounted) return;

                if (loadedAdvisors.length > 0) {
                    setAdvisors(loadedAdvisors);
                } else {
                    setAdvisors(sampleAdvisors);
                }

                if (user) {
                    if (['admin', 'super_admin'].includes(user.app_role)) {
                        if (isMounted) {
                            setHasSubscription(true);
                        }
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 800));
                        if (!isMounted) return;

                        try {
                            const subs = await base44.entities.Subscription.filter({ 
                                user_id: user.id, 
                                status: 'active' 
                            }).catch((error) => {
                                if (error?.name === 'AbortError' || error?.message?.toLowerCase().includes('abort')) {
                                    return [];
                                }
                                throw error;
                            });
                            
                            if (isMounted) {
                                setHasSubscription(subs.length > 0);
                            }
                        } catch (error) {
                            if (!error?.name?.includes('AbortError') && !error?.message?.toLowerCase().includes('abort')) {
                                console.log("No active subscription for user or subscription check failed:", error.message);
                            }
                            if (isMounted) {
                                setHasSubscription(false);
                            }
                        }
                    }
                } else {
                    if (isMounted) {
                        setHasSubscription(false);
                    }
                }

            } catch (error) {
                if (isMounted && !error?.name?.includes('AbortError') && !error?.message?.toLowerCase().includes('abort')) {
                    console.log("Error during data loading, falling back to guest mode with sample data:", error.message);
                }
                
                if (isMounted) {
                    setAdvisors(sampleAdvisors);
                    setCurrentUser(null);
                    setHasSubscription(false);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
            }
        };
    }, []);

    const filteredAdvisors = advisors.filter(advisor => {
        const matchesSearch = advisor.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             advisor.bio?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesSpecialization = specializationFilter === 'all' ||
                                    advisor.specialization?.some(spec => 
                                        spec.toLowerCase().includes(specializationFilter.toLowerCase())
                                    );
        
        return matchesSearch && matchesSpecialization;
    });

    const handleSubscribe = (advisor) => {
        // ✅ Check feature access before subscribing
        if (!hasFeatureAccess) {
          toast.error('Upgrade to VIP to subscribe to advisors');
          return;
        }
        
        setSelectedAdvisor(advisor);
        setShowSubscribeModal(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                           <BookUser className="w-8 h-8 text-blue-600" />
                           <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                SEBI Registered Advisors
                           </h1>
                        </div>
                        <p className="text-lg text-slate-600">Subscribe to verified professionals for expert stock advice.</p>
                        
                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                            <span>✅ All advisors are SEBI verified</span>
                            <span>•</span>
                            <span>📊 {advisors.length} Expert Advisors</span>
                            <span>•</span>
                            <span>⭐ Rated by subscribers</span>
                        </div>
                    </div>
                    <Link to={createPageUrl("AdvisorRegistration")}>
                        <Button size="lg">
                            <UserPlus className="mr-2 h-5 w-5" />
                            Become an Advisor
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Search advisors by name or expertise..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 search-bar-input"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                            <SelectTrigger className="w-48 rounded-xl">
                                <SelectValue placeholder="Filter by specialization" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">All Specializations</SelectItem>
                                <SelectItem value="technical">Technical Analysis</SelectItem>
                                <SelectItem value="fundamental">Fundamental Analysis</SelectItem>
                                <SelectItem value="intraday">Intraday Trading</SelectItem>
                                <SelectItem value="options">Options Trading</SelectItem>
                                <SelectItem value="wealth">Wealth Management</SelectItem>
                                <SelectItem value="mutual">Mutual Funds</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-[500px] w-full rounded-xl" />)}
                    </div>
                ) : filteredAdvisors.length === 0 ? (
                    <Card className="border-0 shadow-lg rounded-xl">
                        <CardContent className="p-12 text-center">
                            <BookUser className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700">No Advisors Found</h3>
                            <p className="text-slate-500 mt-2">
                                {searchTerm || specializationFilter !== 'all' 
                                    ? "Try adjusting your search or filter criteria." 
                                    : "Check back soon for a list of verified stock advisors."}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredAdvisors.map(advisor => (
                            <AdvisorCard 
                                key={advisor.id} 
                                advisor={advisor} 
                                currentUser={currentUser} 
                                hasSubscription={hasSubscription} 
                                handleSubscribe={handleSubscribe} // Pass the new handler
                            />
                        ))}
                    </div>
                )}

                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 border-0 shadow-lg rounded-xl">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <BookUser className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-blue-800 mb-2">Trust & Verification</h3>
                                <p className="text-sm text-blue-700 leading-relaxed">
                                    All advisors listed here are SEBI registered and verified by our admin team. 
                                    However, investments are subject to market risks. Past performance does not guarantee future results. 
                                    Please consult with qualified financial advisors and make informed decisions based on your risk tolerance.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
