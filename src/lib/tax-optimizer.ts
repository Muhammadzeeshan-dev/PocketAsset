import { formatPkr, toPaisa, type FinanceTransaction } from "./finance";

export interface WhtTaxDeduction {
  sectionCode: string;
  sectionName: string;
  description: string;
  taxRatePercent: number;
  totalGrossSpendPaisa: bigint;
  deductedTaxPaisa: bigint;
  transactionCount: number;
}

export interface TaxOptimizerReport {
  taxYear: string;
  totalAdjustableTaxPaisa: bigint;
  breakdown: {
    mobileTelecom: WhtTaxDeduction;
    electricityBills: WhtTaxDeduction;
    psxDividends: WhtTaxDeduction;
    bankingWithdrawals: WhtTaxDeduction;
    educationAndOther: WhtTaxDeduction;
  };
  filerStatus: "filer" | "non_filer";
  estimatedFilingRefundPaisa: bigint;
  refundClaimScheduleNotes: string[];
}

export function calculateWhtRefunds(
  transactions: FinanceTransaction[],
  taxYear = "2026",
  filerStatus: "filer" | "non_filer" = "filer"
): TaxOptimizerReport {
  const activeTx = transactions.filter((t) => !t.deleted_at);

  let mobileGross = 0n;
  let mobileCount = 0;

  let electricGross = 0n;
  let electricCount = 0;

  let dividendGross = 0n;
  let dividendCount = 0;

  let bankingGross = 0n;
  let bankingCount = 0;

  for (const tx of activeTx) {
    const desc = (tx.description || "").toLowerCase();
    const cat = (tx.category || "").toLowerCase();
    const amt = toPaisa(tx.amount_paisa);

    // 1. Mobile Telecom (Section 236)
    if (
      cat.includes("mobile") ||
      cat.includes("load") ||
      desc.includes("jazz") ||
      desc.includes("telenor") ||
      desc.includes("zong") ||
      desc.includes("ufone") ||
      desc.includes("package")
    ) {
      if (tx.transaction_type === "expense") {
        mobileGross += amt;
        mobileCount++;
      }
    }

    // 2. Electricity / Utilities (Section 235)
    else if (
      cat.includes("util") ||
      desc.includes("k-electric") ||
      desc.includes("electricity") ||
      desc.includes("lesco")
    ) {
      if (tx.transaction_type === "expense") {
        electricGross += amt;
        electricCount++;
      }
    }

    // 3. PSX Dividends (Section 150)
    else if (tx.transaction_type === "dividend") {
      dividendGross += amt;
      dividendCount++;
    }

    // 4. Banking ATM / Cash Withdrawals (Section 231A)
    else if (desc.includes("atm") || desc.includes("cash withdrawal")) {
      bankingGross += amt;
      bankingCount++;
    }
  }

  // WHT Rates in Pakistan (Finance Act):
  // Section 236: 15% Advance Income Tax on mobile recharges
  // Section 235: ~10% Advance Tax on electricity bills
  // Section 150: 15% (Filer) / 30% (Non-Filer) on Dividends
  // Section 231A: 0.6% on cash withdrawals for non-filers
  const mobileTaxRate = 15;
  const mobileTaxPaisa = (mobileGross * 15n) / 100n;

  const electricTaxRate = 10;
  const electricTaxPaisa = (electricGross * 10n) / 100n;

  const dividendTaxRate = filerStatus === "filer" ? 15 : 30;
  const dividendTaxPaisa = (dividendGross * BigInt(dividendTaxRate)) / 100n;

  const bankingTaxRate = filerStatus === "non_filer" ? 0.6 : 0;
  const bankingTaxPaisa = BigInt(Math.round((Number(bankingGross) * bankingTaxRate) / 100));

  const totalAdjustableTaxPaisa = mobileTaxPaisa + electricTaxPaisa + dividendTaxPaisa + bankingTaxPaisa;

  return {
    taxYear,
    totalAdjustableTaxPaisa,
    filerStatus,
    estimatedFilingRefundPaisa: totalAdjustableTaxPaisa,
    breakdown: {
      mobileTelecom: {
        sectionCode: "Sec 236",
        sectionName: "Advance Tax on Mobile Recharge & Internet Bundles",
        description: "15% advance tax deducted at source by Jazz, Telenor, Zong & Ufone",
        taxRatePercent: mobileTaxRate,
        totalGrossSpendPaisa: mobileGross,
        deductedTaxPaisa: mobileTaxPaisa,
        transactionCount: mobileCount,
      },
      electricityBills: {
        sectionCode: "Sec 235",
        sectionName: "Advance Income Tax on Electricity Vouchers",
        description: "Income tax charged on K-Electric and LESCO residential/commercial bills",
        taxRatePercent: electricTaxRate,
        totalGrossSpendPaisa: electricGross,
        deductedTaxPaisa: electricTaxPaisa,
        transactionCount: electricCount,
      },
      psxDividends: {
        sectionCode: "Sec 150",
        sectionName: "Withholding Tax on Listed Company Dividends",
        description: "CDC / PSX dividends tax withheld by issuing listed companies",
        taxRatePercent: dividendTaxRate,
        totalGrossSpendPaisa: dividendGross,
        deductedTaxPaisa: dividendTaxPaisa,
        transactionCount: dividendCount,
      },
      bankingWithdrawals: {
        sectionCode: "Sec 231A",
        sectionName: "Advance Tax on Banking Cash Withdrawals",
        description: "Bank withholding tax on transactions & cash withdrawals",
        taxRatePercent: bankingTaxRate,
        totalGrossSpendPaisa: bankingGross,
        deductedTaxPaisa: bankingTaxPaisa,
        transactionCount: bankingCount,
      },
      educationAndOther: {
        sectionCode: "Sec 236I",
        sectionName: "Educational Institution Fees & Other WHT",
        description: "Advance tax on university fees and semester tuition",
        taxRatePercent: 5,
        totalGrossSpendPaisa: 0n,
        deductedTaxPaisa: 0n,
        transactionCount: 0,
      },
    },
    refundClaimScheduleNotes: [
      `Section 170 of Income Tax Ordinance 2001 entitles you to adjust or claim refund of ${formatPkr(totalAdjustableTaxPaisa)}.`,
      "Mobile network operators (Jazz, Easypaisa, Zong) provide annual tax certificates on their mobile apps (e.g., Jazz World 'Tax Certificate').",
      "Attach these withholding certificates to your annual FBR Iris return to receive direct cash credit into your bank account.",
    ],
  };
}

