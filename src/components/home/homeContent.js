import {
  BadgeCheck,
  CalendarDays,
  CandlestickChart,
  ClipboardCheck,
  Compass,
  Eye,
  GraduationCap,
  Handshake,
  MessagesSquare,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  Users,
  Vote,
  Wallet,
} from "lucide-react";

// Static copy for the public Home page, mirroring protocall.in/home.
// Live numbers (rooms, polls, votes, market movers) come from useHomeData.

export const HOME_NAV = [
  { label: "Home", to: "/home" },
  { label: "Explore Stocks", to: "/Dashboard" },
  { label: "Chat Rooms", to: "/ChatRooms" },
  { label: "Community Polls", to: "/Polls" },
  { label: "Features", href: "#features" },
  { label: "Reviews", href: "#reviews" },
  { label: "About Us", href: "#about" },
];

export const HOME_FEATURES = [
  {
    icon: CandlestickChart,
    title: "Stock Market Overview",
    body: "Discover market movements, trending stocks, gainers and losers, and the context behind them.",
    cta: "Explore the market",
    to: "/Dashboard",
  },
  {
    icon: MessagesSquare,
    title: "Trading Chat Rooms",
    body: "Find stock-specific, sector-specific and general rooms where investors discuss ideas in real time.",
    cta: "Browse chat rooms",
    to: "/ChatRooms",
  },
  {
    icon: Vote,
    title: "Community Sentiment Polls",
    body: "See how the community leans on Buy, Hold and Sell questions, and add your own view.",
    cta: "View polls",
    to: "/Polls",
  },
  {
    icon: Wallet,
    title: "Portfolio and Watchlist",
    body: "Track the stocks you follow, review your holdings and keep your watchlist in one place.",
    cta: "Open portfolio",
    to: "/MyPortfolio",
  },
  {
    icon: Handshake,
    title: "Pledge Pool",
    body: "Coordinate with other members around shared stock ideas through the community pledge feature.",
    cta: "About pledge pools",
    to: "/PledgePool",
  },
  {
    icon: GraduationCap,
    title: "Financial Experts and Advisors",
    body: "Discover advisors and educators who share market analysis and financial education content.",
    cta: "Meet the experts",
    to: "/Advisors",
  },
];

export const HOME_STEPS = [
  {
    icon: UserPlus,
    title: "Join the Community",
    body: "Create an account and set up a profile so other members can recognise you in discussions.",
  },
  {
    icon: Compass,
    title: "Discover and Discuss",
    body: "Explore stocks, join the rooms that match your interests, and take part in community polls.",
  },
  {
    icon: ClipboardCheck,
    title: "Make Informed Decisions",
    body: "Review market information and community sentiment as one input into your own research.",
  },
];

export const HOME_MEMBERSHIP = [
  { icon: MessagesSquare, title: "Premium rooms", body: "Access focused rooms that go deeper than the public discussion." },
  { icon: GraduationCap, title: "Advisor discovery", body: "Find advisors and educators publishing analysis and learning material." },
  { icon: CalendarDays, title: "Community events", body: "Join webinars, sessions and member events listed on the platform." },
  { icon: BadgeCheck, title: "Advanced community tools", body: "Use the extended features available to subscribed members." },
];

export const HOME_ABOUT = [
  {
    icon: Users,
    title: "Privacy-conscious profiles",
    body: "Profiles show the display name you choose. Contact details are never shown in public previews.",
  },
  {
    icon: ClipboardCheck,
    title: "Community guidelines",
    body: "Rooms operate under shared posting rules so discussions stay useful and respectful.",
  },
  {
    icon: Eye,
    title: "Transparent poll results",
    body: "Poll counts are visible to everyone who can see the poll, including how many members voted.",
  },
  {
    icon: BadgeCheck,
    title: "Clear membership information",
    body: "What each plan includes is listed on the membership page before you activate anything.",
  },
  {
    icon: ShieldCheck,
    title: "Independent decision-making",
    body: "Every member makes their own investment decisions. Community views are never framed as advice.",
  },
  {
    icon: TriangleAlert,
    title: "Risk disclaimer",
    body: "Market information and community discussions on PROTOCALL are for informational and educational purposes only. They are not investment advice and are not a guarantee of any outcome. Investing in securities carries risk, including loss of capital. Please do your own research and consult a qualified professional where appropriate.",
    warning: true,
  },
];

// Member testimonials shown on the public page (the same set the reference
// shows). Kept static: the reviews API has no public platform-review feed.
export const HOME_REVIEWS = [
  {
    name: "Anjali Joshi",
    rating: 5,
    text: "Great platform for beginners! The community is supportive, advisors are genuine, and the educational content is excellent. 5 stars!",
  },
  {
    name: "Rohit Gupta",
    rating: 5,
    text: "Protocall's portfolio tracking and alerts have saved me from potential losses multiple times. The platform is intuitive and powerful!",
  },
  {
    name: "Kavita Menon",
    rating: 5,
    text: "Finally, a platform that understands retail investors! The trust score system and community validation make me feel safe and informed.",
  },
  {
    name: "Vikram Singh",
    rating: 5,
    text: "The events and webinars are top-notch. Learning from industry experts has significantly improved my trading strategy. Thank you Protocall!",
  },
  {
    name: "Sneha Reddy",
    rating: 4,
    text: "I've tried many trading platforms, but Protocall stands out with its community-driven approach. The real-time polls help gauge market sentiment perfectly.",
  },
  {
    name: "Amit Patel",
    rating: 5,
    text: "Best platform for retail investors in India! The SEBI-registered advisors provide genuine insights, and the chat rooms are incredibly helpful.",
  },
];

// "Events" from the reference footer is left out: this app has no Events page.
export const HOME_FOOTER_COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "Home", to: "/home" },
      { label: "Explore Stocks", to: "/Dashboard" },
      { label: "Chat Rooms", to: "/ChatRooms" },
      { label: "Community Polls", to: "/Polls" },
      { label: "Portfolio", to: "/MyPortfolio" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Advisors", to: "/Advisors" },
      { label: "Educators", to: "/Educators" },
      { label: "Pledge Pool", to: "/PledgePool" },
      { label: "Membership", to: "/Subscription" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Market News", to: "/News" },
      { label: "Blogs", to: "/blogs" },
      { label: "Contact Support", to: "/contactSupport" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms & Conditions", to: "/terms" },
      { label: "Risk Disclaimer", to: "/riskDisclosure" },
      { label: "Cookies Policy", to: "/cookies" },
    ],
  },
];

export const HOME_LEGAL_LINKS = HOME_FOOTER_COLUMNS[3].links;

export const HOME_ROOM_TYPE_LABELS = {
  general: "General",
  stock_specific: "Stock-specific",
  sector: "Sector",
  admin: "Official",
  premium: "Premium",
  premium_admin: "Premium",
};
