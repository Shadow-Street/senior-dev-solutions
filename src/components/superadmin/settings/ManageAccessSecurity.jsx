import SettingsForm, { SectionNote } from './SettingsForm';

const FIELDS = [
  { key: 'registration_enabled', kind: 'switch', help: 'When off, the Register page explains sign-ups are closed and the API refuses new accounts (email and Google). Existing members sign in as usual.' },
  { key: 'maintenance_mode', kind: 'switch', help: 'When on, members and visitors see the maintenance message and the API answers 503. Admins and sub-admins keep full access, and payment webhooks keep working.' },
  { key: 'maintenance_message', kind: 'textarea', rows: 2 },
  { key: 'session_idle_timeout_minutes', kind: 'number', help: 'Signs a browser out after this many minutes without activity. Enforced in the web app; 0 turns it off.' },
  { key: 'login_max_failed_attempts', kind: 'number', help: 'Temporarily locks an account after this many wrong passwords in a row (3–20; 0 = off). Anyone who knows an address can trigger it, so keep the duration short.' },
  { key: 'login_lockout_minutes', kind: 'number', help: 'How long the lock lasts. A locked member can still reset their password by email.' },
];

export default function ManageAccessSecurity(props) {
  return (
    <div className="space-y-6">
      <SectionNote tone="warning">
        Platform-wide access controls, enforced by the API. Only a super admin can change them; every change is recorded
        in Activity Logs. Email verification is always required for email sign-ups and new accounts always start as members.
      </SectionNote>
      <SettingsForm fields={FIELDS} {...props} saveLabel="Save access settings" />
    </div>
  );
}
