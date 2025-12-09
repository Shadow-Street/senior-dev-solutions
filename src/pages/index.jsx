import Layout from "./Layout.jsx";

import Login from "./Login";

import Register from "./Register";

import ForgotPassword from "./ForgotPassword";

import ResetPassword from "./ResetPassword";

import Unauthorized from "./Unauthorized";

import Dashboard from "./Dashboard";

import ChatRooms from "./ChatRooms";

import Subscription from "./Subscription";

import Polls from "./Polls";

import Events from "./Events";

import AdminPanel from "./AdminPanel";

import Profile from "./Profile";

import contact from "./contact";

import Finfluencers from "./Finfluencers";

import InfluencerProfile from "./InfluencerProfile";

import AdvisorRegistration from "./AdvisorRegistration";

import Advisors from "./Advisors";

import AdvisorProfile from "./AdvisorProfile";

import News from "./News";

import SamplePortfolio from "./SamplePortfolio";

import Feedback from "./Feedback";

import SuperAdmin from "./SuperAdmin";

import Educators from "./Educators";

import EntityDashboard from "./EntityDashboard";

import FinfluencerDashboard from "./FinfluencerDashboard";

import AdvisorDashboard from "./AdvisorDashboard";

import EventsManagement from "./EventsManagement";

import PledgePool from "./PledgePool";

import ApiExecutions from "./ApiExecutions";

import AdManagement from "./AdManagement";

import VendorDashboard from "./VendorDashboard";

import Invoice from "./Invoice";

import FundManager from "./FundManager";

import InvestorDashboard from "./InvestorDashboard";

import FundManager_Plans from "./FundManager_Plans";

import FundManager_Investors from "./FundManager_Investors";

import FundManager_Transactions from "./FundManager_Transactions";

import FundManager_Allocations from "./FundManager_Allocations";

import FundManager_Reports from "./FundManager_Reports";

import FeatureHub from "./FeatureHub";

import MyPortfolio from "./MyPortfolio";

import BecomeOrganizer from "./BecomeOrganizer";

import OrganizerDashboard from "./OrganizerDashboard";

import MyEvents from "./MyEvents";

import FixSidebarOrder from "./FixSidebarOrder";

import SubscriptionTest from "./SubscriptionTest";

import Landing from "./Landing";

import Blogs from "./Blogs";

import BlogArticle from "./BlogArticle";

import Terms from "./Terms";

import Privacy from "./Privacy";

import Cookies from "./Cookies";

import RiskDisclosure from "./RiskDisclosure";

import ContactSupport from "./ContactSupport";

import AdvisorPledgeManagement from "./AdvisorPledgeManagement";

import PortfolioManagerDashboard from "./PortfolioManagerDashboard";

import PMRegistration from "./PMRegistration";

import PortfolioManagers from "./PortfolioManagers";

