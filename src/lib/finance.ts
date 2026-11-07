export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "refund"
  | "investment_purchase"
  | "investment_sale"
  | "dividend"
  | "adjustment";

export type AccountType = "cash" | "wallet" | "bank" | "savings" | "brokerage_cash" | "custom";
export type Direction = "inflow" | "outflow";

export interface FinanceAccount {
  id: string;
  name: string;
  account_type: AccountType;
  opening_balance_paisa: string | number | bigint;
  current_balance_paisa?: string | number | bigint;
  currency: string;
  is_active: boolean;
}

export interface FinanceTransaction {
  id: string;
  user_id?: string;
  account_id: string;
  transfer_to_account_id: string | null;
  transaction_type: TransactionType;
  amount_paisa: string | number | bigint;
  direction: Direction;
  occurred_at: string;
  category: string | null;
  description: string;
  notes?: string | null;
  deleted_at?: string | null;
  expense_classification?: string | null;
  quantity?: string | number | null;
  recurring_expense_id?: string | null;
  recurring_occurrence_date?: string | null;
}

export interface DaySummary {
  date: string;
  dayName: string;
  openingBalance: bigint;
  received: bigint;
  otherInflows: bigint;
  expenses: bigint;
  transfers: bigint;
  investmentPurchases: bigint;
  adjustmentsNet: bigint;
  totalAvailable: bigint;
  closingBalance: bigint;
  dailySavings: bigint;
  transactionCount: number;
}

export interface WeeklyDay extends DaySummary {
  weekday: string;
}

export interface MonthlySummary {
  income: bigint;
  expenses: bigint;
  savings: bigint;
  expenseCategories: Array<{ category: string; amount: bigint }>;
}

const INCOMING_TYPES = new Set<TransactionType>(["income", "refund", "dividend", "investment_sale"]);
const OUTGOING_TYPES = new Set<TransactionType>(["expense", "investment_purchase"]);

export function toPaisa(value: string | number | bigint): bigint {
  return BigInt(value);
}

export function parseRupeesToPaisa(raw: string): bigint {
  const normalized = raw.trim().replace(/,/g, "");
  if (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Enter a valid amount with up to two decimal places.");
  }
  const [rupees, fractional = ""] = normalized.split(".");
  const paisa = BigInt(rupees) * 100n + BigInt(fractional.padEnd(2, "0") || "0");
  if (paisa <= 0n) throw new Error("Amount must be greater than zero.");
  return paisa;
}

export function formatPkr(value: string | number | bigint): string {
  const paisa = toPaisa(value);
  const negative = paisa < 0n;
  const absolute = negative ? -paisa : paisa;
  const rupees = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  const groupedRupees = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(rupees);
  return `${negative ? "−" : ""}Rs ${groupedRupees}.${fraction}`;
}

export function paisaToChartNumber(value: bigint): number {
  return Number(value) / 100;
}

export function getPakistanDateKey(value: string | Date, timeZone = "Asia/Karachi"): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function startOfWeekDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDaysToDateKey(dateKey, -((weekday + 6) % 7));
}

export function accountTransactionEffect(transaction: FinanceTransaction, accountId: string): bigint {
  if (transaction.deleted_at) return 0n;
  const amount = toPaisa(transaction.amount_paisa);

  if (transaction.transaction_type === "transfer") {
    if (transaction.account_id === accountId) return -amount;
    if (transaction.transfer_to_account_id === accountId) return amount;
    return 0n;
  }

  if (transaction.account_id !== accountId) return 0n;
  if (INCOMING_TYPES.has(transaction.transaction_type)) return amount;
  if (OUTGOING_TYPES.has(transaction.transaction_type)) return -amount;
  return transaction.direction === "inflow" ? amount : -amount;
}

export function transactionNetEffect(transaction: FinanceTransaction): bigint {
  if (transaction.deleted_at || transaction.transaction_type === "transfer") return 0n;
  return accountTransactionEffect(transaction, transaction.account_id);
}

export function calculateAccountBalance(
  account: FinanceAccount,
  transactions: FinanceTransaction[],
  beforeDate?: string,
): bigint {
  return transactions.reduce((balance, transaction) => {
    if (beforeDate && getPakistanDateKey(transaction.occurred_at) >= beforeDate) return balance;
    return balance + accountTransactionEffect(transaction, account.id);
  }, toPaisa(account.opening_balance_paisa));
}

function transactionDateKey(transaction: FinanceTransaction): string {
  return getPakistanDateKey(transaction.occurred_at);
}

function isDate(transaction: FinanceTransaction, dateKey: string): boolean {
  return !transaction.deleted_at && transactionDateKey(transaction) === dateKey;
}

