import { describe, expect, it } from "vitest";
import { computeInventoryStatus, recordInventoryUsage, restockInventoryItem, type InventoryItem } from "./inventory";

describe("Household Inventory rules", () => {
  const samplePencil: InventoryItem = {
    id: "p1",
    user_id: "u1",
    name: "Pencil",
    category: "stationery",
    current_quantity: 4,
    unit: "pcs",
    minimum_quantity: 1,
    purchase_price_paisa: 3000n, // Rs. 30
    last_purchase_date: "2026-11-01",
    location: "Study Desk",
    notes: "2B Graphite",
    expiry_date: null,
    status: "available",
  };

  it("reduces stock on usage without creating financial expense", () => {
    const { updatedItem, log } = recordInventoryUsage(samplePencil, 1, "University coursework");
    expect(updatedItem.current_quantity).toBe(3);
    expect(updatedItem.status).toBe("available");
    expect(log.quantity_used).toBe(1);
    expect(log.notes).toBe("University coursework");
  });

  it("changes status to running_low when stock hits minimum quantity", () => {
    const { updatedItem } = recordInventoryUsage(samplePencil, 3);
    expect(updatedItem.current_quantity).toBe(1);
    expect(updatedItem.status).toBe("running_low");
  });

  it("restocks correctly when newly purchased", () => {
    const restocked = restockInventoryItem(samplePencil, 5, 15000n, "2026-11-06");
    expect(restocked.current_quantity).toBe(9);
    expect(restocked.purchase_price_paisa).toBe(15000n);
    expect(restocked.last_purchase_date).toBe("2026-11-06");
    expect(restocked.status).toBe("available");
  });
});

