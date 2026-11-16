"use client";

import { useMemo, useState } from "react";
import {
  TrendingUp,
  Percent,
  ShieldAlert,
  Flame,
  Award,
  Zap,
  CheckCircle2,
  Calendar,
  Building2,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
  DollarSign,
  Briefcase,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  Compass,
  Gauge,
  Target,
  ShieldCheck,
  Scale,
  PieChart,
  Check,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  PSX_DIVIDEND_ARISTOCRATS,
  calculateDividendForecast,
  calculateDripGrowth,
  runMonteCarloSimulation,
  calculateMacroStressTest,
  calculateFireMatrix,
  filterAndSortPsxStocks,
  calculateKse100ValuationThermometer,
  PRESET_QUANTUM_GOALS,
  calculateQuantumGoalPlan,
  type PsxDividendStock,
  type QuantumWealthGoal,
} from "@/lib/sarmaya-pro";
import { formatPkr, type FinanceAccount, type FinanceTransaction } from "@/lib/finance";

interface SarmayaProSuiteProps {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
}

type ProTab = "dividends" | "screener" | "cycle" | "goals" | "montecarlo" | "stresstest" | "fire";

export function SarmayaProSuite({ accounts, transactions }: SarmayaProSuiteProps) {
  const [activeTab, setActiveTab] = useState<ProTab>("dividends");

  // Calculate real balances from user's live ledger
  const { liquidPaisa, netWorthPaisa, monthlyEssentialPaisa, monthlyTotalPaisa, monthlySavingsPaisa } = useMemo(() => {
    // 1. Liquid wealth from cash, bank, mobile wallets
    const liquid = accounts
      .filter((a) => a.is_active && (a.account_type === "cash" || a.account_type === "bank" || a.account_type === "wallet"))
      .reduce((sum, a) => sum + BigInt(a.opening_balance_paisa ?? 0n), 0n);

    // 2. Total ledger transactions adjustment
    const netTxs = transactions.filter((t) => !t.deleted_at).reduce((sum, t) => {
      const p = BigInt(t.amount_paisa ?? 0);
      if (t.transaction_type === "income") return sum + p;
      if (t.transaction_type === "expense") return sum - p;
      if (t.transaction_type === "adjustment") return t.direction === "inflow" ? sum + p : sum - p;
      return sum;
    }, 0n);

    const liveLiquid = liquid + netTxs;
    const safeLiquid = liveLiquid > 0n ? liveLiquid : liquid;

    // 3. Monthly expenses breakdown (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentExpenses = transactions.filter(
      (t) => !t.deleted_at && t.transaction_type === "expense" && t.occurred_at >= thirtyDaysAgo
    );

    let essential = 0n;
    let totalExp = 0n;
    for (const exp of recentExpenses) {
      const amount = BigInt(exp.amount_paisa ?? 0);
      totalExp += amount;
      if (exp.expense_classification === "essential" || !exp.expense_classification) {
        essential += amount;
      }
    }

    // Fallbacks if new user has few entries
    const defaultEssential = 20_000_00n; // Rs. 20,000 paisa
    const defaultTotal = 30_000_00n;     // Rs. 30,000 paisa
    const safeEssential = essential > 0n ? essential : defaultEssential;
    const safeTotal = totalExp > 0n ? totalExp : defaultTotal;

    return {
      liquidPaisa: safeLiquid,
      netWorthPaisa: safeLiquid,
      monthlyEssentialPaisa: safeEssential,
      monthlyTotalPaisa: safeTotal,
      monthlySavingsPaisa: 10_000_00n, // Rs. 10,000 / month savings target
    };
  }, [accounts, transactions]);

  // --------------------------------------------------------------------------
  // Tab 1: PSX Dividend State
  // --------------------------------------------------------------------------
  const [selectedStockTicker, setSelectedStockTicker] = useState("FFC");
  const [sharesHeld, setSharesHeld] = useState<number>(500);
  const [isFiler, setIsFiler] = useState<boolean>(true);
  const [dripInitialCapital, setDripInitialCapital] = useState<number>(200_000);

  const selectedStock = useMemo(
    () => PSX_DIVIDEND_ARISTOCRATS.find((s) => s.ticker === selectedStockTicker) ?? PSX_DIVIDEND_ARISTOCRATS[0],
    [selectedStockTicker]
  );

  const dividendForecast = useMemo(
    () => calculateDividendForecast(selectedStock, sharesHeld, isFiler),
    [selectedStock, sharesHeld, isFiler]
  );

  const dripComparison = useMemo(
    () =>
      calculateDripGrowth(
        dripInitialCapital,
        selectedStock.dividendYieldPercent,
        8.0, // 8% expected long-term capital appreciation
        10,
        isFiler
      ),
    [dripInitialCapital, selectedStock, isFiler]
  );

  // --------------------------------------------------------------------------
  // Tab 2: PSX Alpha & Sector Screener State
  // --------------------------------------------------------------------------
  const [screenerSector, setScreenerSector] = useState<string>("All");
  const [shariahOnly, setShariahOnly] = useState<boolean>(false);
  const [screenerSortBy, setScreenerSortBy] = useState<"alpha" | "yield" | "pe" | "roe" | "discount">("alpha");
  const [screenerSearch, setScreenerSearch] = useState<string>("");

  const screenedStocks = useMemo(
    () =>
      filterAndSortPsxStocks(PSX_DIVIDEND_ARISTOCRATS, {
        sector: screenerSector,
        shariahOnly,
        sortBy: screenerSortBy,
        searchQuery: screenerSearch,
      }),
    [screenerSector, shariahOnly, screenerSortBy, screenerSearch]
  );

  const screenerSectors = useMemo(() => {
    const list = ["All", ...new Set(PSX_DIVIDEND_ARISTOCRATS.map((s) => s.sector))];
    return list;
  }, []);

  // --------------------------------------------------------------------------
  // Tab 3: KSE-100 Valuation & Macro Thermometer State
  // --------------------------------------------------------------------------
  const thermometer = useMemo(() => calculateKse100ValuationThermometer(), []);

  // --------------------------------------------------------------------------
  // Tab 4: Quantum Wealth Goals State
  // --------------------------------------------------------------------------
  const [selectedGoalId, setSelectedGoalId] = useState<string>("crorepati");
  const [customGoalTarget, setCustomGoalTarget] = useState<number>(10_000_000);
  const [customGoalYears, setCustomGoalYears] = useState<number>(8);
  const [goalExpectedReturn, setGoalExpectedReturn] = useState<number>(15.0);
  const [goalInflation, setGoalInflation] = useState<number>(9.0);

  const handleSelectPresetGoal = (goal: QuantumWealthGoal) => {
    setSelectedGoalId(goal.id);
    setCustomGoalTarget(goal.targetAmountRupees);
    setCustomGoalYears(goal.targetYears);
  };

  const quantumGoalPlan = useMemo(
    () =>
      calculateQuantumGoalPlan(
        customGoalTarget,
        customGoalYears,
        Number(liquidPaisa) / 100,
        goalExpectedReturn,
        goalInflation
      ),
    [customGoalTarget, customGoalYears, liquidPaisa, goalExpectedReturn, goalInflation]
  );

  // --------------------------------------------------------------------------
  // Tab 5: 30-Year Monte Carlo Simulation State
  // --------------------------------------------------------------------------
  const [startingWealth, setStartingWealth] = useState<number>(() => {
    const rupees = Number(liquidPaisa) / 100;
    return rupees > 10_000 ? Math.round(rupees) : 100_000;
  });
  const [monthlySIP, setMonthlySIP] = useState<number>(15_000);
  const [expectedReturn, setExpectedReturn] = useState<number>(15.0);
  const [inflationRate, setInflationRate] = useState<number>(9.5);
  const [currentAge, setCurrentAge] = useState<number>(24);

  const monteCarloResult = useMemo(
    () =>
      runMonteCarloSimulation({
        currentAge,
        startingWealthRupees: startingWealth,
        monthlyContributionRupees: monthlySIP,
        expectedAnnualReturnPercent: expectedReturn,
        annualVolatilityPercent: 16.0,
        annualInflationPercent: inflationRate,
        simulationYears: 30,
      }),
    [currentAge, startingWealth, monthlySIP, expectedReturn, inflationRate]
  );

  const chartData = useMemo(() => {
    return monteCarloResult.projections.map((p) => ({
      year: `Age ${p.age}`,
      Conservative: Math.round(p.conservativeRupees / 100_000),
      BaseMedian: Math.round(p.medianRupees / 100_000),
      BullMarket: Math.round(p.optimisticRupees / 100_000),
      RealPurchasingPower: Math.round(p.realPurchasingPowerMedianRupees / 100_000),
      TotalInvested: Math.round(p.totalInvestedRupees / 100_000),
    }));
  }, [monteCarloResult]);

  // --------------------------------------------------------------------------
  // Tab 6: Macro Shock Stress-Test State
  // --------------------------------------------------------------------------
  const stressTestResult = useMemo(
    () => calculateMacroStressTest(liquidPaisa, monthlyEssentialPaisa, monthlyTotalPaisa),
    [liquidPaisa, monthlyEssentialPaisa, monthlyTotalPaisa]
  );

  // --------------------------------------------------------------------------
  // Tab 7: Pakistan FIRE Matrix State
  // --------------------------------------------------------------------------
  const fireMatrixResult = useMemo(
    () => calculateFireMatrix(monthlyEssentialPaisa, monthlyTotalPaisa, netWorthPaisa, monthlySavingsPaisa),
    [monthlyEssentialPaisa, monthlyTotalPaisa, netWorthPaisa, monthlySavingsPaisa]
  );

  return (
    <div className="sarmaya-pro-container">
      {/* Futuristic Cyber Live Ticker Strip */}
      <div className="pro-cyber-ticker-bar">
        <div className="cyber-ticker-pill">
          <span className="ticker-live-dot" />
          <span className="ticker-label">KSE-100:</span>
          <strong className="ticker-val text-emerald">93,250 ▲ +1.42%</strong>
        </div>
        <div className="cyber-ticker-pill">
          <span className="ticker-label">SBP POLICY RATE:</span>
          <strong className="ticker-val text-cyan">15.00% ▼ -100bps</strong>
        </div>
        <div className="cyber-ticker-pill">
          <span className="ticker-label">PKR / USD:</span>
          <strong className="ticker-val text-slate">278.20 ▬ STABLE</strong>
        </div>
        <div className="cyber-ticker-pill">
          <span className="ticker-label">24K GOLD:</span>
          <strong className="ticker-val text-amber">Rs. 278,500 / Tola ▲</strong>
        </div>
        <div className="cyber-ticker-pill hide-on-mobile">
          <span className="ticker-label">FORWARD P/E:</span>
          <strong className="ticker-val text-emerald">4.8x (41.5% DISCOUNT)</strong>
        </div>
        <div className="cyber-ticker-pill hide-on-mobile">
          <span className="ticker-system-status">
            <Zap size={11} /> QUANTUM ENGINE v3.0 ACTIVE
          </span>
        </div>
      </div>

      {/* Premium Header Banner */}
      <section className="page-heading module-page-heading pro-page-heading">
        <div>
          <div className="pro-badge-row">
            <span className="pro-unlocked-badge">
              <Sparkles size={12} /> SARMAYA & ZERODHA PRO SUITE (UNLOCKED FREE)
            </span>
            <span className="pro-edition-tag">Institutional FinTech v3.0 Quantum</span>
          </div>
          <h1>
            Wealth & Independence Terminal<span className="heading-period">.</span>
          </h1>
          <p className="page-subtitle">
            Institutional-grade PSX stock screener, dividend tax forecasting, KSE-100 macro valuation radar, and 30-year stochastic Monte Carlo models — engineered for Pakistan without paywalls.
          </p>
        </div>
      </section>

      {/* Pro Navigation Tabs */}
      <div className="pro-nav-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "dividends"}
          className={`pro-tab-button ${activeTab === "dividends" ? "pro-tab-active" : ""}`}
          onClick={() => setActiveTab("dividends")}
        >
          <TrendingUp size={15} />
          <span>PSX Dividend Engine</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "screener"}
          className={`pro-tab-button ${activeTab === "screener" ? "pro-tab-active" : ""}`}
          onClick={() => setActiveTab("screener")}
        >
          <Compass size={15} />
          <span>PSX Alpha Screener</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "cycle"}
          className={`pro-tab-button ${activeTab === "cycle" ? "pro-tab-active" : ""}`}
          onClick={() => setActiveTab("cycle")}
        >
          <Gauge size={15} />
          <span>KSE-100 Valuation Radar</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "goals"}
          className={`pro-tab-button ${activeTab === "goals" ? "pro-tab-active" : ""}`}
          onClick={() => setActiveTab("goals")}
        >
          <Target size={15} />
          <span>Quantum Wealth Goals</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "montecarlo"}
          className={`pro-tab-button ${activeTab === "montecarlo" ? "pro-tab-active" : ""}`}
          onClick={() => setActiveTab("montecarlo")}
        >
          <Percent size={15} />
          <span>30-Yr Monte Carlo</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "stresstest"}
          className={`pro-tab-button ${activeTab === "stresstest" ? "pro-tab-active" : ""}`}
          onClick={() => setActiveTab("stresstest")}
        >
          <ShieldAlert size={15} />
          <span>Macro Stress Shield</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "fire"}
          className={`pro-tab-button ${activeTab === "fire" ? "pro-tab-active" : ""}`}
          onClick={() => setActiveTab("fire")}
        >
          <Flame size={15} />
          <span>FIRE Matrix</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: PSX Dividend & Yield Forecaster                               */}
      {/* ==================================================================== */}
      {activeTab === "dividends" && (
        <div className="pro-tab-content">
          <div className="pro-grid-2col">
            {/* Stock Selection & Holding Input */}
            <div className="panel pro-card">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">PSX Dividend Aristocrats</p>
                  <h2>Select Equity & Shares</h2>
                </div>
                <span className="daily-count-pill">FBR 15% vs 30% WHT</span>
              </div>
              <div className="pro-card-body">
                <div className="stock-chips-grid">
                  {PSX_DIVIDEND_ARISTOCRATS.map((stock) => (
                    <button
                      key={stock.ticker}
                      type="button"
                      className={`stock-select-chip ${selectedStockTicker === stock.ticker ? "stock-chip-active" : ""}`}
                      onClick={() => setSelectedStockTicker(stock.ticker)}
                    >
                      <div className="stock-chip-top">
                        <strong className="stock-ticker">{stock.ticker}</strong>
                        <span className="stock-yield-badge">{stock.dividendYieldPercent}% Yield</span>
                      </div>
                      <div className="stock-chip-bottom">
                        <span className="stock-company-name">{stock.name}</span>
                        <span className="stock-price">Rs. {stock.priceRupees.toFixed(1)}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pro-input-group" style={{ marginTop: "1rem" }}>
                  <label htmlFor="shares-count-input">Number of Shares Held / Target</label>
                  <input
                    id="shares-count-input"
                    type="number"
                    min={0}
                    step={50}
                    value={sharesHeld}
                    onChange={(e) => setSharesHeld(Math.max(0, Number(e.target.value)))}
                    className="pro-input"
                  />
                  <small className="field-hint">
                    Portfolio investment value: Rs. {(sharesHeld * selectedStock.priceRupees).toLocaleString()}
                  </small>
                </div>

                <div className="tax-filer-toggle-card">
                  <div>
                    <strong>FBR Tax Withholding Status</strong>
                    <p>Filer rate is 15%; Non-Filer is subjected to 30% under FBR ITO Part III.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFiler(!isFiler)}
                    className={`filer-toggle-button ${isFiler ? "filer-active" : "non-filer-active"}`}
                  >
                    {isFiler ? "Active Filer (15% Tax)" : "Non-Filer (30% Tax Penalty)"}
                  </button>
                </div>
              </div>
            </div>

            {/* Dividend Output Summary */}
            <div className="panel pro-card">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Projected Income Stream</p>
                  <h2>Annual & Monthly Payouts</h2>
                </div>
                <span className="daily-count-pill">{selectedStock.ticker} Forecast</span>
              </div>
              <div className="pro-card-body">
                <div className="pro-payout-metrics">
                  <div className="payout-metric-block">
                    <span>Net Annual Dividend</span>
                    <strong className="payout-big-number">
                      Rs. {dividendForecast.netAnnualDividendRupees.toLocaleString()}
                    </strong>
                    <small>After {dividendForecast.withholdingTaxPercent}% FBR tax deduction</small>
                  </div>
                  <div className="payout-metric-block">
                    <span>Monthly Passive Cashflow</span>
                    <strong className="payout-monthly-number">
                      Rs. {dividendForecast.monthlyPassiveIncomeRupees.toLocaleString()} / mo
                    </strong>
                    <small>Averages across quarterly distributions</small>
                  </div>
                </div>

                <div className="tax-breakdown-box">
                  <div className="tax-row">
                    <span>Gross Annual Dividend:</span>
                    <strong>Rs. {dividendForecast.grossAnnualDividendRupees.toLocaleString()}</strong>
                  </div>
                  <div className="tax-row">
                    <span>FBR Tax Withheld ({dividendForecast.withholdingTaxPercent}%):</span>
                    <strong className="text-rose">-Rs. {dividendForecast.withholdingTaxRupees.toLocaleString()}</strong>
                  </div>
                  <div className="tax-row tax-savings-highlight">
                    <span>Filer Tax Shield Advantage:</span>
                    <strong className="text-emerald">
                      +Rs. {dividendForecast.taxSavingsByBeingFilerRupees.toLocaleString()} saved
                    </strong>
                  </div>
                  <div className="tax-row">
                    <span>DRIP Share Accumulation (Yr 1):</span>
                    <strong>+{dividendForecast.reinvestmentAdditionalSharesYear1} free shares</strong>
                  </div>
                </div>

                <div className="pro-stock-desc-callout">
                  <Info size={16} />
                  <p>{selectedStock.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* DRIP Compounding Table */}
          <div className="panel pro-card" style={{ marginTop: "1.2rem" }}>
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Dividend Reinvestment Compounding</p>
                <h2>10-Year DRIP vs Cash Withdrawal Comparison</h2>
              </div>
              <div className="drip-capital-input-wrap">
                <label htmlFor="drip-cap">Starting Capital:</label>
                <input
                  id="drip-cap"
                  type="number"
                  step={50000}
                  value={dripInitialCapital}
                  onChange={(e) => setDripInitialCapital(Math.max(10000, Number(e.target.value)))}
                />
              </div>
            </div>
            <div className="pro-table-wrap">
              <table className="pro-data-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Without DRIP (Withdrawn)</th>
                    <th>Dividends Withdrawn</th>
                    <th>With DRIP (Reinvested)</th>
                    <th>Shares Count</th>
                    <th>Compounding Advantage</th>
                  </tr>
                </thead>
                <tbody>
                  {dripComparison.map((row) => (
                    <tr key={row.year} className={row.year === 10 ? "highlight-row" : ""}>
                      <td>
                        <strong>Year {row.year}</strong>
                      </td>
                      <td>Rs. {row.withoutDripValueRupees.toLocaleString()}</td>
                      <td className="text-muted">Rs. {row.withoutDripDividendsWithdrawnRupees.toLocaleString()}</td>
                      <td>
                        <strong className="text-emerald">Rs. {row.withDripValueRupees.toLocaleString()}</strong>
                      </td>
                      <td>{row.withDripSharesCount.toLocaleString()} shares</td>
                      <td>
                        <span className="advantage-pill">+{row.compoundAdvantagePercent}% more wealth</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: PSX Alpha & Sector Screener Engine (NEW)                      */}
      {/* ==================================================================== */}
      {activeTab === "screener" && (
        <div className="pro-tab-content">
          <div className="panel pro-card screener-filter-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Institutional Multi-Factor Screener</p>
                <h2>PSX Alpha & Valuation Scanner</h2>
              </div>
              <span className="daily-count-pill">{screenedStocks.length} Equities Filtered</span>
            </div>
            <div className="pro-card-body">
              {/* Search and Quick Filters */}
              <div className="screener-controls-bar">
                <div className="screener-search-wrap">
                  <Search size={15} className="screener-search-icon" />
                  <input
                    type="text"
                    value={screenerSearch}
                    onChange={(e) => setScreenerSearch(e.target.value)}
                    placeholder="Search ticker, company name, or sector (e.g. FFC, Meezan, Oil)..."
                    className="screener-search-input"
                  />
                  {screenerSearch && (
                    <button type="button" onClick={() => setScreenerSearch("")} className="screener-clear-btn">
                      Clear
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className={`shariah-toggle-pill ${shariahOnly ? "active" : ""}`}
                  onClick={() => setShariahOnly(!shariahOnly)}
                >
                  <ShieldCheck size={14} />
                  <span>Meezan Shariah Certified Only</span>
                </button>
              </div>

              {/* Sector Filter Chips */}
              <div className="screener-sector-chips-wrap">
                <span className="screener-filter-label">Filter by Sector:</span>
                <div className="screener-sector-chips">
                  {screenerSectors.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      className={`screener-sector-chip ${screenerSector === sec ? "active" : ""}`}
                      onClick={() => setScreenerSector(sec)}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By Tabs */}
              <div className="screener-sort-bar">
                <span className="screener-filter-label">Sort Equities by:</span>
                <div className="screener-sort-buttons">
                  <button
                    type="button"
                    className={`sort-pill ${screenerSortBy === "alpha" ? "active" : ""}`}
                    onClick={() => setScreenerSortBy("alpha")}
                  >
                    ⭐ Alpha Score (Highest)
                  </button>
                  <button
                    type="button"
                    className={`sort-pill ${screenerSortBy === "yield" ? "active" : ""}`}
                    onClick={() => setScreenerSortBy("yield")}
                  >
                    💰 Dividend Yield (%)
                  </button>
                  <button
                    type="button"
                    className={`sort-pill ${screenerSortBy === "discount" ? "active" : ""}`}
                    onClick={() => setScreenerSortBy("discount")}
                  >
                    🎯 Graham Discount (%)
                  </button>
                  <button
                    type="button"
                    className={`sort-pill ${screenerSortBy === "pe" ? "active" : ""}`}
                    onClick={() => setScreenerSortBy("pe")}
                  >
                    📉 P/E Ratio (Lowest)
                  </button>
                  <button
                    type="button"
                    className={`sort-pill ${screenerSortBy === "roe" ? "active" : ""}`}
                    onClick={() => setScreenerSortBy("roe")}
                  >
                    📈 ROE % (Highest)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Screened Stocks Cards Grid */}
          <div className="screener-cards-grid">
            {screenedStocks.map((stock) => (
              <div key={stock.ticker} className="panel pro-card screener-stock-card">
                <div className="stock-card-header">
                  <div className="stock-identity">
                    <span className="stock-ticker-badge">{stock.ticker}</span>
                    <div>
                      <strong className="stock-full-name">{stock.name}</strong>
                      <span className="stock-sector-tag">{stock.sector}</span>
                    </div>
                  </div>
                  <div className="stock-badges">
                    {stock.isShariahCompliant && (
                      <span className="shariah-certified-badge" title="Shariah Compliant according to Meezan Islamic screening rules">
                        <Check size={11} /> Shariah
                      </span>
                    )}
                    <span className={`alpha-rating-badge grade-${stock.alphaRating?.toLowerCase().replace("+", "-plus")}`}>
                      Alpha {stock.alphaRating}
                    </span>
                  </div>
                </div>

                <div className="stock-card-price-row">
                  <div>
                    <span className="price-subtext">Current Market Price</span>
                    <strong className="stock-main-price">Rs. {stock.priceRupees.toFixed(1)}</strong>
                  </div>
                  <div className="stock-yield-pill">
                    <span>Dividend Yield</span>
                    <strong>{stock.dividendYieldPercent}%</strong>
                  </div>
                </div>

                <div className="stock-stats-matrix">
                  <div className="stat-matrix-cell">
                    <span>P/E Ratio</span>
                    <strong>{stock.peRatio ?? "—"}x</strong>
                  </div>
                  <div className="stat-matrix-cell">
                    <span>P/B Ratio</span>
                    <strong>{stock.pbRatio ?? "—"}x</strong>
                  </div>
                  <div className="stat-matrix-cell">
                    <span>ROE (%)</span>
                    <strong className="text-emerald">{stock.roePercent ?? "—"}%</strong>
                  </div>
                  <div className="stat-matrix-cell">
                    <span>Annual DPS</span>
                    <strong>Rs. {stock.annualDpsRupees}</strong>
                  </div>
                </div>

                <div className="graham-valuation-bar">
                  <div className="graham-val-left">
                    <span>Graham Fair Value:</span>
                    <strong>Rs. {stock.grahamFairValueRupees?.toFixed(1) ?? "—"}</strong>
                  </div>
                  <div className="graham-discount-pill">
                    {stock.valuationDiscountPercent && stock.valuationDiscountPercent > 0 ? (
                      <span className="text-emerald">+{stock.valuationDiscountPercent}% Undervalued</span>
                    ) : (
                      <span className="text-slate">Fair Value</span>
                    )}
                  </div>
                </div>

                <p className="screener-card-desc">{stock.description}</p>

                <button
                  type="button"
                  className="screener-select-btn"
                  onClick={() => {
                    setSelectedStockTicker(stock.ticker);
                    setActiveTab("dividends");
                  }}
                >
                  <span>Forecast Dividends for {stock.ticker}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: KSE-100 Valuation & Macro Thermometer (NEW)                   */}
      {/* ==================================================================== */}
      {activeTab === "cycle" && (
        <div className="pro-tab-content">
          {/* Main Regime Beacon Card */}
          <div className="panel pro-card kse-regime-hero-card">
            <div className="regime-hero-top">
              <div className="regime-status-beacon">
                <span className="beacon-radar-pulse" />
                <span className="regime-status-title">MARKET REGIME: {thermometer.regimeTitle}</span>
              </div>
              <div className="regime-score-badge">
                <Gauge size={16} />
                <span>Value Score: <strong>{thermometer.thermometerScore} / 100</strong></span>
              </div>
            </div>

            <p className="regime-hero-summary">{thermometer.regimeSummary}</p>

            {/* Valuation Thermometer Visual Track */}
            <div className="thermometer-visual-track-wrap">
              <div className="thermometer-track-labels">
                <span>Severe Bubble (&gt;15x)</span>
                <span>Fair Value (8.2x)</span>
                <span>Deep Bargain Value (&lt;5x)</span>
              </div>
              <div className="thermometer-track-bar">
                <div
                  className="thermometer-track-fill"
                  style={{ width: `${thermometer.thermometerScore}%` }}
                />
                <div
                  className="thermometer-pointer"
                  style={{ left: `${thermometer.thermometerScore}%` }}
                >
                  <span className="pointer-tag">KSE-100 Now (4.8x P/E)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Pillar Macro Metrics */}
          <div className="macro-pillar-grid">
            <div className="panel pro-card macro-metric-card">
              <span className="macro-pillar-kicker">Valuation Multiples</span>
              <h3>Forward P/E Ratio</h3>
              <strong className="macro-big-num text-emerald">{thermometer.forwardPeRatio}x</strong>
              <div className="macro-comparison-sub">
                <span>10-Yr Historical Median: <strong>{thermometer.historicalAvgPeRatio}x</strong></span>
                <span className="text-emerald"><strong>+{thermometer.peDiscountPercent}%</strong> valuation discount</span>
              </div>
            </div>

            <div className="panel pro-card macro-metric-card">
              <span className="macro-pillar-kicker">Pakistan Buffett Indicator</span>
              <h3>Market Cap to GDP</h3>
              <strong className="macro-big-num text-cyan">{thermometer.buffettIndicatorPercent}%</strong>
              <div className="macro-comparison-sub">
                <span>Historical Norm: <strong>{thermometer.buffettHistoricalNormPercent}%</strong></span>
                <span className="text-cyan">Extreme asset undervaluation territory</span>
              </div>
            </div>

            <div className="panel pro-card macro-metric-card">
              <span className="macro-pillar-kicker">Yield Spread Advantage</span>
              <h3>Earnings Yield Spread</h3>
              <strong className="macro-big-num text-emerald">+{thermometer.yieldSpreadPercent}%</strong>
              <div className="macro-comparison-sub">
                <span>PSX Earnings Yield: <strong>{thermometer.equityEarningsYieldPercent}%</strong></span>
                <span>SBP Policy Rate: <strong>{thermometer.sbpPolicyRatePercent}%</strong></span>
              </div>
            </div>

            <div className="panel pro-card macro-metric-card">
              <span className="macro-pillar-kicker">Monetary Supercycle</span>
              <h3>Monetary Easing</h3>
              <strong className="macro-big-num text-amber">Rate Cut Cycle</strong>
              <div className="macro-comparison-sub">
                <span>Policy Rate dropped from 22% &rarr; 15%</span>
                <span className="text-emerald">Historically powers 150%+ multi-year bull runs</span>
              </div>
            </div>
          </div>

          {/* Tactical Asset Allocation Recommendation */}
          <div className="panel pro-card tactical-allocation-panel" style={{ marginTop: "1.2rem" }}>
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Institutional Portfolio Strategy</p>
                <h2>Recommended Tactical Asset Allocation</h2>
              </div>
              <span className="daily-count-pill">Based on 4.8x Forward P/E Regime</span>
            </div>
            <div className="pro-card-body">
              <div className="allocation-bars-container">
                <div className="allocation-bar-segment segment-equity" style={{ width: `${thermometer.tacticalAllocation.equitiesPercent}%` }}>
                  <span>Equities ({thermometer.tacticalAllocation.equitiesPercent}%)</span>
                </div>
                <div className="allocation-bar-segment segment-sukuk" style={{ width: `${thermometer.tacticalAllocation.sovereignSukukOrGovtPercent}%` }}>
                  <span>Sukuk / T-Bills ({thermometer.tacticalAllocation.sovereignSukukOrGovtPercent}%)</span>
                </div>
                <div className="allocation-bar-segment segment-gold" style={{ width: `${thermometer.tacticalAllocation.goldBullionPercent}%` }}>
                  <span>Gold ({thermometer.tacticalAllocation.goldBullionPercent}%)</span>
                </div>
                <div className="allocation-bar-segment segment-cash" style={{ width: `${thermometer.tacticalAllocation.liquidCashPercent}%` }}>
                  <span>Cash ({thermometer.tacticalAllocation.liquidCashPercent}%)</span>
                </div>
              </div>

              <div className="allocation-legend-grid">
                <div className="allocation-legend-item">
                  <span className="legend-swatch swatch-equity" />
                  <div>
                    <strong>{thermometer.tacticalAllocation.equitiesPercent}% PSX Bluechip & High-Yield Equities</strong>
                    <p>Allocate heavily to cash-rich dividend aristocrats (FFC, HUBC, OGDC, MEBL) during low valuation regimes.</p>
                  </div>
                </div>
                <div className="allocation-legend-item">
                  <span className="legend-swatch swatch-sukuk" />
                  <div>
                    <strong>{thermometer.tacticalAllocation.sovereignSukukOrGovtPercent}% Sovereign Sukuk / Govt T-Bills</strong>
                    <p>Lock in double-digit fixed returns before interest rates drop further toward single digits.</p>
                  </div>
                </div>
                <div className="allocation-legend-item">
                  <span className="legend-swatch swatch-gold" />
                  <div>
                    <strong>{thermometer.tacticalAllocation.goldBullionPercent}% Physical 24K Gold / Forex Hedge</strong>
                    <p>Impervious shield protecting purchasing power against sudden domestic currency shocks.</p>
                  </div>
                </div>
                <div className="allocation-legend-item">
                  <span className="legend-swatch swatch-cash" />
                  <div>
                    <strong>{thermometer.tacticalAllocation.liquidCashPercent}% Instant Emergency Cash</strong>
                    <p>Kept in high-yield daily profit savings accounts (JazzCash, Easypaisa, or Islamic savings).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: Quantum Wealth Milestone / Goal Planner (NEW)                 */}
      {/* ==================================================================== */}
      {activeTab === "goals" && (
        <div className="pro-tab-content">
          {/* Preset Goal Cards Grid */}
          <div className="quantum-goal-presets-grid">
            {PRESET_QUANTUM_GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`quantum-goal-card ${selectedGoalId === g.id ? "active" : ""}`}
                onClick={() => handleSelectPresetGoal(g)}
              >
                <div className="goal-card-top">
                  <Target size={18} className="goal-icon" />
                  <span className="goal-years-tag">{g.targetYears} Years Target</span>
                </div>
                <strong className="goal-card-title">{g.title}</strong>
                <span className="goal-card-amount">Target: Rs. {(g.targetAmountRupees / 100_000).toLocaleString()} Lakhs</span>
                <p className="goal-card-desc">{g.description}</p>
              </button>
            ))}
          </div>

          <div className="pro-grid-2col" style={{ marginTop: "1.2rem" }}>
            {/* Goal Input Controls */}
            <div className="panel pro-card">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Quantum SIP Engine</p>
                  <h2>Calibrate Goal Parameters</h2>
                </div>
                <span className="daily-count-pill">Calculated in Real Terms</span>
              </div>
              <div className="pro-card-body">
                <div className="pro-input-group">
                  <label htmlFor="goal-target-amount">Nominal Target Amount (PKR)</label>
                  <input
                    id="goal-target-amount"
                    type="number"
                    step={500_000}
                    value={customGoalTarget}
                    onChange={(e) => {
                      setSelectedGoalId("custom");
                      setCustomGoalTarget(Math.max(100_000, Number(e.target.value)));
                    }}
                    className="pro-input"
                  />
                  <small className="field-hint">
                    Target in Rupees: Rs. {customGoalTarget.toLocaleString()} ({(customGoalTarget / 100_000).toFixed(1)} Lakhs)
                  </small>
                </div>

                <div className="slider-group" style={{ marginTop: "1rem" }}>
                  <div className="slider-label-row">
                    <span>Investment Timeline:</span>
                    <strong>{customGoalYears} Years ({customGoalYears * 12} Months)</strong>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={25}
                    step={1}
                    value={customGoalYears}
                    onChange={(e) => setCustomGoalYears(Number(e.target.value))}
                    className="pro-range"
                  />
                  <div className="slider-quick-presets">
                    {[3, 5, 8, 10, 15, 20].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        className={`slider-preset-chip ${customGoalYears === yr ? "active" : ""}`}
                        onClick={() => setCustomGoalYears(yr)}
                      >
                        {yr} Yrs
                      </button>
                    ))}
                  </div>
                </div>

                <div className="slider-group" style={{ marginTop: "1rem" }}>
                  <div className="slider-label-row">
                    <span>Expected Annual Return:</span>
                    <strong>{goalExpectedReturn}% / year</strong>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={25}
                    step={0.5}
                    value={goalExpectedReturn}
                    onChange={(e) => setGoalExpectedReturn(Number(e.target.value))}
                    className="pro-range"
                  />
                  <div className="slider-quick-presets">
                    {[12, 15, 18, 20].map((ret) => (
                      <button
                        key={ret}
                        type="button"
                        className={`slider-preset-chip ${goalExpectedReturn === ret ? "active" : ""}`}
                        onClick={() => setGoalExpectedReturn(ret)}
                      >
                        {ret}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="slider-group" style={{ marginTop: "1rem" }}>
                  <div className="slider-label-row">
                    <span>Expected Pakistan CPI Inflation:</span>
                    <strong>{goalInflation}% / year</strong>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={0.5}
                    value={goalInflation}
                    onChange={(e) => setGoalInflation(Number(e.target.value))}
                    className="pro-range"
                  />
                  <div className="slider-quick-presets">
                    {[7, 9, 12, 15].map((inf) => (
                      <button
                        key={inf}
                        type="button"
                        className={`slider-preset-chip ${goalInflation === inf ? "active" : ""}`}
                        onClick={() => setGoalInflation(inf)}
                      >
                        {inf}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Goal Plan Output Dashboard */}
            <div className="panel pro-card quantum-plan-result-card">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Required Investment Action</p>
                  <h2>Quantum Goal Trajectory</h2>
                </div>
                <span className="daily-count-pill">{quantumGoalPlan.feasibilityRating} Target</span>
              </div>
              <div className="pro-card-body">
                <div className="quantum-sip-display-box">
                  <span className="sip-caption">Required Monthly SIP</span>
                  <strong className="sip-big-number">
                    Rs. {quantumGoalPlan.requiredMonthlySipRupees.toLocaleString()} / mo
                  </strong>
                  <small>To reach future purchasing power across {quantumGoalPlan.timelineYears} years</small>
                </div>

                <div className="quantum-breakdown-matrix">
                  <div className="quantum-stat-cell">
                    <span>Nominal Target</span>
                    <strong>Rs. {(quantumGoalPlan.nominalTargetRupees / 100_000).toFixed(1)} Lakhs</strong>
                  </div>
                  <div className="quantum-stat-cell">
                    <span>Inflation-Adjusted Target</span>
                    <strong className="text-cyan">Rs. {(quantumGoalPlan.inflationAdjustedTargetRupees / 100_000).toFixed(1)} Lakhs</strong>
                  </div>
                  <div className="quantum-stat-cell">
                    <span>Total Self-Invested</span>
                    <strong>Rs. {(quantumGoalPlan.totalSelfInvestedRupees / 100_000).toFixed(1)} Lakhs</strong>
                  </div>
                  <div className="quantum-stat-cell">
                    <span>Compounding Wealth Created</span>
                    <strong className="text-emerald">+Rs. {(quantumGoalPlan.wealthCreatedByCompoundingRupees / 100_000).toFixed(1)} Lakhs</strong>
                  </div>
                </div>

                <div className="multiplier-highlight-box">
                  <Sparkles size={20} className="text-amber" />
                  <div>
                    <strong>{quantumGoalPlan.compoundingMultiplier}x Wealth Multiplier</strong>
                    <p>
                      Compounding creates{" "}
                      <strong>
                        Rs. {(quantumGoalPlan.wealthCreatedByCompoundingRupees / 100_000).toFixed(1)} Lakhs
                      </strong>{" "}
                      of your goal for free, meaning self-discipline pays only a fraction of the cost.
                    </p>
                  </div>
                </div>

                <div className="probability-meter-box">
                  <div className="probability-label-row">
                    <span>Milestone Probability Score</span>
                    <strong className="text-emerald">{quantumGoalPlan.probabilityScorePercent}% Probability</strong>
                  </div>
                  <div className="probability-track">
                    <div
                      className="probability-fill"
                      style={{ width: `${quantumGoalPlan.probabilityScorePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: 30-Year Monte Carlo Wealth Trajectory Engine                  */}
      {/* ==================================================================== */}
      {activeTab === "montecarlo" && (
        <div className="pro-tab-content">
          {/* Milestones Card */}
          <div className="monte-carlo-milestone-banner">
            <div className="milestone-badge-box">
              <Award size={24} className="milestone-icon" />
              <div>
                <strong>Rs. 1 Crore (Crorepati) Milestone</strong>
                <span>
                  {monteCarloResult.milestones.yearsToOneCrore
                    ? `Reached in Year ${monteCarloResult.milestones.yearsToOneCrore} (Age ${currentAge + monteCarloResult.milestones.yearsToOneCrore})`
                    : "Increase SIP or timeline to reach Rs. 1 Crore"}
                </span>
                <small>{monteCarloResult.milestones.probabilityOfReachingOneCrorePercent}% Historical Probability</small>
              </div>
            </div>

            <div className="milestone-badge-box">
              <Zap size={24} className="milestone-icon icon-zap" />
              <div>
                <strong>Rs. 2.5 Crore (Multi-Millionaire)</strong>
                <span>
                  {monteCarloResult.milestones.yearsToTwoPointFiveCrore
                    ? `Reached in Year ${monteCarloResult.milestones.yearsToTwoPointFiveCrore} (Age ${currentAge + monteCarloResult.milestones.yearsToTwoPointFiveCrore})`
                    : "Projected past Year 30"}
                </span>
                <small>Median Capital Compound Trajectory</small>
              </div>
            </div>

            <div className="milestone-badge-box">
              <Award size={24} className="milestone-icon icon-emerald" />
              <div>
                <strong>Rs. 5 Crore (Generational Freedom)</strong>
                <span>
                  {monteCarloResult.milestones.yearsToFiveCrore
                    ? `Reached in Year ${monteCarloResult.milestones.yearsToFiveCrore} (Age ${currentAge + monteCarloResult.milestones.yearsToFiveCrore})`
                    : "Extends beyond 30-year horizon"}
                </span>
                <small>{monteCarloResult.milestones.probabilityOfReachingFiveCrorePercent}% Historical Probability</small>
              </div>
            </div>
          </div>

          <div className="pro-grid-monte-carlo">
            {/* Simulation Interactive Sliders */}
            <div className="panel pro-card">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Quantum Simulation Controls</p>
                  <h2>Interactive Wealth Parameters</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStartingWealth(100_000);
                    setMonthlySIP(15_000);
                    setExpectedReturn(15.0);
                    setInflationRate(9.5);
                    setCurrentAge(24);
                  }}
                  className="pro-reset-btn"
                  title="Reset to default Pakistani benchmarks"
                >
                  <RotateCcw size={13} /> Reset
                </button>
              </div>
              <div className="pro-card-body pro-sliders-body">
                {/* Starting Wealth */}
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Starting Liquid Capital:</span>
                    <strong>Rs. {startingWealth.toLocaleString()}</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2_000_000}
                    step={10_000}
                    value={startingWealth}
                    onChange={(e) => setStartingWealth(Number(e.target.value))}
                    className="pro-range"
                  />
                  <div className="slider-quick-presets">
                    {[10_000, 50_000, 100_000, 500_000, 1_000_000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`slider-preset-chip ${startingWealth === preset ? "active" : ""}`}
                        onClick={() => setStartingWealth(preset)}
                      >
                        Rs. {(preset / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly SIP */}
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Monthly Investment (SIP):</span>
                    <strong className="text-emerald">Rs. {monthlySIP.toLocaleString()} / mo</strong>
                  </div>
                  <input
                    type="range"
                    min={1_000}
                    max={200_000}
                    step={1_000}
                    value={monthlySIP}
                    onChange={(e) => setMonthlySIP(Number(e.target.value))}
                    className="pro-range"
                  />
                  <div className="slider-quick-presets">
                    {[5_000, 10_000, 20_000, 50_000, 100_000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`slider-preset-chip ${monthlySIP === preset ? "active" : ""}`}
                        onClick={() => setMonthlySIP(preset)}
                      >
                        Rs. {(preset / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expected Return */}
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Expected Return (PSX / Funds):</span>
                    <strong>{expectedReturn}% / year</strong>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={25}
                    step={0.5}
                    value={expectedReturn}
                    onChange={(e) => setExpectedReturn(Number(e.target.value))}
                    className="pro-range"
                  />
                  <div className="slider-quick-presets">
                    {[12, 15, 17.5, 20].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`slider-preset-chip ${expectedReturn === preset ? "active" : ""}`}
                        onClick={() => setExpectedReturn(preset)}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inflation Rate */}
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Pakistan CPI Inflation:</span>
                    <strong>{inflationRate}% / year</strong>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={0.5}
                    value={inflationRate}
                    onChange={(e) => setInflationRate(Number(e.target.value))}
                    className="pro-range"
                  />
                  <div className="slider-quick-presets">
                    {[7, 9.5, 12, 15].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`slider-preset-chip ${inflationRate === preset ? "active" : ""}`}
                        onClick={() => setInflationRate(preset)}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current Age */}
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Current Age:</span>
                    <strong>{currentAge} Years Old</strong>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={65}
                    step={1}
                    value={currentAge}
                    onChange={(e) => setCurrentAge(Number(e.target.value))}
                    className="pro-range"
                  />
                  <div className="slider-quick-presets">
                    {[20, 25, 30, 40].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`slider-preset-chip ${currentAge === preset ? "active" : ""}`}
                        onClick={() => setCurrentAge(preset)}
                      >
                        Age {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Area Chart: 30-Year Trajectory */}
            <div className="panel pro-card">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Stochastic Wealth Fan (1,000 Iterations)</p>
                  <h2>30-Year Trajectory (in Lakhs PKR)</h2>
                </div>
                <span className="daily-count-pill">Inflation-Adjusted Purchasing Power</span>
              </div>
              <div className="pro-card-body pro-chart-body">
                <ResponsiveContainer width="100%" height={380}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bullGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="medianGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}L`} />
                    <RechartsTooltip
                      formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()} Lakhs`, ""]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Area
                      type="monotone"
                      dataKey="BullMarket"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#bullGrad)"
                      name="Bull Market (90th %ile)"
                    />
                    <Area
                      type="monotone"
                      dataKey="BaseMedian"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#medianGrad)"
                      name="Base Case (Median)"
                    />
                    <Area
                      type="monotone"
                      dataKey="RealPurchasingPower"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#realGrad)"
                      name="Real Purchasing Power"
                    />
                    <Area
                      type="monotone"
                      dataKey="TotalInvested"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      fill="none"
                      name="Capital Contributed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: Macro Black-Swan Stress Shield                                */}
      {/* ==================================================================== */}
      {activeTab === "stresstest" && (
        <div className="pro-tab-content">
          {/* Stress Header Banner */}
          <div className="panel pro-card stress-test-header-card">
            <div className="stress-resilience-badge">
              <ShieldAlert size={32} className="stress-icon" />
              <div>
                <span className="caption">Liquid Safety Runway</span>
                <strong className="resilience-score">
                  {stressTestResult.baselineRunwayMonths} Months ({Math.round(stressTestResult.baselineRunwayMonths * 30)} Days)
                </strong>
                <small>Verified liquid wealth: Rs. {stressTestResult.currentLiquidRupees.toLocaleString()}</small>
              </div>
            </div>
            <div className="stress-score-box">
              <span className="score-caption">Institutional Resilience Score</span>
              <strong className={`score-digit ${stressTestResult.resilienceScore >= 70 ? "text-emerald" : "text-amber"}`}>
                {stressTestResult.resilienceScore} / 100
              </strong>
              <small>Based on standard 6-month buffer recommendations</small>
            </div>
          </div>

          {/* 4 Shock Scenarios */}
          <div className="stress-scenarios-grid">
            {stressTestResult.scenarios.map((sc) => (
              <div key={sc.id} className="panel pro-card scenario-card">
                <div className="scenario-header">
                  <div className="scenario-title-row">
                    <AlertTriangle size={18} className="text-amber" />
                    <strong>{sc.title}</strong>
                  </div>
                  <span className={`severity-tag severity-${sc.severityLevel.toLowerCase()}`}>
                    {sc.severityLevel} Risk
                  </span>
                </div>
                <p className="scenario-desc">{sc.description}</p>
                <div className="scenario-runway-box">
                  <span className="runway-label">Survival Runway Under Shock:</span>
                  <strong className="runway-val">
                    {sc.liquidityRunwayMonths} Months ({sc.liquidityRunwayDays} Days)
                  </strong>
                </div>
                <div className="scenario-recs">
                  <span className="recs-heading">Defensive Recommendations:</span>
                  <ul>
                    {sc.defensiveRecommendations.map((rec, idx) => (
                      <li key={idx}>
                        <ArrowRight size={12} /> {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 7: Pakistan FIRE Independence Matrix                             */}
      {/* ==================================================================== */}
      {activeTab === "fire" && (
        <div className="pro-tab-content">
          <div className="fire-intro-box">
            <Flame size={28} className="text-amber" />
            <div>
              <h3>Financial Independence, Retire Early (Pakistan Standard)</h3>
              <p>
                Calculated using Pakistani economic realities (incorporating higher local CPI inflation and real PSX
                equity risk premiums rather than standard US 4% rules).
              </p>
            </div>
          </div>

          <div className="fire-cards-grid">
            {/* Lean FIRE */}
            <div className="panel pro-card fire-tier-card">
              <div className="fire-tier-header">
                <span className="fire-tier-pill pill-lean">Lean FIRE (Survival)</span>
                <span className="fire-multiple">25x Essential Expenses</span>
              </div>
              <div className="fire-corpus-display">
                <span className="corpus-caption">Target Corpus</span>
                <strong className="corpus-number">
                  Rs. {(fireMatrixResult.leanFire.corpusRupees / 100_000).toFixed(1)} Lakhs
                </strong>
                <small>(Rs. {fireMatrixResult.leanFire.corpusRupees.toLocaleString()})</small>
              </div>
              <div className="fire-spec-list">
                <div className="fire-spec-row">
                  <span>Monthly Safe Withdrawal:</span>
                  <strong>Rs. {fireMatrixResult.leanFire.monthlySafeWithdrawalRupees.toLocaleString()} / mo</strong>
                </div>
                <div className="fire-spec-row">
                  <span>Estimated Time to Reach:</span>
                  <strong>{fireMatrixResult.leanFire.yearsToAchieve} Years</strong>
                </div>
                <div className="fire-spec-row">
                  <span>Current Progress:</span>
                  <strong className="text-emerald">{fireMatrixResult.leanFire.currentProgressPercent}%</strong>
                </div>
              </div>
              <div className="fire-progress-bar-wrap">
                <div
                  className="fire-progress-bar-fill"
                  style={{ width: `${Math.min(100, fireMatrixResult.leanFire.currentProgressPercent)}%` }}
                />
              </div>
              <p className="fire-tier-footer">Covers basic food, utility bills, and shelter without luxuries.</p>
            </div>

            {/* Standard FIRE */}
            <div className="panel pro-card fire-tier-card fire-tier-popular">
              <div className="fire-tier-header">
                <span className="fire-tier-pill pill-standard">Standard FIRE (Comfort)</span>
                <span className="fire-multiple">30x Regular Expenses</span>
              </div>
              <div className="fire-corpus-display">
                <span className="corpus-caption">Target Corpus</span>
                <strong className="corpus-number text-emerald">
                  Rs. {(fireMatrixResult.standardFire.corpusRupees / 10_000_000).toFixed(2)} Crore
                </strong>
                <small>(Rs. {fireMatrixResult.standardFire.corpusRupees.toLocaleString()})</small>
              </div>
              <div className="fire-spec-list">
                <div className="fire-spec-row">
                  <span>Monthly Safe Withdrawal:</span>
                  <strong>Rs. {fireMatrixResult.standardFire.monthlySafeWithdrawalRupees.toLocaleString()} / mo</strong>
                </div>
                <div className="fire-spec-row">
                  <span>Estimated Time to Reach:</span>
                  <strong>{fireMatrixResult.standardFire.yearsToAchieve} Years</strong>
                </div>
                <div className="fire-spec-row">
                  <span>Current Progress:</span>
                  <strong className="text-emerald">{fireMatrixResult.standardFire.currentProgressPercent}%</strong>
                </div>
              </div>
              <div className="fire-progress-bar-wrap">
                <div
                  className="fire-progress-bar-fill fill-emerald"
                  style={{ width: `${Math.min(100, fireMatrixResult.standardFire.currentProgressPercent)}%` }}
                />
              </div>
              <p className="fire-tier-footer">Maintains full current lifestyle, dining out, and domestic travel.</p>
            </div>

            {/* Fat FIRE */}
            <div className="panel pro-card fire-tier-card">
              <div className="fire-tier-header">
                <span className="fire-tier-pill pill-fat">Fat FIRE (Abundance)</span>
                <span className="fire-multiple">40x Generational Wealth</span>
              </div>
              <div className="fire-corpus-display">
                <span className="corpus-caption">Target Corpus</span>
                <strong className="corpus-number text-violet">
                  Rs. {(fireMatrixResult.fatFire.corpusRupees / 10_000_000).toFixed(2)} Crore
                </strong>
                <small>(Rs. {fireMatrixResult.fatFire.corpusRupees.toLocaleString()})</small>
              </div>
              <div className="fire-spec-list">
                <div className="fire-spec-row">
                  <span>Monthly Safe Withdrawal:</span>
                  <strong>Rs. {fireMatrixResult.fatFire.monthlySafeWithdrawalRupees.toLocaleString()} / mo</strong>
                </div>
                <div className="fire-spec-row">
                  <span>Estimated Time to Reach:</span>
                  <strong>{fireMatrixResult.fatFire.yearsToAchieve} Years</strong>
                </div>
                <div className="fire-spec-row">
                  <span>Current Progress:</span>
                  <strong className="text-violet">{fireMatrixResult.fatFire.currentProgressPercent}%</strong>
                </div>
              </div>
              <div className="fire-progress-bar-wrap">
                <div
                  className="fire-progress-bar-fill fill-violet"
                  style={{ width: `${Math.min(100, fireMatrixResult.fatFire.currentProgressPercent)}%` }}
                />
              </div>
              <p className="fire-tier-footer">International travel, luxury vehicles, private education, and family legacy.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
