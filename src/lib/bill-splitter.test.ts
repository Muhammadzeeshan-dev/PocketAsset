import { describe, expect, it } from "vitest";
import {
  calculateSplitSummary,
  createSplitBill,
  generateWhatsAppReminderMessage,
} from "./bill-splitter";

describe("Smart Pakistani Bill Splitter & Peer Debt Suite", () => {
  it("splits a restaurant bill of Rs. 4,000 equally among 4 friends without losing 1 paisa", () => {
    // 4 people: Me + Ali, Usman, Hamza
    const bill = createSplitBill(
      "Chai Khana Dinner",
      "4000.00",
      ["Ali", "Usman", "Hamza"],
      true,
      "Food & Dining",
      "2026-11-15"
    );

    expect(bill.totalPaisa).toBe(400000n);
    expect(bill.participants.length).toBe(4);

    // Each person's share = Rs. 1,000 (100,000 paisa)
    for (const p of bill.participants) {
      expect(p.sharePaisa).toBe(100000n);
    }

    const summary = calculateSplitSummary(bill);
    // Organizer (Me) is marked paid initially
    expect(summary.collectedPaisa).toBe(100000n);
    expect(summary.remainingPaisa).toBe(300000n); // Rs. 3,000 pending from friends
    expect(summary.isFullySettled).toBe(false);
  });

  it("handles odd division gracefully with exact paisa remainder allocation", () => {
    // Rs. 100 split among 3 people = 33.34 + 33.33 + 33.33 = 100.00
    const bill = createSplitBill("Tea & Samosa", "100.00", ["Hamza", "Zeeshan"], false);
    expect(bill.participants.length).toBe(2);
    expect(bill.participants[0].sharePaisa + bill.participants[1].sharePaisa).toBe(10000n);
  });

  it("generates polite Pakistani WhatsApp reminder message in Urdu/English", () => {
    const bill = createSplitBill("Hostel Wifi Bill", "3000.00", ["Ali"]);
    const ali = bill.participants.find((p) => p.name === "Ali")!;
    const msg = generateWhatsAppReminderMessage(bill, ali, "Easypaisa to 0312-3456789");

    expect(msg).toContain("Salam Ali!");
    expect(msg).toContain("Hostel Wifi Bill");
    expect(msg).toContain("Rs 1,500.00");
    expect(msg).toContain("Easypaisa to 0312-3456789");
    expect(msg).toContain("JazakAllah!");
  });
});
