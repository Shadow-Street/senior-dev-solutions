/** Labels and styles shared by the Content Moderation screens. */

export const REASON_LABELS = {
  scam: 'Scam / Fraud',
  harassment: 'Harassment',
  hate: 'Hate speech',
  personal_info: 'Personal info leak',
  inappropriate: 'Inappropriate content',
  misinformation: 'Misleading advice',
  spam: 'Spam',
  other: 'Other',
};

export const TARGET_LABELS = {
  message: 'Chat message',
  advisor_post: 'Advisor post',
  user: 'User profile',
  blocked_message: 'Blocked chat message',
};

export const SEVERITY_STYLES = {
  critical: { label: 'Critical', className: 'text-sell-muted-foreground bg-sell-muted' },
  high: { label: 'High', className: 'text-hold-muted-foreground bg-hold-muted' },
  medium: { label: 'Medium', className: 'text-hold-muted-foreground bg-hold-muted' },
  low: { label: 'Low', className: 'text-primary bg-premium-muted' },
};

export const STATUS_STYLES = {
  pending: { label: 'Pending review', className: 'text-hold-muted-foreground bg-hold-muted' },
  escalated: { label: 'Escalated', className: 'text-sell-muted-foreground bg-sell-muted' },
  resolved: { label: 'Action taken', className: 'text-primary bg-premium-muted' },
  dismissed: { label: 'Dismissed', className: 'text-subtle bg-surface-2' },
};

export const ACTION_LABELS = {
  approve: 'Approved (content OK)',
  reject: 'Report rejected',
  escalate: 'Escalated',
  remove_content: 'Content removed',
  warn: 'User warned',
  suspend: 'User suspended',
  ban: 'User blocked',
};

const DECISION_LABELS = {
  approved: 'Approved, content OK',
  rejected: 'Report rejected',
  removed: 'Content removed',
  warned: 'User warned',
  suspended: 'User suspended',
  banned: 'User blocked',
  escalated: 'Escalated',
};

/**
 * What the "Action:" line shows for a report: the admin's decision, or for an
 * automatic flag the filter's own action. Null when nothing has happened yet,
 * so the label is hidden rather than left empty.
 */
export function decisionLabel(report) {
  if (!report) return null;
  if (report.decision && DECISION_LABELS[report.decision]) return DECISION_LABELS[report.decision];
  if (report.source === 'auto') return 'Blocked automatically';
  return null;
}

export const SANCTION_LABELS = {
  warn: 'Warning',
  suspend: 'Suspension',
  ban: 'Block',
  deactivate: 'Deactivation',
  reactivate: 'Reactivation',
};

export const formatDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
};

export const NATIVE_SELECT_CLASS =
  'h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
