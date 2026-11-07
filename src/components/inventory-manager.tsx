"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { formatPkr, parseRupeesToPaisa, toPaisa, type FinanceAccount } from "@/lib/finance";
import {
  computeInventoryStatus,
  recordInventoryUsage,
  restockInventoryItem,
  type InventoryCategory,
  type InventoryItem,
  type InventoryUsageLog,
  type ShoppingListItem,
} from "@/lib/inventory";

interface InventoryManagerProps {
  userId: string;
  supabase: SupabaseClient;
  accounts: FinanceAccount[];
  dataAvailable: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export function InventoryManager({
  userId,
  supabase,
  accounts,
  dataAvailable,
  refreshing,
  onRefresh,
  onToast,
}: InventoryManagerProps) {
  // Initial realistic household inventory items
  const [items, setItems] = useState<InventoryItem[]>([
    {
      id: "inv-1",
      user_id: userId,
      name: "Pencil (2B Lead)",
      category: "stationery",
      current_quantity: 4,
      unit: "pcs",
      minimum_quantity: 1,
      purchase_price_paisa: 3000n, // Rs. 30
      last_purchase_date: "2026-11-01",
      location: "Study Table",
      notes: "For engineering drawings & calculations",
      expiry_date: null,
      status: "available",
    },
    {
      id: "inv-2",
      user_id: userId,
      name: "Ballpoint Pens (Blue)",
      category: "stationery",
      current_quantity: 2,
      unit: "pcs",
      minimum_quantity: 2,
      purchase_price_paisa: 6000n, // Rs. 60
      last_purchase_date: "2026-10-28",
      location: "Study Table",
      notes: "Piano crystal pens",
      expiry_date: null,
      status: "running_low",
    },
    {
      id: "inv-3",
      user_id: userId,
      name: "Daily Shampoo (Anti-Dandruff)",
      category: "personal_care",
      current_quantity: 1,
      unit: "bottle",
      minimum_quantity: 1,
      purchase_price_paisa: 75000n, // Rs. 750
      last_purchase_date: "2026-10-15",
      location: "Bathroom Shelf",
      notes: "Head & Shoulders 200ml",
      expiry_date: null,
      status: "running_low",
    },
    {
      id: "inv-4",
      user_id: userId,
      name: "French Oud Perfume",
      category: "perfume",
      current_quantity: 1,
      unit: "bottle",
      minimum_quantity: 1,
      purchase_price_paisa: 350000n, // Rs. 3,500
      last_purchase_date: "2026-09-10",
      location: "Wardrobe",
      notes: "J. Janan Eau De Parfum 100ml",
      expiry_date: null,
      status: "available",
    },
    {
      id: "inv-5",
      user_id: userId,
      name: "University Notebook (A4 200p)",
      category: "stationery",
      current_quantity: 1,
      unit: "register",
      minimum_quantity: 1,
      purchase_price_paisa: 32000n, // Rs. 320
      last_purchase_date: "2026-10-20",
      location: "Backpack",
      notes: "Calculus & Finance lectures",
      expiry_date: null,
      status: "running_low",
    },
  ]);

  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([
    {
      id: "shop-1",
      user_id: userId,
      inventory_item_id: "inv-2",
      item_name: "Piano Blue Pens (Pack of 10)",
      quantity: 1,
      unit: "pack",
      estimated_price_paisa: 25000n, // Rs. 250
      priority: "high",
      is_purchased: false,
      notes: "Low stock for upcoming university exams",
    },
  ]);

  const [activeTab, setActiveTab] = useState<"inventory" | "shopping">("inventory");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modal dialogs
  const [useDialogOpen, setUseDialogOpen] = useState(false);
  const [selectedItemForUse, setSelectedItemForUse] = useState<InventoryItem | null>(null);
  const [useQuantity, setUseQuantity] = useState(1);
  const [useReason, setUseReason] = useState("");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<InventoryCategory>("stationery");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("pcs");
  const [newItemMinQty, setNewItemMinQty] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemLocation, setNewItemLocation] = useState("");

