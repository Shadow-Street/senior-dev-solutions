import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/context/AuthContext';
import { refreshPublicConfig, usePublicConfig } from '@/lib/platformSettingsApi';

/**
 * Applies platform-wide settings that are not tied to one page:
 *   - document head: default title (SEO title / site name), meta description, keywords;
 *   - maintenance mode: members and visitors see the maintenance screen
 *     (the API refuses their requests anyway); staff keep working;
 *   - idle sign-out after `session_idle_timeout_minutes` without activity.
 * Mounted once, around the routes, in App.jsx.
 */

const STAFF_ROLES = ['admin', 'super_admin', 'sub_admin'];
// Reachable during maintenance so staff can sign in.
const MAINTENANCE_OPEN_PATHS = [/^\/login/i, /^\/admin\/login/i, /^\/forgot-password/i, /^\/reset-password/i];
const STATIC_TITLE = 'Protocall';
const ACTIVITY_KEY = 'protocall.lastActivity';
// Captured, so scrolling inside panels (chat, admin content) counts too.
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'wheel', 'touchstart', 'pointermove', 'visibilitychange'];

function setMeta(name, content) {
  if (typeof document === 'undefined') return;
  let tag = document.head.querySelector(`meta[name="${name}"]`);
  if (!content) {
    if (tag && tag.dataset.platform === 'true') tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    tag.dataset.platform = 'true';
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export function usePlatformHead(config, pathname) {
  const applied = useRef(null);
  useEffect(() => {
    const title = (config.seo_meta_title || config.site_name || STATIC_TITLE).trim();
    // Pages that set their own title keep it; only the static default (or the
    // value applied here before) is replaced.
    if (!document.title || document.title === STATIC_TITLE || document.title === applied.current) {
      document.title = title;
      applied.current = title;
    }
    setMeta('description', config.seo_meta_description || config.site_description || '');
    setMeta('keywords', config.seo_meta_keywords || '');
  }, [config.seo_meta_title, config.site_name, config.seo_meta_description, config.site_description, config.seo_meta_keywords, pathname]);
}

const readActivity = () => {
  try { return Number(localStorage.getItem(ACTIVITY_KEY)) || 0; } catch { return 0; }
};
const writeActivity = (t) => {
  try { localStorage.setItem(ACTIVITY_KEY, String(t)); } catch { /* storage blocked: per-tab only */ }
};

const systemNow = () => Date.now();

/** Signs out after `minutes` without activity in any tab. 0 / falsy disables it. */
export function useIdleSignOut({ minutes, active, onTimeout, now = systemNow }) {
  const last = useRef(now());
  useEffect(() => {
    if (!active || !minutes || minutes <= 0) return undefined;
    const limit = minutes * 60 * 1000;
    last.current = now();
    writeActivity(last.current);
    let lastWrite = 0;
    const onActivity = () => {
      const t = now();
      last.current = t;
      if (t - lastWrite > 15000) { lastWrite = t; writeActivity(t); }
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }));
    const timer = window.setInterval(() => {
      const latest = Math.max(last.current, readActivity());
      if (now() - latest >= limit) {
        window.clearInterval(timer);
        onTimeout();
      }
    }, 15000);
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
      window.clearInterval(timer);
    };
  }, [minutes, active, onTimeout, now]);
}

export function MaintenanceScreen({ message, siteName }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6" role="main">
      <div className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-premium-muted">
          <Wrench className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{siteName || STATIC_TITLE} is under maintenance</h1>
        <p className="text-muted-foreground">{message || 'We are making improvements. Please check back shortly.'}</p>
        <p className="text-xs text-muted-foreground">This page refreshes automatically when we are back.</p>
      </div>
    </main>
  );
}

export default function PlatformRuntime({ children }) {
  const config = usePublicConfig();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isStaff = STAFF_ROLES.includes(user?.app_role || user?.role);

  usePlatformHead(config, location.pathname);

  // Pick up maintenance / sign-up changes without a reload: on focus and every
  // two minutes (more often while in maintenance, to lift the screen promptly).
  useEffect(() => {
    const onFocus = () => refreshPublicConfig();
    window.addEventListener('focus', onFocus);
    // Fired by the API client on a 503 MAINTENANCE answer.
    window.addEventListener('protocall:maintenance', onFocus);
    const timer = window.setInterval(onFocus, config.maintenance_mode ? 30000 : 120000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('protocall:maintenance', onFocus);
      window.clearInterval(timer);
    };
  }, [config.maintenance_mode]);

  const onIdle = React.useCallback(() => {
    toast.info('You were signed out after a period of inactivity.');
    logout();
  }, [logout]);
  useIdleSignOut({ minutes: Number(config.session_idle_timeout_minutes) || 0, active: Boolean(user), onTimeout: onIdle });

  const openPath = MAINTENANCE_OPEN_PATHS.some((re) => re.test(location.pathname));
  if (config.maintenance_mode && !isStaff && !openPath) {
    return <MaintenanceScreen message={config.maintenance_message} siteName={config.site_name} />;
  }
  return children;
}

MaintenanceScreen.propTypes = { message: PropTypes.string, siteName: PropTypes.string };
PlatformRuntime.propTypes = { children: PropTypes.node };
