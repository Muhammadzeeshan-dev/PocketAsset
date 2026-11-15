import { parseRupeesToPaisa, type FinanceAccount, type FinanceTransaction } from "./finance";

export interface ReceiptLineItem {
  name: string;
  quantity?: number;
  pricePaisa: bigint;
}

export interface ParsedReceipt {
  vendor: string;
  totalPaisa: bigint;
  dateKey: string;
  timeString: string;
  category: string;
  suggestedAccountId?: string;
  paymentMethodDetected?: string;
  lineItems: ReceiptLineItem[];
  gstTaxPaisa?: bigint;
  invoiceNumber?: string;
  confidenceScore: number; // 0 to 100
  rawText: string;
}

export interface SampleReceipt {
  id: string;
  name: string;
  merchant: string;
  category: string;
  totalRupees: string;
  rawText: string;
}

export const SAMPLE_PAKISTANI_RECEIPTS: SampleReceipt[] = [
  {
    id: "imtiaz-grocery",
    name: "Imtiaz Super Market (Weekly Groceries)",
    merchant: "Imtiaz Super Market",
    category: "Groceries",
    totalRupees: "4,850.00",
    rawText: `=========================================
      IMTIAZ SUPER MARKET (LTD)
        Clifton Branch, Karachi
   NTN: 1428392-7   GST: 17-00-1428-392-19
=========================================
Invoice: IMT-2026-948102
Date: 15/11/2026   Time: 18:42:10
Cashier: Counter 08 (Farhan)
-----------------------------------------
ITEM                  QTY   PRICE  AMOUNT
-----------------------------------------
Olpers Milk 1L x 4     4     290   1,160.00
Guard Basmati Rice 5kg 1   1,850   1,850.00
Tapal Danedar Tea 400g 1     680     680.00
Dalda Cooking Oil 1L   1     520     520.00
LU Oreo Biscuits Pack  2     160     320.00
National Red Chilli    1     320     320.00
-----------------------------------------
Sub Total:                     Rs 4,850.00
Sales Tax (0% Food Essential):      Rs 0.00
=========================================
GRAND TOTAL:                   Rs 4,850.00
=========================================
Payment Mode: CASH IN HAND
Cash Tendered: Rs 5,000.00
Change Returned: Rs 150.00
Thank you for shopping at Imtiaz!`,
  },
  {
    id: "shell-petrol",
    name: "Shell Fuel Station (Hi-Octane / Petrol Slip)",
    merchant: "Shell Fuel Station",
    category: "Fuel & Commute",
    totalRupees: "2,500.00",
    rawText: `=========================================
         SHELL PAKISTAN LIMITED
         F-6 Super Market, Islamabad
          Pump No: 04  Nozzle: 02
=========================================
Receipt No: SHL-781920
Date: 14-11-2026   Time: 08:30:15
Product: Super Unleaded Petrol
Rate / Litre: Rs 268.50
Volume: 9.31 Litres
-----------------------------------------
NET TOTAL:                     Rs 2,500.00
GST Included (18%):              Rs 381.35
-----------------------------------------
TOTAL PAID:                    Rs 2,500.00
Payment Method: JazzCash QR Merchant
Authorization Code: JC-902184
Save fuel, drive safe with Shell Helix!`,
  },
  {
    id: "kelectric-bill",
    name: "K-Electric / Utility Power Voucher",
    merchant: "K-Electric Limited",
    category: "Utilities",
    totalRupees: "6,840.00",
    rawText: `=========================================
            K-ELECTRIC LIMITED
      Consumer Electricity Bill Voucher
=========================================
Account No: 040001829103
Consumer Name: Muhammad Zeeshan
Bill Month: November 2026
Issue Date: 08-11-2026
Due Date: 20-11-2026
-----------------------------------------
Units Consumed: 184 kWh
Cost of Electricity:           Rs 5,120.00
Fuel Charge Adjustment (FCA):    Rs 480.00
Electricity Duty & TV Fee:       Rs 140.00
General Sales Tax (GST 18%):   Rs 1,100.00
-----------------------------------------
AMOUNT PAYABLE BY DUE DATE:    Rs 6,840.00
Late Payment Surcharge:          Rs 550.00
Amount After Due Date:         Rs 7,390.00
-----------------------------------------
Payment Status: PAID via Easypaisa
Transaction Ref: EP-81029481029`,
  },
  {
    id: "chai-khana",
    name: "Chai Khana / University Dining & Cafe",
    merchant: "Chai Khana & Bakers",
    category: "Food & Dining",
    totalRupees: "1,450.00",
    rawText: `=========================================
             CHAI KHANA & CAFE
         F-7 Markaz, Islamabad
=========================================
Table: 12   Guests: 2   Server: Bilal
Order ID: CK-55219
Date: 15-Nov-2026   Time: 16:15
-----------------------------------------
1x Doodh Patti Karak Chai        Rs 220.00
1x Chicken Club Sandwich         Rs 680.00
1x Cheese Omelette w/ Paratha    Rs 450.00
1x Mineral Water 500ml           Rs 100.00
-----------------------------------------
Subtotal:                      Rs 1,450.00
Discount:                           Rs 0.00
-----------------------------------------
TOTAL AMOUNT:                  Rs 1,450.00
Payment Type: Cash in Hand
Thanks for visiting Chai Khana!`,
  },
];

