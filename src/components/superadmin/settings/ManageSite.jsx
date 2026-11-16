import SettingsForm, { SectionNote } from './SettingsForm';

// Shown in the public footer, Contact and Contact Support pages, the landing
// page and as the browser tab title (with the SEO title).
const FIELDS = [
  { key: 'site_name', kind: 'text', placeholder: 'Protocall', help: 'Used in the browser tab title, footer and contact pages.' },
  { key: 'contact_email', kind: 'email', placeholder: 'hello@protocall.in' },
  { key: 'contact_phone', kind: 'tel', placeholder: '+91 98765 43210' },
  { key: 'company_address', kind: 'text', placeholder: 'Bangalore, Karnataka, India' },
  { key: 'site_description', kind: 'textarea', rows: 2, help: 'Short tagline shown in the footer.' },
  { key: 'facebook_url', kind: 'url', placeholder: 'https://facebook.com/yourpage' },
  { key: 'twitter_url', kind: 'url', placeholder: 'https://x.com/yourhandle' },
  { key: 'instagram_url', kind: 'url', placeholder: 'https://instagram.com/yourhandle' },
  { key: 'linkedin_url', kind: 'url', placeholder: 'https://linkedin.com/company/yours' },
  { key: 'youtube_url', kind: 'url', placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'community_traders_display_min', kind: 'number', placeholder: '670', help: 'The dashboard "Traders" card shows the number of active members, but never less than this. Set 0 to always show the real count.' },
];

export default function ManageSite(props) {
  return (
    <div className="space-y-6">
      <SectionNote>
        Platform identity and public contact details. They appear in the site footer, the Contact pages and the
        browser tab title. Social links are shown only when filled in, and must be full https:// addresses.
      </SectionNote>
      <SettingsForm fields={FIELDS} {...props} saveLabel="Save site settings" />
    </div>
  );
}
