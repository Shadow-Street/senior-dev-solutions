import { Globe } from 'lucide-react';
import { SectionNote } from './SettingsForm';

/**
 * The old options (default country, currency, language) were saved and read by
 * nothing. They are not offered because they cannot be made true today:
 *  - the interface is written in English only (no translation framework);
 *  - every price and payment is in INR: Razorpay settles in INR, and showing
 *    another currency symbol without conversion would misstate amounts;
 *  - the market data, trading hours and regulatory content are for India.
 */
export default function ManageLocalization() {
  return (
    <div className="space-y-4">
      <SectionNote>
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-2">
            <p className="font-semibold">Fixed for this release: English, India, Indian Rupee (INR), Asia/Kolkata.</p>
            <p>
              The previous country, currency and language options were saved but nothing in the platform used them, so they
              have been removed rather than left pretending to work.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>The interface is available in English only; adding Hindi or other languages needs translated text first.</li>
              <li>All prices and payments are in INR because Razorpay settles in INR; showing another currency would misstate amounts.</li>
              <li>Market data, trading hours and regulatory content (SEBI) are for Indian markets.</li>
            </ul>
          </div>
        </div>
      </SectionNote>
    </div>
  );
}
