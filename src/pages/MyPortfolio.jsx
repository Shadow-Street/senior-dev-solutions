
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, TrendingDown, BarChart3, Wallet, Search, LayoutGrid, List, Eye, MessageSquare, Bell, X, Award, Lock, IndianRupee, User as UserIcon } from 'lucide-react'; // Added UserIcon
import { User, Stock, UserInvestment, Watchlist, ChatRoom, Poll } from '@/api/entities';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom'; // Assuming react-router-dom for Link, adjust if using Next.js/other routing

// Import components
import AddStockModal from '../components/stocks/AddStockModal';
import AddInvestmentModal from '../components/stocks/AddInvestmentModal';
import AlertModal from '../components/stocks/AlertModal';

export default function MyPortfolio() {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAddInvestmentModal, setShowAddInvestmentModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedStockForAlert, setSelectedStockForAlert] = useState(null);

  // Basic state
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Separate states for raw watchlist and investments data fetched from backend or samples
  const [watchlist, setWatchlist] = useState([]);
  const [investments, setInvestments] = useState([]);

  // Combined and enriched portfolio stocks for rendering all UI elements
  const [portfolioStocks, setPortfolioStocks] = useState([]);

  // Sample portfolio data for guests
  const samplePortfolioData = {
    watchlist: [
      { id: 'sample-wl-1', stock_symbol: 'RELIANCE', stock_name: 'Reliance Industries', added_price: 2400 },
      { id: 'sample-wl-2', stock_symbol: 'TCS', stock_name: 'Tata Consultancy Services', added_price: 3800 },
      { id: 'sample-wl-3', stock_symbol: 'HDFCBANK', stock_name: 'HDFC Bank', added_price: 1600 }
    ],
    investments: [
      { id: 'sample-inv-1', stock_symbol: 'INFY', stock_name: 'Infosys', quantity: 10, avg_buy_price: 1500, total_invested: 15000, purchase_date: '2023-01-15' },
      { id: 'sample-inv-2', stock_symbol: 'WIPRO', stock_name: 'Wipro', quantity: 20, avg_buy_price: 450, total_invested: 9000, purchase_date: '2022-11-01' }
    ]
  };

  // Helper to enrich stock data with current price and change percent (simulated for sample/watchlist)
  const enrichStock = (item, type) => {
    // Simulate current price and change percent for demo purposes
    // In a real app, you'd fetch this from a market data API
    const currentPrice = item.added_price || item.avg_buy_price || (1000 + Math.random() * 2000); // Fallback if price is not defined
    const changePercent = Math.random() * 10 - 5; // -5% to +5%

    return {
      id: item.id || item.stock_symbol, // Use provided ID or symbol as ID
      symbol: item.stock_symbol,
      company_name: item.stock_name,
      current_price: currentPrice,
      change_percent: changePercent,
      sector: 'Unknown', // Placeholder, would come from a Stock entity or API
      is_trending: Math.random() > 0.7,
      user_investment_data: type === 'investment' ? {
        quantity: item.quantity,
        avg_buy_price: item.avg_buy_price,
        total_invested: item.total_invested,
        purchase_date: item.purchase_date
      } : null,
      watchlist_id: type === 'watchlist' ? item.id : undefined,
      investment_id: type === 'investment' ? item.id : undefined,
      is_sample: item.id && item.id.startsWith('sample-')
    };
  };

  // Load user data and their actual stocks, or sample data for guests
  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();

    const loadPortfolioData = async () => {
      try {
        setIsLoading(true); // Ensure loading state is true at the start of fetch
        // Try to get user. Catch block for User.me() handles cases where no user is logged in
        const currentUser = await User.me().catch(() => null);
        
        if (!isMounted || abortController.signal.aborted) return;
        
        setUser(currentUser);

        if (currentUser) {
          // Load real portfolio data for logged-in users
          try {
            const [userWatchlist, userInvestments] = await Promise.all([
              Watchlist.filter({ user_id: currentUser.id }, { signal: abortController.signal }).catch(() => []),
              UserInvestment.filter({ user_id: currentUser.id }, { signal: abortController.signal }).catch(() => [])
            ]);

            if (isMounted && !abortController.signal.aborted) {
              setWatchlist(userWatchlist);
              setInvestments(userInvestments);
            }
          } catch (error) {
            if (error.name !== 'AbortError') { // Ignore abort errors
              console.error("Error loading user portfolio data:", error);
              toast.error("Failed to load your portfolio data.");
              // Fallback to sample data even if user is present but data load fails
              if (isMounted && !abortController.signal.aborted) {
                setWatchlist(samplePortfolioData.watchlist);
                setInvestments(samplePortfolioData.investments);
              }
            }
          }
        } else {
          // Show sample data for guests
          console.log("Loading portfolio in guest mode with sample data");
          if (isMounted && !abortController.signal.aborted) {
            setWatchlist(samplePortfolioData.watchlist);
            setInvestments(samplePortfolioData.investments);
          }
        }

      } catch (error) {
        if (!isMounted || abortController.signal.aborted) return;
        console.error("Error checking user session:", error);
        // If there's an error getting user, assume guest and load sample data
        setUser(null);
        setWatchlist(samplePortfolioData.watchlist);
        setInvestments(samplePortfolioData.investments);
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadPortfolioData();

    return () => {
      isMounted = false;
      abortController.abort(); // Abort any ongoing fetches
    };
  }, []);


  // Effect to combine watchlist and investments into portfolioStocks for display
  useEffect(() => {
    const stocksMap = new Map();

    // Add watchlist items, enriching them
    watchlist.forEach((item) => {
      stocksMap.set(item.stock_symbol, enrichStock(item, 'watchlist'));
    });

    // Add investment items, enriching them (override watchlist if exists for same symbol)
    investments.forEach((item) => {
      stocksMap.set(item.stock_symbol, enrichStock(item, 'investment'));
    });

    setPortfolioStocks(Array.from(stocksMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol)));
  }, [watchlist, investments]); // Re-run when watchlist or investments change


  const handleAddStockToWatchlist = async (stock) => {
    if (!user) {
      toast.error("Please log in to add stocks to your watchlist.");
      setShowAddStockModal(false); // Close modal even if not logged in
      return;
    }
    try {
      // Ensure we don't add duplicates to watchlist if already present
      const existingWatchlistItem = await Watchlist.filter({ user_id: user.id, stock_symbol: stock.symbol });
      if (existingWatchlistItem.length > 0) {
        toast.info(`${stock.symbol} is already in your watchlist.`);
        setShowAddStockModal(false);
        return;
      }

      const newWatchlistItem = await Watchlist.create({
        user_id: user.id,
        stock_symbol: stock.symbol,
        stock_name: stock.company_name,
        added_price: stock.current_price
      });
      setShowAddStockModal(false);
      toast.success(`${stock.symbol} added to watchlist!`);

      // Update the watchlist state
      setWatchlist((prev) => [...prev, newWatchlistItem]);

    } catch (e) {
      toast.error(`Failed to add ${stock.symbol} to watchlist.`);
      console.error(e);
    }
  };

  const handleAddInvestment = async (investmentData) => {
    if (!user) {
      toast.error("Please log in to add investments.");
      setShowAddInvestmentModal(false); // Close modal even if not logged in
      return;
    }
    try {
      const newInvestment = await UserInvestment.create({ ...investmentData, user_id: user.id });
      setShowAddInvestmentModal(false);
      toast.success(`Investment in ${investmentData.stock_symbol} added!`);

      // Update the investments state
      setInvestments((prev) => [...prev, newInvestment]);

    } catch (e) {
      toast.error(`Failed to add investment.`);
      console.error(e);
    }
  };

  const handleChatClick = async (stockSymbol) => {
    try {
      const rooms = await ChatRoom.filter({ stock_symbol: stockSymbol }, '', 1);
      if (rooms.length > 0) {
        window.location.href = createPageUrl(`ChatRooms?stock_symbol=${stockSymbol}`);
      } else {
        toast.info(`No chat has started yet on this stock.`);
      }
    } catch (e) {
      toast.error(`Could not find chat for ${stockSymbol}.`);
      console.error(e);
    }
  };

  const handlePollClick = async (stockSymbol) => {
    try {
      const polls = await Poll.filter({ stock_symbol: stockSymbol, is_active: true }, '', 1);
      if (polls.length > 0) {
        window.location.href = createPageUrl(`Polls?stock_symbol=${stockSymbol}`);
      } else {
        toast.info(`No poll has been created for this stock.`);
      }
    } catch (e) {
      toast.error(`Could not find poll for ${stockSymbol}.`);
      console.error(e);
    }
  };

  const handleOpenAlertModal = (stock) => {
    // Alerts can be set by guests for sample data, but if they want to save them permanently, they'll need to log in.
    // The AlertModal component itself should handle the login requirement for saving.
    setSelectedStockForAlert(stock);
    setShowAlertModal(true);
  };

  const handleSaveAlert = async (alertData) => {
    toast.success(`Alert for ${alertData.stock_symbol} saved!`);
    setShowAlertModal(false);
  };

  const handleDeleteStock = async (stockId, stockSymbol) => {
    if (!user) {
      // If in guest mode, just remove from local sample data
      setWatchlist((prev) => prev.filter((item) => item.stock_symbol !== stockSymbol));
      setInvestments((prev) => prev.filter((item) => item.stock_symbol !== stockSymbol));
      toast.success(`${stockSymbol} removed from sample data.`);
      return;
    }

    try {
      let deletedFromWatchlist = false;
      let deletedFromInvestments = false;

      // For watchlist items, find and delete the watchlist entry
      const watchlistItems = await Watchlist.filter({ user_id: user.id, stock_symbol: stockSymbol });
      if (watchlistItems.length > 0) {
        await Watchlist.delete(watchlistItems[0].id);
        deletedFromWatchlist = true;
      }

      // For investments, delete the investment record
      const investmentsToDelete = await UserInvestment.filter({ user_id: user.id, stock_symbol: stockSymbol });
      if (investmentsToDelete.length > 0) {
        await UserInvestment.delete(investmentsToDelete[0].id);
        deletedFromInvestments = true;
      }

      // Update local state to reflect the change
      if (deletedFromWatchlist) {
        setWatchlist((prev) => prev.filter((item) => item.stock_symbol !== stockSymbol));
      }
      if (deletedFromInvestments) {
        setInvestments((prev) => prev.filter((item) => item.stock_symbol !== stockSymbol));
      }

      // Show appropriate success message
      if (deletedFromWatchlist && deletedFromInvestments) {
        toast.success(`${stockSymbol} removed from both watchlist and portfolio`);
      } else if (deletedFromWatchlist) {
        toast.success(`${stockSymbol} removed from watchlist`);
      } else if (deletedFromInvestments) {
        toast.success(`${stockSymbol} removed from portfolio`);
      } else {
        toast.info(`${stockSymbol} was not found in your watchlist or investments.`);
      }

    } catch (error) {
      console.error('Error deleting stock:', error);
      toast.error(`Failed to remove ${stockSymbol}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your portfolio...</p>
        </div>
      </div>);

  }

  // Calculate portfolio stats
  const investedStocks = portfolioStocks.filter((s) => s.user_investment_data);

  const portfolioTotalValue = investedStocks.reduce((sum, stock) => sum + (stock.current_price || 0) * (stock.user_investment_data?.quantity || 0), 0);
  const portfolioTotalInvestment = investedStocks.reduce((sum, stock) => sum + (stock.user_investment_data?.total_invested || 0), 0);
  const portfolioTotalChange = portfolioTotalValue - portfolioTotalInvestment;

  // New stats for the top summary cards
  const stats = {
    totalInvested: investedStocks.reduce((sum, stock) => sum + (stock.user_investment_data?.total_invested || 0), 0),
    currentValue: investedStocks.reduce((sum, stock) => sum + (stock.current_price || 0) * (stock.user_investment_data?.quantity || 0), 0)
  };
  stats.totalPL = stats.currentValue - stats.totalInvested;
  stats.totalPLPercent = stats.totalInvested === 0 ? 0 : stats.totalPL / stats.totalInvested * 100;

  const gainers = portfolioStocks.filter((s) => (s.change_percent || 0) > 0).length;
  const losers = portfolioStocks.filter((s) => (s.change_percent || 0) < 0).length;

  const filteredStocks = portfolioStocks.filter((stock) =>
  stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
  stock.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate filters for Portfolio and Watchlist tabs
  const portfolioFilteredStocks = filteredStocks.filter((stock) => stock.user_investment_data);
  const watchlistFilteredStocks = filteredStocks.filter((stock) => stock.watchlist_id && !stock.user_investment_data);


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Guest Mode Banner */}
        {!user && (
          <div className="max-w-7xl mx-auto mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">Guest Mode - Sample Portfolio</p>
                  <p className="text-xs text-blue-700 mt-1">Log in to create and manage your own portfolio.</p>
                </div>
                <Link to={createPageUrl("Profile")}> {/* Assuming "Profile" page is where login happens */}
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Log In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Compact Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 mb-6 shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">My Portfolio</h1>
            </div>
            <p className="text-blue-100 text-sm">
              Track your investments and discover new opportunities
            </p>
          </div>
        </div>

        {/* Portfolio Summary - NEW SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Total Invested</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">₹{stats.totalInvested.toLocaleString('en-IN')}</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Current Value</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">₹{stats.currentValue.toLocaleString('en-IN')}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Total P/L</p>
                  <p className={`text-3xl font-bold mt-2 ${stats.totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{stats.totalPL.toLocaleString('en-IN')}
                  </p>
                  <p className={`text-sm mt-1 ${stats.totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.totalPLPercent.toFixed(2)}%
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stats.totalPL >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  {stats.totalPL >= 0 ?
                  <TrendingUp className="w-6 h-6 text-green-600" /> :
                  <TrendingDown className="w-6 h-6 text-red-600" />
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Watchlist Items</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{watchlistFilteredStocks.length}</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Navigation Tabs - Aligned Right */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-end mb-6">
            <TabsList className="bg-transparent p-1 rounded-lg grid grid-cols-2 gap-2 w-auto">
              <TabsTrigger
                value="portfolio" className="bg-gradient-to-r text-blue-700 pr-64 pl-64 text-sm font-semibold rounded-xl data-[state=active]:bg-background justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 disabled:pointer-events-none disabled:opacity-50 h-10 shadow-md flex items-center gap-3 transition-all duration-300 from-blue-50 to-purple-50 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg">

                <TrendingUp className="w-4 h-4" />
                Portfolio
              </TabsTrigger>

              <TabsTrigger
                value="watchlist"
                className="bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 px-8 py-2.5 text-sm font-semibold rounded-xl shadow-md flex items-center gap-3 transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10">
                <BarChart3 className="w-4 h-4" />
                Watchlist
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Portfolio Tab Content */}
          <TabsContent value="portfolio" className="space-y-6">
            {/* Compact Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 rounded-lg shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-xs font-medium uppercase tracking-wide">Portfolio Value</p>
                      <p className="text-xl font-bold text-blue-900 mt-1">
                        ₹{portfolioTotalValue > 0 ? (portfolioTotalValue / 100000).toLocaleString('en-IN', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + 'L' : '0.0L'}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <IndianRupee className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 rounded-lg shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-xs font-medium uppercase tracking-wide">Total Change</p>
                      <p className="text-xl font-bold text-purple-900 mt-1">
                        {portfolioTotalInvestment > 0 ?
                        `${(portfolioTotalChange / portfolioTotalInvestment * 100).toFixed(2)}%` :
                        '0.0%'
                        }
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 rounded-lg shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-600 text-xs font-medium uppercase tracking-wide">Gainers</p>
                      <p className="text-xl font-bold text-emerald-900 mt-1">{gainers}</p>
                    </div>
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 rounded-lg shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-600 text-xs font-medium uppercase tracking-wide">Losers</p>
                      <p className="text-xl font-bold text-red-900 mt-1">{losers}</p>
                    </div>
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compact Search and Controls */}
            <Card className="bg-white border rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                  <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search your portfolio..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200" />

                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowAddInvestmentModal(true)}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 rounded-lg px-4 py-2 font-medium transition-all duration-200">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Investment
                    </Button>
                    <Button
                      onClick={() => setViewMode('grid')}
                      className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${
                      viewMode === 'grid' ?
                      'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm' :
                      'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white'}`
                      }>
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      Grid
                    </Button>
                    <Button
                      onClick={() => setViewMode('list')}
                      className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${
                      viewMode === 'list' ?
                      'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm' :
                      'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white'}`
                      }>
                      <List className="w-4 h-4 mr-2" />
                      List
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock Cards Grid/List */}
            {portfolioFilteredStocks.length === 0 ?
            <Card className="bg-white border rounded-lg shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No stocks found in your portfolio</h3>
                  <p className="text-gray-500">Start building your portfolio by adding some stocks</p>
                </CardContent>
              </Card> :
            viewMode === 'grid' ?
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {portfolioFilteredStocks.map((stock) =>
              <Card key={stock.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 relative">
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        {stock.is_trending &&
                  <Badge className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-md">
                            🔥 Hot
                          </Badge>
                  }
                        <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600 rounded-md"
                    onClick={() => handleDeleteStock(stock.id, stock.symbol)}>

                          <X className="w-3 h-3" />
                        </Button>
                      </div>

                      <CardContent className="p-4">
                        <div className="mb-3">
                          <h3 className="font-bold text-gray-900">{stock.symbol}</h3>
                          <p className="text-sm text-gray-500 truncate">{stock.company_name}</p>
                        </div>

                        <div className="mb-3">
                          <div className="text-xl font-bold text-gray-900 mb-1">
                            ₹{stock.current_price.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-1">
                            {stock.change_percent >= 0 ?
                      <span className="text-emerald-600 text-sm flex items-center">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                +{stock.change_percent.toFixed(2)}%
                              </span> :

                      <span className="text-red-600 text-sm flex items-center">
                                <TrendingDown className="w-3 h-3 mr-1" />
                                {stock.change_percent.toFixed(2)}%
                              </span>
                      }
                          </div>
                        </div>

                        {stock.user_investment_data ?
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-blue-700 mb-1">Investment Details</p>
                            <p className="text-xs text-gray-600">Qty: <span className="font-medium">{stock.user_investment_data.quantity}</span></p>
                            <p className="text-xs text-gray-600">Avg: <span className="font-medium">₹{stock.user_investment_data.avg_buy_price.toFixed(2)}</span></p>
                          </div> :

                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-xs text-gray-500 font-medium">Watchlist only</p>
                          </div>
                  }

                        {/* Community Insights - More Compact */}
                        <div className="bg-purple-50 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-1 mb-2">
                            <Award className="w-3 h-3 text-purple-600" />
                            <span className="text-xs font-medium text-purple-900">Community Insights</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      stock.change_percent >= 0 ?
                      'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'}`
                      }>
                              {stock.change_percent >= 0 ? 'BUY' : 'HOLD'}
                            </span>
                            <span className="text-xs text-gray-500">50% confidence</span>
                          </div>
                        </div>

                        {/* Sector Badge with White Hover Text */}
                        <div className="mb-3">
                          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-700 hover:text-white text-xs px-2 py-1 rounded-md border border-gray-200 transition-colors duration-200">
                            {stock.sector}
                          </Badge>
                        </div>

                        {/* Action Buttons - More Compact */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                        onClick={() => handleChatClick(stock.symbol)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border-0 rounded-md text-xs py-2 font-medium transition-all duration-200">

                              <MessageSquare className="w-3 h-3 mr-1" />
                              Chat
                            </Button>
                            <Button
                        onClick={() => handlePollClick(stock.symbol)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border-0 rounded-md text-xs py-2 font-medium transition-all duration-200">

                              <BarChart3 className="w-3 h-3 mr-1" />
                              Poll
                            </Button>
                          </div>
                          <Button
                      onClick={() => handleOpenAlertModal(stock)}
                      className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border-0 rounded-md text-xs py-2 font-medium transition-all duration-200">

                            <Bell className="w-3 h-3 mr-1" />
                            Set Alert
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
              )}
                </div> :

            <div className="space-y-3">
                  {portfolioFilteredStocks.map((stock) =>
              <Card key={stock.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div>
                              <h3 className="font-bold text-gray-900">{stock.symbol}</h3>
                              <p className="text-sm text-gray-600">{stock.company_name}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-700 hover:text-white text-xs px-2 py-1 rounded-md border border-gray-200 transition-colors duration-200">
                                {stock.sector}
                              </Badge>
                              {stock.is_trending &&
                        <Badge className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-md">
                                  🔥 Hot
                                </Badge>
                        }
                              {stock.user_investment_data &&
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-md">
                                  📈 Invested
                                </Badge>
                        }
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                ₹{stock.current_price.toFixed(2)}
                              </div>
                              <div className="flex items-center justify-end gap-1">
                                {stock.change_percent >= 0 ?
                          <span className="text-emerald-600 text-sm flex items-center">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    +{stock.change_percent.toFixed(2)}%
                                  </span> :

                          <span className="text-red-600 text-sm flex items-center">
                                    <TrendingDown className="w-3 h-3 mr-1" />
                                    {stock.change_percent.toFixed(2)}%
                                  </span>
                          }
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                          onClick={() => handleOpenAlertModal(stock)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border-0 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200">

                                <Bell className="w-3 h-3 mr-1" />
                                Alert
                              </Button>

                              <Button
                          onClick={() => handleDeleteStock(stock.id, stock.symbol)}
                          className="w-8 h-8 p-0 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-all duration-200 border border-red-200">

                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
              )}
                </div>
            }
          </TabsContent>

          {/* Watchlist Tab Content - Same structure as Portfolio */}
          <TabsContent value="watchlist" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 rounded-lg shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-xs font-medium uppercase tracking-wide">Total Stocks</p>
                      <p className="text-xl font-bold text-blue-900 mt-1">{watchlistFilteredStocks.length}</p>
                    </div>
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 rounded-lg shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-xs font-medium uppercase tracking-wide">Avg Change</p>
                      <p className="text-xl font-bold text-purple-900 mt-1">
                        {watchlistFilteredStocks.length > 0 ?
                        `${(watchlistFilteredStocks.reduce((sum, s) => sum + s.change_percent, 0) / watchlistFilteredStocks.length).toFixed(1)}%` :
                        '0.0%'}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 rounded-lg shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-600 text-xs font-medium uppercase tracking-wide">Gainers</p>
                      <p className="text-xl font-bold text-emerald-900 mt-1">{watchlistFilteredStocks.filter((s) => (s.change_percent || 0) > 0).length}</p>
                    </div>
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 rounded-lg shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-600 text-xs font-medium uppercase tracking-wide">Losers</p>
                      <p className="text-xl font-bold text-red-900 mt-1">{watchlistFilteredStocks.filter((s) => (s.change_percent || 0) < 0).length}</p>
                    </div>
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Same compact search and controls */}
            <Card className="bg-white border rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                  <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search your watchlist..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200" />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowAddStockModal(true)}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary hover:bg-primary/90 h-10 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 rounded-lg px-4 py-2 font-medium transition-all duration-200">

                      <Plus className="w-4 h-4 mr-2" />
                      Add to Watchlist
                    </Button>

                    <Button
                      onClick={() => setViewMode('grid')}
                      className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${
                      viewMode === 'grid' ?
                      'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm' :
                      'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white'}`
                      }>
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      Grid
                    </Button>
                    <Button
                      onClick={() => setViewMode('list')}
                      className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${
                      viewMode === 'list' ?
                      'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm' :
                      'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white'}`
                      }>
                      <List className="w-4 h-4 mr-2" />
                      List
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Watchlist Stock Grid */}
            {watchlistFilteredStocks.length === 0 ?
            <Card className="bg-white border rounded-lg shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Eye className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Your watchlist is empty</h3>
                  <p className="text-gray-500">Add some stocks to track their performance</p>
                </CardContent>
              </Card> :
            viewMode === 'grid' ?
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Same stock cards as in Portfolio tab */}
                {watchlistFilteredStocks.map((stock) =>
              <Card key={stock.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 relative">
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      {stock.is_trending &&
                  <Badge className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-md">
                          🔥 Hot
                        </Badge>
                  }
                      <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600 rounded-md"
                    onClick={() => handleDeleteStock(stock.id, stock.symbol)}>

                        <X className="w-3 h-3" />
                      </Button>
                    </div>

                    <CardContent className="p-4">
                      <div className="mb-3">
                        <h3 className="font-bold text-gray-900">{stock.symbol}</h3>
                        <p className="text-sm text-gray-500 truncate">{stock.company_name}</p>
                      </div>

                      <div className="mb-3">
                        <div className="text-xl font-bold text-gray-900 mb-1">
                          ₹{stock.current_price.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1">
                          {stock.change_percent >= 0 ?
                      <span className="text-emerald-600 text-sm flex items-center">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              +{stock.change_percent.toFixed(2)}%
                            </span> :

                      <span className="text-red-600 text-sm flex items-center">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              {stock.change_percent.toFixed(2)}%
                            </span>
                      }
                        </div>
                      </div>

                      {stock.user_investment_data ?
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                          <p className="text-xs font-medium text-blue-700 mb-1">Investment Details</p>
                          <p className="text-xs text-gray-600">Qty: <span className="font-medium">{stock.user_investment_data.quantity}</span></p>
                          <p className="text-xs text-gray-600">Avg: <span className="font-medium">₹{stock.user_investment_data.avg_buy_price.toFixed(2)}</span></p>
                        </div> :

                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-gray-500 font-medium">Watchlist only</p>
                        </div>
                  }

                      {/* Community Insights - More Compact */}
                      <div className="bg-purple-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-1 mb-2">
                          <Award className="w-3 h-3 text-purple-600" />
                          <span className="text-xs font-medium text-purple-900">Community Insights</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      stock.change_percent >= 0 ?
                      'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'}`
                      }>
                            {stock.change_percent >= 0 ? 'BUY' : 'HOLD'}
                          </span>
                          <span className="text-xs text-gray-500">50% confidence</span>
                        </div>
                      </div>

                      {/* Sector Badge with White Hover Text */}
                      <div className="mb-3">
                        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-700 hover:text-white text-xs px-2 py-1 rounded-md border border-gray-200 transition-colors duration-200">
                          {stock.sector}
                        </Badge>
                      </div>

                      {/* Action Buttons - More Compact */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                        onClick={() => handleChatClick(stock.symbol)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border-0 rounded-md text-xs py-2 font-medium transition-all duration-200">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Chat
                          </Button>
                          <Button
                        onClick={() => handlePollClick(stock.symbol)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border-0 rounded-md text-xs py-2 font-medium transition-all duration-200">
                            <BarChart3 className="w-3 h-3 mr-1" />
                            Poll
                          </Button>
                        </div>
                        <Button
                      onClick={() => handleOpenAlertModal(stock)}
                      className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border-0 rounded-md text-xs py-2 font-medium transition-all duration-200">

                          <Bell className="w-3 h-3 mr-1" />
                          Set Alert
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
              )}
              </div> :
            <div className="space-y-3">
                {watchlistFilteredStocks.map((stock) =>
              <Card key={stock.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div>
                              <h3 className="font-bold text-gray-900">{stock.symbol}</h3>
                              <p className="text-sm text-gray-600">{stock.company_name}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-700 hover:text-white text-xs px-2 py-1 rounded-md border border-gray-200 transition-colors duration-200">
                                {stock.sector}
                              </Badge>
                              {stock.is_trending &&
                        <Badge className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-md">
                                  🔥 Hot
                                </Badge>
                        }
                              {stock.user_investment_data &&
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-md">
                                  📈 Invested
                                </Badge>
                        }
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                ₹{stock.current_price.toFixed(2)}
                              </div>
                              <div className="flex items-center justify-end gap-1">
                                {stock.change_percent >= 0 ?
                          <span className="text-emerald-600 text-sm flex items-center">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    +{stock.change_percent.toFixed(2)}%
                                  </span> :

                          <span className="text-red-600 text-sm flex items-center">
                                    <TrendingDown className="w-3 h-3 mr-1" />
                                    {stock.change_percent.toFixed(2)}%
                                  </span>
                          }
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                          onClick={() => handleOpenAlertModal(stock)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border-0 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200">

                                <Bell className="w-3 h-3 mr-1" />
                                Alert
                              </Button>

                              <Button
                          onClick={() => handleDeleteStock(stock.id, stock.symbol)}
                          className="w-8 h-8 p-0 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-all duration-200 border border-red-200">

                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
              )}
                </div>
            }
          </TabsContent>
        </Tabs>

        {/* Enhanced Modals */}
        {showAddStockModal &&
        <AddStockModal
          open={showAddStockModal}
          onClose={() => setShowAddStockModal(false)}
          watchlist={portfolioStocks.filter((s) => s.watchlist_id)} // Pass combined watchlist items for checking
          onAddStock={handleAddStockToWatchlist} />

        }

        {showAddInvestmentModal &&
        <AddInvestmentModal
          open={showAddInvestmentModal}
          onClose={() => setShowAddInvestmentModal(false)}
          onSave={handleAddInvestment}
          stocks={portfolioStocks} />

        }

        {showAlertModal &&
        <AlertModal
          open={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          stock={selectedStockForAlert}
          onSave={handleSaveAlert}
          user={user} />

        }
      </div>
    </div>);

}
