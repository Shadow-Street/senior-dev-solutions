import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/context/AuthContext';
import { usePlatformSettings } from '@/components/hooks/usePlatformSettings';
import { useHomeData } from '@/components/home/useHomeData';
import {
  renderHomeAbout,
  renderHomeCommunity,
  renderHomeCta,
  renderHomeFeatures,
  renderHomeFooter,
  renderHomeHeader,
  renderHomeHero,
  renderHomeMarket,
  renderHomeMembership,
  renderHomeReviews,
  renderHomeStats,
  renderHomeSteps,
} from '@/components/home/HomeSections';

/**
 * Public Home page (/home and /landing), rebuilt section by section from
 * protocall.in/home. Copy lives in components/home/homeContent.js, live
 * numbers come from useHomeData, and the markup in HomeSections.jsx.
 */
export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { settings } = usePlatformSettings();
  const data = useHomeData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [marketTab, setMarketTab] = useState('gainers');

  useEffect(() => {
    document.title = 'Home | Protocall';
    return () => {
      document.title = 'Protocall';
    };
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const goLogin = useCallback(() => {
    setMenuOpen(false);
    navigate(isAuthenticated ? '/Dashboard' : '/login');
  }, [navigate, isAuthenticated]);
  // Signed-in members skip registration and land on their dashboard.
  const goGetStarted = useCallback(() => {
    setMenuOpen(false);
    navigate(isAuthenticated ? '/Dashboard' : '/register');
  }, [navigate, isAuthenticated]);

  return (
    <div className="min-h-screen bg-home-cream font-display text-home-ink antialiased">
      {renderHomeHeader({
        menuOpen,
        onToggleMenu: () => setMenuOpen((open) => !open),
        onCloseMenu: closeMenu,
        onLogin: goLogin,
        onGetStarted: goGetStarted,
      })}
      <main>
        {renderHomeHero(data, goGetStarted)}
        {renderHomeStats(data)}
        {renderHomeFeatures()}
        {renderHomeMarket(data, marketTab, setMarketTab)}
        {renderHomeCommunity(data)}
        {renderHomeReviews(data)}
        {renderHomeSteps()}
        {renderHomeMembership()}
        {renderHomeAbout()}
        {renderHomeCta(goGetStarted)}
      </main>
      {renderHomeFooter(settings)}
    </div>
  );
}
