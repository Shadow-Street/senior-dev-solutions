import { useState, useEffect, useCallback } from 'react';
import { AdvisorSubscription } from '@/lib/apiClient';
import { advisorApi } from '@/lib/advisorApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BookUser, UserPlus, Search, Filter, LayoutDashboard, Clock, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdvisorCard from '../components/advisors/AdvisorCard';
import { useAuth } from '@/components/context/AuthContext';

const useDebounced = (value, ms = 300) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return debounced;
};

export default function Advisors() {
    const { user: currentUser } = useAuth();
    const [advisors, setAdvisors] = useState([]);
    const [advisorsError, setAdvisorsError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [specializationFilter, setSpecializationFilter] = useState('all');
    const [mySubscriptions, setMySubscriptions] = useState([]);
    const [myApplication, setMyApplication] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const q = useDebounced(searchTerm.trim());

    const myRole = currentUser?.app_role || currentUser?.role;
    const isAdvisor = myRole === 'advisor';

    // The directory is searched and filtered by the server (approved advisors
    // only), so pagination and counts stay honest as the directory grows.
    useEffect(() => {
        let alive = true;
        setIsLoading(true);
        setAdvisorsError(false);
        advisorApi.directory({
            limit: 50,
            sort: '-follower_count',
            ...(q ? { q } : {}),
            ...(specializationFilter !== 'all' ? { specialization: specializationFilter } : {}),
        })
            .then((rows) => { if (alive) setAdvisors(Array.isArray(rows) ? rows : []); })
            .catch((error) => {
                console.error('Could not load advisors:', error);
                if (alive) { setAdvisors([]); setAdvisorsError(true); }
            })
            .finally(() => { if (alive) setIsLoading(false); });
        return () => { alive = false; };
    }, [q, specializationFilter, reloadKey]);

    // Who the viewer is in the advisor journey: advisor, applicant, or neither.
    useEffect(() => {
        if (!currentUser?.id) { setMySubscriptions([]); setMyApplication(null); return undefined; }
        let alive = true;
        AdvisorSubscription.filter({ user_id: currentUser.id, status: 'active' })
            .then((rows) => { if (alive) setMySubscriptions(Array.isArray(rows) ? rows : []); })
            .catch(() => { if (alive) setMySubscriptions([]); });
        advisorApi.me()
            .then((res) => { if (alive) setMyApplication(res?.advisor || null); })
            .catch(() => { if (alive) setMyApplication(null); });
        return () => { alive = false; };
    }, [currentUser?.id]);

    const renderAdvisorEntry = () => {
        if (isAdvisor) {
            return (
                <Link to={createPageUrl('AdvisorDashboard')}>
                    <Button size="lg">
                        <LayoutDashboard className="mr-2 h-5 w-5" />
                        Go to my dashboard
                    </Button>
                </Link>
            );
        }
        if (myApplication) {
            return (
                <Link to={createPageUrl('AdvisorRegistration')}>
                    <Button size="lg" variant="outline">
                        <Clock className="mr-2 h-5 w-5" />
                        My advisor application
                    </Button>
                </Link>
            );
        }
        return (
            <Link to={createPageUrl('AdvisorRegistration')}>
                <Button size="lg">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Become an Advisor
                </Button>
            </Link>
        );
    };

    const filtersActive = Boolean(q) || specializationFilter !== 'all';
    const retry = useCallback(() => setReloadKey((k) => k + 1), []);

    return (
        <div className="w-full bg-background p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <BookUser className="w-8 h-8 text-primary" />
                            <h1 className="text-4xl font-bold text-primary">
                                SEBI Registered Advisors
                            </h1>
                        </div>
                        <p className="text-lg text-subtle">Subscribe to verified professionals for expert stock advice.</p>

                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span>All advisors are reviewed and SEBI verified</span>
                            {!isLoading && !advisorsError && (<><span>•</span><span>{advisors.length} {advisors.length === 1 ? 'advisor' : 'advisors'}{filtersActive ? ' match' : ''}</span></>)}
                        </div>
                    </div>
                    {renderAdvisorEntry()}
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search advisors by name or expertise..."
                            aria-label="Search advisors"
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
                ) : advisors.length === 0 ? (
                    <Card className="border-0 shadow-lg rounded-xl">
                        <CardContent className="p-12 text-center">
                            <BookUser className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-subtle">
                                {advisorsError ? 'Advisors could not be loaded' : 'No advisors found'}
                            </h3>
                            <p className="text-muted-foreground mt-2">
                                {advisorsError
                                    ? 'We could not reach the advisor directory. Please try again.'
                                    : filtersActive
                                        ? 'Try adjusting your search or filter criteria.'
                                        : 'Check back soon for a list of verified stock advisors.'}
                            </p>
                            {advisorsError && (
                                <Button className="mt-4" variant="outline" onClick={retry}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Try again
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {advisors.map((advisor) => (
                            <AdvisorCard key={advisor.id} advisor={advisor} userSubscriptions={mySubscriptions} />
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
