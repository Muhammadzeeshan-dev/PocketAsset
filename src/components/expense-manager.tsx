"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowDownRight, CalendarDays, Check, ChevronDown, ChevronUp, Clock3, CreditCard, Info, Plus, RefreshCw, Repeat2, Search, ShoppingBag, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import {
  addDaysToDateKey,
  formatPkr,
  getDateLabel,
  getMonthlySummary,
  getMonthlyTrend,
  getPakistanDateKey,
  getWeeklySummary,
  paisaToChartNumber,
  parseRupeesToPaisa,
  type FinanceAccount,
  type FinanceTransaction,
} from "@/lib/finance";
import { nextRecurrenceDate, type RecurrenceUnit } from "@/lib/recurrence";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ExpenseClassification = "essential" | "non_essential" | "occasional" | "emergency" | "optional";
type RecurringExpense = {
  id: string;
  user_id: string;
  account_id: string;
  description: string;
  category: string | null;
  amount_paisa: string;
  expense_classification: ExpenseClassification;
  quantity: string | null;
  interval_unit: RecurrenceUnit;
  interval_count: number;
  next_due_date: string;
  end_date: string | null;
  active: boolean;
};

const EXPENSE_CATEGORIES = ["Food", "Transport", "Drinks", "Clothes", "Shoes", "Perfume", "Personal care", "Entertainment", "Mobile package", "Education", "Medical", "Bus", "Rickshaw", "Lunch", "Snacks", "Stationery", "Printing", "Books", "Groceries", "Cleaning", "Electricity", "Gas", "Internet", "Household supplies", "Repairs", "Family purchases", "Other"];
const CLASSIFICATIONS: ExpenseClassification[] = ["essential", "non_essential", "occasional", "emergency", "optional"];

