import { describe, expect, it } from "vitest";
import { parseTransactionSms } from "./sms-parser";

describe("Pakistani SMS & Bank Notification Parser Engine", () => {
  it("parses JazzCash payment SMS accurately", () => {
    const sms = "You have sent Rs. 450.00 to Ali Khan (03001234567) from your JazzCash Account. Remaining Balance: Rs. 2760.00. Fee: Rs. 0.00. TID: 9988776655.";
    const result = parseTransactionSms(sms);

    expect(result).not.toBeNull();
    expect(result?.amountPaisa).toBe(45000n);
    expect(result?.amountRupees).toBe("450.00");
    expect(result?.direction).toBe("outflow");
    expect(result?.transactionType).toBe("expense");
    expect(result?.suggestedAccountNameHint).toBe("JazzCash");
    expect(result?.counterparty).toContain("Ali Khan");
    expect(result?.referenceId).toBe("9988776655");
    expect(result?.remainingBalancePaisa).toBe(276000n);
  });

  it("parses Easypaisa merchant transaction SMS with category detection", () => {
    const sms = "Paid Rs. 1,250.00 to KFC Gulberg via Easypaisa. Trans ID: 12345678. Your new balance is Rs. 3,500.00.";
    const result = parseTransactionSms(sms);

    expect(result).not.toBeNull();
    expect(result?.amountPaisa).toBe(125000n);
    expect(result?.amountRupees).toBe("1250.00");
    expect(result?.suggestedCategory).toBe("Food & Dining");
    expect(result?.suggestedAccountNameHint).toBe("Easypaisa");
    expect(result?.referenceId).toBe("12345678");
    expect(result?.remainingBalancePaisa).toBe(350000n);
  });

  it("parses bank debit alert SMS (e.g. Meezan Bank)", () => {
    const sms = "Dear Customer, PKR 3,200.00 debited from A/C 01010101 on 15-Nov-26 at SHELL PETROL PUMP. Avail Bal: PKR 14,800.00. Ref: MB991122";
    const result = parseTransactionSms(sms);

    expect(result).not.toBeNull();
    expect(result?.amountPaisa).toBe(320000n);
    expect(result?.amountRupees).toBe("3200.00");
    expect(result?.direction).toBe("outflow");
    expect(result?.suggestedCategory).toBe("Transportation & Fuel");
    expect(result?.suggestedAccountType).toBe("bank");
    expect(result?.referenceId).toBe("MB991122");
    expect(result?.remainingBalancePaisa).toBe(1480000n);
  });

  it("parses incoming transfer / income SMS", () => {
    const sms = "Received Rs. 5,000.00 from Father (03129998888) in your JazzCash account. TID: 5544332211.";
    const result = parseTransactionSms(sms);

    expect(result).not.toBeNull();
    expect(result?.amountPaisa).toBe(500000n);
    expect(result?.direction).toBe("inflow");
    expect(result?.transactionType).toBe("income");
    expect(result?.suggestedCategory).toBe("Family Allowance");
    expect(result?.referenceId).toBe("5544332211");
  });

  it("gracefully returns null for irrelevant or too short text", () => {
    expect(parseTransactionSms("Hello there")).toBeNull();
    expect(parseTransactionSms("Your OTP code is 123456. Do not share.")).toBeNull();
  });
});

