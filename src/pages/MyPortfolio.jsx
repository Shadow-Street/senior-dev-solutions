import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, TrendingDown, BarChart3, Wallet, Search, LayoutGrid, List, Eye, MessageSquare, Bell, X, Award, Lock, IndianRupee, User as UserIcon } from 'lucide-react';
import { portfolioAPI, Watchlist, authAPI, ChatRoom, Poll } from '@/lib/apiClient';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

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

    // Portfolio and watchlist data
    const [portfolioData, setPortfolioData] = useState(null);
    const [watchlistData, setWatchlistData] = useState(null);
    const [portfolioStocks, setPortfolioStocks] = useState([]);

    // Sample portfolio data for guests
    const samplePortfolioData = {
        portfolio_holdings: [
            { id: 'sample-1', stock_symbol: 'RELIANCE.NS', quantity: 30, avg_buy_price: 2450, current_value: 73500, profit_loss: 0, change_percent: 2.5, name: 'Reliance Industries' },
            { id: 'sample-2', stock_symbol: 'TCS.NS', quantity: 50, avg_buy_price: 3500, current_value: 175000, profit_loss: 0, change_percent: -1.2, name: 'Tata Consultancy Services' },
            { id: 'sample-3', stock_symbol: 'HDFCBANK.NS', quantity: 40, avg_buy_price: 1650, current_value: 66000, profit_loss: 0, change_percent: 0.8, name: 'HDFC Bank' },
            { id: 'sample-4', stock_symbol: 'INFY.NS', quantity: 100, avg_buy_price: 1450, current_value: 145000, profit_loss: 0, change_percent: 1.5, name: 'Infosys' }
        ]
    };

    const sampleWatchlistData = {
        stocks: [
            { symbol: 'WIPRO.NS', name: 'Wipro', current_price: 450, change_percent: -0.5 },
            { symbol: 'TATAMOTORS.NS', name: 'Tata Motors', current_price: 631, change_percent: 1.8 }
        ]
    };

    // Load user data and portfolio/watchlist
    useEffect(() => {
        let isMounted = true;
        let abortController = new AbortController();

        const loadData = async () => {
            try {
                setIsLoading(true);

                // Try to get current user
                const currentUser = await authAPI.me().catch(() => null);

                if (!isMounted || abortController.signal.aborted) return;

                setUser(currentUser);

                if (currentUser) {
                    // Load real portfolio and watchlist data
                    try {
                        const [portfolio, watchlist] = await Promise.all([
                            portfolioAPI.getPortfolio().catch(() => null),
                            Watchlist.filter({ user_id: currentUser.id }).then(list => list[0] || null).catch(() => null)
                        ]);

                        if (isMounted && !abortController.signal.aborted) {
                            setPortfolioData(portfolio);
                            setWatchlistData(watchlist);
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.error("Error loading portfolio data:", error);
                            toast.error("Failed to load your portfolio data.");
                            // Fallback to sample data
                            if (isMounted && !abortController.signal.aborted) {
                                setPortfolioData(samplePortfolioData);
                                setWatchlistData(sampleWatchlistData);
                            }
                        }
                    }
                } else {
                    // Guest mode - show sample data
                    console.log("Loading portfolio in guest mode with sample data");
                    if (isMounted && !abortController.signal.aborted) {
                        setPortfolioData(samplePortfolioData);
                        setWatchlistData(sampleWatchlistData);
                    }
                }

            } catch (error) {
                if (!isMounted || abortController.signal.aborted) return;
                console.error("Error checking user session:", error);
                setUser(null);
                setPortfolioData(samplePortfolioData);
                setWatchlistData(sampleWatchlistData);
            } finally {
                if (isMounted && !abortController.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []);

    // Transform backend data to UI format
    useEffect(() => {
        const stocks = [];

        if (portfolioData && portfolioData.portfolio_holdings) {
            portfolioData.portfolio_holdings.forEach((holding) => {
                const currentPrice = parseFloat(holding.current_price || holding.avg_buy_price || 0);
                const quantity = parseFloat(holding.quantity || 0);
                const avgBuyPrice = parseFloat(holding.avg_buy_price || 0);
                const currentValue = parseFloat(holding.current_value || currentPrice * quantity);
                const profitLoss = parseFloat(holding.profit_loss || 0);
                const changePercent = holding.change_percent !== undefined ? parseFloat(holding.change_percent) : (Math.random() * 10 - 5);

                stocks.push({
                    id: holding.id || holding.stock_symbol,
                    symbol: holding.stock_symbol,
                    company_name: holding.name || holding.stock_symbol,
                    current_price: currentPrice,
                    change_percent: changePercent,
                    sector: 'Technology', // Default sector
                    is_trending: Math.abs(changePercent) > 2,
                    user_investment_data: {
                        quantity: quantity,
                        avg_buy_price: avgBuyPrice,
                        total_invested: avgBuyPrice * quantity,
                        current_value: currentValue,
                        profit_loss: profitLoss,
                        profit_loss_percent: avgBuyPrice > 0 ? (profitLoss / (avgBuyPrice * quantity)) * 100 : 0
                    },
                    is_sample: holding.id && holding.id.startsWith('sample-')
                });
            });
        }

        setPortfolioStocks(stocks);
    }, [portfolioData]);

    const handleAddStockToWatchlist = async (stock) => {
        if (!user) {
            toast.error("Please log in to add stocks to your watchlist.");
            setShowAddStockModal(false);
            return;
        }
        try {
            await Watchlist.create({
                user_id: user.id,
                stock_symbol: stock.symbol,
                stock_name: stock.company_name
            });
            setShowAddStockModal(false);
            toast.success(`${stock.symbol} added to watchlist!`);

            // Reload watchlist
            const updatedWatchlist = await Watchlist.filter({ user_id: user.id }).then(list => list[0] || null);
            setWatchlistData(updatedWatchlist);
        } catch (e) {
            toast.error(`Failed to add ${stock.symbol} to watchlist.`);
            console.error(e);
        }
    };

    const handleAddInvestment = async (investmentData) => {
        if (!user) {
            toast.error("Please log in to add investments.");
            setShowAddInvestmentModal(false);
            return;
        }
        try {
            await portfolioAPI.addStock(
                investmentData.stock_symbol,
                investmentData.quantity,
                investmentData.avg_buy_price
            );
            setShowAddInvestmentModal(false);
            toast.success(`Investment in ${investmentData.stock_symbol} added!`);

            // Reload portfolio
            const updatedPortfolio = await portfolioAPI.getPortfolio();
            setPortfolioData(updatedPortfolio);
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
        setSelectedStockForAlert(stock);
        setShowAlertModal(true);
    };

    const handleSaveAlert = async (alertData) => {
        toast.success(`Alert for ${alertData.stock_symbol} saved!`);
        setShowAlertModal(false);
    };

    const handleDeleteStock = async (stockId, stockSymbol) => {
        if (!user) {
            // Guest mode - just remove from local sample data
            setPortfolioData(prev => ({
                ...prev,
                portfolio_holdings: prev.portfolio_holdings.filter(h => h.stock_symbol !== stockSymbol)
            }));
            toast.success(`${stockSymbol} removed from sample data.`);
            return;
        }

        try {
            await portfolioAPI.removeStock(stockSymbol);
            toast.success(`${stockSymbol} removed from portfolio`);

            // Reload portfolio
            const updatedPortfolio = await portfolioAPI.getPortfolio();
            setPortfolioData(updatedPortfolio);
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
            </div>
        );
    }

    // Calculate portfolio stats
    const stats = {
        totalInvested: portfolioStocks.reduce((sum, stock) => sum + (stock.user_investment_data?.total_invested || 0), 0),
        currentValue: portfolioStocks.reduce((sum, stock) => sum + (stock.user_investment_data?.current_value || 0), 0)
    };
    stats.totalPL = stats.currentValue - stats.totalInvested;
    stats.totalPLPercent = stats.totalInvested === 0 ? 0 : (stats.totalPL / stats.totalInvested) * 100;

    const gainers = portfolioStocks.filter((s) => (s.change_percent || 0) > 0).length;
    const losers = portfolioStocks.filter((s) => (s.change_percent || 0) < 0).length;

    const filteredStocks = portfolioStocks.filter((stock) =>
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get watchlist stocks
    const watchlistStocks = watchlistData && watchlistData.stocks ? watchlistData.stocks.map(ws => ({
        id: ws.symbol,
        symbol: ws.symbol,
        company_name: ws.name || ws.symbol,
        current_price: ws.current_price || 0,
        change_percent: ws.change_percent || 0,
        sector: 'Unknown',
        is_trending: Math.abs(ws.change_percent || 0) > 2,
        watchlist_id: ws.symbol,
        is_sample: ws.symbol && ws.symbol.includes('sample')
    })) : [];

    const filteredWatchlistStocks = watchlistStocks.filter((stock) =>
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                                <Link to={createPageUrl("Profile")}>
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

                {/* Portfolio Summary */}
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
                                    <p className="text-3xl font-bold text-slate-900 mt-2">{watchlistStocks.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                                    <Eye className="w-6 h-6 text-amber-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Navigation Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex justify-end mb-6">
                        <TabsList className="bg-transparent p-1 rounded-lg grid grid-cols-2 gap-2 w-auto">
                            <TabsTrigger
                                value="portfolio"
                                className="bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 px-8 py-2.5 text-sm font-semibold rounded-xl shadow-md flex items-center gap-3 transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg">
                                <TrendingUp className="w-4 h-4" />
                                Portfolio
                            </TabsTrigger>

                            <TabsTrigger
                                value="watchlist"
                                className="bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 px-8 py-2.5 text-sm font-semibold rounded-xl shadow-md flex items-center gap-3 transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg">
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
                                                ₹{stats.currentValue > 0 ? (stats.currentValue / 100000).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'L' : '0.0L'}
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
                                                {stats.totalInvested > 0 ? `${stats.totalPLPercent.toFixed(2)}%` : '0.0%'}
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
                                            className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                                        />
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
                                            className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${viewMode === 'grid' ?
                                                'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm' :
                                                'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white'}`
                                            }>
                                            <LayoutGrid className="w-4 h-4 mr-2" />
                                            Grid
                                        </Button>
                                        <Button
                                            onClick={() => setViewMode('list')}
                                            className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${viewMode === 'list' ?
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
                        {filteredStocks.length === 0 ? (
                            <Card className="bg-white border rounded-lg shadow-sm">
                                <CardContent className="p-12 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <TrendingUp className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No stocks found in your portfolio</h3>
                                    <p className="text-gray-500">Start building your portfolio by adding some stocks</p>
                                </CardContent>
                            </Card>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {filteredStocks.map((stock) => (
                                    <Card key={stock.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 relative">
                                        <div className="absolute top-3 right-3 flex items-center gap-2">
                                            {stock.is_trending && (
                                                <Badge className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-md">
                                                    🔥 Hot
                                                </Badge>
                                            )}
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
                                                    {stock.change_percent >= 0 ? (
                                                        <span className="text-emerald-600 text-sm flex items-center">
                                                            <TrendingUp className="w-3 h-3 mr-1" />
                                                            +{stock.change_percent.toFixed(2)}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-600 text-sm flex items-center">
                                                            <TrendingDown className="w-3 h-3 mr-1" />
                                                            {stock.change_percent.toFixed(2)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {stock.user_investment_data ? (
                                                <div className="bg-blue-50 rounded-lg p-3 mb-3">
                                                    <p className="text-xs font-medium text-blue-700 mb-1">Investment Details</p>
                                                    <p className="text-xs text-gray-600">Qty: <span className="font-medium">{stock.user_investment_data.quantity}</span></p>
                                                    <p className="text-xs text-gray-600">Avg: <span className="font-medium">₹{stock.user_investment_data.avg_buy_price.toFixed(2)}</span></p>
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                                    <p className="text-xs text-gray-500 font-medium">Watchlist only</p>
                                                </div>
                                            )}

                                            {/* Community Insights */}
                                            <div className="bg-purple-50 rounded-lg p-3 mb-3">
                                                <div className="flex items-center gap-1 mb-2">
                                                    <Award className="w-3 h-3 text-purple-600" />
                                                    <span className="text-xs font-medium text-purple-900">Community Insights</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${stock.change_percent >= 0 ?
                                                        'bg-emerald-100 text-emerald-700' :
                                                        'bg-amber-100 text-amber-700'}`
                                                    }>
                                                        {stock.change_percent >= 0 ? 'BUY' : 'HOLD'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">50% confidence</span>
                                                </div>
                                            </div>

                                            {/* Sector Badge */}
                                            <div className="mb-3">
                                                <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-700 hover:text-white text-xs px-2 py-1 rounded-md border border-gray-200 transition-colors duration-200">
                                                    {stock.sector}
                                                </Badge>
                                            </div>

                                            {/* Action Buttons */}
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
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredStocks.map((stock) => (
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
                                                        {stock.is_trending && (
                                                            <Badge className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-md">
                                                                🔥 Hot
                                                            </Badge>
                                                        )}
                                                        {stock.user_investment_data && (
                                                            <Badge className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-md">
                                                                📈 Invested
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-gray-900">
                                                            ₹{stock.current_price.toFixed(2)}
                                                        </div>
                                                        <div className="flex items-center justify-end gap-1">
                                                            {stock.change_percent >= 0 ? (
                                                                <span className="text-emerald-600 text-sm flex items-center">
                                                                    <TrendingUp className="w-3 h-3 mr-1" />
                                                                    +{stock.change_percent.toFixed(2)}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-red-600 text-sm flex items-center">
                                                                    <TrendingDown className="w-3 h-3 mr-1" />
                                                                    {stock.change_percent.toFixed(2)}%
                                                                </span>
                                                            )}
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
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Watchlist Tab Content */}
                    <TabsContent value="watchlist" className="space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 rounded-lg shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-blue-600 text-xs font-medium uppercase tracking-wide">Total Stocks</p>
                                            <p className="text-xl font-bold text-blue-900 mt-1">{filteredWatchlistStocks.length}</p>
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
                                                {filteredWatchlistStocks.length > 0 ?
                                                    `${(filteredWatchlistStocks.reduce((sum, s) => sum + s.change_percent, 0) / filteredWatchlistStocks.length).toFixed(1)}%` :
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
                                            <p className="text-xl font-bold text-emerald-900 mt-1">{filteredWatchlistStocks.filter((s) => (s.change_percent || 0) > 0).length}</p>
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
                                            <p className="text-xl font-bold text-red-900 mt-1">{filteredWatchlistStocks.filter((s) => (s.change_percent || 0) < 0).length}</p>
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
                                            className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => setShowAddStockModal(true)}
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 rounded-lg px-4 py-2 font-medium transition-all duration-200">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add to Watchlist
                                        </Button>

                                        <Button
                                            onClick={() => setViewMode('grid')}
                                            className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${viewMode === 'grid' ?
                                                'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm' :
                                                'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white'}`
                                            }>
                                            <LayoutGrid className="w-4 h-4 mr-2" />
                                            Grid
                                        </Button>
                                        <Button
                                            onClick={() => setViewMode('list')}
                                            className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${viewMode === 'list' ?
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

                        {/* Watchlist Empty State or Stock Grid */}
                        {filteredWatchlistStocks.length === 0 ? (
                            <Card className="bg-white border rounded-lg shadow-sm">
                                <CardContent className="p-12 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Eye className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Your watchlist is empty</h3>
                                    <p className="text-gray-500">Add some stocks to track their performance</p>
                                </CardContent>
                            </Card>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {filteredWatchlistStocks.map((stock) => (
                                    <Card key={stock.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 relative">
                                        <div className="absolute top-3 right-3 flex items-center gap-2">
                                            {stock.is_trending && (
                                                <Badge className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-md">
                                                    🔥 Hot
                                                </Badge>
                                            )}
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
                                                    {stock.change_percent >= 0 ? (
                                                        <span className="text-emerald-600 text-sm flex items-center">
                                                            <TrendingUp className="w-3 h-3 mr-1" />
                                                            +{stock.change_percent.toFixed(2)}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-600 text-sm flex items-center">
                                                            <TrendingDown className="w-3 h-3 mr-1" />
                                                            {stock.change_percent.toFixed(2)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                                <p className="text-xs text-gray-500 font-medium">Watchlist only</p>
                                            </div>

                                            {/* Community Insights */}
                                            <div className="bg-purple-50 rounded-lg p-3 mb-3">
                                                <div className="flex items-center gap-1 mb-2">
                                                    <Award className="w-3 h-3 text-purple-600" />
                                                    <span className="text-xs font-medium text-purple-900">Community Insights</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${stock.change_percent >= 0 ?
                                                        'bg-emerald-100 text-emerald-700' :
                                                        'bg-amber-100 text-amber-700'}`
                                                    }>
                                                        {stock.change_percent >= 0 ? 'BUY' : 'HOLD'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">50% confidence</span>
                                                </div>
                                            </div>

                                            {/* Sector Badge */}
                                            <div className="mb-3">
                                                <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-700 hover:text-white text-xs px-2 py-1 rounded-md border border-gray-200 transition-colors duration-200">
                                                    {stock.sector}
                                                </Badge>
                                            </div>

                                            {/* Action Buttons */}
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
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredWatchlistStocks.map((stock) => (
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
                                                        {stock.is_trending && (
                                                            <Badge className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-md">
                                                                🔥 Hot
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-gray-900">
                                                            ₹{stock.current_price.toFixed(2)}
                                                        </div>
                                                        <div className="flex items-center justify-end gap-1">
                                                            {stock.change_percent >= 0 ? (
                                                                <span className="text-emerald-600 text-sm flex items-center">
                                                                    <TrendingUp className="w-3 h-3 mr-1" />
                                                                    +{stock.change_percent.toFixed(2)}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-red-600 text-sm flex items-center">
                                                                    <TrendingDown className="w-3 h-3 mr-1" />
                                                                    {stock.change_percent.toFixed(2)}%
                                                                </span>
                                                            )}
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
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Enhanced Modals */}
                {showAddStockModal && (
                    <AddStockModal
                        open={showAddStockModal}
                        onClose={() => setShowAddStockModal(false)}
                        watchlist={watchlistStocks}
                        onAddStock={handleAddStockToWatchlist}
                    />
                )}

                {showAddInvestmentModal && (
                    <AddInvestmentModal
                        open={showAddInvestmentModal}
                        onClose={() => setShowAddInvestmentModal(false)}
                        onSave={handleAddInvestment}
                        stocks={portfolioStocks}
                    />
                )}

                {showAlertModal && (
                    <AlertModal
                        open={showAlertModal}
                        onClose={() => setShowAlertModal(false)}
                        stock={selectedStockForAlert}
                        onSave={handleSaveAlert}
                        user={user}
                    />
                )}
            </div>
        </div>
    );
}
