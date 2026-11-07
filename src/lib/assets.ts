import { toPaisa, type FinanceAccount, type FinanceTransaction, calculateAccountBalance } from "./finance";

export type AssetType =
  | "electronics"
  | "jewelry"
  | "vehicle"
  | "real_estate"
  | "valuable_possession"
  | "other";

export type LiabilityType =
  | "borrowed_money"
  | "outstanding_payment"
  | "personal_loan"
  | "family_debt"
  | "other";

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  asset_type: AssetType;
  purchase_date: string | null;
  purchase_cost_paisa: string | number | bigint;
  current_estimated_value_paisa: string | number | bigint;
  ownership: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Liability {
  id: string;
  user_id: string;
  name: string;
  liability_type: LiabilityType;
  principal_amount_paisa: string | number | bigint;
  remaining_balance_paisa: string | number | bigint;
  owed_to: string;
  due_date: string | null;
  notes?: string | null;
  is_settled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NetWorthBreakdown {
  liquidCashPaisa: bigint; // Accounts ledger balances
  stockInvestmentsMarketValuePaisa: bigint; // Stock portfolio market value
  physicalAssetsPaisa: bigint; // Electronics, valuables, vehicles, etc.
  totalAssetsPaisa: bigint; // liquid + stock + physical
  totalLiabilitiesPaisa: bigint; // All remaining liabilities
  totalNetWorthPaisa: bigint; // totalAssets - totalLiabilities
  liquidNetWorthPaisa: bigint; // liquidCash - totalLiabilities
  debtToAssetRatio: number;
}

export function calculateNetWorth(
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
  stockMarketValuePaisa: bigint,
  physicalAssets: Asset[],
  liabilities: Liability[],
): NetWorthBreakdown {
  // 1. Liquid cash from accounts
  const liquidCash = accounts.reduce((total, acc) => {
    return total + calculateAccountBalance(acc, transactions);
  }, 0n);

  // 2. Physical / fixed assets (electronics, laptop, etc.)
  const physicalAssetsVal = physicalAssets.reduce((total, asset) => {
    return total + toPaisa(asset.current_estimated_value_paisa);
  }, 0n);

  // 3. Stock investments (strictly from investment portfolio, NOT duplicated)
  const stockVal = stockMarketValuePaisa;

  // 4. Total assets
  const totalAssets = liquidCash + stockVal + physicalAssetsVal;

  // 5. Total liabilities (only unsettled)
  const totalLiabilities = liabilities.reduce((total, l) => {
    if (l.is_settled) return total;
    return total + toPaisa(l.remaining_balance_paisa);
  }, 0n);

  // 6. Net worths
  const totalNetWorth = totalAssets - totalLiabilities;
  const liquidNetWorth = liquidCash - totalLiabilities;

  const debtRatio = totalAssets > 0n
    ? Number(((Number(totalLiabilities) / Number(totalAssets)) * 100).toFixed(1))
    : 0;

  return {
    liquidCashPaisa: liquidCash,
    stockInvestmentsMarketValuePaisa: stockVal,
    physicalAssetsPaisa: physicalAssetsVal,
    totalAssetsPaisa: totalAssets,
    totalLiabilitiesPaisa: totalLiabilities,
    totalNetWorthPaisa: totalNetWorth,
    liquidNetWorthPaisa: liquidNetWorth,
    debtToAssetRatio: debtRatio,
  };
}

