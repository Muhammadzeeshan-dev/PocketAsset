"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpRight, ChevronLeft, ChevronRight, Clock3, FileSearch, FilterX, Pencil, Plus, RefreshCw, Search, ShoppingBag, TrendingUp, X } from "lucide-react";
import {
  formatPkr,
  getDateLabel,
  getPakistanDateKey,
  type FinanceAccount,
  type FinanceTransaction,
  type TransactionType,
} from "@/lib/finance";
import { filterTransactions, type TransactionDatePreset } from "@/lib/transaction-filters";

const PAGE_SIZE = 25;
const ENTRY_TYPES: TransactionType[] = ["income", "expense", "transfer", "refund", "investment_purchase", "investment_sale", "dividend", "adjustment"];

export function TransactionsPage({
  accounts,
  transactions,
  dataAvailable,
  refreshing,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
}: {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  dataAvailable: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onAdd: (kind: TransactionType) => void;
  onEdit: (transaction: FinanceTransaction) => void;
  onDelete: (transaction: FinanceTransaction) => void;
}) {
  const today = getPakistanDateKey(new Date());
  const [search, setSearch] = useState("");
  const [preset, setPreset] = useState<TransactionDatePreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [accountId, setAccountId] = useState("all");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState<TransactionType | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [pageState, setPageState] = useState({ filterKey: "", page: 0 });
  const [details, setDetails] = useState<FinanceTransaction | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const categories = useMemo(() => [...new Set(transactions.map((item) => item.category?.trim() || "Uncategorized"))].sort((a, b) => a.localeCompare(b)), [transactions]);
  const typeOptions = useMemo(() => [...new Set(transactions.map((item) => item.transaction_type))].sort(), [transactions]);

  const filtered = useMemo(() => filterTransactions({
    transactions,
    accounts,
    today,
    preset,
    customStart: fromDate,
    customEnd: toDate,
    accountId,
    category,
    type,
    search,
    sort,
  }), [transactions, accounts, today, preset, fromDate, toDate, accountId, category, type, search, sort]);

  const filterKey = JSON.stringify([search, preset, fromDate, toDate, accountId, category, type, sort]);
  const page = pageState.filterKey === filterKey ? pageState.page : 0;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  function clearFilters() {
    setSearch(""); setPreset("all"); setFromDate(""); setToDate(""); setAccountId("all"); setCategory("all"); setType("all"); setSort("newest");
  }

  function exportCsv() {
    const headers = ["Date (PKT)", "Time (PKT)", "ID", "Type", "Description", "Amount (PKR)", "Category", "Account", "Related account", "Notes"];
    const rows = filtered.map((transaction) => {
      const source = accounts.find((account) => account.id === transaction.account_id)?.name ?? "Unknown account";
      const destination = transaction.transfer_to_account_id ? accounts.find((account) => account.id === transaction.transfer_to_account_id)?.name ?? "Unknown account" : "";
      return [getPakistanDateKey(transaction.occurred_at), timeLabel(transaction.occurred_at), transaction.id, transaction.transaction_type, transaction.description, (Number(BigInt(transaction.amount_paisa)) / 100).toFixed(2), transaction.category ?? "", source, destination, transaction.notes ?? ""];
    });
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pocketasset-transactions-${today}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const pageLabel = filtered.length ? `${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}` : "0 records";

  return <>
    <section className="page-heading module-page-heading">
      <div><p className="eyebrow">Complete ledger</p><h1>Transactions<span className="heading-period">.</span></h1><p className="page-subtitle">Search, review, and reconcile every recorded movement.</p></div>
      <div className="heading-actions"><button type="button" className="outline-button refresh-button" onClick={onRefresh} disabled={refreshing}><RefreshCw size={14} className={refreshing ? "spin" : ""} /> Refresh</button><div className="transactions-add-wrap"><button type="button" className="primary-button" aria-expanded={addMenuOpen} aria-controls="transaction-add-menu" onClick={() => setAddMenuOpen((open) => !open)}><Plus size={16} /> Add transaction</button>{addMenuOpen && <div className="transactions-add-menu" id="transaction-add-menu">{ENTRY_TYPES.map((entryType) => <button type="button" key={entryType} onClick={() => { setAddMenuOpen(false); onAdd(entryType); }}>{typeLabel(entryType)}</button>)}</div>}</div></div>
    </section>

    <section className="transactions-toolbar panel" aria-label="Transaction filters">
      <div className="transactions-search"><Search size={16} /><input aria-label="Search transactions" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search description, amount, category, account…" /></div>
      <div className="transactions-filter-grid">
        <label><span>Date range</span><select value={preset} onChange={(event) => setPreset(event.target.value as TransactionDatePreset)}><option value="all">All dates</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="this_week">This week</option><option value="last_week">Last week</option><option value="this_month">This month</option><option value="last_month">Last month</option><option value="custom">Custom range</option></select></label>
        <label><span>Account</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="all">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>Transaction type</span><select value={type} onChange={(event) => setType(event.target.value as TransactionType | "all")}><option value="all">All types</option>{typeOptions.map((item) => <option key={item} value={item}>{typeLabel(item)}</option>)}</select></label>
        <label><span>Sort by date</span><select value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest")}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
      </div>
      {preset === "custom" && <div className="transactions-custom-date"><label>From <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label>To <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>{fromDate && toDate && fromDate > toDate && <span>End date must be on or after start date.</span>}</div>}
      <div className="transactions-filter-actions"><span>{filtered.length} matching {filtered.length === 1 ? "transaction" : "transactions"}</span><button type="button" className="text-action" onClick={clearFilters}><FilterX size={14} /> Clear filters</button></div>
    </section>

    <section className="panel transactions-list-panel">
      <div className="panel-heading"><div><p className="panel-kicker">Transaction history</p><h2>All activity</h2></div><div className="transactions-list-actions"><span className="daily-count-pill">{pageLabel}</span><button type="button" className="outline-button csv-button" onClick={exportCsv} disabled={!filtered.length}><ArrowDownToLine size={14} /> Export CSV</button></div></div>
      {!dataAvailable ? <div className="empty-transactions"><div><FileSearch size={21} /></div><strong>Ledger data is unavailable</strong><span>Reconnect or refresh to load your saved transactions.</span></div> : !filtered.length ? <div className="empty-transactions"><div><FileSearch size={21} /></div><strong>{transactions.length ? "No matching transactions" : "No transactions recorded yet"}</strong><span>{transactions.length ? "Try changing a filter or search term." : "Entries added through the daily tracker and other modules will appear here."}</span>{transactions.length === 0 && <button type="button" className="text-action" onClick={() => onAdd("expense")}><Plus size={14} /> Add the first transaction</button>}</div> : <div className="transactions-table-wrap"><table className="transactions-table"><thead><tr><th>Date & time</th><th>Description</th><th>Type</th><th>Account</th><th>Category</th><th className="numeric-column">Amount</th><th>Actions</th></tr></thead><tbody>{visible.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} accounts={accounts} onDetails={() => setDetails(transaction)} onEdit={() => onEdit(transaction)} onDelete={() => onDelete(transaction)} />)}</tbody></table></div>}
      {dataAvailable && filtered.length > PAGE_SIZE && <div className="transactions-pagination"><span>{pageLabel}</span><div><button type="button" className="icon-button" aria-label="Previous page" disabled={currentPage === 0} onClick={() => setPageState({ filterKey, page: currentPage - 1 })}><ChevronLeft size={16} /></button><span>Page {currentPage + 1} of {pageCount}</span><button type="button" className="icon-button" aria-label="Next page" disabled={currentPage >= pageCount - 1} onClick={() => setPageState({ filterKey, page: currentPage + 1 })}><ChevronRight size={16} /></button></div></div>}
    </section>
    <footer className="dashboard-footer"><span>Opening balances are not transactions or income.</span><span><Clock3 size={13} /> Times are shown in Pakistan Standard Time.</span></footer>
    {details && <TransactionDetails transaction={details} accounts={accounts} onClose={() => setDetails(null)} onEdit={() => { onEdit(details); setDetails(null); }} />}
  </>;
}