export function ExpenseManager({
  userId,
  supabase,
  accounts,
  transactions,
  selectedDate,
  setSelectedDate,
  dataAvailable,
  refreshing,
  offline,
  onRefresh,
  onAdd,
}: {
  userId: string;
  supabase: SupabaseClient;
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  dataAvailable: boolean;
  refreshing: boolean;
  offline: boolean;
  onRefresh: () => void;
  onAdd: () => void;
}) {
  const today = getPakistanDateKey(new Date());
  const [monthKey, setMonthKey] = useState(today.slice(0, 7));
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [scheduleRows, setScheduleRows] = useState<RecurringExpense[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [recordingId, setRecordingId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [classification, setClassification] = useState<ExpenseClassification>("essential");
  const [quantity, setQuantity] = useState("");
  const [intervalUnit, setIntervalUnit] = useState<RecurrenceUnit>("monthly");
  const [intervalCount, setIntervalCount] = useState("1");
  const [nextDueDate, setNextDueDate] = useState(today);
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadSchedules() {
      const { data, error } = await supabase.from("recurring_expense_schedules").select("*").order("next_due_date", { ascending: true });
      if (cancelled) return;
      if (error) setScheduleError(`${error.message}. Apply the expense migration to enable recurring schedules.`);
      else setScheduleRows((data ?? []) as RecurringExpense[]);
      setScheduleLoading(false);
    }
    void loadSchedules();
    return () => { cancelled = true; };
  }, [supabase]);

  const monthSummary = getMonthlySummary(monthKey, transactions);
  const weekRows = getWeeklySummary(selectedDate, accounts, transactions);
  const weekExpenses = weekRows.reduce((sum, day) => sum + day.expenses, 0n);
  const monthDayCount = getMonthDayCount(monthKey, today);
  const currentMonthTransactions = transactions.filter((transaction) => !transaction.deleted_at && transaction.transaction_type === "expense" && getPakistanDateKey(transaction.occurred_at).startsWith(monthKey));
  const filteredExpenses = currentMonthTransactions.filter((transaction) => {
    if (categoryFilter !== "all" && (transaction.category?.trim() || "Uncategorized") !== categoryFilter) return false;
    if (classificationFilter !== "all" && transaction.expense_classification !== classificationFilter) return false;
    const query = search.trim().toLocaleLowerCase();
    const rupeeAmount = (Number(BigInt(transaction.amount_paisa)) / 100).toFixed(2);
    return !query || [transaction.description, transaction.category, transaction.notes, rupeeAmount, transaction.expense_classification]
      .some((value) => String(value ?? "").toLocaleLowerCase().includes(query));
  }).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  const unexpectedTotal = currentMonthTransactions.reduce((sum, transaction) => transaction.expense_classification === "emergency" || transaction.expense_classification === "occasional" ? sum + BigInt(transaction.amount_paisa) : sum, 0n);
  const topCategory = monthSummary.expenseCategories[0] ?? null;
  const chartRows = getMonthlyTrend(monthKey, transactions, 6).map((month) => ({
    month: getDateLabel(`${month.month}-01`, { month: "short" }),
    amount: paisaToChartNumber(month.expenses),
  }));
  const expenseCategories = [...new Set(transactions.filter((transaction) => transaction.transaction_type === "expense").map((transaction) => transaction.category?.trim() || "Uncategorized"))].sort();

  const previousMonth = previousMonthKey(monthKey);
  const comparisonDays = monthDayCount || 0;
  const previousMonthEnd = comparisonDays ? addDaysToDateKey(`${previousMonth}-01`, Math.min(comparisonDays, daysInMonth(previousMonth)) - 1) : "";
  const previousCategoryTotals = categoryTotals(transactions.filter((transaction) => !transaction.deleted_at && transaction.transaction_type === "expense" && getPakistanDateKey(transaction.occurred_at).startsWith(previousMonth) && (!previousMonthEnd || getPakistanDateKey(transaction.occurred_at) <= previousMonthEnd)));
  const currentCategoryTotals = categoryTotals(currentMonthTransactions.filter((transaction) => !comparisonDays || getPakistanDateKey(transaction.occurred_at) <= `${monthKey}-${String(comparisonDays).padStart(2, "0")}`));
  const spendingChanges = [...currentCategoryTotals.entries()].map(([name, current]) => ({ name, current, previous: previousCategoryTotals.get(name) ?? 0n }))
    .filter((entry) => entry.current > entry.previous)
    .sort((left, right) => left.current - left.previous > right.current - right.previous ? -1 : 1)
    .slice(0, 4);
  const thisWeekNonEssential = transactions.filter((transaction) => !transaction.deleted_at && transaction.transaction_type === "expense" && transaction.expense_classification === "non_essential" && getPakistanDateKey(transaction.occurred_at) >= weekRows[0]?.date && getPakistanDateKey(transaction.occurred_at) <= weekRows[6]?.date);

  async function createRecurringSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScheduleError("");
    setFeedback("");
    if (offline) { setScheduleError("Connect to the internet before creating a recurring schedule."); return; }
    if (!accountId) { setScheduleError("Create a spending account first."); return; }
    let amountPaisa: bigint;
    try { amountPaisa = parseRupeesToPaisa(amount); }
    catch (caught) { setScheduleError(caught instanceof Error ? caught.message : "Enter a valid amount."); return; }
    if (quantity.trim() && (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/.test(quantity.trim()) || Number(quantity) <= 0)) {
      setScheduleError("Enter a valid quantity with up to three decimal places."); return;
    }
    const count = Number(intervalCount);
    if (!Number.isInteger(count) || count < 1 || count > 12) { setScheduleError("Choose a repeat interval from 1 to 12."); return; }
    if (endDate && endDate < nextDueDate) { setScheduleError("End date must be on or after the next due date."); return; }
    setSavingSchedule(true);
    const { data, error } = await supabase.from("recurring_expense_schedules").insert({
      user_id: userId,
      account_id: accountId,
      description: description.trim(),
      category: category || null,
      amount_paisa: amountPaisa.toString(),
      expense_classification: classification,
      quantity: quantity.trim() || null,
      interval_unit: intervalUnit,
      interval_count: count,
      next_due_date: nextDueDate,
      end_date: endDate || null,
      active: true,
    }).select("*").single();
    setSavingSchedule(false);
    if (error) { setScheduleError(error.message); return; }
    setScheduleRows((previous) => [...previous, data as RecurringExpense].sort((a, b) => a.next_due_date.localeCompare(b.next_due_date)));
    setFormOpen(false);
    setDescription(""); setAmount(""); setQuantity(""); setEndDate("");
    setFeedback("Recurring schedule saved. Future charges require your confirmation before they enter the ledger.");
  }

  async function recordOccurrence(schedule: RecurringExpense) {
    if (offline) { setScheduleError("Connect to the internet before confirming a scheduled expense."); return; }
    setRecordingId(schedule.id);
    setScheduleError(""); setFeedback("");
    const occurredAt = new Date(`${schedule.next_due_date}T12:00:00+05:00`).toISOString();
    const transaction: FinanceTransaction = {
      id: crypto.randomUUID(), user_id: userId, account_id: schedule.account_id, transfer_to_account_id: null,
      transaction_type: "expense", amount_paisa: schedule.amount_paisa, direction: "outflow", category: schedule.category,
      description: schedule.description, notes: "Confirmed from recurring expense schedule.", occurred_at: occurredAt,
      expense_classification: schedule.expense_classification, quantity: schedule.quantity,
      recurring_expense_id: schedule.id, recurring_occurrence_date: schedule.next_due_date,
    };
    const { error: insertError } = await supabase.from("transactions").insert(transaction);
    if (insertError && insertError.code !== "23505") {
      setRecordingId(""); setScheduleError(insertError.message); return;
    }
    let nextDate: string;
    try { nextDate = nextRecurrenceDate(schedule.next_due_date, schedule.interval_unit, schedule.interval_count); }
    catch (caught) { setRecordingId(""); setScheduleError(caught instanceof Error ? caught.message : "The next date could not be calculated."); return; }
    const stillActive = !schedule.end_date || nextDate <= schedule.end_date;
    const { error: updateError } = await supabase.from("recurring_expense_schedules").update({
      next_due_date: nextDate,
      active: stillActive,
      updated_at: new Date().toISOString(),
    }).eq("id", schedule.id).eq("user_id", userId);
    setRecordingId("");
    if (updateError) { setScheduleError(`Expense was recorded, but the schedule could not advance: ${updateError.message}`); return; }
    setScheduleRows((previous) => previous.map((item) => item.id === schedule.id ? { ...item, next_due_date: nextDate, active: stillActive } : item));
    setFeedback(insertError ? "This occurrence was already recorded; the next date has been advanced." : "Scheduled expense recorded in the ledger.");
    onRefresh();
  }

  async function toggleSchedule(schedule: RecurringExpense) {
    const { error } = await supabase.from("recurring_expense_schedules").update({ active: !schedule.active, updated_at: new Date().toISOString() }).eq("id", schedule.id).eq("user_id", userId);
    if (error) { setScheduleError(error.message); return; }
    setScheduleRows((previous) => previous.map((item) => item.id === schedule.id ? { ...item, active: !item.active } : item));
  }

  return <>
    <section className="page-heading module-page-heading">
      <div><p className="eyebrow">Actual spending</p><h1>Expense manager<span className="heading-period">.</span></h1><p className="page-subtitle">See what you spent, what changed, and which items were planned or unexpected.</p></div>
      <div className="heading-actions"><button type="button" className="outline-button refresh-button" onClick={onRefresh} disabled={refreshing}><RefreshCw size={14} className={refreshing ? "spin" : ""} /> Refresh</button><button type="button" className="primary-button" onClick={onAdd}><Plus size={16} /> Record expense</button></div>
    </section>

    {scheduleError && <div className="error-banner"><X size={16} /><div><strong>Expense schedule action failed</strong><span>{scheduleError}</span></div><button type="button" onClick={() => setScheduleError("")}>Dismiss</button></div>}
    {feedback && <div className="expense-feedback"><Check size={14} />{feedback}<button type="button" aria-label="Dismiss message" onClick={() => setFeedback("")}><X size={13} /></button></div>}

    <section className="filter-row expense-month-filter" aria-label="Expense reporting period"><div className="date-control"><CalendarDays size={15} /><label htmlFor="expense-month">Reporting month</label><input id="expense-month" type="month" value={monthKey} max={today.slice(0, 7)} onChange={(event) => setMonthKey(event.target.value)} /></div><div className="date-control"><span className="month-icon">◷</span><label htmlFor="expense-week">Weekly report</label><input id="expense-week" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></div><span className="expense-month-note">Transactions are counted by Pakistan local date.</span></section>

    <section className="expense-metrics-grid" aria-label="Expense summary">
      <ExpenseMetric icon={Wallet} label="Monthly expenses" value={dataAvailable ? formatPkr(monthSummary.expenses) : "—"} detail={getDateLabel(`${monthKey}-01`, { month: "long", year: "numeric" })} tone="rose" />
      <ExpenseMetric icon={CalendarDays} label="This week" value={dataAvailable ? formatPkr(weekExpenses) : "—"} detail="Monday through Sunday" tone="amber" />
      <ExpenseMetric icon={TrendingDown} label="Average per day" value={dataAvailable ? formatPkr(monthDayCount ? monthSummary.expenses / BigInt(monthDayCount) : 0n) : "—"} detail={`Across ${monthDayCount} calendar days`} tone="blue" />
      <ExpenseMetric icon={ShoppingBag} label="Occasional & emergency" value={dataAvailable ? formatPkr(unexpectedTotal) : "—"} detail="Classified expenses this month" tone="violet" />
    </section>

    <section className="expense-primary-grid">
      <article className="panel expense-chart-panel">
        <div className="panel-heading"><div><p className="panel-kicker">Recorded totals</p><h2>Expense trend</h2></div><span className="daily-count-pill">Six completed months</span></div>
        {dataAvailable && chartRows.some((row) => row.amount > 0) ? <div className="chart-area expense-trend-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f4" strokeDasharray="3 4" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8a94a4", fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8a94a4", fontSize: 9 }} tickFormatter={compactRupees} /><Tooltip content={<ExpenseChartTooltip />} cursor={{ fill: "#f5f7fa" }} /><Bar dataKey="amount" name="Expenses" fill="#e7a44b" radius={[4, 4, 0, 0]} maxBarSize={28} /></BarChart></ResponsiveContainer></div> : <div className="expense-chart-empty"><TrendingUp size={17} /><strong>{dataAvailable ? "No expense trend yet" : "Ledger data is unavailable"}</strong><span>{dataAvailable ? "Recorded expenses will appear when you add them." : "Refresh after reconnecting to load saved activity."}</span></div>}
      </article>
      <article className="panel expense-category-panel">
        <div className="panel-heading"><div><p className="panel-kicker">Category breakdown</p><h2>Top spending</h2></div><span className="daily-count-pill">{monthSummary.expenseCategories.length} categories</span></div>
        {topCategory ? <div className="expense-top-category"><span>{topCategory.category}</span><strong>{formatPkr(topCategory.amount)}</strong><div className="expense-category-bars">{monthSummary.expenseCategories.slice(0, 6).map((item) => <div key={item.category}><span>{item.category}</span><div><i style={{ width: `${Number(item.amount * 10000n / topCategory.amount) / 100}%` }} /></div><strong>{formatPkr(item.amount)}</strong></div>)}</div></div> : <div className="expense-chart-empty"><ShoppingBag size={17} /><strong>No expenses this month</strong><span>Only confirmed purchases are counted.</span></div>}
      </article>
    </section>

    <section className="expense-insights-grid">
      <article className="panel expense-insights-panel">
        <div className="panel-heading"><div><p className="panel-kicker">Based on your ledger</p><h2>Spending signals</h2></div><Info size={16} className="expense-info-icon" /></div>
        {spendingChanges.length || thisWeekNonEssential.length >= 3 ? <div className="expense-signal-list">
          {spendingChanges.map((change) => <div className="expense-signal" key={change.name}><span className="signal-dot signal-up" /><p>{change.previous === 0n ? <>Recorded <strong>{change.name}</strong> spending this month; none was recorded during the same dates last month.</> : <><strong>{change.name}</strong> spending is up <strong>{formatPkr(change.current - change.previous)}</strong> compared with the same dates last month.</>}</p></div>)}
          {thisWeekNonEssential.length >= 3 && <div className="expense-signal"><span className="signal-dot signal-neutral" /><p>You recorded <strong>{thisWeekNonEssential.length}</strong> non-essential expenses this week.</p></div>}
        </div> : <div className="expense-no-signals"><Check size={15} /><span>No spending changes to flag from the selected records.</span></div>}
        <small className="expense-signal-footnote">Signals compare recorded transactions only and do not infer intent.</small>
      </article>
      <article className="panel recurring-expense-panel">
        <div className="panel-heading"><div><p className="panel-kicker">User confirmed</p><h2>Recurring expenses</h2></div><button type="button" className="outline-button recurring-add-button" onClick={() => setFormOpen((open) => !open)}><Plus size={13} /> Add schedule</button></div>
        <p className="recurring-explainer">A schedule is a reminder, not an automatic expense. Confirm each occurrence before it affects your balance.</p>
        {formOpen && <form className="recurring-expense-form" onSubmit={(event) => void createRecurringSchedule(event)}>
          <label htmlFor="recurring-description">Description</label><input id="recurring-description" required maxLength={160} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Monthly internet bill" />
          <div className="form-two-columns"><div><label htmlFor="recurring-amount">Amount (PKR)</label><div className="rupee-input"><span>Rs</span><input id="recurring-amount" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} /></div></div><div><label htmlFor="recurring-category">Category</label><select id="recurring-category" value={category} onChange={(event) => setCategory(event.target.value)}>{EXPENSE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div>
          <div className="form-two-columns"><div><label htmlFor="recurring-account">Payment account</label><select id="recurring-account" required value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div><div><label htmlFor="recurring-classification">Classification</label><select id="recurring-classification" value={classification} onChange={(event) => setClassification(event.target.value as ExpenseClassification)}>{CLASSIFICATIONS.map((item) => <option key={item} value={item}>{classificationLabel(item)}</option>)}</select></div></div>
          <div className="form-two-columns"><div><label htmlFor="recurring-quantity">Quantity <span className="optional-label">Optional</span></label><input id="recurring-quantity" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div><div className="recurring-interval-control"><label>Repeat every</label><div><input aria-label="Repeat interval count" type="number" min="1" max="12" value={intervalCount} onChange={(event) => setIntervalCount(event.target.value)} /><select aria-label="Repeat interval unit" value={intervalUnit} onChange={(event) => setIntervalUnit(event.target.value as RecurrenceUnit)}><option value="weekly">week(s)</option><option value="monthly">month(s)</option></select></div></div></div>
          <div className="form-two-columns"><div><label htmlFor="recurring-next-date">Next due date</label><input id="recurring-next-date" type="date" required value={nextDueDate} onChange={(event) => setNextDueDate(event.target.value)} /></div><div><label htmlFor="recurring-end-date">End date <span className="optional-label">Optional</span></label><input id="recurring-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div></div>
          <div className="dialog-actions"><button type="button" className="outline-button" onClick={() => setFormOpen(false)} disabled={savingSchedule}>Cancel</button><button type="submit" className="primary-button" disabled={savingSchedule || !accounts.length}>{savingSchedule ? "Saving…" : "Save recurring schedule"}</button></div>
        </form>}
        {scheduleLoading ? <div className="expense-schedule-loading"><span className="loading-spinner" />Loading schedules…</div> : scheduleRows.length ? <div className="recurring-schedule-list">{scheduleRows.map((schedule) => {
          const account = accounts.find((item) => item.id === schedule.account_id)?.name ?? "Unknown account";
          const canRecord = schedule.active && schedule.next_due_date <= today;
          return <div className={`recurring-schedule-row ${!schedule.active ? "schedule-paused" : ""}`} key={schedule.id}>
            <div className="recurring-schedule-icon"><Repeat2 size={15} /></div><div className="recurring-schedule-copy"><strong>{schedule.description}</strong><span>{schedule.category || "Uncategorized"} · {account} · {formatPkr(schedule.amount_paisa)}</span><small>{schedule.active ? `Next due ${getDateLabel(schedule.next_due_date, { month: "short", day: "numeric", year: "numeric" })}` : "Paused"}</small></div>
            <div className="recurring-schedule-actions">{canRecord && <button type="button" className="outline-button schedule-record-button" onClick={() => void recordOccurrence(schedule)} disabled={Boolean(recordingId)}>{recordingId === schedule.id ? "Saving…" : "Record"}</button>}<button type="button" className="icon-button" aria-label={schedule.active ? `Pause ${schedule.description}` : `Resume ${schedule.description}`} onClick={() => void toggleSchedule(schedule)} disabled={recordingId === schedule.id}>{schedule.active ? "Ⅱ" : "▶"}</button></div>
          </div>;
        })}</div> : <div className="recurring-empty"><Repeat2 size={17} /><strong>No recurring schedules</strong><span>Add one only for expenses you choose to repeat.</span></div>}
      </article>
    </section>

    <section className="panel expense-transactions-panel">
      <div className="panel-heading"><div><p className="panel-kicker">Confirmed transactions</p><h2>{getDateLabel(`${monthKey}-01`, { month: "long", year: "numeric" })}</h2></div><span className="daily-count-pill">{filteredExpenses.length} shown</span></div>
      <div className="expense-filters"><label className="expense-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search expenses" aria-label="Search expenses" /></label><label><span>Category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{expenseCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span>Classification</span><select value={classificationFilter} onChange={(event) => setClassificationFilter(event.target.value)}><option value="all">All classifications</option>{CLASSIFICATIONS.map((item) => <option key={item} value={item}>{classificationLabel(item)}</option>)}</select></label></div>
      {filteredExpenses.length ? <div className="expense-table-wrap"><table className="expense-table"><thead><tr><th>Date</th><th>Purchase</th><th>Category</th><th>Classification</th><th>Account</th><th className="numeric-column">Amount</th></tr></thead><tbody>{filteredExpenses.map((transaction) => <tr key={transaction.id}><td>{getDateLabel(getPakistanDateKey(transaction.occurred_at), { month: "short", day: "numeric", year: "numeric" })}</td><td><strong>{transaction.description}</strong>{transaction.quantity && <small>Quantity {transaction.quantity}</small>}</td><td>{transaction.category || "Uncategorized"}</td><td><span className={`classification-pill ${transaction.expense_classification ? `classification-${transaction.expense_classification}` : "classification-unclassified"}`}>{transaction.expense_classification ? classificationLabel(transaction.expense_classification as ExpenseClassification) : "Unclassified"}</span></td><td>{accounts.find((item) => item.id === transaction.account_id)?.name ?? "Unknown account"}</td><td className="numeric-column expense-amount-cell">{formatPkr(transaction.amount_paisa)}</td></tr>)}</tbody></table></div> : <div className="expense-table-empty"><ShoppingBag size={18} /><strong>{dataAvailable ? "No matching expenses" : "Ledger data is unavailable"}</strong><span>{dataAvailable ? "Try another filter or record a confirmed purchase." : "Refresh after reconnecting to load saved expenses."}</span></div>}
    </section>
    <footer className="dashboard-footer"><span>Only actual purchases change account balances.</span><span><CreditCard size={13} /> Taking an item from stock is not a new expense.</span></footer>
  </>;
}

