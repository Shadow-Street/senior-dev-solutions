
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User, Investor, FundAllocation } from '@/api/entities';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Wallet,
  Download,
  FileText,
  UserCircle,
  ChevronDown,
  Shield,
  CheckCircle,
  Clock,
  LogOut,
  Home
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InvestorLayout({ children, currentView }) { // Changed activePage to currentView
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [investor, setInvestor] = useState(null);
  const [investorStatus, setInvestorStatus] = useState('inactive');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInvestorData = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        const investors = await Investor.filter({ user_id: currentUser.id });
        if (investors.length === 0) {
          toast.error('No investor profile found');
          navigate(createPageUrl('Dashboard'));
          return;
        }

        const investorData = investors[0];
        setInvestor(investorData);

        // Check allocations to determine status
        const allocations = await FundAllocation.filter({ investor_id: investorData.id });
        const hasActiveInvestments = allocations.some(a => a.status === 'active' && (a.total_invested || 0) > 0);
        setInvestorStatus(hasActiveInvestments ? 'active' : 'inactive');
      } catch (error) {
        console.error('Error loading investor:', error);
        toast.error('Failed to load investor profile');
        navigate(createPageUrl('Dashboard'));
      } finally {
        setIsLoading(false);
      }
    };

    loadInvestorData();
  }, [navigate]);

  // Modified navigationItems to include 'id' and 'badge' properties
  const navigationItems = [
    { id: 'wallet', path: 'InvestorDashboard_Wallet', label: 'Wallet', icon: Wallet, badge: 3 },
    { id: 'payouts', path: 'InvestorDashboard_Payouts', label: 'Payouts', icon: Download, badge: 1 },
    { id: 'reports', path: 'InvestorDashboard_Reports', label: 'Reports', icon: FileText, badge: 0 },
    { id: 'profile', path: 'InvestorDashboard_Profile', label: 'Profile', icon: UserCircle, badge: 0 },
  ];

  const handleLogout = async () => {
    try {
      await User.logout();
      navigate(createPageUrl('Login')); // Redirect to login after logout
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  const handleBackToDashboard = () => {
    navigate(createPageUrl('Dashboard'));
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col shadow-xl">
        {/* Logo Section */}
        <div className="h-20 flex items-center justify-center border-b border-sidebar-border bg-sidebar-dark">
          <div className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7" />
            Investor Portal
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button // Changed Link to button
                key={item.id}
                onClick={() => navigate(createPageUrl(item.path))} // Use navigate for internal routing
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg scale-105'
                    : 'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-md'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <Badge className="bg-protocall-sell-text text-white text-xs px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center animate-pulse">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer - Back to Main Dashboard */}
        <div className="p-4 border-t border-sidebar-border space-y-3">
          <button
            onClick={handleBackToDashboard}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-sidebar-dark hover:bg-sidebar-accent text-sidebar-foreground rounded-lg transition-all"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Main Dashboard</span>
          </button>

          <div className="text-center p-4 bg-sidebar-dark rounded-lg">
            <Shield className="w-8 h-8 mx-auto text-protocall-premium-light mb-2" />
            <h3 className="font-bold text-sidebar-foreground">Protocol</h3>
            <p className="text-xs text-sidebar-muted-foreground">Secure Investment Fund</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-20 bg-card border-b border-border flex items-center justify-between px-8 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Investment Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your portfolio</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Badge */}
            <Badge className={investorStatus === 'active' ? 'bg-buy-muted text-buy-muted-foreground border-buy/30' : 'bg-surface-2 text-foreground border-border'}>
              {investorStatus === 'active' ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 mr-1" />
                  Inactive
                </>
              )}
            </Badge>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-all">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={investor?.profile_image_url} alt={investor?.full_name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {investor?.full_name?.charAt(0) || 'I'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-semibold text-foreground">{investor?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{investor?.investor_code}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Investor Details</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <div className="px-2 py-3 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-medium text-sm">{investor?.full_name}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium text-sm">{investor?.email}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium text-sm">{investor?.mobile_number || 'Not provided'}</p>
                  </div>

                  {investor?.bank_account_number && (
                    <div>
                      <p className="text-xs text-muted-foreground">Bank Account</p>
                      <p className="font-medium text-sm">****{investor.bank_account_number.slice(-4)}</p>
                      <p className="text-xs text-muted-foreground">{investor.bank_name} - {investor.bank_ifsc_code}</p>
                    </div>
                  )}

                  {investor?.upi_id && (
                    <div>
                      <p className="text-xs text-muted-foreground">UPI ID</p>
                      <p className="font-medium text-sm">{investor.upi_id}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground">Profit Distribution</p>
                    <p className="font-medium text-sm capitalize">{investor?.profit_distribution_plan || 'Not set'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">KYC Status</p>
                    <Badge className={investor?.kyc_status === 'verified' ? 'bg-buy-muted text-buy-muted-foreground' : 'bg-hold-muted text-hold-muted-foreground'}>
                      {investor?.kyc_status || 'Pending'}
                    </Badge>
                  </div>
                </div>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-sell-muted-foreground">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
