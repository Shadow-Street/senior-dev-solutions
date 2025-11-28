import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle,
  Clock,
  Home,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { ContactInquiry } from '@/api/entities';
import { toast } from 'sonner';
import PageFooter from '../components/footer/PageFooter';
import { usePlatformSettings } from '../components/hooks/usePlatformSettings';

export default function ContactSupport() {
  const { settings } = usePlatformSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile_number: '',
    subject: 'general_inquiry',
    message: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await ContactInquiry.create({
        ...formData,
        status: 'new'
      });
      
      toast.success('Message sent successfully! We\'ll get back to you soon.');
      
      // Reset form
      setFormData({
        full_name: '',
        email: '',
        mobile_number: '',
        subject: 'general_inquiry',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error('Failed to send message. Please try again or email us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-12">
        <div className="max-w-5xl mx-auto px-6">
          <Link to={createPageUrl('Landing')}>
            <Button variant="outline" className="mb-6 bg-white/20 border-white/30 text-white hover:bg-white/30">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Contact Support</h1>
          </div>
          <p className="text-blue-100 text-lg">
            We're here to help. Get in touch with our team 24/7
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 bg-white shadow-lg border-0">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-600" />
                Call Us
              </h3>
              <p className="text-sm text-slate-600 mb-2">24/7 Phone Support</p>
              <a 
                href={`tel:${settings.contact_phone || '+918045678900'}`}
                className="text-lg font-semibold text-blue-600 hover:text-blue-700"
              >
                {settings.contact_phone || '+91-80-4567-8900'}
              </a>
            </Card>

            <Card className="p-6 bg-white shadow-lg border-0">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Email Us
              </h3>
              <p className="text-sm text-slate-600 mb-2">General Inquiries</p>
              <a 
                href={`mailto:${settings.contact_email || 'support@protocall.in'}`}
                className="text-blue-600 hover:text-blue-700 break-all"
              >
                {settings.contact_email || 'support@protocall.in'}
              </a>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Support Team</p>
                <a 
                  href={`mailto:${settings.support_email || 'help@protocall.in'}`}
                  className="text-blue-600 hover:text-blue-700 break-all"
                >
                  {settings.support_email || 'help@protocall.in'}
                </a>
              </div>
            </Card>

            <Card className="p-6 bg-white shadow-lg border-0">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                Visit Us
              </h3>
              <p className="text-sm text-slate-600 mb-2">Office Address</p>
              <p className="text-slate-700">
                {settings.company_address || 'Bangalore, Karnataka - 560001'}
                <br />
                India
              </p>
            </Card>

            <Card className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg border-0">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Support Hours
              </h3>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Monday - Friday: 9:00 AM - 6:00 PM IST</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>24/7 Emergency Support Available</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Response Time: Within 24 Hours</span>
                </p>
              </div>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="p-8 bg-white shadow-lg border-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Send Us a Message</h2>
                <p className="text-slate-600">Fill out the form below and we'll get back to you as soon as possible</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-semibold flex items-center gap-2">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                      className="border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="your.email@example.com"
                      required
                      className="border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="mobile_number" className="text-sm font-semibold">
                      Mobile Number (Optional)
                    </Label>
                    <Input
                      id="mobile_number"
                      value={formData.mobile_number}
                      onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                      placeholder="+91 98765 43210"
                      className="border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-sm font-semibold flex items-center gap-2">
                      Subject <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      required
                    >
                      <option value="general_inquiry">General Inquiry</option>
                      <option value="technical_support">Technical Support</option>
                      <option value="partnership">Partnership Opportunity</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-semibold flex items-center gap-2">
                    Message <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Tell us how we can help you..."
                    rows={6}
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Privacy Notice</p>
                      <p>
                        Your information will be used only to respond to your inquiry. 
                        We respect your privacy and will not share your details with third parties.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </Card>

            {/* FAQ Quick Links */}
            <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 mt-6">
              <div className="flex items-start gap-4">
                <HelpCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-2">Looking for Quick Answers?</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Check out our FAQ section for instant answers to common questions
                  </p>
                  <Link to={createPageUrl('Landing') + '#faq'}>
                    <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
                      View FAQs
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Additional Support Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-0 bg-white">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Live Chat</h3>
              <p className="text-sm text-slate-600 mb-4">
                Chat with our support team in real-time
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Start Chat
              </Button>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-0 bg-white">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Help Center</h3>
              <p className="text-sm text-slate-600 mb-4">
                Browse guides and documentation
              </p>
              <Link to={createPageUrl('Landing') + '#faq'}>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Visit Help Center
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-0 bg-white">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Emergency Support</h3>
              <p className="text-sm text-slate-600 mb-4">
                24/7 phone support for urgent issues
              </p>
              <a href={`tel:${settings.contact_phone || '+918045678900'}`}>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Call Now
                </Button>
              </a>
            </div>
          </Card>
        </div>

        {/* Support Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
          <Card className="p-6 text-center bg-white shadow-md border-0">
            <div className="text-3xl font-bold text-blue-600 mb-2">{'<24h'}</div>
            <p className="text-sm text-slate-600">Average Response Time</p>
          </Card>

          <Card className="p-6 text-center bg-white shadow-md border-0">
            <div className="text-3xl font-bold text-green-600 mb-2">98%</div>
            <p className="text-sm text-slate-600">Customer Satisfaction</p>
          </Card>

          <Card className="p-6 text-center bg-white shadow-md border-0">
            <div className="text-3xl font-bold text-purple-600 mb-2">10,000+</div>
            <p className="text-sm text-slate-600">Issues Resolved</p>
          </Card>

          <Card className="p-6 text-center bg-white shadow-md border-0">
            <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
            <p className="text-sm text-slate-600">Support Available</p>
          </Card>
        </div>

        {/* Support Types Info */}
        <Card className="mt-12 bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200">
          <div className="p-8">
            <h3 className="text-2xl font-bold mb-6 text-center">How Can We Help You?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold mb-1">Technical Support</h4>
                  <p className="text-sm text-slate-600">
                    Issues with login, payments, platform features, or bugs
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold mb-1">Account Assistance</h4>
                  <p className="text-sm text-slate-600">
                    Help with account setup, verification, or subscription management
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold mb-1">Trading Questions</h4>
                  <p className="text-sm text-slate-600">
                    Questions about Pledge Pool, polls, chat rooms, or portfolio tracking
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold mb-1">Partnership Inquiries</h4>
                  <p className="text-sm text-slate-600">
                    Business partnerships, advisor applications, or event collaborations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <PageFooter />
    </div>
  );
}