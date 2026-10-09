
import React, { useState, useEffect } from 'react';
import { Advisor, authAPI } from '@/lib/apiClient';
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
import { useSubscription } from '../components/hooks/useSubscription';
import { Lock, Crown } from 'lucide-react';
import toast from 'react-hot-toast'; // Assuming react-hot-toast is used for notifications

export default function Advisors() {
    const [advisors, setAdvisors] = useState([]);
    const [advisorsError, setAdvisorsError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [specializationFilter, setSpecializationFilter] = useState('all');
    const [hasSubscription, setHasSubscription] = useState(false);
    const [selectedAdvisor, setSelectedAdvisor] = useState(null);
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);

    const { hasFeatureAccess } = useFeatureAccess('advisor_subscriptions');
    // The page used to hardcode "no subscription", so a paying subscriber was
    // shown the upgrade gate. Read the real state from the subscription context.
    const subscriptionCtx = useSubscription();

    useEffect(() => {
        let isMounted = true;
        let loadingTimeout = null;

        const loadData = async () => {
            // Wait slightly to simulate loading or ensure mounting if needed
            await new Promise(resolve => {
                loadingTimeout = setTimeout(resolve, 100);
            });

            if (!isMounted) return;

            setIsLoading(true);

            try {
                // `apiClient.auth` was never defined, so this threw on every load and
                // the catch left `user` null — the page treated every visitor, including
                // signed-in subscribers, as anonymous. authAPI.me() returns the user.
                let user = null;
                try {
                    user = await authAPI.me();
                } catch {
                    user = null;   // genuinely not signed in
                }

                if (!isMounted) return;
                setCurrentUser(user);

                // `apiClient.advisors` was never defined, so this call threw on every
                // load, the catch swallowed it, and the page silently rendered six
                // fabricated "SEBI verified" advisors. Use the exported entity API,
                // and surface a real failure instead of inventing professionals: this
                // page tells visitors every advisor shown is SEBI verified.
                let loadedAdvisors = [];
                let loadFailed = false;
                try {
                    loadedAdvisors = await Advisor.filter({ status: 'approved' }, '-follower_count', 50);
                } catch (error) {
                    console.error('Could not load advisors:', error);
                    loadFailed = true;
                }

                if (!isMounted) return;

                setAdvisorsError(loadFailed);
                setAdvisors(Array.isArray(loadedAdvisors) ? loadedAdvisors : []);

                if (user) {
                    if (['admin', 'super_admin'].includes(user.app_role || user.role)) {
                        if (isMounted) {
                            setHasSubscription(true);
                        }
                    } else if (isMounted) {
                        setHasSubscription(Boolean(subscriptionCtx?.isSubscribed));
                    }
                } else {
                    if (isMounted) {
                        setHasSubscription(false);
                    }
                }

            } catch (error) {
                if (isMounted) {
                    console.error("Error during advisor data loading:", error);
                    setAdvisorsError(true);
                    setAdvisors([]);
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
        // The subscription context resolves asynchronously, so the gate has to
        // re-evaluate once it arrives — with an empty array a subscriber kept
        // seeing the upgrade prompt until a manual reload.
    }, [subscriptionCtx?.isSubscribed]);

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
        <div className="w-full bg-background p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <BookUser className="w-8 h-8 text-primary" />
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-protocall-deep to-protocall-blue bg-clip-text text-transparent">
                                SEBI Registered Advisors
                            </h1>
                        </div>
                        <p className="text-lg text-subtle">Subscribe to verified professionals for expert stock advice.</p>

                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
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
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search advisors by name or expertise..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 search-bar-input"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
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
                            <BookUser className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-subtle">
                                {advisorsError ? "Advisors Could Not Be Loaded" : "No Advisors Found"}
                            </h3>
                            <p className="text-muted-foreground mt-2">
                                {advisorsError
                                    ? "We could not reach the advisor directory. Please try again shortly."
                                    : searchTerm || specializationFilter !== 'all'
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

                <Card className="bg-card border-protocall-premium-light border-0 shadow-lg rounded-xl">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-premium-muted rounded-full flex items-center justify-center flex-shrink-0">
                                <BookUser className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-primary mb-2">Trust & Verification</h3>
                                <p className="text-sm text-primary leading-relaxed">
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