import MyPMInvestments from "./MyPMInvestments";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Login: Login,
    
    Register: Register,
    
    ForgotPassword: ForgotPassword,
    
    ResetPassword: ResetPassword,
    
    Unauthorized: Unauthorized,
    
    Register: Register,
    
    Dashboard: Dashboard,
    
    ChatRooms: ChatRooms,
    
    Subscription: Subscription,
    
    Polls: Polls,
    
    Events: Events,
    
    AdminPanel: AdminPanel,
    
    Profile: Profile,
    
    contact: contact,
    
    Finfluencers: Finfluencers,
    
    InfluencerProfile: InfluencerProfile,
    
    AdvisorRegistration: AdvisorRegistration,
    
    Advisors: Advisors,
    
    AdvisorProfile: AdvisorProfile,
    
    News: News,
    
    SamplePortfolio: SamplePortfolio,
    
    Feedback: Feedback,
    
    SuperAdmin: SuperAdmin,
    
    Educators: Educators,
    
    EntityDashboard: EntityDashboard,
    
    FinfluencerDashboard: FinfluencerDashboard,
    
    AdvisorDashboard: AdvisorDashboard,
    
    EventsManagement: EventsManagement,
    
    PledgePool: PledgePool,
    
    ApiExecutions: ApiExecutions,
    
    AdManagement: AdManagement,
    
    VendorDashboard: VendorDashboard,
    
    Invoice: Invoice,
    
    FundManager: FundManager,
    
    InvestorDashboard: InvestorDashboard,
    
    FundManager_Plans: FundManager_Plans,
    
    FundManager_Investors: FundManager_Investors,
    
    FundManager_Transactions: FundManager_Transactions,
    
    FundManager_Allocations: FundManager_Allocations,
    
    FundManager_Reports: FundManager_Reports,
    
    FeatureHub: FeatureHub,
    
    MyPortfolio: MyPortfolio,
    
    BecomeOrganizer: BecomeOrganizer,
    
    OrganizerDashboard: OrganizerDashboard,
    
    MyEvents: MyEvents,
    
    FixSidebarOrder: FixSidebarOrder,
    
    SubscriptionTest: SubscriptionTest,
    
    Landing: Landing,
    
    Blogs: Blogs,
    
    BlogArticle: BlogArticle,
    
    Terms: Terms,
    
    Privacy: Privacy,
    
    Cookies: Cookies,
    
    RiskDisclosure: RiskDisclosure,
    
    ContactSupport: ContactSupport,
    
    AdvisorPledgeManagement: AdvisorPledgeManagement,
    
    PortfolioManagerDashboard: PortfolioManagerDashboard,
    
    PMRegistration: PMRegistration,
    
    PortfolioManagers: PortfolioManagers,
    
    MyPMInvestments: MyPMInvestments,
    
}

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

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
        <Routes>            
                
                    <Route path="/" element={<Login />} />
                
                <Route path="/login" element={<Login />} />
                
                <Route path="/register" element={<Register />} />
                
                <Route path="/forgot-password" element={<ForgotPassword />} />
                
                <Route path="/reset-password" element={<ResetPassword />} />
                
                <Route path="/unauthorized" element={<Unauthorized />} />
                
                <Route path="/Dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                
                <Route path="/ChatRooms" element={<ChatRooms />} />
                
                <Route path="/Subscription" element={<Subscription />} />
                
                <Route path="/Polls" element={<Polls />} />
                
                <Route path="/Events" element={<Events />} />
                
                <Route path="/AdminPanel" element={<AdminPanel />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/contact" element={<contact />} />
                
                <Route path="/Finfluencers" element={<Finfluencers />} />
                
                <Route path="/InfluencerProfile" element={<InfluencerProfile />} />
                
                <Route path="/AdvisorRegistration" element={<AdvisorRegistration />} />
                
                <Route path="/Advisors" element={<Advisors />} />
                
                <Route path="/AdvisorProfile" element={<AdvisorProfile />} />
                
                <Route path="/News" element={<News />} />
                
                <Route path="/SamplePortfolio" element={<SamplePortfolio />} />
                
                <Route path="/Feedback" element={<Feedback />} />
                
                <Route path="/SuperAdmin" element={<SuperAdmin />} />
                
                <Route path="/Educators" element={<Educators />} />
                
                <Route path="/EntityDashboard" element={<EntityDashboard />} />
                
                <Route path="/FinfluencerDashboard" element={<FinfluencerDashboard />} />
                
                <Route path="/AdvisorDashboard" element={<AdvisorDashboard />} />
                
                <Route path="/EventsManagement" element={<EventsManagement />} />
                
                <Route path="/PledgePool" element={<PledgePool />} />
                
                <Route path="/ApiExecutions" element={<ApiExecutions />} />
                
                <Route path="/AdManagement" element={<AdManagement />} />
                
                <Route path="/VendorDashboard" element={<VendorDashboard />} />
                
                <Route path="/Invoice" element={<Invoice />} />
                
                <Route path="/FundManager" element={<FundManager />} />
                
                <Route path="/InvestorDashboard" element={<InvestorDashboard />} />
                
                <Route path="/FundManager_Plans" element={<FundManager_Plans />} />
                
                <Route path="/FundManager_Investors" element={<FundManager_Investors />} />
                
                <Route path="/FundManager_Transactions" element={<FundManager_Transactions />} />
                
                <Route path="/FundManager_Allocations" element={<FundManager_Allocations />} />
                
                <Route path="/FundManager_Reports" element={<FundManager_Reports />} />
                
                <Route path="/FeatureHub" element={<FeatureHub />} />
                
                <Route path="/MyPortfolio" element={<MyPortfolio />} />
                
                <Route path="/BecomeOrganizer" element={<BecomeOrganizer />} />
                
                <Route path="/OrganizerDashboard" element={<OrganizerDashboard />} />
                
                <Route path="/MyEvents" element={<MyEvents />} />
                
                <Route path="/FixSidebarOrder" element={<FixSidebarOrder />} />
                
                <Route path="/SubscriptionTest" element={<SubscriptionTest />} />
                
                <Route path="/Landing" element={<Landing />} />
                
                <Route path="/Blogs" element={<Blogs />} />
                
                <Route path="/BlogArticle" element={<BlogArticle />} />
                
                <Route path="/Terms" element={<Terms />} />
                
                <Route path="/Privacy" element={<Privacy />} />
                
                <Route path="/Cookies" element={<Cookies />} />
                
                <Route path="/RiskDisclosure" element={<RiskDisclosure />} />
                
                <Route path="/ContactSupport" element={<ContactSupport />} />
                
                <Route path="/AdvisorPledgeManagement" element={<AdvisorPledgeManagement />} />
                
                <Route path="/PortfolioManagerDashboard" element={<PortfolioManagerDashboard />} />
                
                <Route path="/PMRegistration" element={<PMRegistration />} />
                
                <Route path="/PortfolioManagers" element={<PortfolioManagers />} />
                
                <Route path="/MyPMInvestments" element={<MyPMInvestments />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}