export function generateFbrClaimSchedule(report: TaxOptimizerReport): string {
  const b = report.breakdown;
  return `=== FBR SECTION 170 REFUND & ADJUSTABLE TAX SCHEDULE (Tax Year ${report.taxYear}) ===\n` +
    `Filer Status: ${report.filerStatus.toUpperCase()}\n` +
    `Total Claimable WHT Refund: ${formatPkr(report.totalAdjustableTaxPaisa)}\n\n` +
    `1. ${b.mobileTelecom.sectionCode} - ${b.mobileTelecom.sectionName}:\n` +
    `   - Gross Recharges: ${formatPkr(b.mobileTelecom.totalGrossSpendPaisa)} (${b.mobileTelecom.transactionCount} transactions)\n` +
    `   - WHT Deducted (${b.mobileTelecom.taxRatePercent}%): ${formatPkr(b.mobileTelecom.deductedTaxPaisa)}\n\n` +
    `2. ${b.electricityBills.sectionCode} - ${b.electricityBills.sectionName}:\n` +
    `   - Gross Bills: ${formatPkr(b.electricityBills.totalGrossSpendPaisa)} (${b.electricityBills.transactionCount} bills)\n` +
    `   - WHT Deducted (${b.electricityBills.taxRatePercent}%): ${formatPkr(b.electricityBills.deductedTaxPaisa)}\n\n` +
    `3. ${b.psxDividends.sectionCode} - ${b.psxDividends.sectionName}:\n` +
    `   - Gross Dividends: ${formatPkr(b.psxDividends.totalGrossSpendPaisa)} (${b.psxDividends.transactionCount} payouts)\n` +
    `   - WHT Deducted (${b.psxDividends.taxRatePercent}%): ${formatPkr(b.psxDividends.deductedTaxPaisa)}\n\n` +
    `Notes & Legal Basis:\n` +
    report.refundClaimScheduleNotes.map((n, i) => `${i + 1}. ${n}`).join("\n") + "\n\n" +
    `Generated by PocketAsset Institutional Finance Engine (PKR paisa precision).`;
}
