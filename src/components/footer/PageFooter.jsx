
import React from "react";
import {
  Shield,
  FileText,
  Lock,
  Cookie,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  CheckCircle,
  Calendar,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { usePlatformSettings } from "../hooks/usePlatformSettings";

export default function PageFooter() {
  const { settings } = usePlatformSettings();

  const socialLinks = [
    {
      name: 'Facebook',
      url: settings.facebook_url || '#',
      icon: Facebook,
      color: 'hover:text-blue-600',
      gradient: 'from-blue-500 to-blue-700',
      shadow: 'shadow-blue-500/50'
    },
    {
      name: 'Twitter',
      url: settings.twitter_url || '#',
      icon: Twitter,
      color: 'hover:text-blue-400',
      gradient: 'from-blue-400 to-blue-600',
      shadow: 'shadow-blue-400/50'
    },
    {
      name: 'Instagram',
      url: settings.instagram_url || '#',
      icon: Instagram,
      color: 'hover:text-pink-600',
      gradient: 'from-pink-500 to-purple-600',
      shadow: 'shadow-pink-500/50'
    },
    {
      name: 'LinkedIn',
      url: settings.linkedin_url || '#',
      icon: Linkedin,
      color: 'hover:text-blue-700',
      gradient: 'from-blue-600 to-blue-800',
      shadow: 'shadow-blue-600/50'
    },
    {
      name: 'YouTube',
      url: settings.youtube_url || '#',
      icon: Youtube,
      color: 'hover:text-red-600',
      gradient: 'from-red-500 to-red-700',
      shadow: 'shadow-red-500/50'
    }
  ];

  return (
    <footer className="bg-gradient-to-r from-blue-900 via-blue-800 to-purple-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-8">
          
          {/* Protocol Branding Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb21f4e5ccdcab161121f6/1dc7cf9b7_FinancialNetworkingLogoProtocol.png"
                alt="Protocall Logo"
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-xl font-bold">{settings.site_name || 'Protocall'}</span>
            </div>
            
            {/* Enhanced Brand Description */}
            <div className="mb-4 space-y-2">
              <p className="text-white leading-relaxed">
                India's largest retail investor community.
              </p>
              <p className="text-white/80 text-sm leading-relaxed">
                Join thousands of traders and investors coming together to share insights, learn, and make smarter trading decisions. Empower your journey with real conversations, real strategies, and real growth.
              </p>
            </div>
            
            {/* Social Media Icons - Embossed & Highlighted */}
            <div className="flex gap-3 mt-6">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                const hasUrl = social.url && social.url !== '#';
                
                return (
                  <a
                    key={social.name}
                    href={hasUrl ? social.url : '#'}
                    target={hasUrl ? "_blank" : "_self"}
                    rel={hasUrl ? "noopener noreferrer" : undefined}
                    onClick={(e) => {
                      if (!hasUrl) {
                        e.preventDefault();
                      }
                    }}
                    className={`
                      group relative w-11 h-11 rounded-xl 
                      bg-white/20 backdrop-blur-sm
                      flex items-center justify-center 
                      transition-all duration-300 ease-out
                      shadow-lg hover:shadow-xl
                      border border-white/30
                      ${hasUrl ? 'hover:scale-110 hover:-translate-y-1 cursor-pointer' : 'opacity-70 cursor-default'}
                      ${hasUrl ? `hover:bg-gradient-to-br hover:${social.gradient} hover:border-transparent hover:${social.shadow}` : ''}
                      before:absolute before:inset-0 before:rounded-xl
                      before:bg-gradient-to-br before:${social.gradient}
                      before:opacity-0 ${hasUrl ? 'before:hover:opacity-100' : ''}
                      before:transition-opacity before:duration-300
                      after:absolute after:inset-0.5 after:rounded-lg
                      after:bg-gradient-to-t after:from-white/10 after:to-transparent
                      after:pointer-events-none
                    `}
                    aria-label={social.name}
                    title={hasUrl ? `Follow us on ${social.name}` : `${social.name} (Coming Soon)`}
                  >
                    {/* Icon with glow effect */}
                    <Icon className={`
                      w-5 h-5 relative z-10 text-white
                      transition-all duration-300
                      ${hasUrl ? 'group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''}
                    `} />
                    
                    {/* Pulse animation for active links */}
                    {hasUrl && (
                      <span className="absolute inset-0 rounded-xl bg-white/20 animate-ping opacity-0 group-hover:opacity-75"></span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Legal & Compliance</h3>
            <div className="space-y-3">
              <Link 
                to={createPageUrl("Terms")} 
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Terms of Service</span>
              </Link>
              <Link 
                to={createPageUrl("Privacy")} 
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group text-sm"
              >
                <Lock className="w-4 h-4" />
                <span>Privacy Policy</span>
              </Link>
              <Link 
                to={createPageUrl("Cookies")} 
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group text-sm"
              >
                <Cookie className="w-4 h-4" />
                <span>Cookies Policy</span>
              </Link>
              <Link 
                to={createPageUrl("RiskDisclosure")} 
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group text-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Risk Disclosure</span>
              </Link>
            </div>
          </div>

          {/* Content & Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Content & Resources</h3>
            <div className="space-y-3">
              <Link 
                to={createPageUrl("News")} 
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Market News</span>
              </Link>
              <Link 
                to={createPageUrl("Blogs")} 
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Blogs & Articles</span>
              </Link>
              <Link 
                to={createPageUrl("Events")} 
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group text-sm"
              >
                <Calendar className="w-4 h-4" />
                <span>Events & Webinars</span>
              </Link>
              <Link 
                to={createPageUrl("Finfluencers")} 
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Learn from Experts</span>
              </Link>
            </div>
          </div>

          {/* Regulatory */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Regulatory</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-white/80">SEBI Registered</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-white/80">RBI Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-white/80">ISO 27001 Certified</span>
              </div>
            </div>
          </div>

          {/* Contact & Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Contact & Support</h3>
            <div className="space-y-3">
              {settings.contact_email && (
                <a 
                  href={`mailto:${settings.contact_email}`} 
                  className="flex items-start gap-2 text-white/70 hover:text-white transition-colors group text-sm"
                >
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="block">{settings.contact_email}</span>
                    <span className="text-xs text-white/60">General queries</span>
                  </div>
                </a>
              )}
              
              {settings.contact_phone && (
                <a 
                  href={`tel:${settings.contact_phone}`} 
                  className="flex items-start gap-2 text-white/70 hover:text-white transition-colors group text-sm"
                >
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="block">{settings.contact_phone}</span>
                    <span className="text-xs text-white/60">24/7 Support</span>
                  </div>
                </a>
              )}
              
              <Link
                to={createPageUrl("ContactSupport")}
                className="flex items-start gap-2 text-white/70 hover:text-white transition-colors group text-sm"
              >
                <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="block">Contact Support</span>
                  <span className="text-xs text-white/60">Get help instantly</span>
                </div>
              </Link>

              {settings.company_address && (
                <div className="flex items-start gap-2 text-white/70 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="block">{settings.company_address}</span>
                    <span className="text-xs text-white/60">India</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p className="text-white/60">
              © 2025 {settings.site_name || 'Protocall'}. All rights reserved. | India's Retail Investor Community
            </p>
            <div className="flex gap-6 text-white/60">
              <Link 
                to={createPageUrl("Sitemap")} 
                className="hover:text-white transition-colors"
              >
                Sitemap
              </Link>
              <Link 
                to={createPageUrl("Accessibility")} 
                className="hover:text-white transition-colors"
              >
                Accessibility
              </Link>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
