"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Home,
  LayoutDashboard,
  Landmark,
  LockKeyhole,
  LogOut,
  Menu,
  Pencil,
  PiggyBank,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Settings2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trash2,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateAccountBalance,
  formatPkr,
  getDateLabel,
  getDaySummary,
  getMonthlySummary,
  getMonthlyTrend,
  getPakistanDateKey,
  getWeeklySummary,
  paisaToChartNumber,
  parseRupeesToPaisa,
  type AccountType,
  type FinanceAccount,
  type FinanceTransaction,
  type DaySummary,
  type WeeklyDay,
  type TransactionType,
} from "@/lib/finance";
import {
  cacheFinancialData,
  getCachedFinancialData,
  getPendingTransactions,
  queueOfflineTransaction,
  removePendingTransaction,
} from "@/lib/offline";
import type { AppSection } from "@/lib/navigation";
import { TransactionsPage } from "@/components/transactions-page";
import { IncomeManager } from "@/components/income-manager";
import { ExpenseManager } from "@/components/expense-manager";
import { BudgetPlanner } from "@/components/budget-planner";
import { InventoryManager } from "@/components/inventory-manager";
import { SavingsManager } from "@/components/savings-manager";
import { InvestmentPortfolio } from "@/components/investment-portfolio";
import { AssetsManager } from "@/components/assets-manager";
import { ReportsPage } from "@/components/reports-page";
import { FinancialAssistant } from "@/components/financial-assistant";
import { SettingsPage } from "@/components/settings-page";
import { FinancialCalendar } from "@/components/financial-calendar";
import { NotificationBell } from "@/components/notification-bell";
import { Shield } from "lucide-react";

type EntryKind = TransactionType;
type DashboardProps = {
  user: User;
  supabase: SupabaseClient;
  section: AppSection;
  onSignedOut: () => void;
};

const accountIcon: Record<AccountType, typeof Wallet> = {
  cash: Wallet,
  wallet: Smartphone,
  bank: Landmark,
  savings: PiggyBank,
  brokerage_cash: BriefcaseBusiness,
  custom: CreditCard,
};

const accountTypeLabel: Record<AccountType, string> = {
  cash: "Cash in hand",
  wallet: "Mobile wallet",
  bank: "Bank account",
  savings: "Savings account",
  brokerage_cash: "Brokerage cash",
  custom: "Other account",
};

const categoryPalette = ["#2563eb", "#22a07a", "#f0a332", "#8767d9", "#ef7181", "#48a6bf"];

