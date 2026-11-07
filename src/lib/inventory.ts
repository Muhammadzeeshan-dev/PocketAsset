export type InventoryCategory =
  | "stationery"
  | "personal_care"
  | "perfume"
  | "clothing"
  | "shoes"
  | "food_supplies"
  | "cleaning_supplies"
  | "household_products"
  | "electronics"
  | "other";

export type InventoryStatus =
  | "available"
  | "running_low"
  | "out_of_stock"
  | "shopping_required"
  | "discontinued";

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  category: InventoryCategory;
  current_quantity: number;
  unit: string;
  minimum_quantity: number;
  purchase_price_paisa: string | number | bigint;
  last_purchase_date: string | null;
  location: string | null;
  notes: string | null;
  expiry_date: string | null;
  status: InventoryStatus;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryUsageLog {
  id: string;
  item_id: string;
  user_id: string;
  quantity_used: number;
  notes: string | null;
  used_at: string;
}

export interface ShoppingListItem {
  id: string;
  user_id: string;
  inventory_item_id: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  estimated_price_paisa: string | number | bigint;
  priority: "low" | "medium" | "high" | "urgent";
  is_purchased: boolean;
  notes: string | null;
  created_at?: string;
}

export function computeInventoryStatus(currentQty: number, minQty: number): InventoryStatus {
  if (currentQty <= 0) return "out_of_stock";
  if (currentQty <= minQty) return "running_low";
  return "available";
}

export function recordInventoryUsage(
  item: InventoryItem,
  quantityUsed: number,
  reason?: string,
): { updatedItem: InventoryItem; log: InventoryUsageLog } {
  if (quantityUsed <= 0) {
    throw new Error("Quantity used must be greater than zero.");
  }
  if (quantityUsed > item.current_quantity) {
    throw new Error(`Cannot use ${quantityUsed} ${item.unit}. Only ${item.current_quantity} available in stock.`);
  }

  const newQty = Math.max(0, item.current_quantity - quantityUsed);
  const newStatus = computeInventoryStatus(newQty, item.minimum_quantity);

  const updatedItem: InventoryItem = {
    ...item,
    current_quantity: newQty,
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  const log: InventoryUsageLog = {
    id: crypto.randomUUID(),
    item_id: item.id,
    user_id: item.user_id,
    quantity_used: quantityUsed,
    notes: reason || "Household usage (non-financial)",
    used_at: new Date().toISOString(),
  };

  return { updatedItem, log };
}

export function restockInventoryItem(
  item: InventoryItem,
  quantityAdded: number,
  purchasePricePaisa: bigint,
  purchaseDate: string,
): InventoryItem {
  if (quantityAdded <= 0) {
    throw new Error("Quantity added must be greater than zero.");
  }

  const newQty = item.current_quantity + quantityAdded;
  return {
    ...item,
    current_quantity: newQty,
    purchase_price_paisa: purchasePricePaisa,
    last_purchase_date: purchaseDate,
    status: computeInventoryStatus(newQty, item.minimum_quantity),
    updated_at: new Date().toISOString(),
  };
}

