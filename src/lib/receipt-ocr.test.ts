import { describe, expect, it } from "vitest";
import {
  parseReceiptText,
  receiptToTransaction,
  SAMPLE_PAKISTANI_RECEIPTS,
} from "./receipt-ocr";
import type { FinanceAccount } from "./finance";

describe("Smart Receipt & Bill OCR Vision Engine", () => {
  const accounts: FinanceAccount[] = [
    { id: "acc-cash", name: "Cash in hand", account_type: "cash", opening_balance_paisa: 400000n, currency: "PKR", is_active: true },
    { id: "acc-jazz", name: "JazzCash", account_type: "wallet", opening_balance_paisa: 321000n, currency: "PKR", is_active: true },
    { id: "acc-easy", name: "Easypaisa", account_type: "wallet", opening_balance_paisa: 159900n, currency: "PKR", is_active: true },
  ];

  it("parses Imtiaz Super Market grocery receipt correctly", () => {
    const imtiaz = SAMPLE_PAKISTANI_RECEIPTS.find((r) => r.id === "imtiaz-grocery")!;
    const parsed = parseReceiptText(imtiaz.rawText, accounts);

    expect(parsed.vendor).toBe("Imtiaz Super Market");
    expect(parsed.totalPaisa).toBe(485000n); // Rs. 4,850.00
    expect(parsed.category).toBe("Groceries");
    expect(parsed.paymentMethodDetected).toBe("Cash in hand");
    expect(parsed.suggestedAccountId).toBe("acc-cash");
    expect(parsed.invoiceNumber).toBe("IMT-2026-948102");
    expect(parsed.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it("parses Shell fuel station receipt and detects JazzCash QR", () => {
    const shell = SAMPLE_PAKISTANI_RECEIPTS.find((r) => r.id === "shell-petrol")!;
    const parsed = parseReceiptText(shell.rawText, accounts);

    expect(parsed.vendor).toBe("Shell Fuel Station");
    expect(parsed.totalPaisa).toBe(250000n); // Rs. 2,500.00
    expect(parsed.category).toBe("Fuel & Commute");
    expect(parsed.paymentMethodDetected).toBe("JazzCash");
    expect(parsed.suggestedAccountId).toBe("acc-jazz");
    expect(parsed.invoiceNumber).toBe("SHL-781920");
    expect(parsed.gstTaxPaisa).toBe(38135n); // Rs. 381.35
  });

  it("parses K-Electric utility bill and matches Easypaisa payment", () => {
    const ke = SAMPLE_PAKISTANI_RECEIPTS.find((r) => r.id === "kelectric-bill")!;
    const parsed = parseReceiptText(ke.rawText, accounts);

    expect(parsed.vendor).toBe("K-Electric");
    expect(parsed.totalPaisa).toBe(684000n); // Rs. 6,840.00
    expect(parsed.category).toBe("Utilities");
    expect(parsed.paymentMethodDetected).toBe("Easypaisa");
    expect(parsed.suggestedAccountId).toBe("acc-easy");
  });

  it("parses Chai Khana dining cafe bill", () => {
    const cafe = SAMPLE_PAKISTANI_RECEIPTS.find((r) => r.id === "chai-khana")!;
    const parsed = parseReceiptText(cafe.rawText, accounts);

    expect(parsed.vendor).toBe("Chai Khana");
    expect(parsed.totalPaisa).toBe(145000n); // Rs. 1,450.00
    expect(parsed.category).toBe("Food & Dining");
  });

  it("converts parsed receipt into an audit-compliant ledger transaction", () => {
    const imtiaz = SAMPLE_PAKISTANI_RECEIPTS[0];
    const parsed = parseReceiptText(imtiaz.rawText, accounts);
    const tx = receiptToTransaction(parsed, "user-123", "acc-cash");

    expect(tx.user_id).toBe("user-123");
    expect(tx.account_id).toBe("acc-cash");
    expect(tx.transaction_type).toBe("expense");
    expect(tx.direction).toBe("outflow");
    expect(tx.amount_paisa).toBe("485000");
    expect(tx.category).toBe("Groceries");
    expect(tx.description).toContain("Imtiaz Super Market");
    expect(tx.notes).toContain("IMT-2026-948102");
  });
});