export function Dashboard({ user, supabase, section, onSignedOut }: DashboardProps) {
  const today = getPakistanDateKey(new Date());
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activeEntry, setActiveEntry] = useState<EntryKind | null>(null);
  const [entryPreset, setEntryPreset] = useState<{ description: string; category: string } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<FinanceTransaction | null>(null);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const openEntry = useCallback((kind: EntryKind, preset?: { description: string; category: string }) => {
    setEntryPreset(preset ?? null);
    setActiveEntry(kind);
  }, []);

  const refreshData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setLoadError("");
    try {
      const { data: accountRows, error: accountError } = await supabase
        .from("account_balances")
        .select("*")
        .order("created_at", { ascending: true });
      if (accountError) throw accountError;

      const transactionRows: FinanceTransaction[] = [];
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .is("deleted_at", null)
          .order("occurred_at", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        const page = (data ?? []) as FinanceTransaction[];
        transactionRows.push(...page);
        if (page.length < pageSize) break;
        offset += pageSize;
      }

      const accountData = (accountRows ?? []) as FinanceAccount[];
      const pending = await getPendingTransactions(user.id).catch(() => []);
      const knownIds = new Set(transactionRows.map((transaction) => transaction.id));
      const mergedTransactions = [...transactionRows, ...pending.filter((transaction) => !knownIds.has(transaction.id))];
      await cacheFinancialData(user.id, accountData, mergedTransactions).catch(() => undefined);
      setAccounts(accountData);
      setTransactions(mergedTransactions);
      setOffline(!navigator.onLine);
      setDataAvailable(true);

      if (navigator.onLine && pending.length) {
        void syncPendingTransactions(user.id, supabase, pending);
      }
    } catch (caught) {
      const cached = await getCachedFinancialData(user.id).catch(() => ({ accounts: [], transactions: [] }));
      const pending = await getPendingTransactions(user.id).catch(() => []);
      if (cached.accounts.length || cached.transactions.length || pending.length) {
        const knownIds = new Set(cached.transactions.map((transaction) => transaction.id));
        setAccounts(cached.accounts);
        setTransactions([...cached.transactions, ...pending.filter((transaction) => !knownIds.has(transaction.id))]);
        setOffline(true);
        setDataAvailable(true);
      } else {
        setDataAvailable(false);
        setLoadError(caught instanceof Error ? caught.message : "The finance data could not be loaded.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, user.id]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void refreshData(); }, 0);
    const onOnline = () => { void refreshData(true); };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshData]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeAccounts = useMemo(() => accounts.filter((account) => account.is_active), [accounts]);
  const accountTotal = useMemo(() => accounts.reduce(
    (total, account) => total + calculateAccountBalance(account, transactions),
    0n,
  ), [accounts, transactions]);
  const daySummary = useMemo(() => getDaySummary(selectedDate, accounts, transactions), [selectedDate, accounts, transactions]);
  const monthSummary = useMemo(() => getMonthlySummary(selectedMonth, transactions), [selectedMonth, transactions]);
  const weeklySummary = useMemo(() => getWeeklySummary(selectedDate, accounts, transactions), [selectedDate, accounts, transactions]);
  const monthlyTrend = useMemo(() => getMonthlyTrend(selectedMonth, transactions), [selectedMonth, transactions]);
  const customRangeSummary = useMemo(() => {
    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return null;
    const rangeTransactions = transactions.filter((transaction) => {
      if (transaction.deleted_at) return false;
      const date = getPakistanDateKey(transaction.occurred_at);
      return date >= rangeStart && date <= rangeEnd;
    });
    const income = rangeTransactions.reduce((total, transaction) => transaction.transaction_type === "income" || transaction.transaction_type === "dividend"
      ? total + BigInt(transaction.amount_paisa)
      : total, 0n);
    const expenses = rangeTransactions.reduce((total, transaction) => transaction.transaction_type === "expense"
      ? total + BigInt(transaction.amount_paisa)
      : total, 0n);
    return { income, expenses, savings: income - expenses, count: rangeTransactions.length };
  }, [rangeStart, rangeEnd, transactions]);
  const selectedDayTransactions = useMemo(() => transactions
    .filter((transaction) => getPakistanDateKey(transaction.occurred_at) === selectedDate && !transaction.deleted_at)
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at)), [transactions, selectedDate]);
  const hasWeekActivity = weeklySummary.some((day) => day.transactionCount > 0);
  const hasMonthActivity = monthlyTrend.some((month) => month.income > 0n || month.expenses > 0n);
  const displayMoney = (value: bigint) => dataAvailable ? formatPkr(value) : "—";
  const greetingName = user.email?.split("@")[0] || "there";

  async function signOut() {
    await supabase.auth.signOut();
    onSignedOut();
  }

  function handleSaved(message: string) {
    setActiveEntry(null);
    setEntryPreset(null);
    setShowAccountDialog(false);
    setToast(message);
    void refreshData(true);
  }

  if (loading) return <div className="loading-screen"><span className="loading-spinner" />Preparing your overview…</div>;

  return (
    <div className="app-frame">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><div className="brand-mark"><WalletCards size={23} /></div><span>Pocket<span>Asset</span></span></div>
        <div className="workspace-switcher"><div className="workspace-avatar">{(user.email?.[0] ?? "P").toUpperCase()}</div><div><strong>My finances</strong><small>Private workspace</small></div><ChevronDown size={15} /></div>

        <nav className="side-navigation" aria-label="Main navigation">
          <p className="nav-caption">Workspace</p>
          <NavLinkItem href="/" icon={LayoutDashboard} label="Overview" active={section === "overview"} onClick={() => setMobileNavOpen(false)} />
          <NavLinkItem href="/daily" icon={CalendarDays} label="Daily money" active={section === "daily"} onClick={() => setMobileNavOpen(false)} />
          <NavLinkItem href="/calendar" icon={CalendarDays} label="Calendar" active={section === "calendar"} onClick={() => setMobileNavOpen(false)} />
          <NavLinkItem href="/transactions" icon={CreditCard} label="Transactions" active={section === "transactions"} onClick={() => setMobileNavOpen(false)} />
          <NavLinkItem href="/income" icon={ArrowDownRight} label="Income" active={section === "income"} onClick={() => setMobileNavOpen(false)} />
          <NavLinkItem href="/expenses" icon={TrendingDown} label="Expenses" active={section === "expenses"} onClick={() => setMobileNavOpen(false)} />
          <NavLinkItem href="/budgets" icon={ChartNoAxesCombined} label="Budgets" active={section === "budgets"} onClick={() => setMobileNavOpen(false)} />
          <p className="nav-caption nav-caption-spaced">Build wealth</p>
          <NavLinkItem href="/inventory" icon={Home} label="Household inventory" active={section === "inventory"} onClick={() => setMobileNavOpen(false)} />
          <NavLinkItem href="/savings" icon={PiggyBank} label="Savings goals" active={section === "savings"} onClick={() => setMobileNavOpen(false)} />
          <NavLinkItem href="/investments" icon={TrendingUp} label="Investments" active={section === "investments"} onClick={() => setMobileNavOpen(false)} />
          <NavLinkItem href="/assets" icon={Landmark} label="Assets & liabilities" active={section === "assets"} onClick={() => setMobileNavOpen(false)} />
          <NavLinkItem href="/reports" icon={Activity} label="Reports" active={section === "reports"} onClick={() => setMobileNavOpen(false)} />
        </nav>

        <div className="sidebar-bottom">
          <NavLinkItem href="/assistant" icon={Sparkles} label="Financial assistant" active={section === "assistant"} onClick={() => setMobileNavOpen(false)} />
          <NavLinkItem href="/settings" icon={Settings2} label="Settings" active={section === "settings"} onClick={() => setMobileNavOpen(false)} />
          <NavLinkItem href="/admin" icon={Shield} label="Admin panel" active={section === "admin"} onClick={() => setMobileNavOpen(false)} />
          <div className="side-user"><div className="user-avatar">{(user.email?.[0] ?? "P").toUpperCase()}</div><div className="user-details"><strong>{user.email?.split("@")[0]}</strong><small>{user.email}</small></div><button type="button" className="icon-button subtle" aria-label="Sign out" onClick={() => void signOut()}><LogOut size={17} /></button></div>
        </div>
      </aside>

      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button>
            <div className="breadcrumbs">
              <span>Workspace</span>
              <span className="crumb-divider">/</span>
              <strong>
                {section === "daily" ? "Daily money"
                  : section === "calendar" ? "Financial calendar"
                  : section === "transactions" ? "Transactions"
                  : section === "income" ? "Income"
                  : section === "expenses" ? "Expenses"
                  : section === "budgets" ? "Budgets"
                  : section === "inventory" ? "Household inventory"
                  : section === "savings" ? "Savings goals"
                  : section === "investments" ? "Investments"
                  : section === "assets" ? "Assets & liabilities"
                  : section === "reports" ? "Reports"
                  : section === "assistant" ? "Financial assistant"
                  : section === "settings" ? "Settings"
                  : section === "admin" ? "Security Admin Console"
                  : "Overview"}
              </strong>
            </div>
          </div>
          <div className="topbar-actions">
            <NotificationBell />
            {offline && <span className="offline-pill"><span />Offline mode</span>}
            <div className="topbar-profile"><div className="user-avatar small">{(user.email?.[0] ?? "P").toUpperCase()}</div><span>{user.email?.split("@")[0]}</span><ChevronDown size={14} /></div>
          </div>
        </header>

        <div className="dashboard-content">
          {section === "daily" ? <DailyTrackerContent
            userId={user.id}
            supabase={supabase}
            accounts={accounts}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            summary={daySummary}
            week={weeklySummary}
            dayTransactions={selectedDayTransactions}
            dataAvailable={dataAvailable}
            offline={offline}
            onAdd={(kind) => setActiveEntry(kind)}
            onEdit={setEditingTransaction}
            onDelete={setDeletingTransaction}
            onRefresh={() => void refreshData(true)}
            onToast={setToast}
          /> : section === "calendar" ? <FinancialCalendar
            userId={user.id}
            supabase={supabase}
            accounts={accounts}
            transactions={transactions}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dataAvailable={dataAvailable}
            refreshing={refreshing}
            onRefresh={() => void refreshData(true)}
            onAdd={(kind) => setActiveEntry(kind)}
            onEdit={setEditingTransaction}
            onDelete={setDeletingTransaction}
            onToast={setToast}
          /> : section === "transactions" ? <TransactionsPage
            accounts={accounts}
            transactions={transactions}
            dataAvailable={dataAvailable}
            refreshing={refreshing}
            onRefresh={() => void refreshData(true)}
            onAdd={(kind) => { setSelectedDate(today); setActiveEntry(kind); }}
            onEdit={setEditingTransaction}
            onDelete={setDeletingTransaction}
          /> : section === "income" ? <IncomeManager
            userId={user.id}
            supabase={supabase}
            accounts={accounts}
            transactions={transactions}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dataAvailable={dataAvailable}
            refreshing={refreshing}
            onRefresh={() => void refreshData(true)}
            onAdd={(kind) => setActiveEntry(kind)}
          /> : section === "expenses" ? <ExpenseManager
            userId={user.id}
            supabase={supabase}
            accounts={activeAccounts}
            transactions={transactions}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dataAvailable={dataAvailable}
            refreshing={refreshing}
            offline={offline}
            onRefresh={() => void refreshData(true)}
            onAdd={() => setActiveEntry("expense")}
          /> : section === "budgets" ? <BudgetPlanner
            userId={user.id}
            supabase={supabase}
            transactions={transactions}
            selectedDate={selectedDate}
            dataAvailable={dataAvailable}
            refreshing={refreshing}
            onRefresh={() => void refreshData(true)}
            onToast={setToast}
          /> : section === "inventory" ? <InventoryManager
            userId={user.id}
            supabase={supabase}
            accounts={accounts}
            dataAvailable={dataAvailable}
            refreshing={refreshing}
            onRefresh={() => void refreshData(true)}
            onToast={setToast}
          /> : section === "savings" ? <SavingsManager
            userId={user.id}
            supabase={supabase}
            accounts={accounts}
            transactions={transactions}
            dataAvailable={dataAvailable}
            refreshing={refreshing}
            onRefresh={() => void refreshData(true)}
            onToast={setToast}
          /> : section === "investments" ? <InvestmentPortfolio
            userId={user.id}
            supabase={supabase}
            accounts={accounts}
            dataAvailable={dataAvailable}
            refreshing={refreshing}
            onRefresh={() => void refreshData(true)}
            onToast={setToast}
          /> : section === "assets" ? <AssetsManager
            userId={user.id}
            supabase={supabase}
            accounts={accounts}
            transactions={transactions}
            stockMarketValuePaisa={1740426n}
            dataAvailable={dataAvailable}
            refreshing={refreshing}
            onRefresh={() => void refreshData(true)}
            onToast={setToast}
          /> : section === "reports" ? <ReportsPage
            accounts={accounts}
            transactions={transactions}
            selectedDate={selectedDate}
            dataAvailable={dataAvailable}
            refreshing={refreshing}
            onRefresh={() => void refreshData(true)}
            onToast={setToast}
          /> : section === "assistant" ? <FinancialAssistant
            userId={user.id}
            supabase={supabase}
            accounts={accounts}
            transactions={transactions}
            selectedDate={selectedDate}
            dataAvailable={dataAvailable}
            refreshing={refreshing}
            onRefresh={() => void refreshData(true)}
            onToast={setToast}
          /> : section === "settings" ? <SettingsPage
            user={user}
            supabase={supabase}
            accounts={accounts}
            transactions={transactions}
            onRefresh={() => void refreshData(true)}
            onToast={setToast}
          /> : <>
          <section className="page-heading">
            <div>
              <p className="eyebrow">Your financial snapshot</p>
              <h1>Good day, {greetingName}<span className="heading-period">.</span></h1>
              <p className="page-subtitle">Here’s where your money stands today.</p>
            </div>
            <div className="heading-actions">
              <button type="button" className="outline-button refresh-button" onClick={() => void refreshData(true)} disabled={refreshing}>
                <RefreshCw size={15} className={refreshing ? "spin" : ""} /> Refresh
              </button>
              <button type="button" className="primary-button" onClick={() => setActiveEntry("expense")}><Plus size={17} /> Add transaction</button>
            </div>
          </section>

          {loadError && <div className="error-banner"><X size={17} /><div><strong>Couldn’t load your finance data</strong><span>{loadError}</span></div><button type="button" onClick={() => void refreshData(true)}>Try again</button></div>}

          <section className="filter-row" aria-label="Dashboard date filters">
            <div className="date-control"><CalendarDays size={16} /><label htmlFor="selected-day">Day</label><input id="selected-day" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></div>
            <div className="date-control"><span className="month-icon">◷</span><label htmlFor="selected-month">Month</label><input id="selected-month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></div>
            <button type="button" className="filter-hint" onClick={() => { setSelectedDate(today); setSelectedMonth(today.slice(0, 7)); }}>Today</button>
            <button type="button" className={`filter-hint custom-range-button ${customRangeOpen ? "selected" : ""}`} onClick={() => setCustomRangeOpen((open) => !open)}><SlidersHorizontal size={13} /> Date range</button>
            <span className="snapshot-updated"><span className="live-indicator" /> Data from your ledger</span>
          </section>

          {customRangeOpen && <section className="custom-range-row" aria-label="Custom date range">
            <div><label htmlFor="range-start">From</label><input id="range-start" type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} /></div>
            <div><label htmlFor="range-end">To</label><input id="range-end" type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} /></div>
            {customRangeSummary && <div className="range-result"><span>{customRangeSummary.count} records</span><strong>Received {formatPkr(customRangeSummary.income)}</strong><strong>Spent {formatPkr(customRangeSummary.expenses)}</strong><strong>Net {formatPkr(customRangeSummary.savings)}</strong></div>}
            {rangeStart && rangeEnd && rangeStart > rangeEnd && <span className="range-error">Choose an end date on or after the start date.</span>}
          </section>}

          <section className="quick-actions" aria-label="Quick actions">
            <span className="quick-actions-label">Quick actions</span>
            <button type="button" className="quick-action quick-income" onClick={() => openEntry("income")}><ArrowDownRight size={15} /> Add Money</button>
            <button type="button" className="quick-action quick-expense" onClick={() => openEntry("expense")}><ShoppingBag size={14} /> Add Expense</button>
            <button type="button" className="quick-action quick-transfer" onClick={() => openEntry("transfer")}><ArrowLeftRight size={15} /> Transfer</button>
            <Link href="/calendar" className="quick-action"><CalendarDays size={14} /> View Calendar</Link>
            <button type="button" className="quick-action quick-expense" onClick={() => openEntry("expense")}><Plus size={14} /> Add Purchase</button>
            <Link href="/investments" className="quick-action quick-investment"><TrendingUp size={14} /> View Investments</Link>
          </section>

          {/* 10 Prioritized Financial Metrics */}
          <section className="metric-grid-5" aria-label="Today's financial metrics">
            <MetricCard icon={Wallet} label="1. Today's Available" value={displayMoney(daySummary.totalAvailable)} tone="blue" hint="Opening + received today" />
            <MetricCard icon={ArrowUpRight} label="2. Today's Received" value={displayMoney(daySummary.received + daySummary.otherInflows)} tone="green" hint="Income & allowances" />
            <MetricCard icon={ArrowDownRight} label="3. Today's Expenses" value={displayMoney(daySummary.expenses + daySummary.investmentPurchases)} tone="rose" hint="Daily purchases & spending" />
            <MetricCard icon={CircleDollarSign} label="4. Today's Remaining" value={displayMoney(daySummary.closingBalance)} tone="violet" hint="Closing balance for day" />
            <MetricCard icon={Landmark} label="5. Liquid Balance" value={displayMoney(accountTotal)} tone="teal" hint="Cash, JazzCash, Easypaisa" />
          </section>

          <section className="metric-grid-5" aria-label="Monthly and wealth metrics">
            <MetricCard icon={ArrowUpRight} label="6. Monthly Income" value={displayMoney(monthSummary.income)} tone="green" hint={!dataAvailable ? "Ledger unavailable" : monthSummary.income > 0n ? "Received this month" : "No income recorded"} compact />
            <MetricCard icon={ArrowDownRight} label="7. Monthly Expenses" value={displayMoney(monthSummary.expenses)} tone="rose" hint={!dataAvailable ? "Ledger unavailable" : monthSummary.expenses > 0n ? "Purchases this month" : "No expenses recorded"} compact />
            <MetricCard icon={PiggyBank} label="8. Monthly Savings" value={displayMoney(monthSummary.savings)} tone="mint" hint="Monthly income − expenses" compact />
            <MetricCard icon={TrendingUp} label="9. Stock Value" value={formatPkr(1740426n)} tone="violet" hint="PSX snapshot (+Rs 1,255.63)" compact />
            <MetricCard icon={CircleDollarSign} label="10. Total Net Worth" value={formatPkr(accountTotal + 1740426n)} tone="amber" hint="Liquid balances + PSX holdings" compact />
          </section>

          <section className="dashboard-grid primary-grid">
            <article className="panel today-panel">
              <div className="panel-heading">
                <div><p className="panel-kicker">Daily money tracker</p><h2>{getDateLabel(selectedDate, { weekday: "long", month: "long", day: "numeric" })}</h2></div>
              </div>
              <div className="daily-balance-card">
                <div><span>Closing balance</span><strong>{displayMoney(daySummary.closingBalance)}</strong></div>
                <div className="balance-change"><span className="balance-dot" />Across your accounts</div>
                <div className="balance-illustration"><span /><span /><span /><span /></div>
              </div>
              <div className="daily-breakdown">
                <SummaryRow icon={CircleDollarSign} iconTone="slate" label="Opening balance" value={displayMoney(daySummary.openingBalance)} />
                <SummaryRow icon={ArrowUpRight} iconTone="green" label="Money received" value={displayMoney(daySummary.received)} positive />
                {daySummary.otherInflows > 0n && <SummaryRow icon={ArrowUpRight} iconTone="slate" label="Refunds & sale proceeds" value={displayMoney(daySummary.otherInflows)} />}
                <SummaryRow icon={ArrowDownRight} iconTone="rose" label="Expenses" value={displayMoney(daySummary.expenses)} negative={daySummary.expenses > 0n} />
                {daySummary.investmentPurchases > 0n && <SummaryRow icon={TrendingUp} iconTone="violet" label="Investment purchases" value={displayMoney(daySummary.investmentPurchases)} />}
                {daySummary.adjustmentsNet !== 0n && <SummaryRow icon={Settings2} iconTone="slate" label="Adjustments" value={displayMoney(daySummary.adjustmentsNet)} />}
                <div className="daily-footer"><span><Clock3 size={14} /> {dataAvailable ? `${daySummary.transactionCount} ${daySummary.transactionCount === 1 ? "transaction" : "transactions"}` : "Ledger unavailable"}</span><button type="button" onClick={() => setActiveEntry("income")}>Add money <ArrowRight size={14} /></button></div>
              </div>
            </article>

            <article className="panel weekly-panel">
              <div className="panel-heading">
                <div><p className="panel-kicker">Cash flow</p><h2>This week</h2></div>
                <span className="panel-select-label">Monday – Sunday</span>
              </div>
              {dataAvailable && hasWeekActivity ? <div className="chart-area weekly-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklySummary.map((day) => ({
                    day: day.weekday,
                    income: paisaToChartNumber(day.received),
                    expense: paisaToChartNumber(day.expenses),
                  }))} margin={{ top: 12, right: 4, left: -16, bottom: 0 }} barGap={5}>
                    <CartesianGrid vertical={false} stroke="#edf0f4" strokeDasharray="3 4" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#8a94a4", fontSize: 11 }} dy={9} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8a94a4", fontSize: 10 }} tickFormatter={compactRupees} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f5f7fa" }} />
                    <Bar dataKey="income" name="Received" fill="#27a780" radius={[4, 4, 0, 0]} maxBarSize={19} />
                    <Bar dataKey="expense" name="Expenses" fill="#f2a848" radius={[4, 4, 0, 0]} maxBarSize={19} />
                  </BarChart>
                </ResponsiveContainer>
              </div> : <EmptyChart icon={CalendarDays} title={dataAvailable ? "No activity this week" : "Ledger data is unavailable"} detail={dataAvailable ? "Income and expenses will appear here when you record them." : "Reconnect to load a recent saved ledger or try again."} />}
              <div className="chart-legend"><span><i className="legend-dot income-dot" />Received</span><span><i className="legend-dot expense-dot" />Expenses</span><span className="legend-summary">Weekly savings <strong>{displayMoney(weeklySummary.reduce((sum, day) => sum + day.received - day.expenses, 0n))}</strong></span></div>
            </article>
          </section>

          <section className="dashboard-grid secondary-grid">
            <article className="panel analytics-panel">
              <div className="panel-heading">
                <div><p className="panel-kicker">Your trend</p><h2>Income vs expenses</h2></div>
                <span className="month-label">Last 6 months</span>
              </div>
              {dataAvailable && hasMonthActivity ? <div className="chart-area monthly-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend.map((month) => ({
                    month: new Intl.DateTimeFormat("en-PK", { month: "short", timeZone: "UTC" }).format(new Date(`${month.month}-15T12:00:00Z`)),
                    income: paisaToChartNumber(month.income),
                    expense: paisaToChartNumber(month.expenses),
                  }))} margin={{ top: 12, right: 8, left: -12, bottom: 0 }} barGap={7}>
                    <CartesianGrid vertical={false} stroke="#edf0f4" strokeDasharray="3 4" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8a94a4", fontSize: 11 }} dy={9} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8a94a4", fontSize: 10 }} tickFormatter={compactRupees} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f5f7fa" }} />
                    <Bar dataKey="income" name="Income" fill="#3689e6" radius={[4, 4, 0, 0]} maxBarSize={25} />
                    <Bar dataKey="expense" name="Expenses" fill="#c4d7f5" radius={[4, 4, 0, 0]} maxBarSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              </div> : <EmptyChart icon={ChartNoAxesCombined} title={dataAvailable ? "Your trend starts here" : "Ledger data is unavailable"} detail={dataAvailable ? "Record income or expenses to see month-by-month cash flow." : "Reconnect to load a recent saved ledger or try again."} />}
              <div className="chart-legend"><span><i className="legend-dot month-income-dot" />Income</span><span><i className="legend-dot month-expense-dot" />Expenses</span></div>
            </article>

            <article className="panel category-panel">
              <div className="panel-heading">
                <div><p className="panel-kicker">Where it goes</p><h2>Spending by category</h2></div>
                <button type="button" className="text-action" onClick={() => setActiveEntry("expense")}>Add expense <ArrowRight size={14} /></button>
              </div>
              {dataAvailable && monthSummary.expenseCategories.length ? <>
                <div className="category-visual">
                  <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={monthSummary.expenseCategories.map((item) => ({ name: item.category, value: paisaToChartNumber(item.amount) }))} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="88%" paddingAngle={3} stroke="none">{monthSummary.expenseCategories.map((item, index) => <Cell key={item.category} fill={categoryPalette[index % categoryPalette.length]} />)}</Pie><Tooltip formatter={(value) => formatPkr(Math.round(Number(value) * 100))} /></PieChart></ResponsiveContainer><div className="donut-center"><span>Total spent</span><strong>{formatCompactPkr(monthSummary.expenses)}</strong></div></div>
                  <div className="category-list">{monthSummary.expenseCategories.slice(0, 4).map((item, index) => <div className="category-item" key={item.category}><span className="category-dot" style={{ background: categoryPalette[index % categoryPalette.length] }} /><span>{item.category}</span><strong>{formatCompactPkr(item.amount)}</strong></div>)}</div>
                </div>
              </> : <EmptyChart icon={ShoppingBag} title={dataAvailable ? "No spending recorded" : "Ledger data is unavailable"} detail={dataAvailable ? "Actual purchases will be grouped by category here." : "Reconnect to load a recent saved ledger or try again."} />}
            </article>
          </section>

          <section className="dashboard-grid tertiary-grid">
            <article className="panel savings-trend-panel">
              <div className="panel-heading"><div><p className="panel-kicker">Your monthly surplus</p><h2>Savings trend</h2></div><span className="month-label">Last 6 months</span></div>
              {dataAvailable && hasMonthActivity ? <div className="chart-area savings-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyTrend.map((month) => ({ month: new Intl.DateTimeFormat("en-PK", { month: "short", timeZone: "UTC" }).format(new Date(`${month.month}-15T12:00:00Z`)), savings: paisaToChartNumber(month.income - month.expenses) }))} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f4" strokeDasharray="3 4" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8a94a4", fontSize: 11 }} dy={9} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8a94a4", fontSize: 10 }} tickFormatter={compactRupees} /><Tooltip content={<ChartTooltip />} cursor={{ fill: "#f5f7fa" }} /><Bar dataKey="savings" name="Savings" fill="#29a27a" radius={[4, 4, 0, 0]} maxBarSize={28} /></BarChart></ResponsiveContainer></div> : <EmptyChart icon={PiggyBank} title={dataAvailable ? "Savings trend starts here" : "Ledger data is unavailable"} detail={dataAvailable ? "Monthly income minus recorded expenses will appear here." : "Reconnect to load a recent saved ledger or try again."} />}
            </article>
            <article className="panel net-worth-panel">
              <div className="panel-heading"><div><p className="panel-kicker">Your long-term picture</p><h2>Net worth history</h2></div><span className="month-label">Not tracked yet</span></div>
              <EmptyChart icon={Landmark} title="Assets and liabilities aren’t set up" detail="Net worth history will appear after you record accounts, investments, assets, and liabilities." />
            </article>
          </section>

          <section className="dashboard-grid lower-grid">
            <article className="panel accounts-panel">
              <div className="panel-heading">
                <div><p className="panel-kicker">Where your money lives</p><h2>Accounts</h2></div>
                <button type="button" className="text-action" onClick={() => setShowAccountDialog(true)}><Plus size={15} /> Add account</button>
              </div>
              {!dataAvailable ? <EmptyChart icon={Wallet} title="Ledger data is unavailable" detail="Reconnect to load your saved account balances." /> : accounts.length ? <div className="account-list">{accounts.map((account) => {
                const Icon = accountIcon[account.account_type] ?? CreditCard;
                const balance = calculateAccountBalance(account, transactions);
                return <div className={`account-row ${account.is_active ? "" : "account-row-inactive"}`} key={account.id}><div className={`account-icon account-${account.account_type}`}><Icon size={17} /></div><div className="account-info"><strong>{account.name}</strong><span>{accountTypeLabel[account.account_type] ?? "Account"}{account.is_active ? "" : " · Inactive"}</span></div><strong className="account-balance">{formatPkr(balance)}</strong></div>;
              })}</div> : <EmptyAccounts onCreate={() => setShowAccountDialog(true)} />}
              {dataAvailable && accounts.length > 0 && <div className="account-total"><span>Total account balances</span><strong>{formatPkr(accountTotal)}</strong></div>}
            </article>

            <article className="panel activity-panel">
              <div className="panel-heading">
                <div><p className="panel-kicker">On this day</p><h2>Recent activity</h2></div>
              </div>
              {!dataAvailable ? <EmptyChart icon={Clock3} title="Ledger data is unavailable" detail="Reconnect to load transactions for this date." /> : selectedDayTransactions.length ? <div className="activity-list">{selectedDayTransactions.slice(0, 5).map((transaction) => <ActivityRow key={transaction.id} transaction={transaction} />)}</div> : <EmptyActivity onAdd={() => setActiveEntry("expense")} />}
              {selectedDayTransactions.length > 5 && <button type="button" className="activity-footer" onClick={() => setToast("The Transactions module will be available in the next development phase.")}>View all {selectedDayTransactions.length} transactions <ArrowRight size={14} /></button>}
            </article>
          </section>

          <section className="goal-nudge">
            <div className="goal-nudge-icon"><PiggyBank size={20} /></div>
            <div><strong>Give your savings a direction</strong><span>Savings goals and emergency fund tracking are coming in the next module.</span></div>
            <span className="module-status">Not set up</span>
          </section>

          <footer className="dashboard-footer"><span>Private finance workspace</span><span><LockKeyhole size={13} /> Data protected by Supabase Row Level Security</span></footer>
          </>}
        </div>
      </main>

      {activeEntry && <QuickEntryDialog key={activeEntry + (entryPreset?.description ?? "")} kind={activeEntry} initialPreset={entryPreset} accounts={activeAccounts} userId={user.id} selectedDate={selectedDate} supabase={supabase} onClose={() => { setActiveEntry(null); setEntryPreset(null); }} onSaved={handleSaved} onCreateAccount={() => { setActiveEntry(null); setEntryPreset(null); setShowAccountDialog(true); }} />}
      {editingTransaction && <TransactionCorrectionDialog transaction={editingTransaction} accounts={activeAccounts} userId={user.id} supabase={supabase} onClose={() => setEditingTransaction(null)} onSaved={(message) => { setEditingTransaction(null); handleSaved(message); }} />}
      {deletingTransaction && <DeleteTransactionDialog transaction={deletingTransaction} userId={user.id} supabase={supabase} onClose={() => setDeletingTransaction(null)} onDeleted={(message) => { setDeletingTransaction(null); handleSaved(message); }} />}
      {showAccountDialog && <AccountDialog userId={user.id} supabase={supabase} onClose={() => setShowAccountDialog(false)} onCreated={() => handleSaved("Account added. Its opening balance is recorded separately from income.")} />}
      {toast && <div className="toast-message" role="status"><span className="toast-check">✓</span>{toast}<button type="button" aria-label="Dismiss notification" onClick={() => setToast("")}><X size={15} /></button></div>}
    </div>
  );
}

