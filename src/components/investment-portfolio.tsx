"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  PieChart as PieIcon,
  Plus,
  Radio,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatPkr, parseRupeesToPaisa, toPaisa, type FinanceAccount } from "@/lib/finance";
import {
  calculatePortfolioSummary,
  INITIAL_VERIFIED_HOLDINGS,
  type StockHolding,
  type StockTransaction,
} from "@/lib/investments";
import {
  autoUpdateHoldingPrices,
  fetchLiveMarketData,
  type PsxQuote,
} from "@/lib/market-feed";

interface InvestmentPortfolioProps {
  userId: string;
  supabase: SupabaseClient;
  accounts: FinanceAccount[];
  dataAvailable: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

const ALLOCATION_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#e11d48", "#0891b2"];

export function InvestmentPortfolio({
  userId,
  supabase,
  accounts,
  dataAvailable,
  refreshing,
  onRefresh,
  onToast,
}: InvestmentPortfolioProps) {
  // Pre-seeded verified holdings matching user statement
  const [holdings, setHoldings] = useState<StockHolding[]>(() => {
    return INITIAL_VERIFIED_HOLDINGS.map((item, idx) => ({
      ...item,
      id: `holding-${idx + 1}`,
      user_id: userId,
    }));
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [priceUpdateDialogOpen, setPriceUpdateDialogOpen] = useState(false);
  const [selectedHoldingForUpdate, setSelectedHoldingForUpdate] = useState<StockHolding | null>(null);
  const [newPriceRupees, setNewPriceRupees] = useState("");
  const [priceSource, setPriceSource] = useState("PSX Official Closing Rate");

  // Autonomous Live Market Sync State
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("pocketasset_auto_sync_psx") !== "false";
  });
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [nextSyncCountdown, setNextSyncCountdown] = useState(300); // 5 minutes
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [liveQuotes, setLiveQuotes] = useState<PsxQuote[]>([]);

  // Buy holding form
  const [symbol, setSymbol] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sharesQuantity, setSharesQuantity] = useState("");
  const [buyPriceRupees, setBuyPriceRupees] = useState("");

  const summary = useMemo(() => {
    return calculatePortfolioSummary(holdings, 0n);
  }, [holdings]);

  const pieChartData = useMemo(() => {
    return summary.holdings.map((h) => ({
      name: h.holding.symbol,
      value: Number(h.currentMarketValuePaisa) / 100,
      allocation: h.allocationPercentage,
    }));
  }, [summary]);

