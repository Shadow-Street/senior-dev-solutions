import { QueryClient, useQuery } from '@tanstack/react-query';
import { advisorApi } from '@/lib/advisorApi';
import { withdrawalsApi } from '@/lib/withdrawalsApi';
import { Review } from '@/lib/apiClient';

/**
 * Shared server state for the advisor dashboard. Every section and modal reads
 * the same cache entries, so a mutation only has to invalidate a key instead of
 * passing data and callbacks through props.
 */
export const advisorKeys = {
  me: ['advisor', 'me'],
  plans: ['advisor', 'plans'],
  posts: ['advisor', 'posts'],
  subscribers: ['advisor', 'subscribers'],
  earnings: ['advisor', 'earnings'],
  refunds: ['advisor', 'refunds'],
  summary: ['advisor', 'withdrawal-summary'],
  reviews: ['advisor', 'reviews'],
};

/**
 * The app has no global QueryClientProvider; the advisor portal brings its own
 * (AdvisorDashboard wraps itself in it) so its sections can share cached data.
 */
export const advisorQueryClient = new QueryClient();

const QUERY_DEFAULTS = { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false };

/** The caller's own advisor row ({ advisor } -> row | null). */
export const useMyAdvisor = () =>
  useQuery({ queryKey: advisorKeys.me, queryFn: () => advisorApi.me().then((r) => r.advisor), ...QUERY_DEFAULTS });

export const useMyPlans = (enabled = true) =>
  useQuery({ queryKey: advisorKeys.plans, queryFn: advisorApi.plans, enabled, ...QUERY_DEFAULTS });

export const useMyPosts = (enabled = true) =>
  useQuery({ queryKey: advisorKeys.posts, queryFn: () => advisorApi.posts({ limit: 200 }), enabled, ...QUERY_DEFAULTS });

export const useMySubscribers = (enabled = true) =>
  useQuery({ queryKey: advisorKeys.subscribers, queryFn: () => advisorApi.subscribers({ limit: 200 }), enabled, ...QUERY_DEFAULTS });

export const useWithdrawalSummary = (enabled = true) =>
  useQuery({ queryKey: advisorKeys.summary, queryFn: withdrawalsApi.summary, enabled, ...QUERY_DEFAULTS });

export const useMyReviews = (advisorId, enabled = true) =>
  useQuery({
    queryKey: [...advisorKeys.reviews, advisorId],
    queryFn: () => Review.filter({ entity_type: 'advisor', entity_id: advisorId, status: 'approved' }),
    enabled: enabled && Boolean(advisorId),
    ...QUERY_DEFAULTS,
  });

/** Earnings page of the ledger: { summary, items, total }. */
export const useMyEarnings = (params, enabled = true) =>
  useQuery({
    queryKey: [...advisorKeys.earnings, params],
    queryFn: () => advisorApi.earnings(params),
    enabled,
    keepPreviousData: true,
    ...QUERY_DEFAULTS,
  });

export const useMyRefunds = (enabled = true) =>
  useQuery({ queryKey: advisorKeys.refunds, queryFn: advisorApi.refunds, enabled, ...QUERY_DEFAULTS });