function TransactionRow({ transaction, accounts, onDetails, onEdit, onDelete }: {
  transaction: FinanceTransaction;
  accounts: FinanceAccount[];
  onDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const account = accounts.find((item) => item.id === transaction.account_id)?.name ?? "Unknown account";
  const destination = transaction.transfer_to_account_id ? accounts.find((item) => item.id === transaction.transfer_to_account_id)?.name : null;
  const incoming = ["income", "refund", "dividend", "investment_sale"].includes(transaction.transaction_type);
  const prefix = transaction.transaction_type === "transfer" ? "" : incoming ? "+" : "−";
  const Icon = transaction.transaction_type === "transfer" ? ArrowLeftRight : incoming ? ArrowUpRight : transaction.transaction_type.startsWith("investment") ? TrendingUp : ShoppingBag;
  return <tr>
    <td><div className="transaction-date-cell"><strong>{getDateLabel(getPakistanDateKey(transaction.occurred_at), { month: "short", day: "numeric", year: "numeric" })}</strong><span>{timeLabel(transaction.occurred_at)}</span></div></td>
    <td><button type="button" className="transaction-description-button" onClick={onDetails}><span className={`transaction-row-icon ${incoming ? "row-positive" : transaction.transaction_type === "transfer" ? "row-transfer" : "row-outgoing"}`}><Icon size={14} /></span><span><strong>{transaction.description}</strong><small>{transaction.notes || "View transaction details"}</small></span></button></td>
    <td><span className={`transaction-type-pill type-${transaction.transaction_type}`}>{typeLabel(transaction.transaction_type)}</span></td>
    <td><span className="transaction-account-names">{account}{destination ? ` → ${destination}` : ""}</span></td>
    <td>{transaction.category || <span className="uncategorized-label">Uncategorized</span>}</td>
    <td className={`numeric-column transaction-amount ${incoming ? "amount-incoming" : ""}`}>{prefix}{formatPkr(transaction.amount_paisa)}</td>
    <td><div className="transaction-action-group"><button type="button" className="icon-button" aria-label={`View ${transaction.description}`} onClick={onDetails}><FileSearch size={14} /></button><button type="button" className="icon-button" aria-label={`Edit ${transaction.description}`} onClick={onEdit}><Pencil size={14} /></button><button type="button" className="icon-button row-delete-button" aria-label={`Delete ${transaction.description}`} onClick={onDelete}><X size={14} /></button></div></td>
  </tr>;
}

function TransactionDetails({ transaction, accounts, onClose, onEdit }: { transaction: FinanceTransaction; accounts: FinanceAccount[]; onClose: () => void; onEdit: () => void }) {
  const accountName = (id: string | null) => id ? accounts.find((account) => account.id === id)?.name ?? "Unknown account" : "—";
  return <div className="transaction-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="transaction-detail-card" role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title">
      <div className="transaction-detail-heading"><div><p className="panel-kicker">Transaction details</p><h2 id="transaction-detail-title">{transaction.description}</h2></div><button type="button" className="icon-button" aria-label="Close details" onClick={onClose}><X size={17} /></button></div>
      <div className="transaction-detail-amount"><span>{typeLabel(transaction.transaction_type)}</span><strong>{formatPkr(transaction.amount_paisa)}</strong></div>
      <dl className="transaction-detail-list"><Detail label="Date" value={getDateLabel(getPakistanDateKey(transaction.occurred_at), { weekday: "long", month: "long", day: "numeric", year: "numeric" })} /><Detail label="Time" value={`${timeLabel(transaction.occurred_at)} PKT`} /><Detail label="Account" value={accountName(transaction.account_id)} />{transaction.transfer_to_account_id && <Detail label="Related account" value={accountName(transaction.transfer_to_account_id)} />}<Detail label="Category" value={transaction.category || "Uncategorized"} /><Detail label="Transaction ID" value={transaction.id} /><Detail label="Notes" value={transaction.notes || "No notes"} /></dl>
      <div className="transaction-detail-actions"><button type="button" className="outline-button" onClick={onClose}>Close</button><button type="button" className="primary-button" onClick={onEdit}><Pencil size={14} /> Edit transaction</button></div>
    </section>
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Karachi" }).format(new Date(value));
}

function typeLabel(type: TransactionType | string): string {
  const labels: Record<string, string> = {
    income: "Income", expense: "Expense", transfer: "Transfer", refund: "Refund",
    investment_purchase: "Investment purchase", investment_sale: "Investment sale", dividend: "Dividend", adjustment: "Adjustment",
  };
  return labels[type] ?? type;
}