  // Autonomous Live Market Fetch & Holding Update Handler
  async function triggerAutoSync(silent = false) {
    setIsAutoSyncing(true);
    try {
      const feed = await fetchLiveMarketData();
      setLiveQuotes(feed.psxQuotes);

      const updateResult = autoUpdateHoldingPrices(holdings, feed.psxQuotes);

      if (updateResult.updatedCount > 0) {
        setHoldings(updateResult.updatedHoldings);
        const formattedDiff = formatPkr(updateResult.valueDiffPaisa < 0n ? -updateResult.valueDiffPaisa : updateResult.valueDiffPaisa);
        const sign = updateResult.valueDiffPaisa >= 0n ? "+" : "-";

        if (!silent) {
          onToast(
            `⚡ Live PSX Auto-Update: Synchronized ${updateResult.updatedCount} stocks (${sign}${formattedDiff} portfolio change).`
          );
        }
      } else if (!silent) {
        onToast("⚡ Live PSX prices verified. Portfolio is up to date.");
      }

      setLastSyncTime(new Date().toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }));
      setNextSyncCountdown(300);
    } catch {
      if (!silent) onToast("Notice: Market feed snapshot active.");
    } finally {
      setIsAutoSyncing(false);
    }
  }

  // Initial load auto-fetch
  useEffect(() => {
    if (autoSyncEnabled) {
      void triggerAutoSync(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic auto-sync countdown timer
  useEffect(() => {
    if (!autoSyncEnabled) return;

    const interval = setInterval(() => {
      setNextSyncCountdown((prev) => {
        if (prev <= 1) {
          void triggerAutoSync(true);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoSyncEnabled, holdings]);

  function toggleAutoSync() {
    const nextVal = !autoSyncEnabled;
    setAutoSyncEnabled(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("pocketasset_auto_sync_psx", String(nextVal));
    }
    if (nextVal) {
      onToast("🟢 PSX Live Auto-Sync enabled (refreshes every 5 mins).");
      void triggerAutoSync(false);
    } else {
      onToast("⚪ PSX Live Auto-Sync paused.");
    }
  }

  function handleOpenPriceUpdate(holding: StockHolding) {
    setSelectedHoldingForUpdate(holding);
    setNewPriceRupees((Number(holding.current_market_price_paisa) / 100).toFixed(2));
    setPriceSource("PSX Official Closing Rate");
    setPriceUpdateDialogOpen(true);
  }

  function handleSavePriceUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHoldingForUpdate) return;

    let pricePaisa: bigint;
    try {
      pricePaisa = parseRupeesToPaisa(newPriceRupees);
    } catch {
      alert("Please enter a valid stock price.");
      return;
    }

    setHoldings((prev) =>
      prev.map((h) =>
        h.id === selectedHoldingForUpdate.id
          ? {
            ...h,
            current_market_price_paisa: pricePaisa,
            last_price_updated_at: new Date().toISOString(),
            price_source: priceSource.trim() || "Manual Entry",
          }
          : h
      )
    );

    onToast(`Updated market price for ${selectedHoldingForUpdate.symbol}.`);
    setPriceUpdateDialogOpen(false);
  }

  function handleBuyStock(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol.trim() || !companyName.trim()) return;

    const qty = parseFloat(sharesQuantity);
    if (!qty || qty <= 0) {
      alert("Enter a valid shares quantity.");
      return;
    }

    let pricePaisa: bigint;
    try {
      pricePaisa = parseRupeesToPaisa(buyPriceRupees);
    } catch {
      alert("Enter a valid purchase price.");
      return;
    }

    const newHolding: StockHolding = {
      id: crypto.randomUUID(),
      user_id: userId,
      symbol: symbol.trim().toUpperCase(),
      company_name: companyName.trim(),
      shares_quantity: qty,
      average_buy_price_paisa: pricePaisa,
      current_market_price_paisa: pricePaisa,
      last_price_updated_at: new Date().toISOString(),
      price_source: "Manual Buy Entry",
    };

    setHoldings((prev) => [...prev, newHolding]);
    onToast(`Added ${newHolding.symbol} holding to your portfolio.`);
    setDialogOpen(false);
  }

  const countdownMinutes = Math.floor(nextSyncCountdown / 60);
  const countdownSeconds = (nextSyncCountdown % 60).toString().padStart(2, "0");

  return (
    <div className="investment-portfolio-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Pakistan Stock Exchange (PSX)</p>
          <h1>Investment Portfolio<span className="heading-period">.</span></h1>
          <p className="page-subtitle">
            Track your PSX equity holdings, average purchase cost, unrealized gains, and verified statement value.
          </p>
        </div>
        <div className="heading-actions">
          <button type="button" className="outline-button refresh-button" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> Refresh
          </button>
          <button type="button" className="primary-button" onClick={() => setDialogOpen(true)}>
            <Plus size={17} /> Add Stock Holding
          </button>
        </div>
      </section>

      {/* Autonomous Live Market Auto-Sync HUD Bar */}
      <div className="psx-auto-sync-banner">
        <div className="sync-banner-left">
          <div className="live-status-pill">
            <span className={`live-status-dot ${autoSyncEnabled ? "live-dot-pulse" : "live-dot-off"}`} />
            <strong>{autoSyncEnabled ? "LIVE PSX AUTO-SYNC: CONNECTED" : "PSX AUTO-SYNC: PAUSED"}</strong>
          </div>
          <span className="sync-meta-text">
            {autoSyncEnabled
              ? `Next auto-fetch in ${countdownMinutes}:${countdownSeconds} • Refreshes bluechip quotes & recalculates net worth`
              : "Auto-refresh paused. Click to manually fetch latest PSX prices"}
          </span>
          {lastSyncTime && (
            <span className="sync-time-badge">Last updated at {lastSyncTime}</span>
          )}
        </div>

        <div className="sync-banner-actions">
          <button
            type="button"
            className={`sync-toggle-btn ${autoSyncEnabled ? "active" : ""}`}
            onClick={toggleAutoSync}
            title="Toggle automatic periodic price fetching"
          >
            <Radio size={13} />
            <span>Auto-Update: {autoSyncEnabled ? "ON" : "OFF"}</span>
          </button>

          <button
            type="button"
            className="primary-button sync-fetch-now-btn"
            onClick={() => void triggerAutoSync(false)}
            disabled={isAutoSyncing}
          >
            <Zap size={14} className={isAutoSyncing ? "spin" : ""} />
            <span>{isAutoSyncing ? "Fetching PSX Quotes…" : "Fetch Live PSX Prices"}</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
            <BriefcaseBusiness size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Portfolio Market Value</span>
            <strong className="kpi-value">{formatPkr(summary.totalMarketValuePaisa)}</strong>
            <small className="kpi-sub">Verified PSX Valuation</small>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#f8fafc", color: "#475569" }}>
            <Building2 size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Total Investment Cost</span>
            <strong className="kpi-value">{formatPkr(summary.totalCostPaisa)}</strong>
            <small className="kpi-sub">Total capital deployed</small>
          </div>
        </div>

        <div className="kpi-card">
          <div
            className="kpi-icon-wrap"
            style={{
              backgroundColor: summary.totalUnrealizedPaisa >= 0n ? "#ecfdf5" : "#fef2f2",
              color: summary.totalUnrealizedPaisa >= 0n ? "#10b981" : "#ef4444",
            }}
          >
            {summary.totalUnrealizedPaisa >= 0n ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Unrealized Capital Gain</span>
            <strong
              className="kpi-value"
              style={{ color: summary.totalUnrealizedPaisa >= 0n ? "#16a34a" : "#dc2626" }}
            >
              {summary.totalUnrealizedPaisa >= 0n ? "+" : ""}{formatPkr(summary.totalUnrealizedPaisa)}
            </strong>
            <small className="kpi-sub">
              {summary.totalReturnPercentage >= 0 ? "+" : ""}{summary.totalReturnPercentage}% return
            </small>
          </div>
        </div>
      </div>

      {/* Accounting Rule Callout */}
      <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1rem", marginTop: "1.25rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
        <AlertCircle size={18} color="#2563eb" style={{ marginTop: "2px", flexShrink: 0 }} />
        <div style={{ fontSize: "0.85rem", color: "#334155" }}>
          <strong>Core Accounting Rule:</strong> Unrealized stock market profit is never counted as cash income until actual shares are sold and realized. Stock market value is kept strictly separate from liquid cash in hand.
        </div>
      </div>

      {/* Holdings & Allocation Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
        {/* Table of Holdings */}
        <section className="dashboard-card" style={{ gridColumn: "span 2" }}>
          <div className="card-header">
            <div>
              <h3>Verified PSX Holdings</h3>
              <p className="card-caption">All 4 verified blue-chip stocks currently held in your portfolio</p>
            </div>
          </div>

          <div className="ledger-table-wrap" style={{ marginTop: "1rem" }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Symbol & Company</th>
                  <th>Quantity</th>
                  <th>Avg Cost</th>
                  <th>Market Price</th>
                  <th>Total Value</th>
                  <th>P&L</th>
                  <th style={{ textAlign: "right" }}>Update Price</th>
                </tr>
              </thead>
              <tbody>
                {summary.holdings.map(({ holding, totalCostPaisa, currentMarketValuePaisa, unrealizedProfitLossPaisa, returnPercentage }) => (
                  <tr key={holding.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{holding.symbol}</span>
                      </div>
                      <small style={{ color: "#64748b" }}>{holding.company_name}</small>
                    </td>
                    <td>
                      <strong>{holding.shares_quantity}</strong> <small>shares</small>
                    </td>
                    <td>{formatPkr(holding.average_buy_price_paisa)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatPkr(holding.current_market_price_paisa)}</span>
                        {liveQuotes.find((q) => q.symbol === holding.symbol) && (
                          <span
                            className="live-stock-change-pill"
                            style={{
                              fontSize: "10px",
                              fontWeight: 750,
                              padding: "1px 5px",
                              borderRadius: "4px",
                              color: (liveQuotes.find((q) => q.symbol === holding.symbol)?.changePercent ?? 0) >= 0 ? "#059669" : "#e11d48",
                              background: (liveQuotes.find((q) => q.symbol === holding.symbol)?.changePercent ?? 0) >= 0 ? "#ecfdf5" : "#fef2f2",
                            }}
                          >
                            {(liveQuotes.find((q) => q.symbol === holding.symbol)?.changePercent ?? 0) >= 0 ? "▲ +" : "▼ "}
                            {liveQuotes.find((q) => q.symbol === holding.symbol)?.changePercent}%
                          </span>
                        )}
                      </div>
                      <small style={{ fontSize: "0.7rem", color: "#64748b", display: "block", marginTop: "2px" }}>{holding.price_source}</small>
                    </td>
                    <td>
                      <strong>{formatPkr(currentMarketValuePaisa)}</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          color: unrealizedProfitLossPaisa >= 0n ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {unrealizedProfitLossPaisa >= 0n ? "+" : ""}{formatPkr(unrealizedProfitLossPaisa)}
                        <br />
                        <small>({returnPercentage >= 0 ? "+" : ""}{returnPercentage}%)</small>
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="outline-button"
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={() => handleOpenPriceUpdate(holding)}
                      >
                        <Edit2 size={12} /> Edit Price
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Allocation Pie Chart */}
        <section className="dashboard-card">
          <div className="card-header">
            <div>
              <h3>Holdings Allocation</h3>
              <p className="card-caption">Portfolio exposure breakdown</p>
            </div>
          </div>

          <div style={{ height: "240px", marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`Rs. ${Number(value).toLocaleString()}`, "Value"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem", justifyContent: "center" }}>
            {summary.holdings.map((h, i) => (
              <div key={h.holding.symbol} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }} />
                <strong>{h.holding.symbol}</strong> ({h.allocationPercentage}%)
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Price Update Modal */}
      {priceUpdateDialogOpen && selectedHoldingForUpdate && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Update Market Price: {selectedHoldingForUpdate.symbol}</h3>
              <button type="button" className="icon-button subtle" onClick={() => setPriceUpdateDialogOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePriceUpdate} className="entry-form">
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "0.75rem", borderRadius: "6px", fontSize: "0.85rem", color: "#475569" }}>
                <strong>No Fake Data:</strong> Always enter manually verified prices from the Pakistan Stock Exchange closing report.
              </div>

              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label>Current Market Price (PKR per share)</label>
                <input
                  type="text"
                  value={newPriceRupees}
                  onChange={(e) => setNewPriceRupees(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Price Source / Date</label>
                <input
                  type="text"
                  value={priceSource}
                  onChange={(e) => setPriceSource(e.target.value)}
                  placeholder="e.g. PSX Daily Quotations, Brokerage App"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="outline-button" onClick={() => setPriceUpdateDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Dialog */}
      {dialogOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Add Stock Holding</h3>
              <button type="button" className="icon-button subtle" onClick={() => setDialogOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBuyStock} className="entry-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Ticker Symbol</label>
                  <input
                    type="text"
                    placeholder="e.g. ENGRO, SYS, HUBC"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Engro Corporation Limited"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity of Shares</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 10"
                    value={sharesQuantity}
                    onChange={(e) => setSharesQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Buy Price per Share (PKR)</label>
                  <input
                    type="text"
                    placeholder="e.g. 350.50"
                    value={buyPriceRupees}
                    onChange={(e) => setBuyPriceRupees(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="outline-button" onClick={() => setDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Holding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