function sumTypes(transactions: FinanceTransaction[], dateKey: string, types: Set<TransactionType>): bigint {
  return transactions.reduce((total, transaction) => {
    if (isDate(transaction, dateKey) && types.has(transaction.transaction_type)) {
      return total + toPaisa(transaction.amount_paisa);
    }
    return total;
  }, 0n);
}

function totalBalanceAtDate(accounts: FinanceAccount[], transactions: FinanceTransaction[], dateKey: string): bigint {
  return accounts.reduce((total, account) => total + calculateAccountBalance(account, transactions, dateKey), 0n);
}

export function getDaySummary(
  dateKey: string,
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
): DaySummary {
  const dayTransactions = transactions.filter((transaction) => isDate(transaction, dateKey));
  const openingBalance = totalBalanceAtDate(accounts, transactions, dateKey);
  const closingBalance = openingBalance + dayTransactions.reduce(
    (total, transaction) => total + transactionNetEffect(transaction),
    0n,
  );

  const [year, month, day] = dateKey.split("-").map(Number);
  const dayName = new Intl.DateTimeFormat("en-PK", { weekday: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));

  const received = sumTypes(transactions, dateKey, new Set(["income", "dividend"]));
  const otherInflows = sumTypes(transactions, dateKey, new Set(["refund", "investment_sale"]));
  const expenses = sumTypes(transactions, dateKey, new Set(["expense"]));
  const investmentPurchases = sumTypes(transactions, dateKey, new Set(["investment_purchase"]));
  const transfers = sumTypes(transactions, dateKey, new Set(["transfer"]));

  const totalInflows = received + otherInflows;
  const totalOutflows = expenses + investmentPurchases;
  const totalAvailable = openingBalance + totalInflows;
  const dailySavings = totalInflows - totalOutflows;

  return {
    date: dateKey,
    dayName,
    openingBalance,
    received,
    otherInflows,
    expenses,
    transfers,
    investmentPurchases,
    adjustmentsNet: dayTransactions.reduce((total, transaction) => {
      if (transaction.transaction_type !== "adjustment") return total;
      const amount = toPaisa(transaction.amount_paisa);
      return total + (transaction.direction === "inflow" ? amount : -amount);
    }, 0n),
    totalAvailable,
    closingBalance,
    dailySavings,
    transactionCount: dayTransactions.length,
  };
}

export function getWeeklySummary(
  dateKey: string,
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
  locale = "en-PK",
): WeeklyDay[] {
  const monday = startOfWeekDateKey(dateKey);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToDateKey(monday, index);
    const summary = getDaySummary(date, accounts, transactions);
    const [year, month, day] = date.split("-").map(Number);
    const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" })
      .format(new Date(Date.UTC(year, month - 1, day, 12)));
    return { ...summary, weekday };
  });
}

export function getMonthlySummary(monthKey: string, transactions: FinanceTransaction[]): MonthlySummary {
  const inMonth = transactions.filter((transaction) => !transaction.deleted_at && transactionDateKey(transaction).startsWith(monthKey));
  const income = inMonth.reduce((total, transaction) => {
    if (transaction.transaction_type === "income" || transaction.transaction_type === "dividend") {
      return total + toPaisa(transaction.amount_paisa);
    }
    return total;
  }, 0n);
  const expenses = inMonth.reduce((total, transaction) => transaction.transaction_type === "expense"
    ? total + toPaisa(transaction.amount_paisa)
    : total, 0n);
  const categories = new Map<string, bigint>();
  for (const transaction of inMonth) {
    if (transaction.transaction_type !== "expense") continue;
    const category = transaction.category?.trim() || "Uncategorized";
    categories.set(category, (categories.get(category) ?? 0n) + toPaisa(transaction.amount_paisa));
  }
  const expenseCategories = [...categories.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((left, right) => left.amount > right.amount ? -1 : left.amount < right.amount ? 1 : 0);

  return { income, expenses, savings: income - expenses, expenseCategories };
}

export function getMonthlyTrend(
  anchorMonth: string,
  transactions: FinanceTransaction[],
  count = 6,
): Array<{ month: string; income: bigint; expenses: bigint }> {
  const [year, month] = anchorMonth.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - count, 1));
  return Array.from({ length: count }, (_, index) => {
    const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
    const key = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}`;
    const summary = getMonthlySummary(key, transactions);
    return { month: key, income: summary.income, expenses: summary.expenses };
  });
}

export function getDateLabel(dateKey: string, options: Intl.DateTimeFormatOptions, locale = "en-PK"): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
}
