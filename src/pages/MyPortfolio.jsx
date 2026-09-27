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
import { Link, useNavigate } from 'react-router-dom';

// Import components
import AddStockModal from '../components/stocks/AddStockModal';
import AddInvestmentModal from '../components/stocks/AddInvestmentModal';
import AlertModal from '../components/stocks/AlertModal';

export default function MyPortfolio() {
    const navigate = useNavigate();
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

        // Validate against what POST /api/portfolios requires: symbol, quantity, price.
        const symbol = (investmentData.stock_symbol || '').trim().toUpperCase();
        const quantity = Number(investmentData.quantity);
        const price = Number(investmentData.avg_buy_price);

        if (!symbol) return toast.error("Stock symbol is required.");
        if (!Number.isFinite(quantity) || quantity <= 0)
            return toast.error("Quantity must be a number greater than zero.");
        if (!Number.isFinite(price) || price <= 0)
            return toast.error("Buy price must be a number greater than zero.");

        // The backend averages into an existing holding rather than duplicating it.
        const existing = portfolioStocks.find(h => h.stock_symbol === symbol);

        try {
            await portfolioAPI.addStock(symbol, quantity, price);

            // Refresh from the server so totals and live P&L come from the API.
            const updatedPortfolio = await portfolioAPI.getPortfolio();
            setPortfolioData(updatedPortfolio);

            setShowAddInvestmentModal(false);
            toast.success(
                existing
                    ? `${symbol} updated — averaged into your existing holding.`
                    : `Investment in ${symbol} added!`
            );
        } catch (e) {
            const message =
                e?.response?.data?.error || e?.message || 'Failed to add investment.';
            toast.error(message);
        }
    };

    const handleChatClick = async (stockSymbol) => {
        try {
            const rooms = await ChatRoom.filter({ stock_symbol: stockSymbol }, '', 1);
            if (Array.isArray(rooms) && rooms.length > 0) {
                navigate(`${createPageUrl('ChatRooms')}?stock_symbol=${encodeURIComponent(stockSymbol)}`);
            } else {
                toast.info(`No Stock Chat Room has been opened for ${stockSymbol} yet.`);
            }
        } catch {
            toast.error(`Could not load the Stock Chat Room for ${stockSymbol}.`);
        }
    };

    const handlePollClick = async (stockSymbol) => {
        try {
            const polls = await Poll.filter({ stock_symbol: stockSymbol, is_active: true }, '', 1);
            if (Array.isArray(polls) && polls.length > 0) {
                navigate(`${createPageUrl('Polls')}?stock_symbol=${encodeURIComponent(stockSymbol)}`);
            } else {
                toast.info(`No Community Poll is running for ${stockSymbol} yet.`);
            }
        } catch {
            toast.error(`Could not load the Community Poll for ${stockSymbol}.`);
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
            <div className="flex items-center justify-center w-full bg-background">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-protocall-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-subtle">Loading your portfolio...</p>
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
        <div className="w-full bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Guest Mode Banner */}
                {!user && (
                    <div className="max-w-7xl mx-auto mb-6">
                        <div className="bg-premium-muted border border-protocall-premium-light rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-premium-muted flex items-center justify-center">
                                    <UserIcon className="w-5 h-5 text-protocall-blue" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-protocall-blue">Guest Mode - Sample Portfolio</p>
                                    <p className="text-xs text-protocall-blue mt-1">Log in to create and manage your own portfolio.</p>
                                </div>
                                <Link to={createPageUrl("Profile")}>
                                    <Button size="sm" className="bg-protocall-blue hover:bg-protocall-blue">
                                        Log In
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Compact Header */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-protocall-deep to-protocall-blue p-6 mb-6 shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-8 h-8 text-white" />
                            <h1 className="text-2xl font-bold text-white">My Portfolio</h1>
                        </div>
                        <p className="text-protocall-blue text-sm">
                            Track your investments and discover new opportunities
                        </p>
                    </div>
                </div>

                {/* Portfolio Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-white border-2 border-border shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-subtle text-sm font-medium">Total Invested</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">₹{stats.totalInvested.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="w-12 h-12 bg-buy-muted rounded-lg flex items-center justify-center">
                                    <IndianRupee className="w-6 h-6 text-buy-muted-foreground" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-2 border-border shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-subtle text-sm font-medium">Current Value</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">₹{stats.currentValue.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="w-12 h-12 bg-premium-muted rounded-lg flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-protocall-blue" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-2 border-border shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-subtle text-sm font-medium">Total P/L</p>
                                    <p className={`text-3xl font-bold mt-2 ${stats.totalPL >= 0 ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}`}>
                                        ₹{stats.totalPL.toLocaleString('en-IN')}
                                    </p>
                                    <p className={`text-sm mt-1 ${stats.totalPL >= 0 ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}`}>
                                        {stats.totalPLPercent.toFixed(2)}%
                                    </p>
                                </div>
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stats.totalPL >= 0 ? 'bg-buy-muted' : 'bg-sell-muted'}`}>
                                    {stats.totalPL >= 0 ?
                                        <TrendingUp className="w-6 h-6 text-buy-muted-foreground" /> :
                                        <TrendingDown className="w-6 h-6 text-sell-muted-foreground" />
                                    }
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-2 border-border shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-subtle text-sm font-medium">Watchlist Items</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">{watchlistStocks.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-hold-muted rounded-lg flex items-center justify-center">
                                    <Eye className="w-6 h-6 text-hold-muted-foreground" />
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
                                className="bg-background text-protocall-blue px-8 py-2.5 text-sm font-semibold rounded-xl shadow-md flex items-center gap-3 transition-all duration-300 hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg">
                                <TrendingUp className="w-4 h-4" />
                                Portfolio
                            </TabsTrigger>

                            <TabsTrigger
                                value="watchlist"
                                className="bg-background text-protocall-blue px-8 py-2.5 text-sm font-semibold rounded-xl shadow-md flex items-center gap-3 transition-all duration-300 hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg">
                                <BarChart3 className="w-4 h-4" />
                                Watchlist
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Portfolio Tab Content */}
                    <TabsContent value="portfolio" className="space-y-6">
                        {/* Compact Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="bg-background border-protocall-premium-light rounded-lg shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-protocall-blue text-xs font-medium uppercase tracking-wide">Portfolio Value</p>
                                            <p className="text-xl font-bold text-protocall-blue mt-1">
                                                ₹{stats.currentValue > 0 ? (stats.currentValue / 100000).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'L' : '0.0L'}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 bg-protocall-blue rounded-lg flex items-center justify-center">
                                            <IndianRupee className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-background border-protocall-premium-light rounded-lg shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-protocall-premium-text text-xs font-medium uppercase tracking-wide">Total Change</p>
                                            <p className="text-xl font-bold text-protocall-premium-text mt-1">
                                                {stats.totalInvested > 0 ? `${stats.totalPLPercent.toFixed(2)}%` : '0.0%'}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                            <BarChart3 className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-surface-2 to-buy-muted border-buy/30 rounded-lg shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-buy-muted-foreground text-xs font-medium uppercase tracking-wide">Gainers</p>
                                            <p className="text-xl font-bold text-buy-muted-foreground mt-1">{gainers}</p>
                                        </div>
                                        <div className="w-8 h-8 bg-buy rounded-lg flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-surface-2 to-sell-muted border-sell/30 rounded-lg shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sell-muted-foreground text-xs font-medium uppercase tracking-wide">Losers</p>
                                            <p className="text-xl font-bold text-sell-muted-foreground mt-1">{losers}</p>
                                        </div>
                                        <div className="w-8 h-8 bg-sell rounded-lg flex items-center justify-center">
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
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                        <Input
                                            placeholder="Search your portfolio..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 rounded-lg border border-border bg-white focus:border-protocall-blue focus:ring-1 focus:ring-ring transition-all duration-200"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => setShowAddInvestmentModal(true)}
                                            className="bg-buy-soft text-buy-foreground hover:from-buy hover:to-buy rounded-lg px-4 py-2 font-medium transition-all duration-200">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Investment
                                        </Button>
                                        <Button
                                            onClick={() => setViewMode('grid')}
                                            className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${viewMode === 'grid' ?
                                                'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-sm' :
                                                'bg-background text-protocall-blue hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white'}`
                                            }>
                                            <LayoutGrid className="w-4 h-4 mr-2" />
                                            Grid
                                        </Button>
                                        <Button
                                            onClick={() => setViewMode('list')}
                                            className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${viewMode === 'list' ?
                                                'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-sm' :
                                                'bg-background text-protocall-blue hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white'}`
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
                                    <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <TrendingUp className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-subtle mb-2">No stocks found in your portfolio</h3>
                                    <p className="text-muted-foreground">Start building your portfolio by adding some stocks</p>
                                </CardContent>
                            </Card>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {filteredStocks.map((stock) => (
                                    <Card key={stock.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 relative">
                                        <div className="absolute top-3 right-3 flex items-center gap-2">
                                            {stock.is_trending && (
                                                <Badge className="bg-hold-muted text-hold-muted-foreground text-xs px-2 py-1 rounded-md">
                                                    🔥 Hot
                                                </Badge>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-sell-muted hover:text-sell-muted-foreground rounded-md"
                                                onClick={() => handleDeleteStock(stock.id, stock.symbol)}>
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>

                                        <CardContent className="p-4">
                                            <div className="mb-3">
                                                <h3 className="font-bold text-foreground">{stock.symbol}</h3>
                                                <p className="text-sm text-muted-foreground truncate">{stock.company_name}</p>
                                            </div>

                                            <div className="mb-3">
                                                <div className="text-xl font-bold text-foreground mb-1">
                                                    ₹{stock.current_price.toFixed(2)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {stock.change_percent >= 0 ? (
                                                        <span className="text-buy-muted-foreground text-sm flex items-center">
                                                            <TrendingUp className="w-3 h-3 mr-1" />
                                                            +{stock.change_percent.toFixed(2)}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-sell-muted-foreground text-sm flex items-center">
                                                            <TrendingDown className="w-3 h-3 mr-1" />
                                                            {stock.change_percent.toFixed(2)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {stock.user_investment_data ? (
                                                <div className="bg-premium-muted rounded-lg p-3 mb-3">
                                                    <p className="text-xs font-medium text-protocall-blue mb-1">Investment Details</p>
                                                    <p className="text-xs text-subtle">Qty: <span className="font-medium">{stock.user_investment_data.quantity}</span></p>
                                                    <p className="text-xs text-subtle">Avg: <span className="font-medium">₹{stock.user_investment_data.avg_buy_price.toFixed(2)}</span></p>
                                                </div>
                                            ) : (
                                                <div className="bg-surface-2 rounded-lg p-3 mb-3">
                                                    <p className="text-xs text-muted-foreground font-medium">Watchlist only</p>
                                                </div>
                                            )}

                                            {/* Community Insights */}
                                            <div className="bg-premium-muted rounded-lg p-3 mb-3">
                                                <div className="flex items-center gap-1 mb-2">
                                                    <Award className="w-3 h-3 text-protocall-premium-text" />
                                                    <span className="text-xs font-medium text-protocall-premium-text">Community Insights</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${stock.change_percent >= 0 ?
                                                        'bg-buy-muted text-buy-muted-foreground' :
                                                        'bg-hold-muted text-hold-muted-foreground'}`
                                                    }>
                                                        {stock.change_percent >= 0 ? 'BUY' : 'HOLD'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">50% confidence</span>
                                                </div>
                                            </div>

                                            {/* Sector Badge */}
                                            <div className="mb-3">
                                                <Badge className="bg-surface-2 text-subtle hover:bg-protocall-ink hover:text-white text-xs px-2 py-1 rounded-md border border-border transition-colors duration-200">
                                                    {stock.sector}
                                                </Badge>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        onClick={() => handleChatClick(stock.symbol)}
                                                        className="bg-premium-muted hover:bg-premium-muted text-protocall-blue hover:text-protocall-blue border-0 rounded-md text-xs py-2 font-medium transition-all duration-200">
                                                        <MessageSquare className="w-3 h-3 mr-1" />
                                                        Chat
                                                    </Button>
                                                    <Button
                                                        onClick={() => handlePollClick(stock.symbol)}
                                                        className="bg-buy-muted hover:bg-buy-muted text-buy-muted-foreground hover:text-buy-muted-foreground border-0 rounded-md text-xs py-2 font-medium transition-all duration-200">
                                                        <BarChart3 className="w-3 h-3 mr-1" />
                                                        Poll
                                                    </Button>
                                                </div>
                                                <Button
                                                    onClick={() => handleOpenAlertModal(stock)}
                                                    className="w-full bg-hold-muted hover:bg-hold-muted text-hold-muted-foreground hover:text-hold-muted-foreground border-0 rounded-md text-xs py-2 font-medium transition-all duration-200">
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
                                                        <h3 className="font-bold text-foreground">{stock.symbol}</h3>
                                                        <p className="text-sm text-subtle">{stock.company_name}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-surface-2 text-subtle hover:bg-protocall-ink hover:text-white text-xs px-2 py-1 rounded-md border border-border transition-colors duration-200">
                                                            {stock.sector}
                                                        </Badge>
                                                        {stock.is_trending && (
                                                            <Badge className="bg-hold-muted text-hold-muted-foreground text-xs px-2 py-1 rounded-md">
                                                                🔥 Hot
                                                            </Badge>
                                                        )}
                                                        {stock.user_investment_data && (
                                                            <Badge className="bg-buy-muted text-buy-muted-foreground text-xs px-2 py-1 rounded-md">
                                                                📈 Invested
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-foreground">
                                                            ₹{stock.current_price.toFixed(2)}
                                                        </div>
                                                        <div className="flex items-center justify-end gap-1">
                                                            {stock.change_percent >= 0 ? (
                                                                <span className="text-buy-muted-foreground text-sm flex items-center">
                                                                    <TrendingUp className="w-3 h-3 mr-1" />
                                                                    +{stock.change_percent.toFixed(2)}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-sell-muted-foreground text-sm flex items-center">
                                                                    <TrendingDown className="w-3 h-3 mr-1" />
                                                                    {stock.change_percent.toFixed(2)}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            onClick={() => handleOpenAlertModal(stock)}
                                                            className="bg-hold-muted hover:bg-hold-muted text-hold-muted-foreground hover:text-hold-muted-foreground border-0 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200">
                                                            <Bell className="w-3 h-3 mr-1" />
                                                            Alert
                                                        </Button>

                                                        <Button
                                                            onClick={() => handleDeleteStock(stock.id, stock.symbol)}
                                                            className="w-8 h-8 p-0 rounded-lg bg-sell-muted hover:bg-sell-muted text-sell hover:text-sell-muted-foreground transition-all duration-200 border border-sell/30">
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
                            <Card className="bg-background border-protocall-premium-light rounded-lg shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-protocall-blue text-xs font-medium uppercase tracking-wide">Total Stocks</p>
                                            <p className="text-xl font-bold text-protocall-blue mt-1">{filteredWatchlistStocks.length}</p>
                                        </div>
                                        <div className="w-8 h-8 bg-protocall-blue rounded-lg flex items-center justify-center">
                                            <Eye className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-background border-protocall-premium-light rounded-lg shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-protocall-premium-text text-xs font-medium uppercase tracking-wide">Avg Change</p>
                                            <p className="text-xl font-bold text-protocall-premium-text mt-1">
                                                {filteredWatchlistStocks.length > 0 ?
                                                    `${(filteredWatchlistStocks.reduce((sum, s) => sum + s.change_percent, 0) / filteredWatchlistStocks.length).toFixed(1)}%` :
                                                    '0.0%'}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-surface-2 to-buy-muted border-buy/30 rounded-lg shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-buy-muted-foreground text-xs font-medium uppercase tracking-wide">Gainers</p>
                                            <p className="text-xl font-bold text-buy-muted-foreground mt-1">{filteredWatchlistStocks.filter((s) => (s.change_percent || 0) > 0).length}</p>
                                        </div>
                                        <div className="w-8 h-8 bg-buy rounded-lg flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-surface-2 to-sell-muted border-sell/30 rounded-lg shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sell-muted-foreground text-xs font-medium uppercase tracking-wide">Losers</p>
                                            <p className="text-xl font-bold text-sell-muted-foreground mt-1">{filteredWatchlistStocks.filter((s) => (s.change_percent || 0) < 0).length}</p>
                                        </div>
                                        <div className="w-8 h-8 bg-sell rounded-lg flex items-center justify-center">
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
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                        <Input
                                            placeholder="Search your watchlist..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 rounded-lg border border-border bg-white focus:border-protocall-blue focus:ring-1 focus:ring-ring transition-all duration-200"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => setShowAddStockModal(true)}
                                            className="bg-buy-soft text-buy-foreground hover:from-buy hover:to-buy rounded-lg px-4 py-2 font-medium transition-all duration-200">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add to Watchlist
                                        </Button>

                                        <Button
                                            onClick={() => setViewMode('grid')}
                                            className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${viewMode === 'grid' ?
                                                'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-sm' :
                                                'bg-background text-protocall-blue hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white'}`
                                            }>
                                            <LayoutGrid className="w-4 h-4 mr-2" />
                                            Grid
                                        </Button>
                                        <Button
                                            onClick={() => setViewMode('list')}
                                            className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${viewMode === 'list' ?
                                                'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-sm' :
                                                'bg-background text-protocall-blue hover:bg-gradient-to-r hover:from-protocall-deep hover:to-protocall-blue hover:text-white'}`
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
                                    <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Eye className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-subtle mb-2">Your watchlist is empty</h3>
                                    <p className="text-muted-foreground">Add some stocks to track their performance</p>
                                </CardContent>
                            </Card>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {filteredWatchlistStocks.map((stock) => (
                                    <Card key={stock.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 relative">
                                        <div className="absolute top-3 right-3 flex items-center gap-2">
                                            {stock.is_trending && (
                                                <Badge className="bg-hold-muted text-hold-muted-foreground text-xs px-2 py-1 rounded-md">
                                                    🔥 Hot
                                                </Badge>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-sell-muted hover:text-sell-muted-foreground rounded-md"
                                                onClick={() => handleDeleteStock(stock.id, stock.symbol)}>
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>

                                        <CardContent className="p-4">
                                            <div className="mb-3">
                                                <h3 className="font-bold text-foreground">{stock.symbol}</h3>
                                                <p className="text-sm text-muted-foreground truncate">{stock.company_name}</p>
                                            </div>

                                            <div className="mb-3">
                                                <div className="text-xl font-bold text-foreground mb-1">
                                                    ₹{stock.current_price.toFixed(2)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {stock.change_percent >= 0 ? (
                                                        <span className="text-buy-muted-foreground text-sm flex items-center">
                                                            <TrendingUp className="w-3 h-3 mr-1" />
                                                            +{stock.change_percent.toFixed(2)}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-sell-muted-foreground text-sm flex items-center">
                                                            <TrendingDown className="w-3 h-3 mr-1" />
                                                            {stock.change_percent.toFixed(2)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-surface-2 rounded-lg p-3 mb-3">
                                                <p className="text-xs text-muted-foreground font-medium">Watchlist only</p>
                                            </div>

                                            {/* Community Insights */}
                                            <div className="bg-premium-muted rounded-lg p-3 mb-3">
                                                <div className="flex items-center gap-1 mb-2">
                                                    <Award className="w-3 h-3 text-protocall-premium-text" />
                                                    <span className="text-xs font-medium text-protocall-premium-text">Community Insights</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${stock.change_percent >= 0 ?
                                                        'bg-buy-muted text-buy-muted-foreground' :
                                                        'bg-hold-muted text-hold-muted-foreground'}`
                                                    }>
                                                        {stock.change_percent >= 0 ? 'BUY' : 'HOLD'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">50% confidence</span>
                                                </div>
                                            </div>

                                            {/* Sector Badge */}
                                            <div className="mb-3">
                                                <Badge className="bg-surface-2 text-subtle hover:bg-protocall-ink hover:text-white text-xs px-2 py-1 rounded-md border border-border transition-colors duration-200">
                                                    {stock.sector}
                                                </Badge>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        onClick={() => handleChatClick(stock.symbol)}
                                                        className="bg-premium-muted hover:bg-premium-muted text-protocall-blue hover:text-protocall-blue border-0 rounded-md text-xs py-2 font-medium transition-all duration-200">
                                                        <MessageSquare className="w-3 h-3 mr-1" />
                                                        Chat
                                                    </Button>
                                                    <Button
                                                        onClick={() => handlePollClick(stock.symbol)}
                                                        className="bg-buy-muted hover:bg-buy-muted text-buy-muted-foreground hover:text-buy-muted-foreground border-0 rounded-md text-xs py-2 font-medium transition-all duration-200">
                                                        <BarChart3 className="w-3 h-3 mr-1" />
                                                        Poll
                                                    </Button>
                                                </div>
                                                <Button
                                                    onClick={() => handleOpenAlertModal(stock)}
                                                    className="w-full bg-hold-muted hover:bg-hold-muted text-hold-muted-foreground hover:text-hold-muted-foreground border-0 rounded-md text-xs py-2 font-medium transition-all duration-200">
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
                                                        <h3 className="font-bold text-foreground">{stock.symbol}</h3>
                                                        <p className="text-sm text-subtle">{stock.company_name}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-surface-2 text-subtle hover:bg-protocall-ink hover:text-white text-xs px-2 py-1 rounded-md border border-border transition-colors duration-200">
                                                            {stock.sector}
                                                        </Badge>
                                                        {stock.is_trending && (
                                                            <Badge className="bg-hold-muted text-hold-muted-foreground text-xs px-2 py-1 rounded-md">
                                                                🔥 Hot
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-foreground">
                                                            ₹{stock.current_price.toFixed(2)}
                                                        </div>
                                                        <div className="flex items-center justify-end gap-1">
                                                            {stock.change_percent >= 0 ? (
                                                                <span className="text-buy-muted-foreground text-sm flex items-center">
                                                                    <TrendingUp className="w-3 h-3 mr-1" />
                                                                    +{stock.change_percent.toFixed(2)}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-sell-muted-foreground text-sm flex items-center">
                                                                    <TrendingDown className="w-3 h-3 mr-1" />
                                                                    {stock.change_percent.toFixed(2)}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            onClick={() => handleOpenAlertModal(stock)}
                                                            className="bg-hold-muted hover:bg-hold-muted text-hold-muted-foreground hover:text-hold-muted-foreground border-0 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200">
                                                            <Bell className="w-3 h-3 mr-1" />
                                                            Alert
                                                        </Button>

                                                        <Button
                                                            onClick={() => handleDeleteStock(stock.id, stock.symbol)}
                                                            className="w-8 h-8 p-0 rounded-lg bg-sell-muted hover:bg-sell-muted text-sell hover:text-sell-muted-foreground transition-all duration-200 border border-sell/30">
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
