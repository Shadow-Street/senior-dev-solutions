import { lazy, Suspense } from "react";
import Layout from "./Layout.jsx";


import ProtectedRoute from "@/components/auth/ProtectedRoute";

/**
 * Route-level code splitting.
 *
 * All 55 pages were imported eagerly into one bundle, so opening the login
 * screen downloaded the super-admin panel, the fund-manager suite and every
 * chart library behind them — a single 4MB file before anything could
 * render. Each page is now its own chunk, fetched when its route is first
 * visited. Layout is deliberately left eager: it is the shell every
 * authenticated route draws inside, so splitting it would only add a round
 * trip before the first paint.
 */
const Login = lazy(() => import("./Login"));
const Register = lazy(() => import("./Register"));
const ForgotPassword = lazy(() => import("./ForgotPassword"));
const ResetPassword = lazy(() => import("./ResetPassword"));
const Unauthorized = lazy(() => import("./Unauthorized"));
const Dashboard = lazy(() => import("./Dashboard"));
const ChatRooms = lazy(() => import("./ChatRooms"));
const Subscription = lazy(() => import("./Subscription"));
const Polls = lazy(() => import("./Polls"));
const AdminPanel = lazy(() => import("./AdminPanel"));
const AdminLogin = lazy(() => import("./admin/AdminLogin"));
const SuperAdminDashboard = lazy(() => import("./admin/SuperAdminDashboard"));
const Profile = lazy(() => import("./Profile"));
const Contact = lazy(() => import("./contact"));
const Finfluencers = lazy(() => import("./Finfluencers"));
const InfluencerProfile = lazy(() => import("./InfluencerProfile"));
const AdvisorRegistration = lazy(() => import("./AdvisorRegistration"));
const Advisors = lazy(() => import("./Advisors"));
const AdvisorDashboard = lazy(() => import("./AdvisorDashboard"));
const AdvisorProfile = lazy(() => import("./AdvisorProfile"));
const News = lazy(() => import("./News"));
const SamplePortfolio = lazy(() => import("./SamplePortfolio"));
const Feedback = lazy(() => import("./Feedback"));
const SuperAdmin = lazy(() => import("./SuperAdmin"));
const Educators = lazy(() => import("./Educators"));
const EntityDashboard = lazy(() => import("./EntityDashboard"));
const PledgePool = lazy(() => import("./PledgePool"));
const ApiExecutions = lazy(() => import("./ApiExecutions"));
const AdManagement = lazy(() => import("./AdManagement"));
const VendorDashboard = lazy(() => import("./VendorDashboard"));
const Invoice = lazy(() => import("./Invoice"));
const FundManager = lazy(() => import("./FundManager"));
const InvestorDashboard = lazy(() => import("./InvestorDashboard"));
const FundManager_Plans = lazy(() => import("./FundManager_Plans"));
const FundManager_Investors = lazy(() => import("./FundManager_Investors"));
const FundManager_Transactions = lazy(() => import("./FundManager_Transactions"));
const FundManager_Allocations = lazy(() => import("./FundManager_Allocations"));
const FundManager_Reports = lazy(() => import("./FundManager_Reports"));
const FeatureHub = lazy(() => import("./FeatureHub"));
const MyPortfolio = lazy(() => import("./MyPortfolio"));
const FixSidebarOrder = lazy(() => import("./FixSidebarOrder"));
const SubscriptionTest = lazy(() => import("./SubscriptionTest"));
const Landing = lazy(() => import("./Landing"));
const Blogs = lazy(() => import("./Blogs"));
const BlogArticle = lazy(() => import("./BlogArticle"));
const Terms = lazy(() => import("./Terms"));
const Privacy = lazy(() => import("./Privacy"));
const Cookies = lazy(() => import("./Cookies"));
const RiskDisclosure = lazy(() => import("./RiskDisclosure"));
const ContactSupport = lazy(() => import("./ContactSupport"));
const PMRegistration = lazy(() => import("./PMRegistration"));
const PortfolioManagers = lazy(() => import("./PortfolioManagers"));
const MyPMInvestments = lazy(() => import("./MyPMInvestments"));
const MySubscriptions = lazy(() => import("./MySubscriptions"));

import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    Login,
    Register,
    ForgotPassword,
    ResetPassword,
    Unauthorized,
    Dashboard,
    ChatRooms,
    Subscription,
    Polls,
    AdminPanel,
    AdminLogin,
    SuperAdminDashboard,
    Profile,
    contact: Contact,
    Finfluencers,
    InfluencerProfile,
    AdvisorRegistration,
    Advisors,
    AdvisorDashboard,
    AdvisorProfile,
    News,
    SamplePortfolio,
    Feedback,
    SuperAdmin,
    Educators,
    EntityDashboard,
    PledgePool,
    ApiExecutions,
    AdManagement,
    VendorDashboard,
    Invoice,
    FundManager,
    InvestorDashboard,
    FundManager_Plans,
    FundManager_Investors,
    FundManager_Transactions,
    FundManager_Allocations,
    FundManager_Reports,
    FeatureHub,
    MyPortfolio,
    FixSidebarOrder,
    SubscriptionTest,
    Landing,
    Blogs,
    BlogArticle,
    Terms,
    Privacy,
    Cookies,
    RiskDisclosure,
    ContactSupport,
    PMRegistration,
    PortfolioManagers,
    MyPMInvestments,
    MySubscriptions,
};

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

