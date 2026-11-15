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
  type PsxDividendStock,
} from "@/lib/sarmaya-pro";
import { formatPkr, type FinanceAccount, type FinanceTransaction } from "@/lib/finance";

interface SarmayaProSuiteProps {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
}

type ProTab = "dividends" | "montecarlo" | "stresstest" | "fire";

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
    () => calculateDripGrowth(dripInitialCapital, selectedStock.dividendYieldPercent, 8.5, 10, isFiler),
    [dripInitialCapital, selectedStock, isFiler]
  );

  // --------------------------------------------------------------------------
  // Tab 2: 30-Year Monte Carlo State
  // --------------------------------------------------------------------------
  const currentLiquidRupees = Math.round(Number(liquidPaisa) / 100);
  const [startingWealth, setStartingWealth] = useState<number>(Math.max(currentLiquidRupees, 15_000));
  const [monthlySIP, setMonthlySIP] = useState<number>(15_000);
  const [expectedReturn, setExpectedReturn] = useState<number>(15); // PSX 15% CAGR historical
  const [inflationRate, setInflationRate] = useState<number>(9.5);  // Pakistan CPI average
  const [currentAge, setCurrentAge] = useState<number>(25);

  const monteCarloResult = useMemo(
    () =>
      runMonteCarloSimulation({
        currentAge,
        startingWealthRupees: startingWealth,
        monthlyContributionRupees: monthlySIP,
        expectedAnnualReturnPercent: expectedReturn,
        annualVolatilityPercent: 16,
        annualInflationPercent: inflationRate,
        simulationYears: 30,
      }),
    [currentAge, startingWealth, monthlySIP, expectedReturn, inflationRate]
  );

  // Chart data for Monte Carlo
  const chartData = useMemo(() => {
    return monteCarloResult.projections.map((p) => ({
      year: `Yr ${p.year} (Age ${p.age})`,
      conservative: Math.round(p.conservativeRupees / 100_000) / 10, // In Lakhs
      median: Math.round(p.medianRupees / 100_000) / 10,             // In Lakhs
      optimistic: Math.round(p.optimisticRupees / 100_000) / 10,     // In Lakhs
      realPurchasingPower: Math.round(p.realPurchasingPowerMedianRupees / 100_000) / 10, // In Lakhs
    }));
  }, [monteCarloResult]);

  // --------------------------------------------------------------------------
  // Tab 3: Macro Shock Stress-Test State
  // --------------------------------------------------------------------------
  const stressTestResult = useMemo(
    () => calculateMacroStressTest(liquidPaisa, monthlyEssentialPaisa, monthlyTotalPaisa),
    [liquidPaisa, monthlyEssentialPaisa, monthlyTotalPaisa]
  );

  // --------------------------------------------------------------------------
  // Tab 4: Pakistan FIRE Matrix State
  // --------------------------------------------------------------------------
  const fireMatrixResult = useMemo(
    () => calculateFireMatrix(monthlyEssentialPaisa, monthlyTotalPaisa, netWorthPaisa, monthlySavingsPaisa),
    [monthlyEssentialPaisa, monthlyTotalPaisa, netWorthPaisa, monthlySavingsPaisa]
  );

  return (
    <div className="sarmaya-pro-container">
      {/* Premium Header Banner */}
      <section className="page-heading module-page-heading pro-page-heading">
        <div>
          <div className="pro-badge-row">
            <span className="pro-unlocked-badge">
              <Sparkles size={12} /> SARMAYA & ZERODHA PRO SUITE (UNLOCKED FREE)
            </span>
            <span className="pro-edition-tag">Institutional FinTech v2.4</span>
          </div>
          <h1>
            Wealth & Independence Terminal<span className="heading-period">.</span>
          </h1>
          <p className="page-subtitle">
            Premium-tier dividend forecasting, 30-year stochastic Monte Carlo projections, and economic shock
            stress-testing — built specifically for Pakistan without any subscription paywalls.
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
          aria-selected={activeTab === "montecarlo"}
          className={`pro-tab-button ${activeTab === "montecarlo" ? "pro-tab-active" : ""}`}
          onClick={() => setActiveTab("montecarlo")}
        >
          <Percent size={15} />
          <span>30-Yr Monte Carlo Simulator</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "stresstest"}
          className={`pro-tab-button ${activeTab === "stresstest" ? "pro-tab-active" : ""}`}
          onClick={() => setActiveTab("stresstest")}
        >
          <ShieldAlert size={15} />
          <span>Macro Stress-Test Shield</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "fire"}
          className={`pro-tab-button ${activeTab === "fire" ? "pro-tab-active" : ""}`}
          onClick={() => setActiveTab("fire")}
        >
          <Flame size={15} />
          <span>FIRE Independence Matrix</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: PSX Dividend & Yield Forecaster                               */}
      {/* ==================================================================== */}
      {activeTab === "dividends" && (
        <div className="pro-tab-content">
          <div className="pro-feature-grid">
            {/* Control Panel */}
            <div className="panel pro-card">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">PSX Aristocrat Screener</p>
                  <h2>Select Stock & Holdings</h2>
                </div>
                <span className="status-pill status-ready">FBR ATL Sync</span>
              </div>
              <div className="pro-card-body">
                <div className="form-field-group">
                  <label htmlFor="psx-stock-select">Choose PSX Dividend Stock</label>
                  <select
                    id="psx-stock-select"
                    value={selectedStockTicker}
                    onChange={(e) => setSelectedStockTicker(e.target.value)}
                    className="pro-select"
                  >
                    {PSX_DIVIDEND_ARISTOCRATS.map((stock) => (
                      <option key={stock.ticker} value={stock.ticker}>
                        {stock.ticker} - {stock.name} ({stock.dividendYieldPercent}% Yield)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pro-stock-spec-card">
                  <div className="spec-row">
                    <span>Current Price</span>
                    <strong>Rs. {selectedStock.priceRupees.toFixed(2)}</strong>
                  </div>
                  <div className="spec-row">
                    <span>Annual DPS</span>
                    <strong className="text-emerald">Rs. {selectedStock.annualDpsRupees.toFixed(2)} / share</strong>
                  </div>
                  <div className="spec-row">
                    <span>Trailing Yield</span>
                    <strong className="text-emerald">{selectedStock.dividendYieldPercent}%</strong>
                  </div>
                  <div className="spec-row">
                    <span>Payout Frequency</span>
                    <span>{selectedStock.payoutFrequency}</span>
                  </div>
                  <div className="spec-row">
                    <span>Typical Ex-Months</span>
                    <span>{selectedStock.typicalExMonths.join(", ")}</span>
                  </div>
                </div>

                <div className="form-field-group" style={{ marginTop: "1rem" }}>
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
      {/* TAB 2: 30-Year Monte Carlo Wealth Trajectory Engine                  */}
      {/* ==================================================================== */}
      {activeTab === "montecarlo" && (
        <div className="pro-tab-content">
          {/* Milestones Card */}
          <div className="monte-carlo-milestone-banner">
            <div className="milestone-badge-box">
              <Award size={24} className="milestone-icon" />
              <div>
                <span className="milestone-caption">Milestone 1 (Rs. 1 Crore / 10M)</span>
                <strong>
                  {monteCarloResult.milestones.yearsToOneCrore
                    ? `Reached in ${monteCarloResult.milestones.yearsToOneCrore} Years (Age ${
                        currentAge + monteCarloResult.milestones.yearsToOneCrore
                      })`
                    : "Over 30 Years"}
                </strong>
                <small>{monteCarloResult.milestones.probabilityOfReachingOneCrorePercent}% Probability</small>
              </div>
            </div>
            <div className="milestone-badge-box">
              <Zap size={24} className="milestone-icon text-amber" />
              <div>
                <span className="milestone-caption">Milestone 2 (Rs. 5 Crore / 50M)</span>
                <strong>
                  {monteCarloResult.milestones.yearsToFiveCrore
                    ? `Reached in ${monteCarloResult.milestones.yearsToFiveCrore} Years (Age ${
                        currentAge + monteCarloResult.milestones.yearsToFiveCrore
                      })`
                    : "Over 30 Years"}
                </strong>
                <small>{monteCarloResult.milestones.probabilityOfReachingFiveCrorePercent}% Probability</small>
              </div>
            </div>
            <div className="milestone-badge-box">
              <CheckCircle2 size={24} className="milestone-icon text-emerald" />
              <div>
                <span className="milestone-caption">30-Year Median Net Worth</span>
                <strong className="text-emerald">
                  Rs.{" "}
                  {(
                    (monteCarloResult.projections[monteCarloResult.projections.length - 1]?.medianRupees ?? 0) /
                    10_000_000
                  ).toFixed(2)}{" "}
                  Crore
                </strong>
                <small>Nominal projection</small>
              </div>
            </div>
          </div>

          <div className="pro-feature-grid" style={{ marginTop: "1rem" }}>
            {/* Simulator Interactive Inputs */}
            <div className="panel pro-card">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Stochastic Parameters</p>
                  <h2>Interactive Controls</h2>
                </div>
                <button
                  type="button"
                  className="icon-button subtle"
                  onClick={() => {
                    setStartingWealth(currentLiquidRupees);
                    setMonthlySIP(15_000);
                    setExpectedReturn(15);
                    setInflationRate(9.5);
                  }}
                  title="Reset to defaults"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
              <div className="pro-card-body">
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Starting Wealth</span>
                    <strong>Rs. {startingWealth.toLocaleString()}</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={500_000}
                    step={5_000}
                    value={startingWealth}
                    onChange={(e) => setStartingWealth(Number(e.target.value))}
                    className="pro-range"
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Monthly Investment (SIP)</span>
                    <strong className="text-emerald">Rs. {monthlySIP.toLocaleString()} / mo</strong>
                  </div>
                  <input
                    type="range"
                    min={2_000}
                    max={150_000}
                    step={1_000}
                    value={monthlySIP}
                    onChange={(e) => setMonthlySIP(Number(e.target.value))}
                    className="pro-range"
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Expected Annual PSX Return</span>
                    <strong>{expectedReturn}% CAGR</strong>
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
                  <small className="field-hint">KSE-100 20-year compound CAGR is ~14.8%.</small>
                </div>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Pakistani CPI Inflation Rate</span>
                    <strong className="text-rose">{inflationRate}% / year</strong>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={18}
                    step={0.5}
                    value={inflationRate}
                    onChange={(e) => setInflationRate(Number(e.target.value))}
                    className="pro-range"
                  />
                  <small className="field-hint">Used to compute real purchasing power in today's rupees.</small>
                </div>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Current Age</span>
                    <strong>{currentAge} Years</strong>
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
                </div>
              </div>
            </div>

            {/* Monte Carlo Visual Chart */}
            <div className="panel pro-card">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">30-Year Trajectory Cone (In Lakhs PKR)</p>
                  <h2>Stochastic Probability Bands</h2>
                </div>
                <span className="daily-count-pill">1,000 Iterations</span>
              </div>
              <div className="pro-card-body" style={{ height: "350px", paddingBottom: "1rem" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2468db" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2468db" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="medGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#278669" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#278669" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#bf8c39" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#bf8c39" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#8b97a7" />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="#8b97a7"
                      tickFormatter={(val) => `${val}L`}
                    />
                    <RechartsTooltip
                      formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()} Lakhs`, ""]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #dce8fc",
                        fontSize: "11px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                    <Area
                      type="monotone"
                      dataKey="optimistic"
                      name="Bull Case (90th %ile)"
                      stroke="#2468db"
                      fillOpacity={1}
                      fill="url(#optGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="median"
                      name="Base Case (Median)"
                      stroke="#278669"
                      fillOpacity={1}
                      fill="url(#medGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="realPurchasingPower"
                      name="Real CPI Purchasing Power"
                      stroke="#bf8c39"
                      fillOpacity={1}
                      fill="url(#realGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: Macroeconomic Shock Stress-Test Shield                        */}
      {/* ==================================================================== */}
      {activeTab === "stresstest" && (
        <div className="pro-tab-content">
          <div className="stress-test-header-card">
            <div className="stress-score-gauge">
              <div className="gauge-number">{stressTestResult.resilienceScore}</div>
              <span className="gauge-label">Resilience Index / 100</span>
            </div>
            <div className="stress-header-copy">
              <h3>Institutional Liquidity & Shock Defense Shield</h3>
              <p>
                Calculated directly from your verified liquid balances (Cash + JazzCash + Easypaisa ={" "}
                <strong>Rs. {stressTestResult.currentLiquidRupees.toLocaleString()}</strong>) against your monthly
                essential burn rate of{" "}
                <strong>Rs. {stressTestResult.monthlyEssentialRupees.toLocaleString()}</strong>.
              </p>
              <div className="runway-pills-row">
                <span className="runway-pill">
                  Baseline Survival Runway: <strong>{stressTestResult.baselineRunwayMonths} Months</strong>
                </span>
                <span className="runway-pill">
                  Recommended 6-Mo Buffer:{" "}
                  <strong>Rs. {stressTestResult.recommendedSafetyBufferRupees.toLocaleString()}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="shock-scenarios-grid">
            {stressTestResult.scenarios.map((scenario) => (
              <div key={scenario.id} className="panel pro-card shock-card">
                <div className="shock-card-header">
                  <div>
                    <span
                      className={`severity-tag severity-${scenario.severityLevel.toLowerCase()}`}
                    >
                      {scenario.severityLevel} Risk
                    </span>
                    <h3 className="shock-title">{scenario.title}</h3>
                  </div>
                  <AlertTriangle
                    size={20}
                    className={`severity-icon icon-${scenario.severityLevel.toLowerCase()}`}
                  />
                </div>

                <p className="shock-description">{scenario.description}</p>

                <div className="shock-metrics-row">
                  <div className="shock-metric">
                    <span>Surviving Runway</span>
                    <strong>{scenario.liquidityRunwayDays} Days</strong>
                    <small>({scenario.liquidityRunwayMonths} months)</small>
                  </div>
                  <div className="shock-metric">
                    <span>Expense Jump</span>
                    <strong>+{scenario.impactOnMonthlyBurnPercent}%</strong>
                    <small>Inflation impact</small>
                  </div>
                </div>

                <div className="shock-defensive-box">
                  <strong>Defensive Playbook:</strong>
                  <ul>
                    {scenario.defensiveRecommendations.map((rec, idx) => (
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
      {/* TAB 4: Pakistan FIRE Independence Matrix                             */}
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