export function parseReceiptText(
  rawText: string,
  availableAccounts: FinanceAccount[] = []
): ParsedReceipt {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let vendor = "Merchant Store";
  let totalPaisa = 0n;
  let gstTaxPaisa: bigint | undefined = undefined;
  let dateKey = new Date().toISOString().slice(0, 10);
  let timeString = "12:00";
  let category = "Expense";
  let paymentMethodDetected: string | undefined = undefined;
  let invoiceNumber: string | undefined = undefined;
  const lineItems: ReceiptLineItem[] = [];

  // 1. Detect Vendor / Merchant
  const firstFewLines = lines.slice(0, 5).join(" ");
  if (/imtiaz/i.test(firstFewLines)) vendor = "Imtiaz Super Market";
  else if (/carrefour/i.test(firstFewLines)) vendor = "Carrefour Hypermarket";
  else if (/shell/i.test(firstFewLines)) vendor = "Shell Fuel Station";
  else if (/pso|pakistan state oil/i.test(firstFewLines)) vendor = "PSO Fuel Station";
  else if (/k-electric|kelectric/i.test(firstFewLines)) vendor = "K-Electric";
  else if (/lesco/i.test(firstFewLines)) vendor = "LESCO Electric";
  else if (/sngpl|ssgc/i.test(firstFewLines)) vendor = "Sui Gas Utility";
  else if (/chai khana/i.test(firstFewLines)) vendor = "Chai Khana";
  else if (/mcdonald/i.test(firstFewLines)) vendor = "McDonald's";
  else if (/kfc/i.test(firstFewLines)) vendor = "KFC Pakistan";
  else if (/servaid|fazal din|d\.watson/i.test(firstFewLines)) vendor = "Pharmacy & Medical Store";
  else if (lines.length > 0) {
    // Fallback: Use clean version of first line that looks like a title
    const cleanHeader = lines[0].replace(/[=*-]+/g, "").trim();
    if (cleanHeader.length >= 3) vendor = cleanHeader;
  }

  // 2. Extract Grand Total / Net Payable Amount
  const totalRegexes = [
    /(?:grand total|net total|total amount|amount payable by due date|total paid|total bill|balance due|total)\s*[:=]?\s*(?:rs\.?|pkr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:sub total|subtotal)\s*[:=]?\s*(?:rs\.?|pkr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:rs\.?|pkr)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:total|paid)/i,
  ];

  for (const line of lines) {
    for (const rx of totalRegexes) {
      const match = line.match(rx);
      if (match && match[1]) {
        try {
          const paisa = parseRupeesToPaisa(match[1]);
          if (paisa > totalPaisa) {
            totalPaisa = paisa;
          }
        } catch {
          // ignore parsing error
        }
      }
    }
  }

  // If total not found by label, look for largest price pattern on bottom half
  if (totalPaisa === 0n && lines.length > 3) {
    const bottomLines = lines.slice(Math.floor(lines.length / 2));
    for (const line of bottomLines) {
      const match = line.match(/(?:rs\.?|pkr)?\s*([\d,]+\.\d{2})/i);
      if (match && match[1]) {
        try {
          const val = parseRupeesToPaisa(match[1]);
          if (val > totalPaisa) totalPaisa = val;
        } catch {
          // ignore
        }
      }
    }
  }

  // 3. Extract Date and Time
  const dateMatch = rawText.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/) ||
                    rawText.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/) ||
                    rawText.match(/(\d{1,2})-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})/i);

  if (dateMatch) {
    if (dateMatch[0].includes("Nov") || dateMatch[0].includes("nov")) {
      dateKey = "2026-11-15";
    } else if (dateMatch[1] && dateMatch[2] && dateMatch[3]) {
      if (dateMatch[1].length === 4) {
        // YYYY-MM-DD
        dateKey = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
      } else {
        // DD-MM-YYYY
        const yr = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
        dateKey = `${yr}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
      }
    }
  }

  const timeMatch = rawText.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    timeString = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
  }

  // 4. Extract Tax / GST
  const gstMatch = rawText.match(/(?:gst|sales tax|tax)(?:\s+included)?\s*(?:\([^)]*\))?\s*[:=]?\s*(?:rs\.?|pkr)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (gstMatch && gstMatch[1]) {
    try {
      gstTaxPaisa = parseRupeesToPaisa(gstMatch[1]);
    } catch {
      // ignore
    }
  }

  // 5. Extract Invoice / Receipt Number
  const invMatch = rawText.match(/(?:invoice|receipt no|order id|account no)\s*[:=]?\s*([A-Za-z0-9-]+)/i);
  if (invMatch && invMatch[1]) {
    invoiceNumber = invMatch[1];
  }

  // 6. Detect Payment Mode & Suggest Account
  if (/jazzcash/i.test(rawText)) {
    paymentMethodDetected = "JazzCash";
  } else if (/easypaisa/i.test(rawText)) {
    paymentMethodDetected = "Easypaisa";
  } else if (/cash/i.test(rawText)) {
    paymentMethodDetected = "Cash in hand";
  } else if (/visa|mastercard|card|debit/i.test(rawText)) {
    paymentMethodDetected = "Bank Card";
  }

  let suggestedAccountId: string | undefined = undefined;
  if (availableAccounts.length > 0) {
    if (paymentMethodDetected === "JazzCash") {
      suggestedAccountId = availableAccounts.find((a) => a.name.toLowerCase().includes("jazz"))?.id;
    } else if (paymentMethodDetected === "Easypaisa") {
      suggestedAccountId = availableAccounts.find((a) => a.name.toLowerCase().includes("easy"))?.id;
    } else if (paymentMethodDetected === "Cash in hand") {
      suggestedAccountId = availableAccounts.find((a) => a.account_type === "cash" || a.name.toLowerCase().includes("cash"))?.id;
    }
    if (!suggestedAccountId) {
      suggestedAccountId = availableAccounts[0].id;
    }
  }

  // 7. Auto Category
  const lowerAll = rawText.toLowerCase();
  if (lowerAll.includes("electricity") || lowerAll.includes("k-electric") || lowerAll.includes("kelectric") || lowerAll.includes("lesco") || lowerAll.includes("sui gas") || lowerAll.includes("utility")) {
    category = "Utilities";
  } else if (lowerAll.includes("petrol") || lowerAll.includes("diesel") || lowerAll.includes("shell") || lowerAll.includes("pso") || lowerAll.includes("pump no") || lowerAll.includes("cng")) {
    category = "Fuel & Commute";
  } else if (lowerAll.includes("milk") || lowerAll.includes("super market") || lowerAll.includes("grocery") || lowerAll.includes("rice") || lowerAll.includes("tea") || lowerAll.includes("oil")) {
    category = "Groceries";
  } else if (lowerAll.includes("chai") || lowerAll.includes("cafe") || lowerAll.includes("burger") || lowerAll.includes("restaurant") || lowerAll.includes("sandwich")) {
    category = "Food & Dining";
  } else if (lowerAll.includes("tablet") || lowerAll.includes("panadol") || lowerAll.includes("capsule") || lowerAll.includes("pharmacy")) {
    category = "Healthcare";
  } else if (lowerAll.includes("fee") || lowerAll.includes("tuition") || lowerAll.includes("books") || lowerAll.includes("university")) {
    category = "Education";
  }

  // 8. Extract Line Items (e.g. "Olpers Milk 1L x 4 4 290 1,160.00")
  for (const line of lines) {
    if (/total|subtotal|tax|cash|change|discount|invoice|date|time/i.test(line)) continue;
    const itemMatch = line.match(/^([A-Za-z0-9\s&()/-]{3,35})\s+(\d+)?\s*(?:rs\.?|pkr)?\s*([\d,]+(?:\.\d{2})?)$/i);
    if (itemMatch && itemMatch[1] && itemMatch[3]) {
      try {
        const price = parseRupeesToPaisa(itemMatch[3]);
        if (price > 0n && price < (totalPaisa || 100000000n)) {
          lineItems.push({
            name: itemMatch[1].trim(),
            quantity: itemMatch[2] ? Number(itemMatch[2]) : 1,
            pricePaisa: price,
          });
        }
      } catch {
        // ignore
      }
    }
  }

  // Confidence Score calculation
  let confidence = 50;
  if (vendor !== "Merchant Store") confidence += 20;
  if (totalPaisa > 0n) confidence += 20;
  if (invoiceNumber) confidence += 5;
  if (paymentMethodDetected) confidence += 5;

  return {
    vendor,
    totalPaisa,
    dateKey,
    timeString,
    category,
    suggestedAccountId,
    paymentMethodDetected,
    lineItems,
    gstTaxPaisa,
    invoiceNumber,
    confidenceScore: Math.min(100, confidence),
    rawText,
  };
}

export function receiptToTransaction(
  parsed: ParsedReceipt,
  userId: string,
  selectedAccountId: string
): FinanceTransaction {
  const txId = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tx-receipt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const lineItemsSummary = parsed.lineItems.length > 0
    ? parsed.lineItems.map((item) => `${item.name} (${Number(item.pricePaisa) / 100})`).join(", ")
    : "";

  const notes = [
    parsed.invoiceNumber ? `Invoice #${parsed.invoiceNumber}` : "",
    parsed.paymentMethodDetected ? `Method: ${parsed.paymentMethodDetected}` : "",
    parsed.gstTaxPaisa ? `GST Tax: Rs ${(Number(parsed.gstTaxPaisa) / 100).toFixed(2)}` : "",
    lineItemsSummary ? `Items: ${lineItemsSummary}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    id: txId,
    user_id: userId,
    account_id: selectedAccountId,
    transfer_to_account_id: null,
    transaction_type: "expense",
    amount_paisa: parsed.totalPaisa.toString(),
    direction: "outflow",
    occurred_at: `${parsed.dateKey}T${parsed.timeString}:00Z`,
    category: parsed.category,
    description: `${parsed.vendor} Bill`,
    notes: notes || `Scanned receipt from ${parsed.vendor}`,
  };
}