  const lowStockItems = useMemo(() => {
    return items.filter((i) => i.status === "running_low" || i.status === "out_of_stock");
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.location || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === "all" || item.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [items, searchTerm, categoryFilter]);

  function handleOpenUse(item: InventoryItem) {
    setSelectedItemForUse(item);
    setUseQuantity(1);
    setUseReason("");
    setUseDialogOpen(true);
  }

  function handleConfirmUse(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemForUse) return;

    try {
      const { updatedItem } = recordInventoryUsage(selectedItemForUse, useQuantity, useReason);
      setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
      onToast(`Used ${useQuantity} ${selectedItemForUse.unit} of ${selectedItemForUse.name}. Stock updated (no financial charge).`);
      setUseDialogOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error processing inventory usage.");
    }
  }

  function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim()) return;

    let pricePaisa = 0n;
    if (newItemPrice.trim()) {
      try {
        pricePaisa = parseRupeesToPaisa(newItemPrice);
      } catch {
        alert("Enter a valid price.");
        return;
      }
    }

    const currentQty = parseFloat(newItemQty) || 1;
    const minQty = parseFloat(newItemMinQty) || 1;

    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: newItemName.trim(),
      category: newItemCategory,
      current_quantity: currentQty,
      unit: newItemUnit.trim() || "units",
      minimum_quantity: minQty,
      purchase_price_paisa: pricePaisa,
      last_purchase_date: new Date().toISOString().slice(0, 10),
      location: newItemLocation.trim() || "Home",
      notes: null,
      expiry_date: null,
      status: computeInventoryStatus(currentQty, minQty),
    };

    setItems((prev) => [newItem, ...prev]);
    onToast(`Added "${newItem.name}" to household stock.`);
    setCreateDialogOpen(false);
  }

  function toggleShoppingItemPurchased(id: string) {
    setShoppingList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_purchased: !s.is_purchased } : s))
    );
    onToast("Shopping item updated.");
  }

  return (
    <div className="inventory-manager-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Personal & household stock</p>
          <h1>Household Inventory<span className="heading-period">.</span></h1>
          <p className="page-subtitle">
            Track what you already have at home (stationery, perfume, groceries) so you never buy duplicates or create fake expenses.
          </p>
        </div>
        <div className="heading-actions">
          <button type="button" className="outline-button refresh-button" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> Refresh
          </button>
          <button type="button" className="primary-button" onClick={() => setCreateDialogOpen(true)}>
            <Plus size={17} /> Add item
          </button>
        </div>
      </section>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <AlertTriangle color="#d97706" size={20} />
          <div style={{ flex: 1, fontSize: "0.875rem" }}>
            <strong style={{ color: "#92400e" }}>Low Stock Alert:</strong> {lowStockItems.map((i) => `${i.name} (${i.current_quantity} ${i.unit} left)`).join(", ")}. Consider adding them to your shopping list.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          style={{
            padding: "0.5rem 1rem",
            fontWeight: 600,
            borderBottom: activeTab === "inventory" ? "2px solid #2563eb" : "none",
            color: activeTab === "inventory" ? "#2563eb" : "#64748b",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Package size={15} style={{ display: "inline", marginRight: "6px" }} />
          Available Stock ({items.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shopping")}
          style={{
            padding: "0.5rem 1rem",
            fontWeight: 600,
            borderBottom: activeTab === "shopping" ? "2px solid #2563eb" : "none",
            color: activeTab === "shopping" ? "#2563eb" : "#64748b",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <ShoppingCart size={15} style={{ display: "inline", marginRight: "6px" }} />
          Shopping List ({shoppingList.filter((s) => !s.is_purchased).length})
        </button>
      </div>

      {activeTab === "inventory" ? (
        <>
          {/* Search & Filter Bar */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "11px", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search items, desk, room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%", padding: "7px 10px 7px 32px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: "7px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", textTransform: "capitalize" }}
            >
              <option value="all">All Categories</option>
              <option value="stationery">Stationery</option>
              <option value="personal_care">Personal Care</option>
              <option value="perfume">Perfume</option>
              <option value="clothing">Clothing</option>
              <option value="food_supplies">Food Supplies</option>
              <option value="cleaning_supplies">Cleaning Supplies</option>
              <option value="household_products">Household Products</option>
              <option value="electronics">Electronics</option>
            </select>
          </div>

          {/* Items Table */}
          <div className="ledger-table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>In Stock</th>
                  <th>Location</th>
                  <th>Last Price</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      {item.notes && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.notes}</div>}
                    </td>
                    <td style={{ textTransform: "capitalize", color: "#475569" }}>
                      {item.category.replace("_", " ")}
                    </td>
                    <td>
                      <strong>{item.current_quantity}</strong> <small>{item.unit}</small>
                    </td>
                    <td style={{ color: "#64748b" }}>{item.location || "Home"}</td>
                    <td>{item.purchase_price_paisa ? formatPkr(item.purchase_price_paisa) : "—"}</td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: item.status === "available" ? "#ecfdf5" : item.status === "running_low" ? "#fffbeb" : "#fee2e2",
                          color: item.status === "available" ? "#065f46" : item.status === "running_low" ? "#92400e" : "#991b1b",
                        }}
                      >
                        {item.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="outline-button"
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={() => handleOpenUse(item)}
                        disabled={item.current_quantity <= 0}
                      >
                        Use 1 {item.unit}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Shopping List View */
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h3>Required Household & Study Purchases</h3>
              <p className="card-caption">Items to buy next. When purchased, link to an expense to update stock automatically.</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
            {shoppingList.map((shop) => (
              <div
                key={shop.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  backgroundColor: shop.is_purchased ? "#f8fafc" : "#fff",
                  opacity: shop.is_purchased ? 0.6 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => toggleShoppingItemPurchased(shop.id)}
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "4px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: shop.is_purchased ? "#10b981" : "#fff",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    {shop.is_purchased && <Check size={14} />}
                  </button>
                  <div>
                    <strong style={{ textDecoration: shop.is_purchased ? "line-through" : "none" }}>{shop.item_name}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      Qty: {shop.quantity} {shop.unit} • Est: {formatPkr(shop.estimated_price_paisa)}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    backgroundColor: shop.priority === "urgent" ? "#fee2e2" : "#f1f5f9",
                    color: shop.priority === "urgent" ? "#991b1b" : "#475569",
                  }}
                >
                  {shop.priority} priority
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Use Item Dialog (Non-financial event) */}
      {useDialogOpen && selectedItemForUse && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Take / Use Item: {selectedItemForUse.name}</h3>
              <button type="button" className="icon-button subtle" onClick={() => setUseDialogOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmUse} className="entry-form">
              <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", padding: "0.75rem", borderRadius: "6px", fontSize: "0.85rem", color: "#166534" }}>
                <strong>Accounting Rule:</strong> Using an existing item from home does <em>not</em> create a financial expense. It only reduces inventory count.
              </div>

              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label>Quantity to Use ({selectedItemForUse.unit})</label>
                <input
                  type="number"
                  min="1"
                  max={selectedItemForUse.current_quantity}
                  value={useQuantity}
                  onChange={(e) => setUseQuantity(parseInt(e.target.value, 10) || 1)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Purpose / Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Coursework, personal grooming"
                  value={useReason}
                  onChange={(e) => setUseReason(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="outline-button" onClick={() => setUseDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Confirm Usage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Item Dialog */}
      {createDialogOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Add Stock Item</h3>
              <button type="button" className="icon-button subtle" onClick={() => setCreateDialogOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateItem} className="entry-form">
              <div className="form-group">
                <label>Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Notebook, Pencil, Perfume, Shampoo"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as InventoryCategory)}
                  >
                    <option value="stationery">Stationery</option>
                    <option value="personal_care">Personal Care</option>
                    <option value="perfume">Perfume</option>
                    <option value="clothing">Clothing</option>
                    <option value="shoes">Shoes</option>
                    <option value="food_supplies">Food Supplies</option>
                    <option value="cleaning_supplies">Cleaning Supplies</option>
                    <option value="household_products">Household Products</option>
                    <option value="electronics">Electronics</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input
                    type="text"
                    placeholder="pcs, bottle, register"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Current Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Min Alert Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newItemMinQty}
                    onChange={(e) => setNewItemMinQty(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Purchase Price (PKR)</label>
                  <input
                    type="text"
                    placeholder="e.g. 150"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Stored Location</label>
                  <input
                    type="text"
                    placeholder="Study table, Bedroom, Wardrobe"
                    value={newItemLocation}
                    onChange={(e) => setNewItemLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="outline-button" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

