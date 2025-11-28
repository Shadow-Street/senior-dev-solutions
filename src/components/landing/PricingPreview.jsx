import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function PricingPreview() {
  const plans = [
    {
      name: "Basic",
      price: "Free",
      period: "forever",
      icon: Check,
      color: "from-gray-500 to-gray-600",
      features: [
        "Community Chat Rooms",
        "Basic Polls Access",
        "Market News Updates",
        "Portfolio Tracking"
      ],
      recommended: false
    },
    {
      name: "Premium",
      price: "₹499",
      period: "/month",
      icon: Zap,
      color: "from-blue-500 to-purple-600",
      features: [
        "Everything in Basic",
        "Advisor Recommendations",
        "Premium Polls",
        "Pledge Pool Access",
        "Advanced Analytics"
      ],
      recommended: true
    },
    {
      name: "VIP",
      price: "₹999",
      period: "/month",
      icon: Crown,
      color: "from-purple-500 to-pink-600",
      features: [
        "Everything in Premium",
        "Priority Support 24/7",
        "Exclusive Events",
        "1-on-1 Expert Sessions",
        "Custom Portfolio Analysis"
      ],
      recommended: false
    }
  ];

  return (
    <section className="py-20 px-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the plan that fits your trading journey
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="relative"
            >
              {/* Recommended Badge */}
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 text-sm font-semibold shadow-lg">
                    Most Popular
                  </Badge>
                </div>
              )}

              <Card className={`relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 ${plan.recommended ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
                <CardContent className="p-8">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6`}>
                    <plan.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-gray-600 ml-1">
                      {plan.period}
                    </span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Link to={createPageUrl('Subscription')}>
                    <Button
                      className={`w-full ${
                        plan.recommended
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                          : 'bg-gray-900 hover:bg-gray-800'
                      } text-white rounded-full py-6 text-lg font-semibold shadow-lg`}
                    >
                      {plan.price === "Free" ? "Get Started Free" : "Choose Plan"}
                    </Button>
                  </Link>
                </CardContent>

                {/* Decorative gradient */}
                {plan.recommended && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-5 pointer-events-none`}></div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-gray-600 mb-4">
            Not sure which plan to choose? Compare all features
          </p>
          <Link to={createPageUrl('Subscription')}>
            <Button variant="outline" className="rounded-full px-8 py-6 text-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50">
              View Detailed Comparison
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}