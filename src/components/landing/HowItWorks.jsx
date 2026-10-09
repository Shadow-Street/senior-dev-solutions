
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus, Users, TrendingUp, LineChart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HowItWorks() {
  const steps = [
    {
      icon: UserPlus,
      title: "Sign Up Free",
      description: "Create your account in 2 minutes. No credit card required to start.",
      color: "from-protocall-deep to-protocall-blue",
      delay: 0.1
    },
    {
      icon: Users,
      title: "Invest",
      description: "Invest smarter with the power of community. Join forces with thousands of retail traders sharing insights, strategies, and real-time market intelligence.",
      color: "from-protocall-deep to-protocall-blue",
      delay: 0.2
    },
    {
      icon: TrendingUp,
      title: "Make Smart Trades",
      description: "Use community wisdom and expert advice to make informed investment decisions.",
      color: "from-protocall-deep to-protocall-blue",
      delay: 0.3
    },
    {
      icon: LineChart,
      title: "Track & Grow",
      description: "Monitor your portfolio, track performance, and grow your wealth over time.",
      color: "from-hold to-hold",
      delay: 0.4
    }
  ];

  return (
    <section className="py-20 px-6 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5">
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-protocall-deep to-protocall-blue bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="text-xl text-subtle max-w-3xl mx-auto">
              Start your trading journey in 4 simple steps
            </p>
          </motion.div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: step.delay }}
              whileHover={{ y: -10 }}
            >
              <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white group">
                {/* Step Number */}
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground group-hover:text-subtle transition-colors">
                    {index + 1}
                  </span>
                </div>

                <CardContent className="p-8">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-subtle leading-relaxed">
                    {step.description}
                  </p>

                  {/* Decorative Arrow (except last item) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute -right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </CardContent>

                {/* Hover gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`}></div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
