import { describe, expect, it } from "vitest";
import { autoEnrichTransaction, suggestAccountId } from "./auto-enrich";

describe("Smart Auto-Enrichment Engine", () => {
  it("auto-detects fuel and transport transactions with essential classification", () => {
    const fuel = autoEnrichTransaction("Shell petrol bike tank full");
    expect(fuel).not.toBeNull();
    expect(fuel?.category).toBe("Fuel");
    expect(fuel?.expenseClassification).toBe("essential");
    expect(fuel?.matchedKeyword).toBe("petrol");

    const ride = autoEnrichTransaction("Careem ride to campus");
    expect(ride).not.toBeNull();
    expect(ride?.category).toBe("Transport");
    expect(ride?.expenseClassification).toBe("essential");
  });

  it("auto-detects dining and fast food as non-essential", () => {
    const kfc = autoEnrichTransaction("KFC Krunch burger dinner");
    expect(kfc).not.toBeNull();
    expect(kfc?.category).toBe("Food & Dining");
    expect(kfc?.expenseClassification).toBe("non_essential");

    const foodpanda = autoEnrichTransaction("Foodpanda late night biryani order");
    expect(foodpanda).not.toBeNull();
    expect(foodpanda?.category).toBe("Food & Dining");
    expect(foodpanda?.expenseClassification).toBe("non_essential");
  });

  it("auto-detects utilities and education fees as essential", () => {
    const ke = autoEnrichTransaction("K-Electric bill payment for Oct");
    expect(ke).not.toBeNull();
    expect(ke?.category).toBe("Utilities");
    expect(ke?.expenseClassification).toBe("essential");

    const uni = autoEnrichTransaction("FAST NUCES semester tuition fee");
    expect(uni).not.toBeNull();
    expect(uni?.category).toBe("Education");
    expect(uni?.expenseClassification).toBe("essential");
  });

  it("suggests the correct account based on description text", () => {
    const sampleAccounts = [
      { id: "acc-1", name: "Cash in hand", account_type: "cash" },
      { id: "acc-2", name: "JazzCash Primary", account_type: "wallet" },
      { id: "acc-3", name: "Bank Alfalah Current", account_type: "bank" },
    ];

    expect(suggestAccountId("Paid via JazzCash", sampleAccounts)).toBe("acc-2");
    expect(suggestAccountId("Withdrew cash for fruit", sampleAccounts)).toBe("acc-1");
    expect(suggestAccountId("Alfalah bank transfer for rent", sampleAccounts)).toBe("acc-3");
  });
});
