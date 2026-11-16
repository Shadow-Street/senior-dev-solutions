import SettingsForm, { SectionNote } from './SettingsForm';

const FIELDS = [
  { key: 'support_email', kind: 'email', placeholder: 'support@protocall.in' },
  { key: 'support_phone', kind: 'tel', placeholder: '+91 12345 67890' },
];

export default function ManageSupport(props) {
  return (
    <div className="space-y-6">
      <SectionNote>Shown to members on the Contact and Contact Support pages.</SectionNote>
      <SettingsForm fields={FIELDS} {...props} saveLabel="Save support details" />
    </div>
  );
}
