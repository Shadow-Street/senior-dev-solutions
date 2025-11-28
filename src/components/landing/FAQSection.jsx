
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export default function FAQSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          question: "What is Protocall and how does it work?",
          answer: "Protocall is India's largest retail investor community platform that connects traders, advisors, and financial influencers. You can join chat rooms, participate in community polls, attend events, get expert recommendations, and collaborate on stock pledges - all in one place."
        },
        {
          question: "How do I create an account?",
          answer: "Click on 'Get Started' or 'Sign Up' button on the homepage. You can sign up using your email, Google account, or mobile number. Complete the verification process, and you're ready to start trading smarter with the community!"
        },
        {
          question: "Is Protocall free to use?",
          answer: "Protocall offers both free and premium plans. Free users can access basic features like community polls, chat rooms, and market news. Premium subscribers get access to exclusive features like Pledge Pool, advisor recommendations, premium events, and advanced analytics."
        }
      ]
    },
    {
      category: "Trading Features",
      questions: [
        {
          question: "What is the Pledge Pool and how does it work?",
          answer: "Pledge Pool is our unique feature where community members can pool their buying power for specific stocks. When enough members pledge, we execute bulk orders at optimal prices. Premium feature - requires subscription and KYC verification."
        },
        {
          question: "How do Community Polls work?",
          answer: "Community Polls let you vote on stock sentiment (Buy/Sell/Hold) and see what other traders think. Real-time results show consensus, and you can filter by experience level. Great way to gauge market sentiment before making decisions."
        },
        {
          question: "Can I track my portfolio on Protocall?",
          answer: "Yes! The 'My Portfolio' feature lets you add your investments, track real-time prices, see profit/loss, set alerts, and analyze your holdings. It integrates with live market data to give you accurate information."
        }
      ]
    },
    {
      category: "Advisors & Experts",
      questions: [
        {
          question: "Who are the advisors on Protocall?",
          answer: "All advisors on Protocall are SEBI-registered professionals with verified credentials. They share market insights, stock recommendations, and educational content. You can subscribe to individual advisors to get their exclusive picks and analysis."
        },
        {
          question: "How do I become an advisor on Protocall?",
          answer: "Navigate to 'Become Advisor' from the dashboard. You'll need SEBI registration, professional credentials, and relevant experience. Submit your application with required documents, and our team will review it within 2-3 business days."
        },
        {
          question: "What are Finfluencers?",
          answer: "Finfluencers are verified financial content creators and educators who share videos, articles, courses, and market updates. They help you learn trading strategies, understand market movements, and improve your investment knowledge."
        }
      ]
    },
    {
      category: "Events & Learning",
      questions: [
        {
          question: "What types of events are available?",
          answer: "Protocall hosts webinars, workshops, live trading sessions, Q&A with experts, sector analysis sessions, and networking events. Events can be free or premium, online or offline. Check the Events page for upcoming sessions."
        },
        {
          question: "Can I organize my own event?",
          answer: "Yes! If you're an advisor, finfluencer, or educator, you can apply to become an event organizer. Create events, set ticket prices, manage attendees, and earn revenue. Apply through 'Become Organizer' in your dashboard."
        },
        {
          question: "How do I get event notifications?",
          answer: "Enable notifications in your profile settings. You'll receive reminders 24 hours before, 1 hour before, and when events start. You can choose email, push notifications, or in-app alerts."
        }
      ]
    },
    {
      category: "Subscription & Payment",
      questions: [
        {
          question: "What subscription plans are available?",
          answer: "We offer Basic (Free), Premium (₹999/month), and VIP (₹1,999/month) plans. Premium includes Pledge Pool, advisor picks, premium chat rooms. VIP adds priority support, exclusive events, advanced analytics, and custom features."
        },
        {
          question: "Can I cancel my subscription anytime?",
          answer: "Yes, you can cancel anytime from Profile → Subscription. Your access continues until the end of your billing period. No questions asked, though we'd love your feedback to improve!"
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept UPI, Credit/Debit cards, Net Banking, and popular wallets. All payments are secure and encrypted. We use Razorpay for payment processing."
        }
      ]
    },
    {
      category: "Safety & Compliance",
      questions: [
        {
          question: "Is Protocall SEBI compliant?",
          answer: "Yes, Protocall is fully SEBI-compliant. All our advisors are SEBI-registered, we follow strict KYC norms, maintain data security, and comply with all regulatory requirements for investment platforms."
        },
        {
          question: "How is my data protected?",
          answer: "We use bank-grade encryption, secure servers, and follow ISO 27001 standards. Your personal and financial data is never shared with third parties without consent. We're fully GDPR and data protection compliant."
        },
        {
          question: "What are the risks involved in trading?",
          answer: "Trading involves market risks. Past performance doesn't guarantee future results. Pledge Pool and community recommendations are for informational purposes only. Always do your own research and invest only what you can afford to lose."
        }
      ]
    },
    {
      category: "Technical Support",
      questions: [
        {
          question: "How do I report a bug or technical issue?",
          answer: "Go to Feedback page or contact support@protocall.in. Describe the issue, attach screenshots if possible, and our tech team will respond within 24 hours. Premium users get priority support."
        },
        {
          question: "Can I use Protocall on mobile?",
          answer: "Yes! Protocall is fully mobile-responsive. Access it through any mobile browser. We're also working on native iOS and Android apps - coming soon in Q2 2025!"
        },
        {
          question: "What if I forget my password?",
          answer: "Click 'Forgot Password' on the login page. Enter your registered email, and we'll send a password reset link. Link is valid for 1 hour. If you face issues, contact support."
        }
      ]
    }
  ];

  // Flatten all questions for the expanded view
  const allQuestions = faqs.flatMap((category, categoryIndex) =>
    category.questions.map((q, qIndex) => ({
      ...q,
      category: category.category,
      globalIndex: `${categoryIndex}-${qIndex}`
    }))
  );

  return (
    <div className="w-full py-16 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <HelpCircle className="w-8 h-8 text-blue-600" />
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h2>
          </div>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Everything you need to know about Protocall and how to make the most of our platform
          </p>
        </div>

        {/* Single Expandable Section */}
        <div className="mb-8">
          <Card
            className="overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer border-0 bg-white"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    View All Frequently Asked Questions
                  </h3>
                </div>
                <div className={`flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                  {isExpanded ? (
                    <ChevronUp className="w-6 h-6 text-blue-600" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-slate-400" />
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Expanded FAQ Content */}
        {isExpanded && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {faqs.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
                  {category.category}
                </h3>
                <div className="space-y-3">
                  {category.questions.map((faq, faqIndex) => (
                    <Card
                      key={faqIndex}
                      className="overflow-hidden transition-all duration-300 hover:shadow-lg border-0 bg-white p-6"
                    >
                      <h4 className="text-lg font-semibold text-slate-900 mb-3">
                        {faq.question}
                      </h4>
                      <p className="text-slate-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white border-0 shadow-2xl p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold mb-2">Still have questions?</h3>
            <p className="text-blue-100 mb-6">
              Our support team is here to help you 24/7
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="mailto:support@protocall.in"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-full hover:bg-blue-50 transition-colors w-full sm:w-auto"
              >
                Email Support
              </a>
              <a
                href="tel:+918045678900"
                className="inline-flex items-center justify-center px-6 py-3 bg-white/20 text-white font-semibold rounded-full hover:bg-white/30 transition-colors w-full sm:w-auto"
              >
                Call Us: +91-80-4567-8900
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
