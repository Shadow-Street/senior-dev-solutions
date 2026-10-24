
import React from "react";
import {
  Crosshair,
  FileText,
  Newspaper,
  GraduationCap,
  Lock,
  Cookie,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  CheckCircle,
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
    },
    {
      name: 'Twitter',
      url: settings.twitter_url || '#',
      icon: Twitter,
    },
    {
      name: 'Instagram',
      url: settings.instagram_url || '#',
      icon: Instagram,
    },
    {
      name: 'LinkedIn',
      url: settings.linkedin_url || '#',
      icon: Linkedin,
    },
    {
      name: 'YouTube',
      url: settings.youtube_url || '#',
      icon: Youtube,
    }
  ];

  const linkClass =
    "group flex items-center gap-2.5 text-sm text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded";
  const iconClass = "h-4 w-4 shrink-0 text-white/70 transition-colors group-hover:text-buy";

  return (
    <footer className="bg-[linear-gradient(90deg,#2B3AAE_0%,#3529BF_45%,#5B2A9E_100%)] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1.1fr] lg:gap-8">

          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-protocall-sidebar-dark ring-1 ring-white/15">
                <Crosshair className="h-6 w-6 text-white" />
              </span>
              <span className="text-xl font-bold">{settings.site_name || 'Protocall'}</span>
            </div>

            <p className="text-lg leading-snug text-white">
              India&apos;s largest retail investor community.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Join thousands of traders and investors coming together to share insights, learn, and make smarter trading decisions. Empower your journey with real conversations, real strategies, and real growth.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
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
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 transition-all duration-200 ${
                      hasUrl
                        ? 'cursor-pointer hover:-translate-y-0.5 hover:border-buy hover:bg-buy hover:text-buy-foreground'
                        : 'cursor-default opacity-70'
                    }`}
                    aria-label={social.name}
                    title={hasUrl ? `Follow us on ${social.name}` : `${social.name} (Coming Soon)`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Legal &amp; Compliance</h3>
            <ul className="space-y-3">
              <li><Link to={createPageUrl("Terms")} className={linkClass}><FileText className={iconClass} />Terms &amp; Conditions</Link></li>
              <li><Link to={createPageUrl("Privacy")} className={linkClass}><Lock className={iconClass} />Privacy Policy</Link></li>
              <li><Link to={createPageUrl("Cookies")} className={linkClass}><Cookie className={iconClass} />Cookies Policy</Link></li>
              <li><Link to={createPageUrl("RiskDisclosure")} className={linkClass}><AlertTriangle className={iconClass} />Risk Disclosure</Link></li>
            </ul>
          </div>

          {/* Content & Resources */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Content &amp; Resources</h3>
            <ul className="space-y-3">
              <li><Link to={createPageUrl("News")} className={linkClass}><Newspaper className={iconClass} />Market News</Link></li>
              <li><Link to={createPageUrl("Blogs")} className={linkClass}><FileText className={iconClass} />Blogs &amp; Articles</Link></li>
              <li><Link to={createPageUrl("Finfluencers")} className={linkClass}><GraduationCap className={iconClass} />Learn from Experts</Link></li>
            </ul>
          </div>

          {/* Regulatory — lime checks read on the brand blue (8.2:1). */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Regulatory</h3>
            <ul className="space-y-3">
              {["SEBI Registered Advisors", "RBI Compliant", "ISO 27001 Certified"].map((label) => (
                <li key={label} className="flex items-center gap-2.5 text-sm text-white/80">
                  <CheckCircle className="h-4 w-4 shrink-0 text-buy" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Contact &amp; Support</h3>
            <ul className="space-y-3.5">
              {settings.contact_email && (
                <li>
                  <a href={`mailto:${settings.contact_email}`} className={`${linkClass} items-start`}>
                    <Mail className={`${iconClass} mt-0.5`} />
                    <span>
                      <span className="block break-all">{settings.contact_email}</span>
                      <span className="text-xs text-white/60">General queries</span>
                    </span>
                  </a>
                </li>
              )}

              {settings.contact_phone && (
                <li>
                  <a href={`tel:${settings.contact_phone}`} className={`${linkClass} items-start`}>
                    <Phone className={`${iconClass} mt-0.5`} />
                    <span>
                      <span className="block">{settings.contact_phone}</span>
                      <span className="text-xs text-white/60">24/7 Support</span>
                    </span>
                  </a>
                </li>
              )}

              <li>
                <Link to={createPageUrl("ContactSupport")} className={`${linkClass} items-start`}>
                  <MessageCircle className={`${iconClass} mt-0.5`} />
                  <span>
                    <span className="block">Contact Support</span>
                    <span className="text-xs text-white/60">Get help instantly</span>
                  </span>
                </Link>
              </li>

              {settings.company_address && (
                <li className="flex items-start gap-2.5 text-sm text-white/80">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
                  <span>
                    <span className="block">{settings.company_address}</span>
                    <span className="text-xs text-white/60">India</span>
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/15 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
            <p className="text-center text-white/70 md:text-left">
              © {new Date().getFullYear()} {settings.site_name || 'Protocall'}. All rights reserved. | India's Retail Investor Community
            </p>
            <div className="flex gap-6 text-white/70">
              <Link to={createPageUrl("Sitemap")} className="transition-colors hover:text-white">
                Sitemap
              </Link>
              <Link to={createPageUrl("Accessibility")} className="transition-colors hover:text-white">
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