async function syncPendingTransactions(userId: string, supabase: SupabaseClient, pending: FinanceTransaction[]): Promise<void> {
  for (const transaction of pending) {
    try {
      const { error } = await supabase.from("transactions").insert(transaction);
      if (!error) {
        await removePendingTransaction(userId, transaction.id).catch(() => undefined);
        continue;
      }
      if (error.code === "23505") {
        const { data } = await supabase.from("transactions").select("id").eq("id", transaction.id).maybeSingle();
        if (data) await removePendingTransaction(userId, transaction.id).catch(() => undefined);
      }
    } catch {
      // Keep the local entry queued when network access is unavailable.
    }
  }
}

function NavButton({ icon: Icon, label, active = false, disabled = false, onClick }: {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return <button type="button" className={`nav-item ${active ? "nav-item-active" : ""}`} disabled={disabled} onClick={onClick} aria-current={active ? "page" : undefined} title={disabled ? "This module will be available in a later development phase" : undefined}><Icon size={17} strokeWidth={1.9} /><span>{label}</span>{active && <span className="nav-active-indicator" />}</button>;
}

function NavLinkItem({ href, icon: Icon, label, active, onClick }: {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return <Link href={href} className={`nav-item ${active ? "nav-item-active" : ""}`} aria-current={active ? "page" : undefined} onClick={onClick}><Icon size={17} strokeWidth={1.9} /><span>{label}</span>{active && <span className="nav-active-indicator" />}</Link>;
}

function MetricCard({ icon: Icon, label, value, tone, hint, compact = false, muted = false }: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone: string;
  hint: string;
  compact?: boolean;
  muted?: boolean;
}) {
  return <article className={`metric-card ${compact ? "metric-card-compact" : ""} ${muted ? "metric-muted" : ""}`}><div className={`metric-icon metric-${tone}`}><Icon size={17} strokeWidth={2} /></div><div className="metric-copy"><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-hint">{hint}</span></div></article>;
}

function SummaryRow({ icon: Icon, iconTone, label, value, positive = false, negative = false }: {
  icon: typeof CircleDollarSign;
  iconTone: string;
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return <div className="summary-row"><div className={`summary-icon summary-${iconTone}`}><Icon size={16} /></div><span>{label}</span><strong className={positive ? "text-positive" : negative ? "text-negative" : ""}>{value}</strong></div>;
}

function EmptyChart({ icon: Icon, title, detail }: { icon: typeof CalendarDays; title: string; detail: string }) {
  return <div className="empty-chart"><div className="empty-chart-icon"><Icon size={20} /></div><strong>{title}</strong><span>{detail}</span></div>;
}

function EmptyAccounts({ onCreate }: { onCreate: () => void }) {
  return <div className="empty-accounts"><div className="empty-wallet"><Wallet size={23} /></div><strong>Add your first account</strong><span>Set up cash, a mobile wallet, or a bank account to begin tracking balances.</span><button type="button" className="outline-button small-button" onClick={onCreate}><Plus size={15} /> Add an account</button></div>;
}

function EmptyActivity({ onAdd }: { onAdd: () => void }) {
  return <div className="empty-activity"><div className="empty-activity-icon"><Clock3 size={18} /></div><strong>Nothing recorded for this day</strong><span>Transactions you add for this date will appear here.</span><button type="button" className="text-action" onClick={onAdd}>Add first transaction <ArrowRight size={14} /></button></div>;
}

function ActivityRow({ transaction }: { transaction: FinanceTransaction }) {
  const isIncoming = transaction.transaction_type === "income" || transaction.transaction_type === "refund" || transaction.transaction_type === "dividend" || transaction.transaction_type === "investment_sale";
  const isTransfer = transaction.transaction_type === "transfer";
  const isInvestment = transaction.transaction_type === "investment_purchase" || transaction.transaction_type === "investment_sale";
  const Icon = isTransfer ? ArrowLeftRight : isInvestment ? TrendingUp : isIncoming ? ArrowUpRight : ShoppingBag;
  const time = new Intl.DateTimeFormat("en-PK", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" }).format(new Date(transaction.occurred_at));
  const prefix = isTransfer ? "" : isIncoming ? "+" : "−";
  return <div className="activity-row"><div className={`activity-icon ${isIncoming ? "activity-incoming" : isTransfer ? "activity-transfer" : isInvestment ? "activity-investment" : "activity-outgoing"}`}><Icon size={16} /></div><div className="activity-description"><strong>{transaction.description}</strong><span>{transaction.category || (isTransfer ? "Account transfer" : isInvestment ? "Investment" : "Uncategorized")} · {time}</span></div><strong className={`activity-amount ${isIncoming ? "amount-incoming" : isTransfer ? "amount-transfer" : ""}`}>{prefix}{formatPkr(transaction.amount_paisa)}</strong></div>;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.name} style={{ color: item.color }}>{item.name}<b>{formatPkr(Math.round((item.value ?? 0) * 100))}</b></span>)}</div>;
}

