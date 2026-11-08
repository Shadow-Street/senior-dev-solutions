/**
 * Starts the market-data background work from server boot without blocking it:
 * load the encrypted Dhan credential (importing DHAN_* from the environment the
 * first time), start the token-renewal scheduler, pre-load the instrument master
 * when Dhan is usable, and start the NSE snapshot refresher. Every step is
 * best-effort: a failure is logged and the API keeps serving from the other
 * providers.
 */
const { dhanCredentials } = require('./DhanCredentialService');
const { FinDataService } = require('./FinDataService');

async function startMarketData() {
  try {
    await dhanCredentials.bootstrapFromEnv();
    await dhanCredentials.load();
    const reason = dhanCredentials.disabledReason();
    if (reason) console.log(`[Dhan] disabled (${reason}); using the existing market data providers`);
    dhanCredentials.start();
    FinDataService.snapshot.start();
    if (!reason) FinDataService.dhan.master.ensureLoaded().catch(() => { /* logged inside */ });
  } catch (e) {
    console.error('[MarketData] startup failed:', e && e.name);
  }
}

module.exports = { startMarketData };
