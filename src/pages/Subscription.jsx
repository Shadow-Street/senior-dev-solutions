import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PlanCard from "../components/subscription/PlanCard";
import PaymentModal from "../components/subscription/PaymentModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const samplePlans = [
  {
    id: "basic_sample",
    name: "Basic",
    description: "Access essential features to start your journey.",
    price_monthly: 0,
    price_annually: 0,
    is_active: true,
    features: ['Chat Rooms', 'Community Polls'],
    recommended: false,
  },
  {
    id: "premium_sample",
    name: "Premium",
    description: "Unlock advanced tools and exclusive content.",
    price_monthly: 499,
    price_annually: 4999,
    is_active: true,
    features: ['Chat Rooms', 'Community Polls', 'Advisor Picks', 'Premium Polls', 'Pledge Pool Access'],
    recommended: true,
  },
  {
    id: "vip_sample",
    name: "VIP",
    description: "All features, priority support, and exclusive events.",
    price_monthly: 999,
    price_annually: 9999,
    is_active: true,
    features: ['Chat Rooms', 'Community Polls', 'Advisor Picks', 'Premium Polls', 'Pledge Pool Access', 'Priority Support', 'Exclusive Events'],
    recommended: false,
  }
];

export default function SubscriptionPage() {
  const [subscriptionPlans, setSubscriptionPlans] = useState(samplePlans);
  const user = null; // Guest mode - no authentication
  const currentSubscription = null;
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    // No API calls - just show plans
    setIsLoading(false);
  }, []);

  const handleSelectPlan = (plan, cycle) => {
    toast.info("Feature demo - subscription requires login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full">
            <Crown className="w-5 h-5" />
            <span className="font-semibold">Premium Features</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Choose Your Plan
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Unlock exclusive features, advisor picks, and premium content to enhance your trading journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {subscriptionPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={false}
              currentPlanTier={null}
              onSelect={handleSelectPlan}
              user={user}
              allPlans={subscriptionPlans}
            />
          ))}
        </div>

        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <CardTitle className="text-center text-2xl font-bold text-gray-900">
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="item-1" className="border rounded-xl px-4 bg-white">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">1</span>
                    </div>
                    <span className="font-semibold text-gray-900">Can I cancel anytime?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-gray-600 text-sm">
                    Yes, you can cancel your subscription at any time with no penalties.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-xl px-4 bg-white">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-sm">2</span>
                    </div>
                    <span className="font-semibold text-gray-900">What payment methods do you accept?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-gray-600 text-sm">
                    We accept all major credit/debit cards, UPI, and net banking.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}