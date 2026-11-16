import SettingsForm, { SectionNote } from './SettingsForm';

const FIELDS = [
  { key: 'alert_retention_days', kind: 'number', help: 'A nightly job deletes alerts that were resolved or dismissed longer ago than this. Open and acknowledged alerts are never deleted. 0 keeps everything.' },
];

/**
 * What used to be here — eight poll/pledge alert rules with thresholds, email
 * and push toggles, digest email and recipients — was saved into fields the
 * alert_configurations table does not have, and no part of the platform
 * evaluates alert rules or sends alert emails. Showing those switches told
 * admins they had alerting they did not have, so only the setting the server
 * actually applies is offered.
 */
export default function ManageAlertSettings(props) {
  return (
    <div className="space-y-6">
      <SectionNote tone="warning">
        <p className="font-semibold">Automatic alert rules are not available yet.</p>
        <p className="mt-1">
          The previous poll and pledge alert rules (thresholds, email and push toggles, daily digest) were not connected
          to anything: the platform has no alert engine that evaluates them or sends alert emails, so they have been
          removed. Alerts raised by the platform appear under <strong>System Alerts</strong>.
        </p>
      </SectionNote>
      <SettingsForm fields={FIELDS} {...props} saveLabel="Save alert settings" />
    </div>
  );
}
