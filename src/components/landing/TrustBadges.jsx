import React from 'react';
import { Shield, Lock, Award, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TrustBadges() {
  const badges = [
    {
      icon: Shield,
      title: "SEBI Registered",
      description: "Verified advisors",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: Lock,
      title: "Bank-Grade Security",
      description: "256-bit encryption",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: Award,
      title: "ISO 27001 Certified",
      description: "Information security",
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: CheckCircle2,
      title: "RBI Compliant",
      description: "Payment security",
      color: "from-orange-500 to-red-600"
    }
  ];

  return (
    <section className="py-16 px-6 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Trusted by Thousands of Traders
          </h2>
          <p className="text-lg text-gray-600">
            Your security and trust are our top priorities
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 text-center group"
            >
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <badge.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm">
                {badge.title}
              </h3>
              <p className="text-xs text-gray-600">
                {badge.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}