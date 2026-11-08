import MarketOverviewPanel from "./MarketOverviewPanel";
import SponsoredPanel from "./SponsoredPanel";
import { useAdsEnabled } from "@/components/hooks/useAdsEnabled";

/**
 * Market overview with the sponsored card beside it.
 * With ads off the sponsored column is not rendered and the market panel
 * takes the full row, so there is no hole in the grid. Props (indices, error)
 * are passed straight through to MarketOverviewPanel.
 */
export default function MarketSponsoredRow(marketProps) {
  const adsEnabled = useAdsEnabled();

  return (
    <div className="grid gap-4 sm:gap-5 xl:grid-cols-3" data-testid="market-sponsored-row">
      <div className={`min-w-0 ${adsEnabled ? "xl:col-span-2" : "xl:col-span-3"}`}>
        <MarketOverviewPanel {...marketProps} />
      </div>
      {adsEnabled && (
        <div className="min-w-0" data-testid="sponsored-column">
          <SponsoredPanel />
        </div>
      )}
    </div>
  );
}