/**
 * Who may open each privileged area.
 *
 * Sixteen of these routes sat inside the authenticated branch with no role
 * restriction at all, so any signed-in ordinary user could open /AdminPanel
 * and /admin/dashboard and see the full admin chrome. The API refused the
 * data, so nothing leaked, but the interface rendered — which looks like a
 * broken permission model and exposes the shape of the internal tooling.
 *
 * Staff are included in every set deliberately: an administrator supporting a
 * fund manager or vendor needs to reach the same screens.
 */
const STAFF = ["admin", "super_admin", "sub_admin"];
const ROLES = {
  staff: STAFF,
  advisor: ["advisor", ...STAFF],
  fundManager: ["fund_manager", "portfolio_manager", ...STAFF],
  investor: ["investor", ...STAFF],
  vendor: ["vendor", ...STAFF],
  entity: ["entity", "organizer", ...STAFF],
};

/** Shown while a route's chunk is in flight. */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none" />
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

export default function Pages() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    return (
        <Suspense fallback={<RouteFallback />}>
        <Routes>
            {/* Public Routes - No Authentication Required */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/blogArticle" element={<BlogArticle />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/riskDisclosure" element={<RiskDisclosure />} />
            <Route path="/contactSupport" element={<ContactSupport />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Routes - Authentication Required */}
            <Route path="*" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <Suspense fallback={<RouteFallback />}>
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/Dashboard" element={<Dashboard />} />
                            <Route path="/ChatRooms" element={<ChatRooms />} />
                            <Route path="/Subscription" element={<Subscription />} />
                            <Route path="/Polls" element={<Polls />} />
                            <Route
                              path="/AdminPanel"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.staff}>
                                  <AdminPanel />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/admin/dashboard"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.staff}>
                                  <SuperAdminDashboard />
                                </ProtectedRoute>
                              }
                            />
                            <Route path="/Profile" element={<Profile />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/Finfluencers" element={<Finfluencers />} />
                            <Route path="/InfluencerProfile" element={<InfluencerProfile />} />
                            <Route path="/AdvisorRegistration" element={<AdvisorRegistration />} />
                            <Route path="/Advisors" element={<Advisors />} />
                            <Route
                              path="/AdvisorDashboard"
                              element={
                                <ProtectedRoute allowedRoles={["advisor", "admin", "super_admin"]}>
                                  <AdvisorDashboard />
                                </ProtectedRoute>
                              }
                            />
                            <Route path="/AdvisorProfile" element={<AdvisorProfile />} />
                            <Route path="/News" element={<News />} />
                            <Route path="/SamplePortfolio" element={<SamplePortfolio />} />
                            <Route path="/Feedback" element={<Feedback />} />
                            <Route
                              path="/SuperAdmin"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.staff}>
                                  <SuperAdmin />
                                </ProtectedRoute>
                              }
                            />
                            <Route path="/Educators" element={<Educators />} />
                            <Route
                              path="/EntityDashboard"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.entity}>
                                  <EntityDashboard />
                                </ProtectedRoute>
                              }
                            />
                            <Route path="/PledgePool" element={<PledgePool />} />
                            <Route
                              path="/ApiExecutions"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.staff}>
                                  <ApiExecutions />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/AdManagement"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.vendor}>
                                  <AdManagement />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/VendorDashboard"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.vendor}>
                                  <VendorDashboard />
                                </ProtectedRoute>
                              }
                            />
                            <Route path="/Invoice" element={<Invoice />} />
                            <Route
                              path="/FundManager"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.fundManager}>
                                  <FundManager />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/InvestorDashboard"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.investor}>
                                  <InvestorDashboard />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/FundManager_Plans"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.fundManager}>
                                  <FundManager_Plans />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/FundManager_Investors"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.fundManager}>
                                  <FundManager_Investors />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/FundManager_Transactions"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.fundManager}>
                                  <FundManager_Transactions />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/FundManager_Allocations"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.fundManager}>
                                  <FundManager_Allocations />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/FundManager_Reports"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.fundManager}>
                                  <FundManager_Reports />
                                </ProtectedRoute>
                              }
                            />
                            <Route path="/FeatureHub" element={<FeatureHub />} />
                            <Route path="/MyPortfolio" element={<MyPortfolio />} />
                            <Route
                              path="/FixSidebarOrder"
                              element={
                                <ProtectedRoute allowedRoles={ROLES.staff}>
                                  <FixSidebarOrder />
                                </ProtectedRoute>
                              }
                            />
                            <Route path="/SubscriptionTest" element={<SubscriptionTest />} />
                            <Route path="/PMRegistration" element={<PMRegistration />} />
                            <Route path="/PortfolioManagers" element={<PortfolioManagers />} />
                            <Route path="/MyPMInvestments" element={<MyPMInvestments />} />
                            <Route path="/plans-access" element={<MySubscriptions />} />
                            {/* Retired sections and unknown paths fall back to the Dashboard. */}
                            <Route path="*" element={<Navigate to="/Dashboard" replace />} />
                        </Routes>
                        </Suspense>
                    </Layout>
                </ProtectedRoute>
            } />
        </Routes>
        </Suspense>
    );
}