function compactRupees(value: number): string {
  if (value >= 1000000) return `Rs ${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}m`;
  if (value >= 1000) return `Rs ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `Rs ${value}`;
}

function formatCompactPkr(value: bigint): string {
  const rupees = Number(value) / 100;
  if (rupees >= 1000000) return `Rs ${(rupees / 1000000).toFixed(1)}m`;
  if (rupees >= 1000) return `Rs ${(rupees / 1000).toFixed(1)}k`;
  return formatPkr(value);
}

function localTimeInputValue(): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Karachi",
  }).format(new Date());
}

function localDateTimeIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+05:00`).toISOString();
}

const EXPENSE_PRESETS = [
  { label: "Bus fare", name: "Bus fare", category: "Transport" },
  { label: "Rickshaw", name: "Rickshaw", category: "Transport" },
  { label: "Lunch", name: "Lunch", category: "Food" },
  { label: "Daal chawal", name: "Daal chawal", category: "Food" },
  { label: "Bubble tea", name: "Bubble tea", category: "Drinks" },
  { label: "Pencil", name: "Pencil", category: "Education" },
  { label: "Pen", name: "Pen", category: "Education" },
  { label: "Perfume", name: "Perfume", category: "Personal care" },
  { label: "Mobile package", name: "Mobile package", category: "Mobile package" },
  { label: "Household purchases", name: "Household purchase", category: "Household" },
];

