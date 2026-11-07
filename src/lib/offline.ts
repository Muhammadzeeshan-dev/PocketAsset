import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { FinanceAccount, FinanceTransaction } from "@/lib/finance";

interface PocketAssetDb extends DBSchema {
  pendingTransactions: {
    key: string;
    value: FinanceTransaction;
    indexes: { "by-date": string };
  };
  cachedAccounts: {
    key: string;
    value: FinanceAccount;
  };
  cachedTransactions: {
    key: string;
    value: FinanceTransaction;
    indexes: { "by-date": string };
  };
}

const dbPromises = new Map<string, Promise<IDBPDatabase<PocketAssetDb>>>();

function database(userId: string): Promise<IDBPDatabase<PocketAssetDb>> {
  if (!userId) throw new Error("An authenticated user is required for offline storage.");
  let dbPromise = dbPromises.get(userId);
  if (!dbPromise) {
    dbPromise = openDB<PocketAssetDb>(`pocketasset-private-ledger-${userId}`, 1, {
      upgrade(db) {
        const pending = db.createObjectStore("pendingTransactions", { keyPath: "id" });
        pending.createIndex("by-date", "occurred_at");
        db.createObjectStore("cachedAccounts", { keyPath: "id" });
        const transactions = db.createObjectStore("cachedTransactions", { keyPath: "id" });
        transactions.createIndex("by-date", "occurred_at");
      },
    });
    dbPromises.set(userId, dbPromise);
  }
  return dbPromise;
}

export async function cacheFinancialData(userId: string, accounts: FinanceAccount[], transactions: FinanceTransaction[]): Promise<void> {
  const db = await database(userId);
  const tx = db.transaction(["cachedAccounts", "cachedTransactions"], "readwrite");
  await Promise.all([
    tx.objectStore("cachedAccounts").clear(),
    tx.objectStore("cachedTransactions").clear(),
  ]);
  for (const account of accounts) tx.objectStore("cachedAccounts").put(account);
  for (const transaction of transactions) tx.objectStore("cachedTransactions").put(transaction);
  await tx.done;
}

export async function getCachedFinancialData(userId: string): Promise<{ accounts: FinanceAccount[]; transactions: FinanceTransaction[] }> {
  const db = await database(userId);
  const [accounts, transactions] = await Promise.all([
    db.getAll("cachedAccounts"),
    db.getAll("cachedTransactions"),
  ]);
  return { accounts, transactions };
}

export async function queueOfflineTransaction(userId: string, transaction: FinanceTransaction): Promise<void> {
  const db = await database(userId);
  await db.put("pendingTransactions", transaction);
}

export async function getPendingTransactions(userId: string): Promise<FinanceTransaction[]> {
  const db = await database(userId);
  return db.getAll("pendingTransactions");
}

export async function removePendingTransaction(userId: string, id: string): Promise<void> {
  const db = await database(userId);
  await db.delete("pendingTransactions", id);
}
