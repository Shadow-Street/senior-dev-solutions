import SettingsForm, { SectionNote } from './SettingsForm';

const FIELDS = [
  { key: 'notification_default_email', kind: 'switch', help: 'Starting preference for members who have not set their own.' },
  { key: 'notification_default_push', kind: 'switch', help: 'Starting preference for members who have not set their own.' },
  { key: 'notification_default_sms', kind: 'switch', help: 'Starting preference for members who have not set their own.' },
  { key: 'notification_reminder_emails_enabled', kind: 'switch', help: 'The email sent three days before an auto-renewing subscription renews. Receipts, invoices, verification and password emails are always sent.' },
];

export default function ManageNotifications(props) {
  return (
    <div className="space-y-6">
      <SectionNote>
        Defaults apply when a member&apos;s notification preferences are first created; members can change their own
        afterwards. Changing a default does not overwrite preferences members already have.
      </SectionNote>
      <SettingsForm fields={FIELDS} {...props} saveLabel="Save notification settings" />
    </div>
  );
}