const INCOME_PRESETS = [
  { label: "Family allowance", name: "Family allowance", category: "Family allowance" },
  { label: "University allowance", name: "University allowance", category: "University allowance" },
  { label: "Freelancing", name: "Freelancing income", category: "Freelancing" },
  { label: "Gift", name: "Gift received", category: "Gift" },
  { label: "Other income", name: "Other income", category: "Other income" },
];

function QuickEntryDialog({ kind, initialPreset, accounts, userId, selectedDate, supabase, onClose, onSaved, onCreateAccount }: {
  kind: EntryKind;
  initialPreset?: { description: string; category: string } | null;
  accounts: FinanceAccount[];
  userId: string;
  selectedDate: string;
  supabase: SupabaseClient;
  onClose: () => void;
  onSaved: (message: string) => void;
  onCreateAccount: () => void;
}) {
  const [description, setDescription] = useState(initialPreset?.description ?? "");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(initialPreset?.category ?? "");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState(accounts.find((account) => account.id !== accounts[0]?.id)?.id ?? "");
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState(localTimeInputValue());
  const [notes, setNotes] = useState("");
  const [adjustmentDirection, setAdjustmentDirection] = useState<"inflow" | "outflow">("inflow");
  const [expenseClassification, setExpenseClassification] = useState("essential");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const heading: Record<EntryKind, string> = {
    income: "Add money received",
    expense: "Add an expense",
    transfer: "Transfer between accounts",
    investment_purchase: "Record an investment purchase",
    investment_sale: "Record an investment sale",
    dividend: "Record a dividend",
    refund: "Record a refund",
    adjustment: "Record a balance adjustment",
  };
  const transactionType: TransactionType = kind;
  const categories = kind === "income"
    ? ["Family allowance", "University allowance", "Freelancing", "Gift", "Other income", "Website earnings", "Business"]
    : kind === "expense"
      ? ["Food", "Transport", "Drinks", "Personal care", "Mobile package", "Household", "Education", "Clothes", "Shoes", "Entertainment", "Medical", "Other"]
      : kind === "investment_purchase" ? ["Stocks", "Other investment"]
        : kind === "investment_sale" || kind === "dividend" ? ["Stocks", "Other investment"]
          : kind === "refund" ? ["Refund", "Returned purchase", "Other"]
            : kind === "adjustment" ? ["Balance correction", "Other adjustment"] : [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!accounts.length) {
      setError("Add an account before recording money movement.");
      return;
    }
    if (kind === "transfer" && (!destinationId || destinationId === accountId)) {
      setError("Choose two different accounts for the transfer.");
      return;
    }
    if (kind === "expense" && quantity.trim() && (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/.test(quantity.trim()) || Number(quantity) <= 0)) {
      setError("Enter a valid quantity greater than zero, with up to three decimal places.");
      return;
    }
    let amountPaisa: bigint;
    try {
      amountPaisa = parseRupeesToPaisa(amount);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enter a valid amount.");
      return;
    }

    setBusy(true);
    const transaction: FinanceTransaction = {
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: accountId,
      transfer_to_account_id: kind === "transfer" ? destinationId : null,
      transaction_type: transactionType,
      amount_paisa: amountPaisa.toString(),
      direction: kind === "income" || kind === "refund" || kind === "investment_sale" || kind === "dividend"
        ? "inflow"
        : kind === "adjustment" ? adjustmentDirection : "outflow",
      category: category || null,
      description: description.trim(),
      notes: notes.trim() || null,
      occurred_at: localDateTimeIso(date, time),
      expense_classification: kind === "expense" ? expenseClassification : null,
      quantity: kind === "expense" && quantity.trim() ? quantity.trim() : null,
    };

    let queuedLocally = false;
    try {
      if (!navigator.onLine) {
        await queueOfflineTransaction(userId, transaction);
        onSaved("Saved on this device. It will sync when you’re back online.");
        return;
      }
      queuedLocally = await queueOfflineTransaction(userId, transaction).then(() => true).catch(() => false);
      const { error: insertError } = await supabase.from("transactions").insert(transaction);
      if (insertError) {
        if (insertError.code === "23505") {
          const { data } = await supabase.from("transactions").select("id").eq("id", transaction.id).maybeSingle();
          if (data) {
            await removePendingTransaction(userId, transaction.id).catch(() => undefined);
            onSaved("Transaction saved.");
            return;
          }
        }
        const status = (insertError as { status?: number }).status;
        const isTransient = !insertError.code || (status !== undefined && status >= 500);
        if (isTransient) {
          if (!queuedLocally) queuedLocally = await queueOfflineTransaction(userId, transaction).then(() => true).catch(() => false);
          if (!queuedLocally) throw new Error("The connection failed and offline storage is unavailable, so this entry could not be saved.");
          onSaved("Saved on this device. It will sync when your connection is restored.");
          return;
        }
        await removePendingTransaction(userId, transaction.id).catch(() => undefined);
        throw insertError;
      }
      await removePendingTransaction(userId, transaction.id).catch(() => undefined);
      onSaved(kind === "transfer" ? "Transfer recorded. It was not counted as income or expense."
        : kind === "refund" || kind === "investment_sale" ? "Transaction recorded as cash received, separate from ordinary income."
          : kind === "adjustment" ? "Balance adjustment recorded." : "Transaction recorded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This transaction could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <Modal title={heading[kind]} subtitle={kind === "transfer" ? "Move money without changing income or expense totals." : "Add one confirmed money movement to your ledger."} onClose={onClose}>
    {!accounts.length ? <div className="dialog-empty"><div className="empty-wallet"><Wallet size={22} /></div><strong>You need an account first</strong><p>Create a cash, wallet, bank, or other account before adding a ledger entry.</p><button type="button" className="primary-button" onClick={onCreateAccount}><Plus size={16} /> Add account</button></div> : <form className="entry-form" onSubmit={(event) => void handleSubmit(event)}>
      {kind === "expense" && (
        <div className="preset-chips-wrap">
          <span className="preset-chips-label">Quick purchase presets:</span>
          <div className="preset-chips">
            {EXPENSE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="preset-chip"
                onClick={() => {
                  setDescription(p.name);
                  setCategory(p.category);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {kind === "income" && (
        <div className="preset-chips-wrap">
          <span className="preset-chips-label">Quick income sources:</span>
          <div className="preset-chips">
            {INCOME_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="preset-chip"
                onClick={() => {
                  setDescription(p.name);
                  setCategory(p.category);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <label htmlFor="entry-description">Description</label>
      <input id="entry-description" required maxLength={160} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={kind === "income" ? "e.g. University allowance" : kind === "transfer" ? "e.g. Cash to Easypaisa" : kind === "investment_purchase" ? "e.g. PSX shares" : "e.g. Bus fare"} />
      <div className="form-two-columns">
        <div><label htmlFor="entry-amount">Amount (PKR)</label><div className="rupee-input"><span>Rs</span><input id="entry-amount" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></div></div>
        {categories.length > 0 && <div><label htmlFor="entry-category">Category</label><select id="entry-category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Choose category</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>}
      </div>
      <div className="form-two-columns">
        <div><label htmlFor="entry-account">{kind === "transfer" ? "From account" : "Account"}</label><select id="entry-account" required value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
        {kind === "transfer" && <div><label htmlFor="entry-destination">To account</label><select id="entry-destination" required value={destinationId} onChange={(event) => setDestinationId(event.target.value)}><option value="">Choose destination</option>{accounts.filter((account) => account.id !== accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>}
        {kind === "adjustment" && <div><label htmlFor="entry-adjustment-direction">Balance change</label><select id="entry-adjustment-direction" value={adjustmentDirection} onChange={(event) => setAdjustmentDirection(event.target.value as "inflow" | "outflow")}><option value="inflow">Increase account balance</option><option value="outflow">Decrease account balance</option></select></div>}
      </div>
      {kind === "expense" && <div className="form-two-columns expense-detail-inputs"><div><label htmlFor="expense-classification">Classification</label><select id="expense-classification" value={expenseClassification} onChange={(event) => setExpenseClassification(event.target.value)}><option value="essential">Essential</option><option value="non_essential">Non-essential</option><option value="occasional">Occasional</option><option value="emergency">Emergency</option><option value="optional">Optional</option></select></div><div><label htmlFor="expense-quantity">Quantity <span className="optional-label">Optional</span></label><input id="expense-quantity" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="e.g. 2 or 0.5" /></div></div>}
      <div className="form-two-columns">
        <div><label htmlFor="entry-date">Date</label><input id="entry-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></div>
        <div><label htmlFor="entry-time">Time</label><input id="entry-time" type="time" required value={time} onChange={(event) => setTime(event.target.value)} /></div>
      </div>
      <label htmlFor="entry-notes">Notes <span className="optional-label">Optional</span></label>
      <textarea id="entry-notes" maxLength={2000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add context for your records" />
      {error && <p className="form-alert error" role="alert">{error}</p>}
      <div className="dialog-footnote"><LockKeyhole size={14} /><span>Opening balances and transfers never count as income.</span></div>
      <div className="dialog-actions"><button type="button" className="outline-button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save transaction"}</button></div>
    </form>}
  </Modal>;
}

function AccountDialog({ userId, supabase, onClose, onCreated }: {
  userId: string;
  supabase: SupabaseClient;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("cash");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    let openingPaisa: bigint;
    try {
      openingPaisa = openingBalance.trim() === "0" || openingBalance.trim() === "0.00"
        ? 0n
        : parseRupeesToPaisa(openingBalance);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enter a valid starting balance.");
      return;
    }
    setBusy(true);
    const { error: insertError } = await supabase.from("accounts").insert({
      user_id: userId,
      name: name.trim(),
      account_type: accountType,
      opening_balance_paisa: openingPaisa.toString(),
      currency: "PKR",
      is_active: true,
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onCreated();
  }

  return <Modal title="Add an account" subtitle="Record where your money is kept. The opening balance is not new income." onClose={onClose}>
    <form className="entry-form" onSubmit={(event) => void handleSubmit(event)}>
      <label htmlFor="account-name">Account name</label>
      <input id="account-name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Cash in hand" />
      <div className="form-two-columns">
        <div><label htmlFor="account-type">Account type</label><select id="account-type" value={accountType} onChange={(event) => setAccountType(event.target.value as AccountType)}>{Object.entries(accountTypeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div><label htmlFor="account-opening">Opening balance (PKR)</label><div className="rupee-input"><span>Rs</span><input id="account-opening" inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} placeholder="0.00" /></div></div>
      </div>
      <div className="dialog-footnote"><LockKeyhole size={14} /><span>This is a starting balance, so it will not appear as income.</span></div>
      {error && <p className="form-alert error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="outline-button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save account"}</button></div>
    </form>
  </Modal>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("modal-open");
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="dialog-heading"><div><p className="panel-kicker">PocketAsset ledger</p><h2 id="dialog-title">{title}</h2><p>{subtitle}</p></div><button type="button" className="icon-button dialog-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
      {children}
    </section>
  </div>;
}

type CalendarDayRecord = {
  id?: string;
  user_id?: string;
  date: string;
  is_university_day: boolean;
  is_holiday: boolean;
  label: string | null;
  notes?: string | null;
  updated_at?: string;
};

type DayClosureRecord = {
  id: string;
  user_id: string;
  date: string;
  opening_balance_paisa: string;
  received_paisa: string;
  other_inflows_paisa: string;
  expenses_paisa: string;
  investment_purchases_paisa: string;
  adjustments_paisa: string;
  closing_balance_paisa: string;
  transaction_count: number;
  closed_at: string;
};

type DailyTrackerProps = {
  userId: string;
  supabase: SupabaseClient;
  accounts: FinanceAccount[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  summary: DaySummary;
  week: WeeklyDay[];
  dayTransactions: FinanceTransaction[];
  dataAvailable: boolean;
  offline: boolean;
  onAdd: (kind: EntryKind, preset?: { description: string; category: string }) => void;
  onEdit: (transaction: FinanceTransaction) => void;
  onDelete: (transaction: FinanceTransaction) => void;
  onRefresh: () => void;
  onToast: (message: string) => void;
};

function DailyTrackerContent({
  userId,
  supabase,
  accounts,
  selectedDate,
  setSelectedDate,
  summary,
  week,
  dayTransactions,
  dataAvailable,
  offline,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
  onToast,
}: DailyTrackerProps) {
  const [calendarDays, setCalendarDays] = useState<CalendarDayRecord[]>([]);
  const [closures, setClosures] = useState<DayClosureRecord[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [closingDay, setClosingDay] = useState(false);
  const weekStart = week[0]?.date ?? selectedDate;
  const weekEnd = week[6]?.date ?? selectedDate;
  const selectedCalendarDay = calendarDays.find((item) => item.date === selectedDate) ?? null;
  const selectedClosure = closures.find((item) => item.date === selectedDate) ?? null;
  const closureChanged = selectedClosure !== null && (
    BigInt(selectedClosure.opening_balance_paisa) !== summary.openingBalance
    || BigInt(selectedClosure.received_paisa) !== summary.received
    || BigInt(selectedClosure.other_inflows_paisa) !== summary.otherInflows
    || BigInt(selectedClosure.expenses_paisa) !== summary.expenses
    || BigInt(selectedClosure.investment_purchases_paisa) !== summary.investmentPurchases
    || BigInt(selectedClosure.adjustments_paisa) !== summary.adjustmentsNet
    || BigInt(selectedClosure.closing_balance_paisa) !== summary.closingBalance
    || selectedClosure.transaction_count !== summary.transactionCount
  );

  useEffect(() => {
    let cancelled = false;
    const loadMetadata = async () => {
      setMetadataLoading(true);
      setMetadataError("");
      const [calendarResult, closureResult] = await Promise.all([
        supabase.from("calendar_days").select("*").gte("date", weekStart).lte("date", weekEnd),
        supabase.from("day_closures").select("*").gte("date", weekStart).lte("date", weekEnd),
      ]);
      if (cancelled) return;
      if (calendarResult.error || closureResult.error) {
        setMetadataError(calendarResult.error?.message ?? closureResult.error?.message ?? "The calendar data could not be loaded.");
      } else {
        setCalendarDays((calendarResult.data ?? []) as CalendarDayRecord[]);
        setClosures((closureResult.data ?? []) as DayClosureRecord[]);
      }
      setMetadataLoading(false);
    };
    void loadMetadata();
    return () => { cancelled = true; };
  }, [supabase, weekStart, weekEnd]);

  async function closeSelectedDay() {
    if (offline || !dataAvailable) {
      setOperationError("Connect to the internet before saving a day close snapshot.");
      return;
    }
    setClosingDay(true);
    setOperationError("");
    const now = new Date().toISOString();
    const snapshot = {
      user_id: userId,
      date: selectedDate,
      opening_balance_paisa: summary.openingBalance.toString(),
      received_paisa: summary.received.toString(),
      other_inflows_paisa: summary.otherInflows.toString(),
      expenses_paisa: summary.expenses.toString(),
      investment_purchases_paisa: summary.investmentPurchases.toString(),
      adjustments_paisa: summary.adjustmentsNet.toString(),
      closing_balance_paisa: summary.closingBalance.toString(),
      transaction_count: summary.transactionCount,
      closed_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase.from("day_closures")
      .upsert(snapshot, { onConflict: "user_id,date" })
      .select("*")
      .single();
    setClosingDay(false);
    if (error) {
      setOperationError(error.message);
      return;
    }
    const saved = data as DayClosureRecord;
    setClosures((previous) => [...previous.filter((item) => item.date !== saved.date), saved]);
    onToast("Day summary saved. You can still correct transactions later.");
  }

  function updateCalendarDay(record: CalendarDayRecord) {
    setCalendarDays((previous) => [...previous.filter((item) => item.date !== record.date), record]);
    onToast("Calendar day updated.");
  }

  return <>
    <section className="page-heading daily-page-heading">
      <div><p className="eyebrow">Daily ledger</p><h1>Daily money tracker<span className="heading-period">.</span></h1><p className="page-subtitle">Reconstruct each day, account by account, and carry every balance forward.</p></div>
      <div className="heading-actions">
        <Link href="/calendar" className="outline-button"><CalendarDays size={15} /> View Monthly Calendar</Link>
        <button type="button" className="outline-button refresh-button" onClick={onRefresh}><RefreshCw size={15} /> Refresh</button>
        <button type="button" className="primary-button" onClick={() => onAdd("expense")}><Plus size={17} /> Add purchase</button>
      </div>
    </section>

    {metadataError && <div className="error-banner"><X size={17} /><div><strong>Calendar and close-day records are unavailable</strong><span>{metadataError}. Apply the daily tracker migration to enable these records.</span></div></div>}
    {operationError && <div className="error-banner"><X size={17} /><div><strong>Couldn’t save this change</strong><span>{operationError}</span></div><button type="button" onClick={() => setOperationError("")}>Dismiss</button></div>}

    <section className="filter-row daily-filter-row" aria-label="Selected day">
      <div className="date-control"><CalendarDays size={16} /><label htmlFor="daily-selected-date">Selected date</label><input id="daily-selected-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></div>
      <button type="button" className="filter-hint" onClick={() => setSelectedDate(getPakistanDateKey(new Date()))}>Today</button>
      <span className="daily-selected-label">{getDateLabel(selectedDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
      {offline && <span className="offline-pill"><span />Offline mode</span>}
    </section>

    <section className="daily-week-grid" aria-label="Selected week, Monday to Sunday">
      {week.map((day) => {
        const calendarDay = calendarDays.find((item) => item.date === day.date);
        const isSelected = day.date === selectedDate;
        const hasClosure = closures.some((closure) => closure.date === day.date);
        return <button type="button" className={`daily-week-card ${isSelected ? "daily-week-selected" : ""}`} key={day.date} onClick={() => setSelectedDate(day.date)} aria-pressed={isSelected}>
          <span className="daily-week-top"><strong>{day.weekday}</strong><span>{Number(day.date.slice(-2))}</span></span>
          <span className="daily-week-label">{calendarDay?.label || (calendarDay?.is_holiday ? "Holiday" : calendarDay?.is_university_day ? "University" : "Schedule not set")}</span>
          <span className="daily-week-values"><span><i className="week-income-dot" />{formatCompactPkr(day.received)}</span><span><i className="week-expense-dot" />{formatCompactPkr(day.expenses)}</span></span>
          <span className="daily-week-bottom"><span>Balance</span><strong>{formatCompactPkr(day.closingBalance)}</strong>{hasClosure && <span className="closed-dot" title="Day snapshot saved" />}</span>
        </button>;
      })}
    </section>

    {/* 10-item Daily Summary */}
    <section className="metric-grid-5" aria-label="Selected day cash flow summary">
      <MetricCard icon={CalendarDays} label="1. Date & Day" value={`${summary.dayName}`} tone="blue" hint={selectedDate} compact />
      <MetricCard icon={Wallet} label="2. Opening Balance" value={dataAvailable ? formatPkr(summary.openingBalance) : "—"} tone="blue" hint="Carried forward balance" compact />
      <MetricCard icon={ArrowUpRight} label="3. Received Today" value={dataAvailable ? formatPkr(summary.received + summary.otherInflows) : "—"} tone="green" hint="Income, allowance & inflows" compact />
      <MetricCard icon={CircleDollarSign} label="4. Available Money" value={dataAvailable ? formatPkr(summary.totalAvailable) : "—"} tone="teal" hint="Opening + received" compact />
      <MetricCard icon={ArrowDownRight} label="5. Total Spent" value={dataAvailable ? formatPkr(summary.expenses + summary.investmentPurchases) : "—"} tone="rose" hint="Purchases & investments" compact />
    </section>

    <section className="metric-grid-5" aria-label="Closing, savings and transfers">
      <MetricCard icon={ArrowLeftRight} label="6. Total Transfers" value={dataAvailable ? formatPkr(summary.transfers) : "—"} tone="slate" hint="No effect on net cash flow" compact />
      <MetricCard icon={PiggyBank} label="7. Closing Balance" value={dataAvailable ? formatPkr(summary.closingBalance) : "—"} tone="violet" hint="Available minus spent" compact />
      <MetricCard icon={TrendingUp} label="8. Daily Savings" value={dataAvailable ? formatPkr(summary.dailySavings) : "—"} tone={summary.dailySavings >= 0n ? "mint" : "rose"} hint="Received minus spent" compact />
      <MetricCard icon={Clock3} label="9. Transactions" value={dataAvailable ? `${summary.transactionCount} entries` : "—"} tone="slate" hint="Count of day records" compact />
      <MetricCard icon={Landmark} label="10. Liquid Accounts" value={dataAvailable ? formatPkr(accounts.reduce((tot, acc) => tot + calculateAccountBalance(acc, dayTransactions), 0n)) : "—"} tone="amber" hint="Wallet, cash & bank total" compact />
    </section>

    {/* End-of-Day Financial Report */}
    <section className="eod-report-card">
      <div className="eod-report-header">
        <h3><Activity size={16} /> End-of-Day Financial Report · {summary.dayName}, {selectedDate}</h3>
        <span className="daily-count-pill">{summary.transactionCount} {summary.transactionCount === 1 ? "transaction" : "transactions"}</span>
      </div>
      <div className="eod-report-grid">
        <div className="eod-report-item">
          <span>1. Starting Balance</span>
          <strong>{dataAvailable ? formatPkr(summary.openingBalance) : "—"}</strong>
        </div>
        <div className="eod-report-item highlight-green">
          <span>2. Money Received</span>
          <strong>{dataAvailable ? `+${formatPkr(summary.received + summary.otherInflows)}` : "—"}</strong>
        </div>
        <div className="eod-report-item">
          <span>3. Individual Purchases</span>
          <strong>{dayTransactions.filter((t) => t.transaction_type === "expense").length} recorded</strong>
        </div>
        <div className="eod-report-item highlight-rose">
          <span>4. Total Expenses</span>
          <strong>{dataAvailable ? `−${formatPkr(summary.expenses)}` : "—"}</strong>
        </div>
        <div className="eod-report-item highlight-blue">
          <span>5. Remaining Balance</span>
          <strong>{dataAvailable ? formatPkr(summary.closingBalance) : "—"}</strong>
        </div>
        <div className="eod-report-item highlight-green">
          <span>6. Savings for Day</span>
          <strong>{dataAvailable ? formatPkr(summary.dailySavings) : "—"}</strong>
        </div>
      </div>
      <div className="eod-report-note">
        <LockKeyhole size={13} />
        <span>Formula: Opening Balance + Actual Money Received − Actual Expenses = Closing Balance. Transfers between accounts never count as income or expense. You can correct past transactions at any time.</span>
      </div>
    </section>

    <section className="daily-grid-main">
      <article className="panel daily-ledger-panel">
        <div className="panel-heading"><div><p className="panel-kicker">Reconciled ledger</p><h2>{getDateLabel(selectedDate, { weekday: "long", month: "long", day: "numeric" })}</h2></div><span className="daily-count-pill">{summary.transactionCount} {summary.transactionCount === 1 ? "entry" : "entries"}</span></div>
        <div className="daily-movement-rows">
          <div className="daily-movement-row"><span>Opening balance</span><strong>{dataAvailable ? formatPkr(summary.openingBalance) : "—"}</strong></div>
          <div className="daily-movement-row movement-positive"><span>Money received</span><strong>{dataAvailable ? `+${formatPkr(summary.received)}` : "—"}</strong></div>
          {summary.otherInflows > 0n && <div className="daily-movement-row movement-neutral"><span>Refunds & sale proceeds</span><strong>+{formatPkr(summary.otherInflows)}</strong></div>}
          <div className="daily-movement-row movement-negative"><span>Expenses</span><strong>{dataAvailable ? `−${formatPkr(summary.expenses)}` : "—"}</strong></div>
          {summary.investmentPurchases > 0n && <div className="daily-movement-row movement-investment"><span>Investment purchases</span><strong>−{formatPkr(summary.investmentPurchases)}</strong></div>}
          {summary.adjustmentsNet !== 0n && <div className="daily-movement-row movement-neutral"><span>Adjustments</span><strong>{formatPkr(summary.adjustmentsNet)}</strong></div>}
          <div className="daily-reconciliation-note"><LockKeyhole size={14} /><span>Transfers between your accounts do not change your total balance or count as income or expenses.</span></div>
          <div className="daily-closing-row"><span>Closing balance</span><strong>{dataAvailable ? formatPkr(summary.closingBalance) : "—"}</strong></div>
        </div>
        <div className="daily-ledger-actions">
          <button type="button" className="quick-action quick-income" onClick={() => onAdd("income")}><ArrowUpRight size={15} /> Add income</button>
          <button type="button" className="quick-action quick-expense" onClick={() => onAdd("expense")}><ShoppingBag size={14} /> Add purchase</button>
          <button type="button" className="quick-action quick-transfer" onClick={() => onAdd("transfer")}><ArrowLeftRight size={15} /> Transfer</button>
          <button type="button" className="quick-action quick-transfer" onClick={() => onAdd("refund")}><RefreshCw size={14} /> Refund</button>
        </div>

        <div className="preset-chips-wrap">
          <span className="preset-chips-label">Quick purchase presets:</span>
          <div className="preset-chips">
            {EXPENSE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="preset-chip"
                onClick={() => onAdd("expense", { description: p.name, category: p.category })}
              >
                + {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="preset-chips-wrap">
          <span className="preset-chips-label">Quick income sources:</span>
          <div className="preset-chips">
            {INCOME_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="preset-chip"
                onClick={() => onAdd("income", { description: p.name, category: p.category })}
              >
                + {p.label}
              </button>
            ))}
          </div>
        </div>
      </article>

      <div className="daily-side-panels">
        <ScheduleEditor
          key={`${selectedDate}-${selectedCalendarDay?.is_university_day ?? false}-${selectedCalendarDay?.is_holiday ?? false}-${selectedCalendarDay?.label ?? ""}`}
          userId={userId}
          date={selectedDate}
          record={selectedCalendarDay}
          supabase={supabase}
          offline={offline}
          onSaved={updateCalendarDay}
          onError={setOperationError}
        />
        <article className="panel day-close-panel">
          <div className="panel-heading"><div><p className="panel-kicker">End of day</p><h2>{selectedClosure ? "Snapshot saved" : "Close this day"}</h2></div><div className={`closure-state ${selectedClosure ? "closure-saved" : ""}`}><span />{selectedClosure ? "Closed" : "Open"}</div></div>
          <div className="closure-copy">{selectedClosure
            ? <>Saved {new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(selectedClosure.closed_at))}. Later edits remain allowed.</>
            : "Save a point-in-time summary. You can still correct or add transactions after closing."}</div>
          {closureChanged && <div className="closure-changed"><RefreshCw size={13} /> Transactions changed after this snapshot.</div>}
          <button type="button" className="outline-button close-day-button" onClick={() => void closeSelectedDay()} disabled={closingDay || !dataAvailable || offline || metadataLoading}>{closingDay ? "Saving snapshot…" : selectedClosure ? "Update day snapshot" : "Close day"}</button>
        </article>
      </div>
    </section>

    <section className="panel daily-transactions-panel">
      <div className="panel-heading"><div><p className="panel-kicker">Complete day history</p><h2>Entries for {getDateLabel(selectedDate, { month: "long", day: "numeric" })}</h2></div><span className="daily-count-pill">{dayTransactions.length} {dayTransactions.length === 1 ? "transaction" : "transactions"}</span></div>
      {dayTransactions.length ? <div className="daily-table-wrap"><table className="daily-table"><thead><tr><th>Time</th><th>Description</th><th>Account</th><th>Type</th><th className="numeric-column">Amount</th><th>Actions</th></tr></thead><tbody>{dayTransactions.map((transaction) => <DailyTransactionRow key={transaction.id} transaction={transaction} accounts={accounts} onEdit={() => onEdit(transaction)} onDelete={() => onDelete(transaction)} />)}</tbody></table></div>
        : <div className="empty-daily-transactions"><div className="empty-activity-icon"><Clock3 size={18} /></div><strong>{dataAvailable ? "No entries for this date" : "Ledger data is unavailable"}</strong><span>{dataAvailable ? "Zero-income days are valid. Add an entry only when money actually moves." : "Reconnect to load a saved ledger or try refreshing."}</span>{dataAvailable && <button type="button" className="text-action" onClick={() => onAdd("income")}>Add the first entry <ArrowRight size={14} /></button>}</div>}
      {metadataLoading && <div className="metadata-loading"><span className="loading-spinner" /> Loading calendar notes…</div>}
    </section>

    <footer className="dashboard-footer"><span>Opening balances are carried forward, not recorded as income.</span><span><LockKeyhole size={13} /> Corrections are kept in the transaction audit trail.</span></footer>
  </>;
}

function ScheduleEditor({ userId, date, record, supabase, offline, onSaved, onError }: {
  userId: string;
  date: string;
  record: CalendarDayRecord | null;
  supabase: SupabaseClient;
  offline: boolean;
  onSaved: (record: CalendarDayRecord) => void;
  onError: (message: string) => void;
}) {
  const [universityDay, setUniversityDay] = useState(record?.is_university_day ?? false);
  const [holiday, setHoliday] = useState(record?.is_holiday ?? false);
  const [label, setLabel] = useState(record?.label ?? "");
  const [busy, setBusy] = useState(false);

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (offline) {
      onError("Connect to the internet before changing the university calendar.");
      return;
    }
    setBusy(true);
    onError("");
    const timestamp = new Date().toISOString();
    const { data, error } = await supabase.from("calendar_days").upsert({
      user_id: userId,
      date,
      is_university_day: universityDay,
      is_holiday: holiday,
      label: label.trim() || null,
      updated_at: timestamp,
    }, { onConflict: "user_id,date" }).select("*").single();
    setBusy(false);
    if (error) {
      onError(error.message);
      return;
    }
    onSaved(data as CalendarDayRecord);
  }

  return <article className="panel schedule-panel">
    <div className="panel-heading"><div><p className="panel-kicker">University calendar</p><h2>Day schedule</h2></div><CalendarDays size={17} className="schedule-heading-icon" /></div>
    <form className="schedule-form" onSubmit={(event) => void saveSchedule(event)}>
      <label className="schedule-check"><input type="checkbox" checked={universityDay} onChange={(event) => setUniversityDay(event.target.checked)} /><span>University day</span></label>
      <label className="schedule-check"><input type="checkbox" checked={holiday} onChange={(event) => setHoliday(event.target.checked)} /><span>Holiday / university closed</span></label>
      <label htmlFor="calendar-label">Note <span className="optional-label">Optional</span></label>
      <input id="calendar-label" maxLength={100} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Semester break" />
      <button type="submit" className="outline-button schedule-save" disabled={busy || offline}>{busy ? "Saving…" : "Save day schedule"}</button>
    </form>
  </article>;
}

function DailyTransactionRow({ transaction, accounts, onEdit, onDelete }: {
  transaction: FinanceTransaction;
  accounts: FinanceAccount[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const source = accounts.find((account) => account.id === transaction.account_id)?.name ?? "Unknown account";
  const destination = transaction.transfer_to_account_id ? accounts.find((account) => account.id === transaction.transfer_to_account_id)?.name : null;
  const incoming = transaction.transaction_type === "income" || transaction.transaction_type === "refund" || transaction.transaction_type === "dividend" || transaction.transaction_type === "investment_sale";
  const amountPrefix = transaction.transaction_type === "transfer" ? "" : incoming ? "+" : "−";
  const time = new Intl.DateTimeFormat("en-PK", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" }).format(new Date(transaction.occurred_at));
  return <tr>
    <td className="daily-time-cell">{time}</td>
    <td><div className="daily-description-cell"><strong>{transaction.description}</strong><span>{transaction.category || "Uncategorized"}{transaction.notes ? ` · ${transaction.notes}` : ""}</span></div></td>
    <td><span className="daily-account-cell">{source}{destination ? ` → ${destination}` : ""}</span></td>
    <td><span className={`transaction-type-pill type-${transaction.transaction_type}`}>{transactionKindLabel(transaction.transaction_type)}</span></td>
    <td className={`numeric-column daily-amount-cell ${incoming ? "amount-incoming" : ""}`}>{amountPrefix}{formatPkr(transaction.amount_paisa)}</td>
    <td><div className="daily-row-actions"><button type="button" className="icon-button row-edit-button" aria-label={`Edit ${transaction.description}`} onClick={onEdit}><Pencil size={14} /></button><button type="button" className="icon-button row-delete-button" aria-label={`Delete ${transaction.description}`} onClick={onDelete}><Trash2 size={14} /></button></div></td>
  </tr>;
}

function transactionKindLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    refund: "Refund",
    investment_purchase: "Investment purchase",
    investment_sale: "Investment sale",
    dividend: "Dividend",
    adjustment: "Adjustment",
  };
  return labels[type];
}

function toPaisaInput(value: string | number | bigint): string {
  const paisa = BigInt(value);
  const rupees = paisa / 100n;
  const fraction = (paisa % 100n).toString().padStart(2, "0");
  return `${rupees.toString()}.${fraction}`;
}

function timeInPakistan(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Karachi" }).format(new Date(value));
}

function TransactionCorrectionDialog({ transaction, accounts, userId, supabase, onClose, onSaved }: {
  transaction: FinanceTransaction;
  accounts: FinanceAccount[];
  userId: string;
  supabase: SupabaseClient;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(toPaisaInput(transaction.amount_paisa));
  const [category, setCategory] = useState(transaction.category ?? "");
  const [accountId, setAccountId] = useState(transaction.account_id);
  const [destinationId, setDestinationId] = useState(transaction.transfer_to_account_id ?? "");
  const [date, setDate] = useState(getPakistanDateKey(transaction.occurred_at));
  const [time, setTime] = useState(timeInPakistan(transaction.occurred_at));
  const [notes, setNotes] = useState(transaction.notes ?? "");
  const [direction, setDirection] = useState(transaction.direction);
  const [expenseClassification, setExpenseClassification] = useState(transaction.expense_classification ?? "essential");
  const [quantity, setQuantity] = useState(transaction.quantity == null ? "" : String(transaction.quantity));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!navigator.onLine) {
      setError("Connect to the internet before correcting an entry. Your audit trail must be saved with the correction.");
      return;
    }
    if (transaction.transaction_type === "transfer" && (!destinationId || destinationId === accountId)) {
      setError("Choose two different accounts for the transfer.");
      return;
    }
    if (transaction.transaction_type === "expense" && quantity.trim() && (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/.test(quantity.trim()) || Number(quantity) <= 0)) {
      setError("Enter a valid quantity greater than zero, with up to three decimal places.");
      return;
    }
    let amountPaisa: bigint;
    try {
      amountPaisa = parseRupeesToPaisa(amount);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enter a valid amount.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.from("transactions").update({
      description: description.trim(),
      amount_paisa: amountPaisa.toString(),
      category: category.trim() || null,
      account_id: accountId,
      transfer_to_account_id: transaction.transaction_type === "transfer" ? destinationId : null,
      occurred_at: localDateTimeIso(date, time),
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
      direction: transaction.transaction_type === "adjustment" ? direction : transaction.direction,
      expense_classification: transaction.transaction_type === "expense" ? expenseClassification : transaction.expense_classification ?? null,
      quantity: transaction.transaction_type === "expense" ? quantity.trim() || null : transaction.quantity ?? null,
    }).eq("id", transaction.id).eq("user_id", userId);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved("Transaction corrected. The audit trail records the change.");
  }

  return <Modal title="Correct transaction" subtitle={`${transactionKindLabel(transaction.transaction_type)} · balance totals recalculate from the ledger`} onClose={onClose}>
    <form className="entry-form" onSubmit={(event) => void handleSubmit(event)}>
      <label htmlFor="edit-description">Description</label><input id="edit-description" required maxLength={160} value={description} onChange={(event) => setDescription(event.target.value)} />
      <div className="form-two-columns"><div><label htmlFor="edit-amount">Amount (PKR)</label><div className="rupee-input"><span>Rs</span><input id="edit-amount" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} /></div></div><div><label htmlFor="edit-category">Category</label><input id="edit-category" maxLength={80} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Optional" /></div></div>
      <div className="form-two-columns"><div><label htmlFor="edit-account">{transaction.transaction_type === "transfer" ? "From account" : "Account"}</label><select id="edit-account" required value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>{transaction.transaction_type === "transfer" && <div><label htmlFor="edit-destination">To account</label><select id="edit-destination" required value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>{accounts.filter((account) => account.id !== accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>}</div>
      {transaction.transaction_type === "adjustment" && <label htmlFor="edit-adjustment-direction">Balance change<select id="edit-adjustment-direction" value={direction} onChange={(event) => setDirection(event.target.value as "inflow" | "outflow")}><option value="inflow">Increase account balance</option><option value="outflow">Decrease account balance</option></select></label>}
      {transaction.transaction_type === "expense" && <div className="form-two-columns"><div><label htmlFor="edit-expense-classification">Classification</label><select id="edit-expense-classification" value={expenseClassification} onChange={(event) => setExpenseClassification(event.target.value)}><option value="essential">Essential</option><option value="non_essential">Non-essential</option><option value="occasional">Occasional</option><option value="emergency">Emergency</option><option value="optional">Optional</option></select></div><div><label htmlFor="edit-expense-quantity">Quantity <span className="optional-label">Optional</span></label><input id="edit-expense-quantity" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div></div>}
      <div className="form-two-columns"><div><label htmlFor="edit-date">Date</label><input id="edit-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></div><div><label htmlFor="edit-time">Time</label><input id="edit-time" type="time" required value={time} onChange={(event) => setTime(event.target.value)} /></div></div>
      <label htmlFor="edit-notes">Notes <span className="optional-label">Optional</span></label><textarea id="edit-notes" maxLength={2000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
      {error && <p className="form-alert error" role="alert">{error}</p>}
      <div className="dialog-footnote"><LockKeyhole size={14} /><span>This change is added to the transaction audit trail.</span></div>
      <div className="dialog-actions"><button type="button" className="outline-button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving correction…" : "Save correction"}</button></div>
    </form>
  </Modal>;
}

function DeleteTransactionDialog({ transaction, userId, supabase, onClose, onDeleted }: {
  transaction: FinanceTransaction;
  userId: string;
  supabase: SupabaseClient;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!navigator.onLine) {
      setError("Connect to the internet before deleting an entry so the correction is recorded in the audit trail.");
      return;
    }
    setBusy(true);
    setError("");
    const now = new Date().toISOString();
    const { error: deleteError } = await supabase.from("transactions").update({ deleted_at: now, updated_at: now }).eq("id", transaction.id).eq("user_id", userId);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onDeleted("Transaction removed from current totals. Its deletion remains in the audit trail.");
  }

  return <Modal title="Remove this transaction?" subtitle="This entry will be removed from balance calculations and kept as an audited correction." onClose={onClose}>
    <div className="delete-confirm-body"><div className="delete-confirm-icon"><Trash2 size={19} /></div><div><strong>{transaction.description}</strong><span>{transactionKindLabel(transaction.transaction_type)} · {formatPkr(transaction.amount_paisa)}</span></div></div>
    {error && <p className="form-alert error delete-error" role="alert">{error}</p>}
    <div className="dialog-actions delete-dialog-actions"><button type="button" className="outline-button" onClick={onClose} disabled={busy}>Keep transaction</button><button type="button" className="danger-button" onClick={() => void handleDelete()} disabled={busy}>{busy ? "Recording correction…" : "Remove transaction"}</button></div>
  </Modal>;
}
