import { useState, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QueryClientProvider, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ShieldCheck, Users, DollarSign, Star, PlusCircle, TrendingUp, Eye, Edit, FileText,
  CreditCard, Wallet, Landmark, Clock, CheckCircle, Trash2, AlertCircle, BarChart3,
  Globe, Lock, RefreshCw, Pencil, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/components/context/AuthContext';
import { advisorApi } from '@/lib/advisorApi';
import { apiErrorMessage } from '@/lib/withdrawalsApi';
import { createPageUrl } from '@/utils';
import AdvisorLayout from '../components/layouts/AdvisorLayout';
import CreatePostModal from '../components/advisors/CreatePostModal';
import CreatePlanModal from '../components/advisors/CreatePlanModal';
import PostPreviewModal from '../components/advisors/PostPreviewModal';
import PostAnalyticsModal from '../components/advisors/PostAnalyticsModal';
import SubscriberAnalytics from '../components/advisors/SubscriberAnalytics';
import RefundManagementSection from '../components/advisors/RefundManagementSection';
import AdvisorAnalytics from '../components/advisors/AdvisorAnalytics';
import AdvisorProfileEditor from '../components/advisors/AdvisorProfileEditor';
import AdvisorBankAccounts from '../components/advisors/finance/AdvisorBankAccounts';
import AdvisorWithdrawals from '../components/advisors/finance/AdvisorWithdrawals';
import AdvisorEarnings from '../components/advisors/finance/AdvisorEarnings';
import {
  advisorKeys, advisorQueryClient, useMyAdvisor, useMyPlans, useMyPosts,
  useMyReviews, useMySubscribers, useWithdrawalSummary,
} from '../components/advisors/useAdvisorData';

const ADVISOR_TABS = ['overview', 'posts', 'plans', 'subscribers', 'financials', 'analytics'];
const FIN_TABS = [
  ['overview', 'Earnings', DollarSign],
  ['payouts', 'Withdrawals', Wallet],
  ['bank', 'Bank accounts', Landmark],
  ['refunds', 'Refund requests', TrendingUp],
];
const MAX_PLANS = 3;
const STAFF_ROLES = ['admin', 'super_admin', 'sub_admin'];
const INTERVAL_LABEL = { monthly: 'month', quarterly: 'quarter', yearly: 'year' };
const money = (n) => `₹${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? format(new Date(d), 'MMM d, yyyy') : '-');

function renderShell(content) {
  return <AdvisorLayout activePage="advisor-dashboard"><div className="p-8"><div className="max-w-7xl mx-auto">{content}</div></div></AdvisorLayout>;
}

function renderStat(Icon, label, value, tone) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center">
          <Icon className={`w-8 h-8 shrink-0 ${tone}`} />
          <div className="ml-4 min-w-0">
            <p className="text-sm font-medium text-subtle">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function renderQueryError(message, onRetry) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-sell-muted-foreground mx-auto mb-3" />
        <p className="text-subtle mb-4">{message}</p>
        <Button variant="outline" onClick={onRetry}><RefreshCw className="w-4 h-4 mr-2" />Try again</Button>
      </CardContent>
    </Card>
  );
}

function renderSkeletonCards(count, height = 'h-40') {
  return (
    <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
      {Array.from({ length: count }, (_, i) => <div key={i} className={`${height} bg-border rounded`} />)}
    </div>
  );
}

/** Status cards for a signed-in advisor-role user whose profile is not (yet) approved. */
function renderNotApproved(advisor) {
  const views = {
    pending_approval: { Icon: Clock, tone: 'bg-hold-muted text-hold-muted-foreground', title: 'Application under review', body: 'Your SEBI advisor application is being reviewed by our team. You will be notified as soon as a decision is made.' },
    rejected: { Icon: AlertCircle, tone: 'bg-sell-muted text-sell-muted-foreground', title: 'Application not approved', body: 'Unfortunately your advisor application was not approved.' },
    suspended: { Icon: AlertCircle, tone: 'bg-hold-muted text-hold-muted-foreground', title: 'Advisor account suspended', body: 'Your advisor account is suspended. Contact support for more information.' },
  };
  const view = views[advisor.status] || views.pending_approval;
  return renderShell(
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className={`w-20 h-20 rounded-full ${view.tone} flex items-center justify-center mx-auto mb-4`}><view.Icon className="w-10 h-10" /></div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{view.title}</h2>
          <p className="text-subtle mb-4">{view.body}</p>
          {advisor.rejection_reason && <p className="text-sm text-sell-muted-foreground mb-4"><strong>Reason:</strong> {advisor.rejection_reason}</p>}
          <div className="flex gap-3 justify-center">
            <Link to={createPageUrl('AdvisorRegistration')}><Button>{advisor.status === 'rejected' ? 'Update and re-apply' : 'View application'}</Button></Link>
            <Link to={createPageUrl('Dashboard')}><Button variant="outline">Back to dashboard</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdvisorDashboardContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('section') || searchParams.get('tab');
  const activeTab = ADVISOR_TABS.includes(requestedTab) ? requestedTab : 'overview';
  const requestedFin = searchParams.get('fin');
  const finTab = FIN_TABS.some(([key]) => key === requestedFin) ? requestedFin : 'overview';

  // Several keys can change in one navigation (functional search-param updates
  // are not queued, so two successive calls would drop the first).
  const setParams = useCallback((changes) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(changes).forEach(([key, value]) => next.set(key, value));
      if (changes.section) {
        next.delete('tab');
        if (changes.section !== 'financials' && !changes.fin) next.delete('fin');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const setParam = useCallback((key, value) => setParams({ [key]: value }), [setParams]);

  // The cache is module-level; never let one advisor's data outlive their session.
  useEffect(() => () => advisorQueryClient.clear(), [user?.id]);

  const [postModal, setPostModal] = useState({ open: false, post: null });
  const [planModal, setPlanModal] = useState({ open: false, plan: null });
  const [previewPost, setPreviewPost] = useState(null);
  const [reachPost, setReachPost] = useState(null);
  const [deletePost, setDeletePost] = useState(null);
  const [deletePlan, setDeletePlan] = useState(null);

  const isStaff = STAFF_ROLES.includes(user?.app_role || user?.role);
  const meQuery = useMyAdvisor();
  const advisor = meQuery.data;
  const approved = advisor?.status === 'approved' && !isStaff;
  const plansQuery = useMyPlans(approved);
  const postsQuery = useMyPosts(approved);
  const subsQuery = useMySubscribers(approved);
  const summaryQuery = useWithdrawalSummary(approved);
  const reviewsQuery = useMyReviews(advisor?.id, approved);

  const plans = plansQuery.data || [];
  const posts = postsQuery.data || [];
  const subscribers = subsQuery.data || [];
  const activeSubs = subscribers.filter((s) => s.status === 'active');
  const reviews = reviewsQuery.data || [];
  const avgRating = reviews.length ? Math.round((reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length) * 10) / 10 : 0;
  const available = Number(summaryQuery.data?.available || 0);

  const invalidate = (...keys) => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));

  const savePost = useMutation({
    mutationFn: ({ id, payload }) => (id ? advisorApi.updatePost(id, payload) : advisorApi.createPost(payload)),
    onSuccess: (saved, { id, payload }) => {
      invalidate(advisorKeys.posts);
      setPostModal({ open: false, post: null });
      if (payload.status === 'draft') toast.success('Draft saved.');
      else if (saved?.notified_subscribers > 0) toast.success(`Published. ${saved.notified_subscribers} subscriber${saved.notified_subscribers === 1 ? '' : 's'} notified.`);
      else toast.success(id ? 'Advisory updated.' : 'Advisory published.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not save the advisory.')),
  });

  const removePost = useMutation({
    mutationFn: (id) => advisorApi.deletePost(id),
    onSuccess: () => { invalidate(advisorKeys.posts); toast.success('Advisory deleted.'); },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not delete the advisory.')),
    onSettled: () => setDeletePost(null),
  });

  const savePlan = useMutation({
    mutationFn: ({ id, payload }) => (id ? advisorApi.updatePlan(id, payload) : advisorApi.createPlan(payload)),
    onSuccess: (_saved, { id }) => {
      invalidate(advisorKeys.plans);
      setPlanModal({ open: false, plan: null });
      toast.success(id ? 'Plan updated.' : 'Plan created.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not save the plan.')),
  });

  const togglePlan = useMutation({
    mutationFn: (plan) => advisorApi.updatePlan(plan.id, { is_active: !plan.is_active }),
    onSuccess: (_s, plan) => { invalidate(advisorKeys.plans); toast.success(plan.is_active ? 'Plan deactivated. New subscribers can no longer buy it.' : 'Plan activated.'); },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not update the plan.')),
  });

  const removePlan = useMutation({
    mutationFn: (id) => advisorApi.deletePlan(id),
    onSuccess: () => { invalidate(advisorKeys.plans); toast.success('Plan deleted.'); },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not delete the plan.')),
    onSettled: () => setDeletePlan(null),
  });

  const submitPost = (payload) => savePost.mutateAsync({ id: postModal.post?.id, payload });
  const submitPlan = (payload, id) => savePlan.mutateAsync({ id, payload });
  const openProfileEditor = () => setParam('edit', 'profile');

  // ---- gates ---------------------------------------------------------------
  if (meQuery.isLoading) {
    return renderShell(
      <div className="animate-pulse" aria-busy="true">
        <div className="h-8 bg-border rounded w-1/3 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-border rounded" />)}</div>
      </div>
    );
  }
  if (meQuery.isError) {
    return renderShell(renderQueryError('We could not load your advisor profile.', () => meQuery.refetch()));
  }
  if (isStaff) {
    return renderShell(
      <Card className="max-w-xl mx-auto">
        <CardContent className="p-8 text-center">
          <ShieldCheck className="w-14 h-14 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Staff view</h2>
          <p className="text-subtle mb-6">Advisor tools belong to approved advisors. Review applications, plans and payouts from the admin console.</p>
          <Link to="/admin/dashboard"><Button>Open the admin console</Button></Link>
        </CardContent>
      </Card>
    );
  }
  if (!advisor) {
    return renderShell(
      <Card className="max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Advisor registration required</h2>
          <p className="text-subtle mb-6">Apply as a SEBI registered advisor to unlock this dashboard.</p>
          <Link to={createPageUrl('AdvisorRegistration')}><Button>Apply now</Button></Link>
        </CardContent>
      </Card>
    );
  }
  if (advisor.status !== 'approved') return renderNotApproved(advisor);

  // ---- section renderers ---------------------------------------------------
  const statValue = (query, value) => (query.isLoading ? '...' : query.isError ? 'N/A' : value);
  const anyStatError = [subsQuery, summaryQuery, reviewsQuery].some((q) => q.isError);

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button type="button" onClick={openProfileEditor} className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Change profile photo">
            {advisor.profile_image_url ? (
              <img src={advisor.profile_image_url} alt={advisor.display_name} className="w-20 h-20 rounded-full object-cover border-4 border-protocall-premium-light shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold border-4 border-protocall-premium-light shadow-lg">
                {advisor.display_name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
            )}
            <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-semibold">Change</span>
          </button>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Welcome back, {advisor.display_name}!</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-buy-muted text-buy-muted-foreground border-0">SEBI registered</Badge>
              <span className="text-sm text-muted-foreground">#{advisor.sebi_registration_number}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={createPageUrl(`AdvisorProfile?id=${advisor.id}`)}>
            <Button variant="outline"><ExternalLink className="w-4 h-4 mr-2" />View public profile</Button>
          </Link>
          <Button variant="outline" onClick={openProfileEditor}><Pencil className="w-4 h-4 mr-2" />Edit profile</Button>
          <Button onClick={() => setPostModal({ open: true, post: null })}><PlusCircle className="w-4 h-4 mr-2" />Create advisory</Button>
        </div>
      </div>

      {anyStatError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-hold/30 bg-hold-muted p-3 text-sm text-hold-muted-foreground">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />Some figures could not be loaded.</span>
          <Button size="sm" variant="outline" onClick={() => [subsQuery, summaryQuery, reviewsQuery].forEach((q) => q.isError && q.refetch())}>Retry</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {renderStat(Users, 'Active subscribers', statValue(subsQuery, activeSubs.length), 'text-primary')}
        {renderStat(CreditCard, 'Total subscribers', statValue(subsQuery, subscribers.length), 'text-buy-muted-foreground')}
        {renderStat(DollarSign, 'Approved earnings', statValue(summaryQuery, money(summaryQuery.data?.earned)), 'text-protocall-premium-text')}
        {renderStat(Wallet, 'Available balance', statValue(summaryQuery, money(available)), 'text-buy-muted-foreground')}
        {renderStat(Star, 'Avg rating', statValue(reviewsQuery, reviews.length ? `${avgRating}/5` : 'No reviews'), 'text-hold-muted-foreground')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>At a glance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><FileText className="w-8 h-8 text-primary" /><div><p className="font-semibold text-foreground">Published advisories</p><p className="text-sm text-muted-foreground">{posts.filter((p) => p.status !== 'published').length} draft{posts.filter((p) => p.status !== 'published').length === 1 ? '' : 's'}</p></div></div>
              <p className="text-2xl font-bold text-foreground">{statValue(postsQuery, posts.filter((p) => p.status === 'published').length)}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><CreditCard className="w-8 h-8 text-buy-muted-foreground" /><div><p className="font-semibold text-foreground">Active plans</p><p className="text-sm text-muted-foreground">of {MAX_PLANS} allowed</p></div></div>
              <p className="text-2xl font-bold text-foreground">{statValue(plansQuery, plans.filter((p) => p.is_active).length)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => setPostModal({ open: true, post: null })} className="w-full justify-start" variant="outline"><PlusCircle className="w-4 h-4 mr-2" />Create new advisory</Button>
            <Button onClick={() => setPlanModal({ open: true, plan: null })} className="w-full justify-start" variant="outline" disabled={plans.length >= MAX_PLANS}><CreditCard className="w-4 h-4 mr-2" />{plans.length >= MAX_PLANS ? 'Plan limit reached' : 'Create a plan'}</Button>
            <Button onClick={() => setParams({ section: 'financials', fin: 'payouts' })} className="w-full justify-start" variant="outline" disabled={available <= 0}><Wallet className="w-4 h-4 mr-2" />Request payout</Button>
            <Button onClick={() => setParam('section', 'analytics')} className="w-full justify-start" variant="outline"><TrendingUp className="w-4 h-4 mr-2" />View analytics</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPostCard = (post) => (
    <Card key={post.id} className="hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {post.recommendation_type && (
            <Badge variant="outline" className={`font-semibold uppercase ${post.recommendation_type === 'buy' ? 'text-buy-muted-foreground border-buy bg-buy-muted' : post.recommendation_type === 'sell' ? 'text-sell-muted-foreground border-sell bg-sell-muted' : 'text-hold-muted-foreground border-hold bg-hold-muted'}`}>
              {post.recommendation_type}
            </Badge>
          )}
          <Badge className={post.status === 'published' ? 'bg-buy-muted text-buy-muted-foreground border-0' : 'bg-surface-2 text-subtle border-0'}>{post.status === 'published' ? 'Published' : 'Draft'}</Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            {post.visibility === 'public' ? <><Globe className="w-3 h-3" />Public</> : <><Lock className="w-3 h-3" />{plans.find((p) => p.id === post.required_plan_id)?.name ? `${plans.find((p) => p.id === post.required_plan_id).name}+` : 'Subscribers'}</>}
          </Badge>
        </div>
        <h3 className="font-bold text-lg text-foreground line-clamp-2">{post.title || 'Untitled advisory'}</h3>
        {post.stock_symbol && <p className="text-xl font-bold text-primary">{post.stock_symbol}</p>}
        {(post.target_price || post.stop_loss) && (
          <div className="grid grid-cols-2 gap-3">
            {post.target_price && <div className="bg-buy-muted rounded-lg p-3"><p className="text-xs text-subtle">Target</p><p className="text-lg font-bold text-buy-muted-foreground">₹{Number(post.target_price)}</p></div>}
            {post.stop_loss && <div className="bg-sell-muted rounded-lg p-3"><p className="text-xs text-subtle">Stop loss</p><p className="text-lg font-bold text-sell-muted-foreground">₹{Number(post.stop_loss)}</p></div>}
          </div>
        )}
        <p className="text-sm text-subtle line-clamp-3">{post.content}</p>
        <div className="grid grid-cols-2 gap-2 pt-3 border-t">
          <Button size="sm" variant="outline" onClick={() => setPreviewPost(post)}><Eye className="w-3 h-3 mr-1" />Preview</Button>
          <Button size="sm" variant="outline" onClick={() => setReachPost(post)}><BarChart3 className="w-3 h-3 mr-1" />Reach</Button>
          <Button size="sm" variant="outline" onClick={() => setPostModal({ open: true, post })}><Edit className="w-3 h-3 mr-1" />Edit</Button>
          <Button size="sm" variant="outline" className="text-sell-muted-foreground hover:text-sell-muted-foreground" onClick={() => setDeletePost(post)}><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
        </div>
        <p className="text-xs text-muted-foreground">{fmtDate(post.created_at)}</p>
      </CardContent>
    </Card>
  );

  const renderPosts = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-foreground">My posts</h2>
        <Button onClick={() => setPostModal({ open: true, post: null })}><PlusCircle className="w-4 h-4 mr-2" />Create advisory</Button>
      </div>
      {postsQuery.isLoading ? renderSkeletonCards(3)
        : postsQuery.isError ? renderQueryError('We could not load your posts.', () => postsQuery.refetch())
          : posts.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-subtle">No advisories yet.</p>
              <Button onClick={() => setPostModal({ open: true, post: null })} className="mt-4">Create your first advisory</Button>
            </CardContent></Card>
          ) : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{posts.map(renderPostCard)}</div>}
    </div>
  );

  const renderPlanCard = (plan) => {
    const planSubs = activeSubs.filter((s) => s.plan_id === plan.id).length;
    return (
      <Card key={plan.id} className={`relative overflow-hidden hover:shadow-2xl transition-all duration-300 ${plan.is_active ? 'border-2 border-protocall-premium-light' : 'border-2 border-border opacity-75'}`}>
        <div className="p-6 text-center bg-primary text-primary-foreground">
          <div className="flex justify-between items-start mb-3">
            <Badge className="bg-white/90 text-subtle border-0">{plan.is_active ? 'Active' : 'Inactive'}</Badge>
            {planSubs > 0 && <Badge className="bg-white/90 text-primary border-0">{planSubs} subscriber{planSubs > 1 ? 's' : ''}</Badge>}
          </div>
          <h3 className="text-2xl font-bold mb-3 tracking-wide">{plan.name}</h3>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">{money(plan.price)}</span>
            <span className="text-sm font-medium opacity-90">/ {INTERVAL_LABEL[plan.billing_interval] || 'month'}</span>
          </div>
        </div>
        <CardContent className="p-6">
          {plan.description && <p className="text-sm text-subtle mb-4 text-center leading-relaxed">{plan.description}</p>}
          {Array.isArray(plan.features) && plan.features.length > 0 && (
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-subtle"><CheckCircle className="w-4 h-4 text-buy-muted-foreground shrink-0 mt-0.5" /><span>{feature}</span></li>
              ))}
            </ul>
          )}
          <div className="space-y-2 pt-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => togglePlan.mutate(plan)} disabled={togglePlan.isPending}>{plan.is_active ? 'Deactivate' : 'Activate'}</Button>
              <Button size="sm" variant="outline" onClick={() => setPlanModal({ open: true, plan })}><Edit className="w-3 h-3 mr-1" />Edit</Button>
            </div>
            <Button size="sm" variant="outline" className="w-full text-sell-muted-foreground hover:text-sell-muted-foreground" onClick={() => setDeletePlan(plan)} disabled={planSubs > 0} title={planSubs > 0 ? 'Deactivate instead: this plan has active subscribers' : undefined}>
              <Trash2 className="w-3 h-3 mr-1" />Delete plan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPlans = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Subscription plans</h2>
          <p className="text-sm text-subtle mt-1">{plans.length} of {MAX_PLANS} plans created</p>
        </div>
        {plans.length < MAX_PLANS ? (
          <Button onClick={() => setPlanModal({ open: true, plan: null })}><PlusCircle className="w-4 h-4 mr-2" />Create plan</Button>
        ) : (
          <Badge className="bg-hold-muted text-hold-muted-foreground border-0">Maximum plans reached</Badge>
        )}
      </div>
      {plansQuery.isLoading ? renderSkeletonCards(3, 'h-72')
        : plansQuery.isError ? renderQueryError('We could not load your plans.', () => plansQuery.refetch())
          : plans.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-subtle">You have no plans yet. Investors cannot subscribe until you create one.</p>
              <Button onClick={() => setPlanModal({ open: true, plan: null })} className="mt-4">Create your first plan</Button>
            </CardContent></Card>
          ) : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{plans.map(renderPlanCard)}</div>}
    </div>
  );

  const renderFinancials = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 w-full" role="tablist" aria-label="Financial sections">
        {FIN_TABS.map(([key, label, Icon]) => (
          <Button
            key={key}
            role="tab"
            aria-selected={finTab === key}
            variant={finTab === key ? 'default' : 'outline'}
            onClick={() => setParam('fin', key)}
            className="flex-1 min-w-[10rem] rounded-full"
          >
            <Icon className="w-4 h-4 mr-2" />{label}
          </Button>
        ))}
      </div>
      {finTab === 'overview' && <AdvisorEarnings />}
      {finTab === 'payouts' && <AdvisorWithdrawals />}
      {finTab === 'bank' && <AdvisorBankAccounts />}
      {finTab === 'refunds' && (<div className="space-y-4"><h2 className="text-2xl font-bold text-foreground">Refund requests</h2><RefundManagementSection /></div>)}
    </div>
  );

  const deletingPlanSubs = deletePlan ? activeSubs.filter((s) => s.plan_id === deletePlan.id).length : 0;

  return renderShell(
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={(tab) => setParam('section', tab)} className="w-full">
        <TabsContent value="overview" className="mt-0">{renderOverview()}</TabsContent>
        <TabsContent value="posts" className="mt-0">{renderPosts()}</TabsContent>
        <TabsContent value="plans" className="mt-0">{renderPlans()}</TabsContent>
        <TabsContent value="subscribers" className="space-y-4 mt-0">
          <h2 className="text-2xl font-bold text-foreground mb-2">Subscribers</h2>
          <SubscriberAnalytics />
        </TabsContent>
        <TabsContent value="financials" className="mt-0">{renderFinancials()}</TabsContent>
        <TabsContent value="analytics" className="mt-0">
          <h2 className="text-2xl font-bold text-foreground mb-6">Analytics</h2>
          <AdvisorAnalytics />
        </TabsContent>
      </Tabs>

      <CreatePostModal open={postModal.open} onClose={() => setPostModal({ open: false, post: null })} onSubmit={submitPost} editingPost={postModal.post} />
      <CreatePlanModal open={planModal.open} onClose={() => setPlanModal({ open: false, plan: null })} onSubmit={submitPlan} editingPlan={planModal.plan} />
      {previewPost && <PostPreviewModal open onClose={() => setPreviewPost(null)} post={previewPost} advisor={advisor} />}
      {reachPost && <PostAnalyticsModal open onClose={() => setReachPost(null)} post={reachPost} />}
      <AdvisorProfileEditor />

      <AlertDialog open={Boolean(deletePost)} onOpenChange={(open) => { if (!open) setDeletePost(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this advisory?</AlertDialogTitle>
            <AlertDialogDescription>"{deletePost?.title}" will be removed for you and your subscribers. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removePost.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-sell hover:bg-sell" disabled={removePost.isPending} onClick={(e) => { e.preventDefault(); removePost.mutate(deletePost.id); }}>
              {removePost.isPending ? 'Deleting...' : 'Delete advisory'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deletePlan)} onOpenChange={(open) => { if (!open) setDeletePlan(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subscription plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPlanSubs > 0
                ? `"${deletePlan?.name}" has ${deletingPlanSubs} active subscriber${deletingPlanSubs > 1 ? 's' : ''}. Deactivate it instead.`
                : `"${deletePlan?.name}" (${money(deletePlan?.price)}) will be permanently removed. Past payments and earnings are kept.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removePlan.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-sell hover:bg-sell" disabled={removePlan.isPending || deletingPlanSubs > 0} onClick={(e) => { e.preventDefault(); removePlan.mutate(deletePlan.id); }}>
              {removePlan.isPending ? 'Deleting...' : 'Delete plan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** The portal brings its own QueryClient: the app has no global provider. */
export default function AdvisorDashboard() {
  return (
    <QueryClientProvider client={advisorQueryClient}>
      <AdvisorDashboardContent />
    </QueryClientProvider>
  );
}
