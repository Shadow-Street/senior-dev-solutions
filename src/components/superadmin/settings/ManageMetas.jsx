import SettingsForm, { SectionNote } from './SettingsForm';

const FIELDS = [
  { key: 'seo_meta_title', kind: 'text', placeholder: 'Protocall - The Ultimate Social Trading Platform', help: 'Browser tab and search-result title for pages without their own (up to 70 characters).' },
  { key: 'seo_meta_keywords', kind: 'text', placeholder: 'social trading, stocks, investing', help: 'Comma-separated.' },
  { key: 'seo_meta_description', kind: 'textarea', rows: 3, help: 'Search-result snippet, up to 160 characters.' },
];

export default function ManageMetas(props) {
  return (
    <div className="space-y-6">
      <SectionNote>
        These values are written into the page head (title, description, keywords) as soon as the app loads.
        Search engines that run JavaScript (Google) read them; link previews in chat apps use the static
        defaults in index.html.
      </SectionNote>
      <SettingsForm fields={FIELDS} {...props} saveLabel="Save SEO settings" />
    </div>
  );
}
