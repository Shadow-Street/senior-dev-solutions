import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import PageFooter from '@/components/footer/PageFooter';
import { platformSettingsApi } from '@/lib/platformSettingsApi';

/**
 * A legal page whose text an admin may publish from Platform Settings >
 * Static Pages. While nothing is published for `slug` (404), or the request
 * fails, the built-in page (`Fallback`) is shown, so the page is never blank.
 * Published text is rendered as plain text — paragraphs split on blank lines,
 * never as HTML.
 */
export function splitParagraphs(content) {
  return String(content || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const formatDate = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
};

export default function ManagedStaticPage({ slug, fallback: Fallback }) {
  const [state, setState] = useState({ status: 'loading', page: null });

  useEffect(() => {
    let alive = true;
    platformSettingsApi
      .publishedStaticPage(slug)
      .then((page) => { if (alive) setState({ status: page && page.content ? 'custom' : 'builtin', page }); })
      .catch(() => { if (alive) setState({ status: 'builtin', page: null }); });
    return () => { alive = false; };
  }, [slug]);

  if (state.status === 'loading') {
    return <div className="flex min-h-dvh items-center justify-center bg-surface-2 text-muted-foreground" role="status">Loading...</div>;
  }
  if (state.status === 'builtin') return <Fallback />;

  const { page } = state;
  const updated = formatDate(page.published_at || page.updated_at);
  return (
    <div className="min-h-screen bg-surface-2">
      <div className="bg-gradient-to-r from-protocall-deep via-protocall-grape to-protocall-blue py-12 text-white">
        <div className="mx-auto max-w-5xl px-6">
          <Link to={createPageUrl('Landing')}>
            <Button variant="outline" className="mb-6 border-white/30 bg-white/20 text-white hover:bg-white/30">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold">{page.title}</h1>
          {updated && <p className="mt-3 text-lg text-white/80">Last Updated: {updated}</p>}
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Card className="space-y-4 p-8 leading-relaxed text-foreground">
          {splitParagraphs(page.content).map((para, i) => (
            <p key={i} className="whitespace-pre-line">{para}</p>
          ))}
        </Card>
      </div>
      <PageFooter />
    </div>
  );
}

ManagedStaticPage.propTypes = { slug: PropTypes.string.isRequired, fallback: PropTypes.elementType.isRequired };
