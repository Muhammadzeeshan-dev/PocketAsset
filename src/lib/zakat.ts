import { calculateAccountBalance, toPaisa, type FinanceAccount, type FinanceTransaction } from "./finance";
import type { Asset, Liability } from "./assets";

export interface ZakatRates {
  silverRatePerTolaPaisa: bigint; // e.g. Rs. 3,300 per tola = 330000n
  goldRatePerTolaPaisa: bigint;   // e.g. Rs. 280,000 per tola = 28000000n
  nisabStandard: "silver" | "gold"; // Silver is universally favored by scholars for liquid wealth
  stockZakatablePercentage: number; // Default 30% for dividend/long-term holdings
}

export interface ZakatBreakdown {
  cashAndBankPaisa: bigint;
  goldSilverPaisa: bigint;
  zakatableStocksPaisa: bigint;
  businessGoodsPaisa: bigint;
  deductibleDebtsPaisa: bigint;
  netZakatableWealthPaisa: bigint;
  nisabThresholdPaisa: bigint;
  isEligibleForZakat: boolean;
  zakatDuePaisa: bigint;
}

export const DEFAULT_ZAKAT_RATES: ZakatRates = {
  silverRatePerTolaPaisa: 330000n, // Rs. 3,300 per tola (52.5 Tolas = ~Rs. 173,250)
  goldRatePerTolaPaisa: 28000000n, // Rs. 280,000 per tola (7.5 Tolas = ~Rs. 2,100,000)
  nisabStandard: "silver",
  stockZakatablePercentage: 30, // AAOIFI Shariah standard benchmark
};

export function calculateZakat(
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
  stockMarketValuePaisa: bigint,
  physicalAssets: Asset[] = [],
  liabilities: Liability[] = [],
  rates: ZakatRates = DEFAULT_ZAKAT_RATES,
): ZakatBreakdown {
  // 1. Liquid Cash & Bank Wallets (100% zakatable)
  const cashAndBankPaisa = accounts
    .filter((a) => a.is_active && (a.account_type === "cash" || a.account_type === "wallet" || a.account_type === "bank" || a.account_type === "savings"))
    .reduce((sum, a) => sum + calculateAccountBalance(a, transactions), 0n);

  // 2. Gold & Silver in physical assets
  const goldSilverPaisa = physicalAssets
    .filter((a) => a.asset_type === "jewelry" || a.name.toLowerCase().includes("gold") || a.name.toLowerCase().includes("silver"))
    .reduce((sum, a) => sum + toPaisa(a.current_estimated_value_paisa), 0n);

  // 3. PSX Stock Holdings (Shariah Current Assets Proportion e.g. 30%)
  const stockRatioBigInt = BigInt(Math.max(0, Math.min(100, rates.stockZakatablePercentage)));
  const zakatableStocksPaisa = (stockMarketValuePaisa * stockRatioBigInt) / 100n;

  // 4. Business goods / inventory
  const businessGoodsPaisa = 0n;

  // 5. Deductible short-term liabilities (unsettled obligations)
  const deductibleDebtsPaisa = liabilities
    .filter((l) => !l.is_settled)
    .reduce((sum, l) => sum + toPaisa(l.remaining_balance_paisa), 0n);

  // 6. Gross Zakatable Assets
  const grossZakatable = (cashAndBankPaisa > 0n ? cashAndBankPaisa : 0n) +
    goldSilverPaisa +
    zakatableStocksPaisa +
    businessGoodsPaisa;

  // 7. Net Zakatable Wealth
  const netZakatableWealthPaisa = grossZakatable > deductibleDebtsPaisa
    ? grossZakatable - deductibleDebtsPaisa
    : 0n;

  // 8. Nisab Threshold Calculation
  // Silver Nisab: 52.5 Tola | Gold Nisab: 7.5 Tola
  let nisabThresholdPaisa: bigint;
  if (rates.nisabStandard === "silver") {
    // 52.5 Tola = (525 * silverRate) / 10
    nisabThresholdPaisa = (525n * rates.silverRatePerTolaPaisa) / 10n;
  } else {
    // 7.5 Tola = (75 * goldRate) / 10
    nisabThresholdPaisa = (75n * rates.goldRatePerTolaPaisa) / 10n;
  }

  // 9. Check if eligible (Saahib-e-Nisab)
  const isEligibleForZakat = netZakatableWealthPaisa >= nisabThresholdPaisa;

  // 10. Zakat is exactly 2.5% (1/40th) of Net Zakatable Wealth
  const zakatDuePaisa = isEligibleForZakat
    ? netZakatableWealthPaisa / 40n
    : 0n;

  return {
    cashAndBankPaisa,
    goldSilverPaisa,
    zakatableStocksPaisa,
    businessGoodsPaisa,
    deductibleDebtsPaisa,
    netZakatableWealthPaisa,
    nisabThresholdPaisa,
    isEligibleForZakat,
    zakatDuePaisa,
  };
}

