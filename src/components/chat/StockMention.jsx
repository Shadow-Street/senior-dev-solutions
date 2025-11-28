import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, ExternalLink, BarChart3, Sparkles } from 'lucide-react';
import { Stock } from '@/api/entities';
import { stockAPI } from '../stocks/LiveStockAPI';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function StockMention({ symbol }) {
  const [stockData, setStockData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadStockData();
  }, [symbol]);

  const loadStockData = async () => {
    try {
      setIsLoading(true);
      setError(false);

      const liveData = await stockAPI.getStockPrice(symbol);
      
      if (liveData) {
        setStockData(liveData);
      } else {
        const dbStocks = await Stock.filter({ symbol: symbol.toUpperCase() }, '', 1);
        if (dbStocks.length > 0) {
          setStockData(dbStocks[0]);
        } else {
          setError(true);
        }
      }
    } catch (error) {
      console.error('Error loading stock data:', error);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="my-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (error || !stockData) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm font-medium">
        <BarChart3 className="w-3 h-3" />
        {symbol}
      </span>
    );
  }

  const isPositive = stockData.change_percent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card className="my-2 p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-transparent hover:border-blue-300 hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Live indicator pulse */}
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <div className="flex items-center gap-3 relative z-10">
          {/* Stock Icon with gradient */}
          <motion.div 
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-md"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {stockData.symbol.substring(0, 3)}
          </motion.div>

          {/* Stock Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-slate-900 text-base truncate">{stockData.symbol}</h4>
              <Sparkles className="w-3 h-3 text-yellow-500" />
              <span className="text-xs text-slate-500 truncate">{stockData.company_name || ''}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="font-bold text-xl text-slate-900">
                ₹{stockData.current_price?.toFixed(2) || 0}
              </span>
              <motion.div 
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-semibold ${
                  isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{isPositive ? '+' : ''}{stockData.change_percent?.toFixed(2) || 0}%</span>
              </motion.div>
            </div>
          </div>

          {/* Quick Action Button with hover effect */}
          <Link to={`${createPageUrl('ChatRooms')}?stock_symbol=${stockData.symbol}`}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-md"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                View
              </Button>
            </motion.div>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}