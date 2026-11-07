"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, ChevronUp, CircleDollarSign, Clock3, Plus, RefreshCw, Settings2, Wallet } from "lucide-react";
import {
  addDaysToDateKey,
  formatPkr,
  getDateLabel,
  getMonthlySummary,
  getPakistanDateKey,
  getWeeklySummary,
  parseRupeesToPaisa,
  startOfWeekDateKey,
  type FinanceAccount,
  type FinanceTransaction,
} from "@/lib/finance";
import { compareAllowance, expectedAllowanceForDate, type AllowanceSchedule } from "@/lib/allowance";

type StoredSchedule = AllowanceSchedule & { id: string; user_id: string };
type CalendarDay = { date: string; is_university_day: boolean; is_holiday: boolean; label: string | null };

export function IncomeManager({
  userId,
  supabase,
  accounts,
  transactions,
  selectedDate,
  setSelectedDate,
  dataAvailable,
  refreshing,
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
  onRefresh: () => void;
  onAdd: (kind: "income" | "refund") => void;
}) {
  const [schedule, setSchedule] = useState<StoredSchedule | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [toast, setToast] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("800.00");
  const [expectedDays, setExpectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [scheduleStart, setScheduleStart] = useState(getPakistanDateKey(new Date()));
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [scheduleActive, setScheduleActive] = useState(true);
  const [monthKey, setMonthKey] = useState(getPakistanDateKey(new Date()).slice(0, 7));

  const today = getPakistanDateKey(new Date());
  const week = useMemo(() => getWeeklySummary(selectedDate, accounts, transactions), [selectedDate, accounts, transactions]);
  const weekStart = week[0]?.date ?? startOfWeekDateKey(selectedDate);
  const weekEnd = week[6]?.date ?? addDaysToDateKey(weekStart, 6);

  useEffect(() => {
    let cancelled = false;
    async function loadScheduleAndCalendar() {
      const [scheduleResult, calendarResult] = await Promise.all([
        supabase.from("allowance_schedules").select("*").maybeSingle(),
        supabase.from("calendar_days").select("date,is_university_day,is_holiday,label").gte("date", weekStart).lte("date", weekEnd),
      ]);
      if (cancelled) return;
      if (scheduleResult.error) setMetadataError(scheduleResult.error.message);
      else {
        const saved = scheduleResult.data as StoredSchedule | null;
        setSchedule(saved);
        if (saved) {
          setExpectedAmount(paisaAmountInput(saved.expected_amount_paisa));
          setExpectedDays(saved.expected_weekdays);
          setScheduleStart(saved.start_date);
          setScheduleEnd(saved.end_date ?? "");
          setScheduleActive(saved.active);
        }
      }
      if (calendarResult.error) setMetadataError((previous) => previous || calendarResult.error.message);
      else setCalendarDays((calendarResult.data ?? []) as CalendarDay[]);
      setMetadataLoading(false);
    }
    void loadScheduleAndCalendar();
    return () => { cancelled = true; };
  }, [supabase, weekStart, weekEnd]);

  const daysWithIncome = useMemo(() => {
    const income = new Map<string, bigint>();
    const allowance = new Map<string, bigint>();
    for (const transaction of transactions) {
      if (transaction.deleted_at || (transaction.transaction_type !== "income" && transaction.transaction_type !== "dividend")) continue;
      const date = getPakistanDateKey(transaction.occurred_at);
      const value = BigInt(transaction.amount_paisa);
      income.set(date, (income.get(date) ?? 0n) + value);
      if (transaction.transaction_type === "income" && transaction.category?.trim().toLocaleLowerCase() === "university allowance") {
        allowance.set(date, (allowance.get(date) ?? 0n) + value);
      }
    }
    return { income, allowance };
  }, [transactions]);

  const weekRows = week.map((day) => {
    const calendar = calendarDays.find((item) => item.date === day.date);
    const expected = expectedAllowanceForDate(day.date, schedule, calendar?.is_holiday ?? false);
    const actualAllowance = daysWithIncome.allowance.get(day.date) ?? 0n;
    const comparison = compareAllowance(actualAllowance, expected);
    return { ...day, calendar, expected, actualAllowance, comparison, actual: daysWithIncome.income.get(day.date) ?? 0n };
  });
  const weekExpected = weekRows.reduce((sum, day) => day.expected === null ? sum : sum + day.expected, 0n);
  const weekActual = weekRows.reduce((sum, day) => sum + day.actual, 0n);
  const weekMissed = weekRows.reduce((sum, day) => sum + (day.comparison.missed ?? 0n), 0n);
  const weekAdditional = weekRows.reduce((sum, day) => sum + (day.comparison.additional ?? 0n), 0n);
  const monthSummary = getMonthlySummary(monthKey, transactions);
  const monthDayCount = getMonthDayCount(monthKey, today);
  const monthDays = Array.from({ length: monthDayCount }, (_, index) => addDaysToDateKey(`${monthKey}-01`, index));
  const topDay = monthDays.reduce((best, date) => {
    const amount = daysWithIncome.income.get(date) ?? 0n;
    return amount > best.amount ? { date, amount } : best;
  }, { date: "", amount: 0n });
  const zeroIncomeDays = monthDays.filter((date) => (daysWithIncome.income.get(date) ?? 0n) === 0n).length;
  const refundsThisWeek = transactions.reduce((sum, transaction) => {
    const date = getPakistanDateKey(transaction.occurred_at);
    return !transaction.deleted_at && transaction.transaction_type === "refund" && date >= weekStart && date <= weekEnd ? sum + BigInt(transaction.amount_paisa) : sum;
  }, 0n);
  const monthlySources = new Map<string, bigint>();
  for (const transaction of transactions) {
    if (transaction.deleted_at || !getPakistanDateKey(transaction.occurred_at).startsWith(monthKey)) continue;
    if (transaction.transaction_type !== "income" && transaction.transaction_type !== "dividend") continue;
    const source = transaction.category?.trim() || (transaction.transaction_type === "dividend" ? "Dividends" : "Uncategorized");
    monthlySources.set(source, (monthlySources.get(source) ?? 0n) + BigInt(transaction.amount_paisa));
  }
  const sourceRows = [...monthlySources.entries()].map(([source, amount]) => ({ source, amount }))
    .sort((left, right) => left.amount > right.amount ? -1 : left.amount < right.amount ? 1 : 0);

  function changeWeek(days: number) {
    setSelectedDate(addDaysToDateKey(selectedDate, days));
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScheduleError("");
    let amountPaisa: bigint;
    try {
      amountPaisa = expectedAmount.trim() === "0" || expectedAmount.trim() === "0.00" ? 0n : parseRupeesToPaisa(expectedAmount);
    } catch (caught) {
      setScheduleError(caught instanceof Error ? caught.message : "Enter a valid expected amount.");
      return;
    }
    if (!expectedDays.length) {
      setScheduleError("Select at least one day for the expected allowance schedule.");
      return;
    }
    if (!scheduleStart || (scheduleEnd && scheduleEnd < scheduleStart)) {
      setScheduleError("Choose a valid start date and an end date on or after it.");
      return;
    }
    setSavingSchedule(true);
    const { data, error } = await supabase.from("allowance_schedules").upsert({
      user_id: userId,
      expected_amount_paisa: amountPaisa.toString(),
      expected_weekdays: expectedDays,
      start_date: scheduleStart,
      end_date: scheduleEnd || null,
      active: scheduleActive,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).select("*").single();
    setSavingSchedule(false);
    if (error) {
      setScheduleError(error.message);
      return;
    }
    setSchedule(data as StoredSchedule);
    setToast("Allowance schedule saved. Expected amounts do not change account balances.");
    setTimeout(() => setToast(""), 3500);
    setScheduleOpen(false);
  }

  function toggleExpectedDay(day: number) {
    setExpectedDays((previous) => previous.includes(day) ? previous.filter((item) => item !== day) : [...previous, day].sort((a, b) => a - b));
  }

  const monthAvailable = dataAvailable ? formatPkr(monthSummary.income) : "—";

  return <>
    <section className="page-heading module-page-heading">
      <div><p className="eyebrow">Confirmed receipts</p><h1>Income manager<span className="heading-period">.</span></h1><p className="page-subtitle">Track actual money received and compare it with your own allowance plan.</p></div>
      <div className="heading-actions"><button type="button" className="outline-button refresh-button" onClick={onRefresh} disabled={refreshing}><RefreshCw size={14} className={refreshing ? "spin" : ""} /> Refresh</button><button type="button" className="primary-button" onClick={() => onAdd("income")}><Plus size={16} /> Record income</button></div>
    </section>

    {metadataError && <div className="error-banner"><Settings2 size={16} /><div><strong>Allowance planning data is unavailable</strong><span>{metadataError}. Apply the allowance schedule migration; confirmed income records are still available.</span></div></div>}

    <section className="filter-row income-period-row" aria-label="Income reporting periods">
      <div className="date-control"><CalendarDays size={15} /><label htmlFor="income-week-anchor">Selected week</label><input id="income-week-anchor" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></div>
      <button type="button" className="filter-hint" aria-label="Previous week" onClick={() => changeWeek(-7)}><ArrowLeft size={13} /> Previous</button>
      <button type="button" className="filter-hint" onClick={() => setSelectedDate(today)}>This week</button>
      <button type="button" className="filter-hint" aria-label="Next week" onClick={() => changeWeek(7)}>Next <ArrowRight size={13} /></button>
      <div className="date-control income-month-control"><span className="month-icon">◷</span><label htmlFor="income-month">Monthly report</label><input id="income-month" type="month" max={today.slice(0, 7)} value={monthKey} onChange={(event) => setMonthKey(event.target.value)} /></div>
    </section>

    <section className="income-metrics-grid" aria-label="Income summary">
      <IncomeMetric icon={Wallet} label="Actual received this week" value={dataAvailable ? formatPkr(weekActual) : "—"} tone="green" detail="Confirmed income and dividends" />
      <IncomeMetric icon={CalendarDays} label="Expected allowance" value={schedule?.active ? formatPkr(weekExpected) : schedule ? "Paused" : "Not configured"} tone="blue" detail={schedule?.active ? "Based on your saved schedule" : "Set an active schedule to compare"} />
      <IncomeMetric icon={ArrowDownRight} label="Missed allowance" value={schedule?.active ? formatPkr(weekMissed) : "—"} tone="amber" detail="Expected allowance minus received" />
      <IncomeMetric icon={ArrowUpRight} label="Additional allowance" value={schedule?.active ? formatPkr(weekAdditional) : "—"} tone="violet" detail="Received above expected allowance" />
    </section>

    <section className="income-main-grid">
      <article className="panel income-week-panel">
        <div className="panel-heading"><div><p className="panel-kicker">Monday to Sunday</p><h2>{getDateLabel(weekStart, { month: "long", day: "numeric" })} – {getDateLabel(weekEnd, { month: "long", day: "numeric", year: "numeric" })}</h2></div><span className="daily-count-pill">Actual vs expected</span></div>
        <div className="income-week-table-wrap"><table className="income-week-table"><thead><tr><th>Day</th><th>Schedule</th><th>Expected</th><th>Allowance received</th><th>Actual income</th><th></th></tr></thead><tbody>{weekRows.map((day) => <tr key={day.date}>
          <td><strong>{getDateLabel(day.date, { weekday: "short", month: "short", day: "numeric" })}</strong></td>
          <td>{day.calendar?.is_holiday ? <span className="income-schedule-tag holiday-tag">Holiday{day.calendar.label ? ` · ${day.calendar.label}` : ""}</span> : day.calendar?.is_university_day ? <span className="income-schedule-tag university-tag">University day</span> : day.expected && day.expected > 0n ? <span className="income-schedule-tag scheduled-tag">Allowance day</span> : <span className="income-schedule-muted">No allowance planned</span>}</td>
          <td>{day.expected === null ? <span className="income-schedule-muted">—</span> : formatPkr(day.expected)}</td>
          <td>{dataAvailable ? formatPkr(day.actualAllowance) : "—"}{day.comparison.missed !== null && day.comparison.missed > 0n && <small className="allowance-difference">Missed {formatPkr(day.comparison.missed)}</small>}{day.comparison.additional !== null && day.comparison.additional > 0n && <small className="allowance-additional">Extra {formatPkr(day.comparison.additional)}</small>}</td>
          <td className="income-actual-cell">{dataAvailable ? formatPkr(day.actual) : "—"}</td>
          <td><button type="button" className="icon-button income-add-day" aria-label={`Record income for ${day.date}`} onClick={() => { setSelectedDate(day.date); onAdd("income"); }}><Plus size={14} /></button></td>
        </tr>)}</tbody></table></div>
        {!metadataLoading && !schedule && <p className="income-unconfigured-note">Set a schedule to compare actual receipts against expected allowance. Expectations are never posted as income.</p>}
      </article>

      <article className="panel allowance-setup-panel">
        <div className="panel-heading"><div><p className="panel-kicker">Planning only</p><h2>Allowance schedule</h2></div><button type="button" className="icon-button" aria-label={scheduleOpen ? "Hide allowance schedule" : "Edit allowance schedule"} onClick={() => setScheduleOpen((open) => !open)}>{scheduleOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></div>
        {!scheduleOpen ? <div className="allowance-summary">
          {schedule ? <><div className="allowance-summary-value"><strong>{formatPkr(schedule.expected_amount_paisa)}</strong><span>per selected day</span></div><div className="allowance-summary-days">{schedule.expected_weekdays.map((day) => <span key={day} className="allowance-day-chip">{weekdayName(day)}</span>)}</div><p>{schedule.active ? `Active from ${getDateLabel(schedule.start_date, { month: "short", day: "numeric", year: "numeric" })}${schedule.end_date ? ` through ${getDateLabel(schedule.end_date, { month: "short", day: "numeric", year: "numeric" })}` : ", no end date"}.` : "Paused. Expected allowance is not calculated."}</p></> : <><div className="allowance-empty-icon"><CalendarDays size={18} /></div><strong>No expected schedule set</strong><p>Configure the days and amount you expect. Only confirmed receipts count as income.</p></>}
          <button type="button" className="outline-button allowance-edit-button" onClick={() => setScheduleOpen(true)}>{schedule ? "Edit schedule" : "Configure schedule"}</button>
        </div> : <form className="allowance-form" onSubmit={(event) => void saveSchedule(event)}>
          <label htmlFor="expected-allowance">Expected amount per scheduled day</label><div className="rupee-input"><span>Rs</span><input id="expected-allowance" inputMode="decimal" value={expectedAmount} onChange={(event) => setExpectedAmount(event.target.value)} /></div>
          <span className="allowance-form-label">Days with expected allowance</span><div className="allowance-weekday-options">{[1, 2, 3, 4, 5, 6, 0].map((day) => <label key={day} className={expectedDays.includes(day) ? "weekday-selected" : ""}><input type="checkbox" checked={expectedDays.includes(day)} onChange={() => toggleExpectedDay(day)} />{weekdayName(day)}</label>)}</div>
          <div className="form-two-columns"><div><label htmlFor="allowance-start">Start date</label><input id="allowance-start" type="date" required value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} /></div><div><label htmlFor="allowance-end">End date <span className="optional-label">Optional</span></label><input id="allowance-end" type="date" value={scheduleEnd} onChange={(event) => setScheduleEnd(event.target.value)} /></div></div>
          <label className="allowance-active-check"><input type="checkbox" checked={scheduleActive} onChange={(event) => setScheduleActive(event.target.checked)} /> Schedule active</label>
          {scheduleError && <p className="form-alert error" role="alert">{scheduleError}</p>}
          <div className="dialog-footnote"><CircleDollarSign size={14} /><span>Expected amounts are not transactions and will never change your balance.</span></div>
          <div className="dialog-actions"><button type="button" className="outline-button" onClick={() => setScheduleOpen(false)} disabled={savingSchedule}>Cancel</button><button type="submit" className="primary-button" disabled={savingSchedule}>{savingSchedule ? "Saving…" : "Save schedule"}</button></div>
        </form>}
      </article>
    </section>

    <section className="income-report-grid">
      <article className="panel income-month-panel">
        <div className="panel-heading"><div><p className="panel-kicker">Monthly actual income</p><h2>{getDateLabel(`${monthKey}-01`, { month: "long", year: "numeric" })}</h2></div><span className="daily-count-pill">Actual only</span></div>
        <div className="income-month-total"><span>Total received</span><strong>{monthAvailable}</strong></div>
        <div className="income-month-facts"><div><span>Daily average</span><strong>{dataAvailable ? formatPkr(monthDayCount ? monthSummary.income / BigInt(monthDayCount) : 0n) : "—"}</strong><small>Across {monthDayCount} calendar days</small></div><div><span>Highest earning day</span><strong>{dataAvailable && topDay.date ? formatPkr(topDay.amount) : dataAvailable ? formatPkr(0n) : "—"}</strong><small>{topDay.date ? getDateLabel(topDay.date, { weekday: "short", month: "short", day: "numeric" }) : "No income recorded"}</small></div><div><span>Zero-income days</span><strong>{dataAvailable ? String(zeroIncomeDays) : "—"}</strong><small>Includes weekends and holidays</small></div></div>
        <div className="income-source-list"><div className="income-source-heading"><strong>Actual income by source</strong><span>{sourceRows.length} {sourceRows.length === 1 ? "source" : "sources"}</span></div>{sourceRows.length ? sourceRows.slice(0, 7).map((source) => <div className="income-source-row" key={source.source}><span>{source.source}</span><strong>{formatPkr(source.amount)}</strong></div>) : <div className="income-source-empty">No confirmed income recorded this month.</div>}</div>
      </article>
      <article className="panel income-info-panel">
        <div className="panel-heading"><div><p className="panel-kicker">Accounting distinction</p><h2>Actual vs planned</h2></div><Check size={17} className="income-check-icon" /></div>
        <div className="income-rule-list"><div><span className="income-rule-dot rule-green" /><div><strong>Actual income</strong><p>Only money you confirm as received updates an account balance.</p></div></div><div><span className="income-rule-dot rule-blue" /><div><strong>Expected allowance</strong><p>A schedule helps you notice missed or additional allowance; it never creates a transaction.</p></div></div><div><span className="income-rule-dot rule-amber" /><div><strong>Refunds and sale proceeds</strong><p>They are cash received but remain separate from ordinary income totals.</p></div></div></div>
        <div className="income-other-inflows"><span>Refunds this week</span><strong>{dataAvailable ? formatPkr(refundsThisWeek) : "—"}</strong><button type="button" className="text-action" onClick={() => onAdd("refund")}>Record a refund <ArrowRight size={13} /></button></div>
      </article>
    </section>
    {toast && <div className="toast-message" role="status"><span className="toast-check">✓</span>{toast}</div>}
    <footer className="dashboard-footer"><span>Expected allowance is planning information only.</span><span><Clock3 size={13} /> All dates follow Pakistan time.</span></footer>
  </>;
}

function IncomeMetric({ icon: Icon, label, value, tone, detail }: { icon: typeof Wallet; label: string; value: string; tone: string; detail: string }) {
  return <article className="metric-card"><div className={`metric-icon metric-${tone}`}><Icon size={17} /></div><div className="metric-copy"><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-hint">{detail}</span></div></article>;
}

function weekdayName(day: number): string {
  const date = new Date(Date.UTC(2026, 0, 4 + day));
  return new Intl.DateTimeFormat("en-PK", { weekday: "short", timeZone: "UTC" }).format(date);
}

function getMonthDayCount(monthKey: string, today: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  const fullMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (monthKey === today.slice(0, 7)) return Number(today.slice(-2));
  return monthKey < today.slice(0, 7) ? fullMonth : 0;
}

function paisaAmountInput(value: string | number | bigint): string {
  const paisa = BigInt(value);
  return `${paisa / 100n}.${(paisa % 100n).toString().padStart(2, "0")}`;
}
