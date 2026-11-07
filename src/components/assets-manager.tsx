"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  DollarSign,
  Laptop,
  Layers,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  Smartphone,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { formatPkr, parseRupeesToPaisa, toPaisa, type FinanceAccount, type FinanceTransaction } from "@/lib/finance";
import {
  calculateNetWorth,
  type Asset,
  type AssetType,
  type Liability,
  type LiabilityType,
} from "@/lib/assets";

interface AssetsManagerProps {
  userId: string;
  supabase: SupabaseClient;
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  stockMarketValuePaisa: bigint;
  dataAvailable: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export function AssetsManager({
  userId,
  supabase,
  accounts,
  transactions,
  stockMarketValuePaisa,
  dataAvailable,
  refreshing,
  onRefresh,
  onToast,
}: AssetsManagerProps) {
  // Initial realistic assets and liabilities
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: "asset-1",
      user_id: userId,
      name: "Dell XPS 15 Workstation",
      asset_type: "electronics",
      purchase_date: "2025-08-15",
      purchase_cost_paisa: 18000000n, // Rs. 180,000
      current_estimated_value_paisa: 15500000n, // Rs. 155,000
      ownership: "Sole owner",
      notes: "Development machine",
    },
    {
      id: "asset-2",
      user_id: userId,
      name: "OnePlus Smartphone",
      asset_type: "electronics",
      purchase_date: "2025-02-10",
      purchase_cost_paisa: 7500000n, // Rs. 75,000
      current_estimated_value_paisa: 5500000n, // Rs. 55,000
      ownership: "Sole owner",
      notes: "Primary phone",
    },
  ]);

  const [liabilities, setLiabilities] = useState<Liability[]>([
    {
      id: "liab-1",
      user_id: userId,
      name: "Short-term borrow from cousin",
      liability_type: "borrowed_money",
      principal_amount_paisa: 500000n, // Rs. 5,000
      remaining_balance_paisa: 300000n, // Rs. 3,000 remaining
      owed_to: "Hamza",
      due_date: "2026-11-20",
      is_settled: false,
      notes: "Covered unexpected travel ticket",
    },
  ]);

  const [activeTab, setActiveTab] = useState<"overview" | "assets" | "liabilities">("overview");

  // Dialogs
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [liabilityDialogOpen, setLiabilityDialogOpen] = useState(false);

  // Asset Form
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("electronics");
  const [assetCost, setAssetCost] = useState("");
  const [assetValue, setAssetValue] = useState("");

  // Liability Form
  const [liabName, setLiabName] = useState("");
  const [liabType, setLiabType] = useState<LiabilityType>("borrowed_money");
  const [liabOwedTo, setLiabOwedTo] = useState("");
  const [liabAmount, setLiabAmount] = useState("");
  const [liabDueDate, setLiabDueDate] = useState("");

  const netWorth = useMemo(() => {
    return calculateNetWorth(accounts, transactions, stockMarketValuePaisa, assets, liabilities);
  }, [accounts, transactions, stockMarketValuePaisa, assets, liabilities]);

  function handleCreateAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!assetName.trim()) return;

    let costPaisa = 0n;
    let valPaisa = 0n;
    try {
      costPaisa = parseRupeesToPaisa(assetCost);
      valPaisa = parseRupeesToPaisa(assetValue);
    } catch {
      alert("Please enter valid amounts.");
      return;
    }

    const newAsset: Asset = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: assetName.trim(),
      asset_type: assetType,
      purchase_date: new Date().toISOString().slice(0, 10),
      purchase_cost_paisa: costPaisa,
      current_estimated_value_paisa: valPaisa,
      ownership: "Sole owner",
    };

    setAssets((prev) => [...prev, newAsset]);
    onToast(`Added asset "${newAsset.name}".`);
    setAssetDialogOpen(false);
  }

  function handleCreateLiability(e: React.FormEvent) {
    e.preventDefault();
    if (!liabName.trim() || !liabOwedTo.trim()) return;

    let amountPaisa = 0n;
    try {
      amountPaisa = parseRupeesToPaisa(liabAmount);
    } catch {
      alert("Please enter a valid amount.");
      return;
    }

    const newLiability: Liability = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: liabName.trim(),
      liability_type: liabType,
      principal_amount_paisa: amountPaisa,
      remaining_balance_paisa: amountPaisa,
      owed_to: liabOwedTo.trim(),
      due_date: liabDueDate || null,
      is_settled: false,
    };

    setLiabilities((prev) => [...prev, newLiability]);
    onToast(`Added liability "${newLiability.name}".`);
    setLiabilityDialogOpen(false);
  }

  function handleSettleLiability(id: string) {
    setLiabilities((prev) =>
      prev.map((l) => (l.id === id ? { ...l, is_settled: true, remaining_balance_paisa: 0n } : l))
    );
    onToast("Liability marked as settled.");
  }

  return (
    <div className="assets-manager-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">True Financial Worth</p>
          <h1>Assets & Liabilities<span className="heading-period">.</span></h1>
          <p className="page-subtitle">
            Understand your total net worth and liquid net worth without duplicating account balances.
          </p>
        </div>
        <div className="heading-actions">
          <button type="button" className="outline-button refresh-button" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> Refresh
          </button>
          <button type="button" className="outline-button" onClick={() => setLiabilityDialogOpen(true)}>
            <Plus size={16} /> Add Liability
          </button>
          <button type="button" className="primary-button" onClick={() => setAssetDialogOpen(true)}>
            <Plus size={17} /> Add Physical Asset
          </button>
        </div>
      </section>

      {/* KPI Net Worth Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
            <Scale size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Total Net Worth</span>
            <strong className="kpi-value">{formatPkr(netWorth.totalNetWorthPaisa)}</strong>
            <small className="kpi-sub">Assets minus Liabilities</small>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#ecfdf5", color: "#10b981" }}>
            <DollarSign size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Liquid Net Worth</span>
            <strong className="kpi-value">{formatPkr(netWorth.liquidNetWorthPaisa)}</strong>
            <small className="kpi-sub">Cash minus Obligations</small>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#fef2f2", color: "#ef4444" }}>
            <ShieldAlert size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Outstanding Liabilities</span>
            <strong className="kpi-value">{formatPkr(netWorth.totalLiabilitiesPaisa)}</strong>
            <small className="kpi-sub">Debt ratio: {netWorth.debtToAssetRatio}%</small>
          </div>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
        <div className="dashboard-card">
          <h4 style={{ margin: "0 0 0.5rem 0", color: "#64748b", fontSize: "0.85rem" }}>1. Liquid Accounts Cash</h4>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>
            {formatPkr(netWorth.liquidCashPaisa)}
          </div>
          <small style={{ color: "#64748b" }}>Cash in hand, JazzCash, Easypaisa, Bank</small>
        </div>

        <div className="dashboard-card">
          <h4 style={{ margin: "0 0 0.5rem 0", color: "#64748b", fontSize: "0.85rem" }}>2. PSX Stock Investments</h4>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#2563eb" }}>
            {formatPkr(netWorth.stockInvestmentsMarketValuePaisa)}
          </div>
          <small style={{ color: "#64748b" }}>Market value of shares (FFC, LUCK, MEBL, OGDC)</small>
        </div>

        <div className="dashboard-card">
          <h4 style={{ margin: "0 0 0.5rem 0", color: "#64748b", fontSize: "0.85rem" }}>3. Physical Assets Value</h4>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#059669" }}>
            {formatPkr(netWorth.physicalAssetsPaisa)}
          </div>
          <small style={{ color: "#64748b" }}>Electronics, devices, and valuable possessions</small>
        </div>
      </div>

      {/* Assets & Liabilities Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
        {/* Assets Section */}
        <section className="dashboard-card">
          <div className="card-header">
            <div>
              <h3>Physical Assets</h3>
              <p className="card-caption">Valuable personal assets (not liquid cash)</p>
            </div>
          </div>

          <div className="ledger-table-wrap" style={{ marginTop: "1rem" }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Category</th>
                  <th>Current Value</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Cost: {formatPkr(a.purchase_cost_paisa)}</div>
                    </td>
                    <td style={{ textTransform: "capitalize", color: "#475569" }}>{a.asset_type}</td>
                    <td>
                      <strong>{formatPkr(a.current_estimated_value_paisa)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Liabilities Section */}
        <section className="dashboard-card">
          <div className="card-header">
            <div>
              <h3>Liabilities & Debts</h3>
              <p className="card-caption">Money borrowed or pending payments</p>
            </div>
          </div>

          <div className="ledger-table-wrap" style={{ marginTop: "1rem" }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Owed To</th>
                  <th>Remaining</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {liabilities.map((l) => (
                  <tr key={l.id} style={{ opacity: l.is_settled ? 0.6 : 1 }}>
                    <td>
                      <strong>{l.name}</strong>
                      {l.due_date && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Due: {l.due_date}</div>}
                    </td>
                    <td>{l.owed_to}</td>
                    <td>
                      <strong style={{ color: l.is_settled ? "#64748b" : "#dc2626" }}>
                        {l.is_settled ? "Settled" : formatPkr(l.remaining_balance_paisa)}
                      </strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {!l.is_settled ? (
                        <button
                          type="button"
                          className="outline-button"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          onClick={() => handleSettleLiability(l.id)}
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600 }}>Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Add Asset Modal */}
      {assetDialogOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Add Physical Asset</h3>
              <button type="button" className="icon-button subtle" onClick={() => setAssetDialogOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="entry-form">
              <div className="form-group">
                <label>Asset Name</label>
                <input
                  type="text"
                  placeholder="e.g. Laptop, Phone, Bike"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Asset Type</label>
                <select value={assetType} onChange={(e) => setAssetType(e.target.value as AssetType)}>
                  <option value="electronics">Electronics & Devices</option>
                  <option value="jewelry">Jewelry & Gold</option>
                  <option value="vehicle">Vehicle / Bike</option>
                  <option value="real_estate">Real Estate / Property</option>
                  <option value="valuable_possession">Valuable Possession</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Original Purchase Cost (PKR)</label>
                  <input
                    type="text"
                    placeholder="e.g. 100000"
                    value={assetCost}
                    onChange={(e) => setAssetCost(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Current Estimated Value (PKR)</label>
                  <input
                    type="text"
                    placeholder="e.g. 80000"
                    value={assetValue}
                    onChange={(e) => setAssetValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="outline-button" onClick={() => setAssetDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Liability Modal */}
      {liabilityDialogOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Record Debt / Liability</h3>
              <button type="button" className="icon-button subtle" onClick={() => setLiabilityDialogOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLiability} className="entry-form">
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="e.g. Friend borrow, Store credit"
                  value={liabName}
                  onChange={(e) => setLiabName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Owed To (Person/Store)</label>
                  <input
                    type="text"
                    placeholder="e.g. Ali, Brother, Uncle"
                    value={liabOwedTo}
                    onChange={(e) => setLiabOwedTo(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Amount (PKR)</label>
                  <input
                    type="text"
                    placeholder="e.g. 5000"
                    value={liabAmount}
                    onChange={(e) => setLiabAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Due Date (Optional)</label>
                <input type="date" value={liabDueDate} onChange={(e) => setLiabDueDate(e.target.value)} />
              </div>

              <div className="modal-actions">
                <button type="button" className="outline-button" onClick={() => setLiabilityDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Liability
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

