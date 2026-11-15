import { parseRupeesToPaisa, type AccountType, type Direction, type TransactionType } from "./finance";

export interface ParsedSmsTransaction {
  rawText: string;
  senderHint?: string;
  suggestedAccountType: AccountType;
  suggestedAccountNameHint: string;
  transactionType: TransactionType;
  direction: Direction;
  amountPaisa: bigint;
  amountRupees: string;
  counterparty: string;
  referenceId: string | null;
  remainingBalancePaisa: bigint | null;
  suggestedCategory: string;
  notes: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Clean numbers like "1,500.00" or "450" into standard decimal string.
 */
function cleanAmount(raw: string): string {
  return raw.replace(/,/g, "").trim();
}

/**
 * Intelligent categorization based on merchant / text keywords.
 */
function guessCategory(text: string, counterparty: string): string {
  const combined = `${text} ${counterparty}`.toLowerCase();

  if (combined.match(/kfc|mcdonald|foodpanda|restaurant|cafe|burger|pizza|diner|lunch|tea|coffee|subway|savour/)) {
    return "Food & Dining";
  }
  if (combined.match(/chenone|outfitters|khaadi|al-fatah|daraz|store|mart|supermarket|grocery|mall|shopping|hyperstar/)) {
    return "Groceries & Shopping";
  }
  if (combined.match(/uber|careem|petrol|fuel|pso|shell|total|pump|cng|toll|bus|metro|transit|bike|rickshaw/)) {
    return "Transportation & Fuel";
  }
  if (combined.match(/fee|university|college|school|tuition|exam|books|stationery/)) {
    return "Education & University";
  }
  if (combined.match(/doctor|pharmacy|hospital|clinic|medicine|panadol|medical/)) {
    return "Healthcare & Medical";
  }
  if (combined.match(/lesco|k-electric|iesco|ssgc|sngpl|ptcl|nayatel|stormfiber|bill|electric|gas|water/)) {
    return "Utilities & Bills";
  }
  if (combined.match(/father|mother|brother|sister|uncle|allowance|pocket money|family/)) {
    return "Family Allowance";
  }
  return "General & Miscellaneous";
}

export function parseTransactionSms(rawText: string): ParsedSmsTransaction | null {
  const text = rawText.trim();
  if (!text || text.length < 15) return null;

  const lower = text.toLowerCase();

  // 1. Identify Account Hint (JazzCash, Easypaisa, Bank, Sadapay, Nayapay)
  let suggestedAccountType: AccountType = "cash";
  let suggestedAccountNameHint = "Cash in hand";

  if (lower.includes("jazzcash") || lower.includes("8558") || lower.includes("mobilink")) {
    suggestedAccountType = "wallet";
    suggestedAccountNameHint = "JazzCash";
  } else if (lower.includes("easypaisa") || lower.includes("3737") || lower.includes("telenor")) {
    suggestedAccountType = "wallet";
    suggestedAccountNameHint = "Easypaisa";
  } else if (lower.includes("sadapay") || lower.includes("sada")) {
    suggestedAccountType = "wallet";
    suggestedAccountNameHint = "SadaPay";
  } else if (lower.includes("nayapay") || lower.includes("naya")) {
    suggestedAccountType = "wallet";
    suggestedAccountNameHint = "NayaPay";
  } else if (
    lower.includes("meezan") ||
    lower.includes("hbl") ||
    lower.includes("alfalah") ||
    lower.includes("ubl") ||
    lower.includes("mcb") ||
    lower.includes("standard chartered") ||
    lower.includes("bank") ||
    lower.includes("a/c") ||
    lower.includes("acct")
  ) {
    suggestedAccountType = "bank";
    suggestedAccountNameHint = "Bank Account";
  }

  // 2. Identify Direction & Transaction Type
  let direction: Direction = "outflow";
  let transactionType: TransactionType = "expense";

  const isReceived = Boolean(
    lower.match(/\b(received|credited|money in|added to|has been deposited|deposit of)\b/)
  );
  const isSent = Boolean(
    lower.match(/\b(sent|transferred|transfer to|paid to|payment to)\b/)
  );
  const isPaid = Boolean(
    lower.match(/\b(paid|debited|spent|deducted|withdrawn|purchase at)\b/)
  );

  if (isReceived) {
    direction = "inflow";
    transactionType = "income";
  } else if (isSent) {
    direction = "outflow";
    transactionType = "expense";
  } else if (isPaid) {
    direction = "outflow";
    transactionType = "expense";
  }

  // 3. Extract Amount
  // Matches: "Rs. 1,500.00", "Rs 450", "PKR 2,500.50", "PKR. 3000", "Rs: 120"
  const amountMatch = text.match(/(?:Rs\.?|PKR\.?|Rs:)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
    text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:PKR|Rupees)/i);

  if (!amountMatch) return null;

  const rawAmountStr = cleanAmount(amountMatch[1]);
  let amountPaisa = 0n;
  try {
    amountPaisa = parseRupeesToPaisa(rawAmountStr);
  } catch {
    return null;
  }
  if (amountPaisa <= 0n) return null;

  // 4. Extract Counterparty / Merchant
  let counterparty = "Merchant / Recipient";
  const toMatch = text.match(/(?:to|at|paid to|sent to)\s+([A-Za-z0-9\s&'()+-]+?)(?:\s+(?:from|via|with|for|remaining|balance|fee|tid|ref|trans id|on|your)|\.|\,|$)/i);
  const fromMatch = text.match(/(?:from|received from)\s+([A-Za-z0-9\s&'()+-]+?)(?:\s+(?:in|into|via|for|remaining|balance|fee|tid|ref|trans id|on|your)|\.|\,|$)/i);

  if (isReceived && fromMatch && fromMatch[1]) {
    counterparty = fromMatch[1].trim();
  } else if (toMatch && toMatch[1]) {
    counterparty = toMatch[1].trim();
  }

  // Remove phone numbers or common words inside counterparty
  counterparty = counterparty.replace(/\([0-9xX+-]+\)/g, "").trim();
  if (counterparty.length > 50) counterparty = counterparty.slice(0, 50).trim();
  if (!counterparty) counterparty = isReceived ? "Sender" : "Merchant";

  // 5. Extract Reference / TID Number
  let referenceId: string | null = null;
  const tidMatch = text.match(/(?:TID|Trans ID|Trx ID|Ref(?:erence)?(?:\s*No|\s*ID)?|Txn ID)[:\s]*([A-Za-z0-9]+)/i);
  if (tidMatch && tidMatch[1]) {
    referenceId = tidMatch[1].trim();
  }

  // 6. Extract Remaining Balance (if reported in SMS)
  let remainingBalancePaisa: bigint | null = null;
  const balMatch = text.match(/(?:Remaining Balance|New Balance|Avail(?:able)? Bal(?:ance)?|Bal)(?:\s+is)?[:\s]*(?:Rs\.?|PKR\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (balMatch && balMatch[1]) {
    try {
      remainingBalancePaisa = parseRupeesToPaisa(cleanAmount(balMatch[1]));
    } catch {
      remainingBalancePaisa = null;
    }
  }

  const category = guessCategory(text, counterparty);

  return {
    rawText: text,
    suggestedAccountType,
    suggestedAccountNameHint,
    transactionType,
    direction,
    amountPaisa,
    amountRupees: (Number(amountPaisa) / 100).toFixed(2),
    counterparty,
    referenceId,
    remainingBalancePaisa,
    suggestedCategory: category,
    notes: referenceId ? `SMS TID: ${referenceId}` : "Imported from transaction SMS",
    confidence: referenceId ? "high" : "medium",
  };
}