function ExpenseMetric({ icon: Icon, label, value, detail, tone }: { icon: typeof Wallet; label: string; value: string; detail: string; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon metric-${tone}`}><Icon size={17} /></div><div className="metric-copy"><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-hint">{detail}</span></div></article>;
}

function ExpenseChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong><span>Expenses<b>{formatPkr(Math.round((payload[0].value ?? 0) * 100))}</b></span></div>;
}

function classificationLabel(value: ExpenseClassification): string {
  return value === "non_essential" ? "Non-essential" : value.charAt(0).toUpperCase() + value.slice(1);
}

function compactRupees(value: number): string {
  if (value >= 1000000) return `Rs ${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `Rs ${(value / 1000).toFixed(1)}k`;
  return `Rs ${value}`;
}

function categoryTotals(transactions: FinanceTransaction[]): Map<string, bigint> {
  const result = new Map<string, bigint>();
  for (const transaction of transactions) {
    const category = transaction.category?.trim() || "Uncategorized";
    result.set(category, (result.get(category) ?? 0n) + BigInt(transaction.amount_paisa));
  }
  return result;
}

function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getMonthDayCount(monthKey: string, today: string): number {
  if (monthKey === today.slice(0, 7)) return Number(today.slice(-2));
  return monthKey < today.slice(0, 7) ? daysInMonth(monthKey) : 0;
}

function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
