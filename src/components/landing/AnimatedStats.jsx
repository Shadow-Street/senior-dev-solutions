import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Users, Star, TrendingUp } from 'lucide-react';

export default function AnimatedStats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  const [traders, setTraders] = useState(0);
  const [rating, setRating] = useState(0);
  const [stocks, setStocks] = useState(0);

  useEffect(() => {
    if (isInView) {
      // Animate traders count
      const traderInterval = setInterval(() => {
        setTraders(prev => {
          if (prev >= 10000) {
            clearInterval(traderInterval);
            return 10000;
          }
          return prev + 250;
        });
      }, 30);

      // Animate rating
      const ratingInterval = setInterval(() => {
        setRating(prev => {
          if (prev >= 4.8) {
            clearInterval(ratingInterval);
            return 4.8;
          }
          return prev + 0.1;
        });
      }, 50);

      // Animate stocks
      const stocksInterval = setInterval(() => {
        setStocks(prev => {
          if (prev >= 1000) {
            clearInterval(stocksInterval);
            return 1000;
          }
          return prev + 25;
        });
      }, 30);

      return () => {
        clearInterval(traderInterval);
        clearInterval(ratingInterval);
        clearInterval(stocksInterval);
      };
    }
  }, [isInView]);

  const stats = [
    {
      icon: Users,
      value: `${traders.toLocaleString()}+`,
      label: "Active Traders",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: Star,
      value: rating.toFixed(1),
      label: "Average Rating",
      color: "from-yellow-500 to-orange-600"
    },
    {
      icon: TrendingUp,
      value: `${stocks.toLocaleString()}+`,
      label: "Stocks Tracked",
      color: "from-blue-500 to-purple-600"
    }
  ];

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="relative group"
        >
          <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300`}>
              <stat.icon className="w-8 h-8 text-white" />
            </div>

            {/* Value */}
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-gray-600 font-medium">
                {stat.label}
              </div>
            </div>

            {/* Decorative corner */}
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-5 rounded-bl-full`}></div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}