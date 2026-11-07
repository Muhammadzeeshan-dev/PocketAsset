import {
  formatPkr,
  toPaisa,
  type FinanceAccount,
  type FinanceTransaction,
  calculateAccountBalance,
  getMonthlySummary,
  getPakistanDateKey,
  startOfWeekDateKey,
  addDaysToDateKey,
} from "./finance";
import type { PortfolioSummary } from "./investments";

export interface AssistantMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
  financialFactSnippet?: {
    metricName: string;
    value: string;
    breakdownExplanation: string;
  };
}

export function answerFinancialQueryLocally(
  query: string,
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
  portfolio?: PortfolioSummary | null,
  referenceDateKey: string = getPakistanDateKey(new Date()),
): { reply: string; snippet?: AssistantMessage["financialFactSnippet"] } {
  const q = query.toLowerCase().trim();

  // 1. Balance in specific or cash accounts
  if (q.includes("how much is left") || q.includes("cash account") || q.includes("balance")) {
    const cashAcc = accounts.find((a) => a.account_type === "cash");
    const jazzCashAcc = accounts.find((a) => a.name.toLowerCase().includes("jazz"));
    const easyPaisaAcc = accounts.find((a) => a.name.toLowerCase().includes("easy"));

    const details = accounts.map((acc) => {
      const bal = calculateAccountBalance(acc, transactions);
      return `• ${acc.name}: ${formatPkr(bal)}`;
    }).join("\n");

    const totalLiquid = accounts.reduce((sum, a) => sum + calculateAccountBalance(a, transactions), 0n);

    return {
      reply: `Here are your exact verified account balances:\n\n${details}\n\n**Total Liquid Funds:** ${formatPkr(totalLiquid)}`,
      snippet: {
        metricName: "Total Liquid Cash",
        value: formatPkr(totalLiquid),
        breakdownExplanation: "Sum of opening balances and all verified inflows minus outflows across all active accounts.",
      },
    };
  }

  // 2. Food spending this week
  if (q.includes("food") && (q.includes("week") || q.includes("spend"))) {
    const monday = startOfWeekDateKey(referenceDateKey);
    const weekExpenses = transactions.filter((tx) => {
      if (tx.deleted_at || tx.transaction_type !== "expense") return false;
      const txDate = tx.occurred_at.slice(0, 10);
      const isFood = (tx.category || "").toLowerCase().includes("food") ||
        (tx.description || "").toLowerCase().includes("food") ||
        (tx.description || "").toLowerCase().includes("lunch") ||
        (tx.description || "").toLowerCase().includes("tea");
      return txDate >= monday && txDate <= referenceDateKey && isFood;
    });

    const sumPaisa = weekExpenses.reduce((sum, tx) => sum + toPaisa(tx.amount_paisa), 0n);
    const itemList = weekExpenses.length > 0
      ? weekExpenses.map((t) => `• ${t.description}: ${formatPkr(t.amount_paisa)} on ${t.occurred_at.slice(0, 10)}`).join("\n")
      : "No food expenses logged this week.";

    return {
      reply: `You have spent **${formatPkr(sumPaisa)}** on food & beverages this week (since Monday ${monday}):\n\n${itemList}`,
      snippet: {
        metricName: "Weekly Food Spending",
        value: formatPkr(sumPaisa),
        breakdownExplanation: `Calculated from ${weekExpenses.length} food ledger entries between ${monday} and ${referenceDateKey}.`,
      },
    };
  }

  // 3. What did I buy yesterday?
  if (q.includes("yesterday") || (q.includes("buy") && q.includes("yesterday"))) {
    const yesterday = addDaysToDateKey(referenceDateKey, -1);
    const purchases = transactions.filter((tx) => {
      return !tx.deleted_at && tx.transaction_type === "expense" && tx.occurred_at.slice(0, 10) === yesterday;
    });

    if (purchases.length === 0) {
      return {
        reply: `You recorded **no purchases** yesterday (${yesterday}).`,
      };
    }

    const totalYesterday = purchases.reduce((sum, tx) => sum + toPaisa(tx.amount_paisa), 0n);
    const items = purchases.map((p) => `• ${p.description}: ${formatPkr(p.amount_paisa)} (${p.category || "General"})`).join("\n");

    return {
      reply: `Yesterday (${yesterday}), you made ${purchases.length} purchase(s) totaling **${formatPkr(totalYesterday)}**:\n\n${items}`,
      snippet: {
        metricName: "Yesterday's Spending",
        value: formatPkr(totalYesterday),
        breakdownExplanation: `${purchases.length} purchases recorded on ${yesterday}.`,
      },
    };
  }

  // 4. How much money did I receive this Monday?
  if (q.includes("receive") && q.includes("monday")) {
    const monday = startOfWeekDateKey(referenceDateKey);
    const received = transactions.filter((tx) => {
      return !tx.deleted_at && (tx.transaction_type === "income" || tx.transaction_type === "dividend") &&
        tx.occurred_at.slice(0, 10) === monday;
    });

    const sumPaisa = received.reduce((sum, tx) => sum + toPaisa(tx.amount_paisa), 0n);
    if (received.length === 0) {
      return {
        reply: `You recorded **no income** on Monday (${monday}).`,
      };
    }

    const items = received.map((r) => `• ${r.description}: ${formatPkr(r.amount_paisa)}`).join("\n");
    return {
      reply: `On Monday (${monday}), you received **${formatPkr(sumPaisa)}** in total:\n\n${items}`,
      snippet: {
        metricName: "Monday Inflow",
        value: formatPkr(sumPaisa),
        breakdownExplanation: `Inflow entries confirmed on ${monday}.`,
      },
    };
  }

  // 5. How is my investment portfolio performing?
  if (q.includes("invest") || q.includes("stock") || q.includes("portfolio")) {
    if (!portfolio || portfolio.holdings.length === 0) {
      return {
        reply: "You currently have no recorded stock investments in your portfolio.",
      };
    }

    const gainLoss = portfolio.totalUnrealizedPaisa >= 0n ? "Unrealized Profit" : "Unrealized Loss";
    const holdingsDetail = portfolio.holdings.map((h) => {
      return `• **${h.holding.symbol}** (${h.holding.company_name}): ${h.holding.shares_quantity} shares @ avg ${formatPkr(h.holding.average_buy_price_paisa)} | Market: ${formatPkr(h.currentMarketValuePaisa)} (${h.returnPercentage >= 0 ? "+" : ""}${h.returnPercentage}%)`;
    }).join("\n");

    return {
      reply: `Your Pakistan Stock Exchange (PSX) portfolio status:\n\n` +
        `• **Total Investment Cost:** ${formatPkr(portfolio.totalCostPaisa)}\n` +
        `• **Current Market Value:** ${formatPkr(portfolio.totalMarketValuePaisa)}\n` +
        `• **${gainLoss}:** ${formatPkr(portfolio.totalUnrealizedPaisa)} (${portfolio.totalReturnPercentage >= 0 ? "+" : ""}${portfolio.totalReturnPercentage}%)\n\n` +
        `**Holdings Breakdown:**\n${holdingsDetail}`,
      snippet: {
        metricName: "PSX Market Value",
        value: formatPkr(portfolio.totalMarketValuePaisa),
        breakdownExplanation: `Cost ${formatPkr(portfolio.totalCostPaisa)}, Profit ${formatPkr(portfolio.totalUnrealizedPaisa)}.`,
      },
    };
  }

  // 6. How much did I save this month?
  if (q.includes("save") || q.includes("savings")) {
    const currentMonth = referenceDateKey.slice(0, 7);
    const summary = getMonthlySummary(currentMonth, transactions);
    const savingsRate = summary.income > 0n
      ? ((Number(summary.savings) / Number(summary.income)) * 100).toFixed(1)
      : "0";

    return {
      reply: `For the month of **${currentMonth}**:\n\n` +
        `• **Confirmed Income:** ${formatPkr(summary.income)}\n` +
        `• **Confirmed Expenses:** ${formatPkr(summary.expenses)}\n` +
        `• **Net Savings:** ${formatPkr(summary.savings)} (${savingsRate}% savings rate)`,
      snippet: {
        metricName: "Net Monthly Savings",
        value: formatPkr(summary.savings),
        breakdownExplanation: `Income (${formatPkr(summary.income)}) minus Expenses (${formatPkr(summary.expenses)}).`,
      },
    };
  }

  // 7. Which category consumed most money?
  if (q.includes("category") || q.includes("consumed") || q.includes("most")) {
    const currentMonth = referenceDateKey.slice(0, 7);
    const summary = getMonthlySummary(currentMonth, transactions);

    if (summary.expenseCategories.length === 0) {
      return {
        reply: `You haven't recorded any expenses for ${currentMonth} yet.`,
      };
    }

    const top = summary.expenseCategories[0];
    const topPct = summary.expenses > 0n ? ((Number(top.amount) / Number(summary.expenses)) * 100).toFixed(1) : "0";

    return {
      reply: `The highest spending category for **${currentMonth}** is **${top.category}** with **${formatPkr(top.amount)}** (${topPct}% of your total monthly expenses).\n\n` +
        `Other categories:\n` +
        summary.expenseCategories.slice(1, 4).map((c) => `• ${c.category}: ${formatPkr(c.amount)}`).join("\n"),
      snippet: {
        metricName: `Top Expense: ${top.category}`,
        value: formatPkr(top.amount),
        breakdownExplanation: `Accounted for ${topPct}% of expenses this month.`,
      },
    };
  }

  // 8. Affordability question: "Can I afford Rs 5000"
  const amountMatch = query.match(/(?:rs\.?|pkr)?\s*(\d+[\d,]*)/i);
  if (q.includes("afford") && amountMatch) {
    const amountNum = parseInt(amountMatch[1].replace(/,/g, ""), 10);
    const amountPaisa = BigInt(amountNum) * 100n;
    const totalLiquid = accounts.reduce((sum, a) => sum + calculateAccountBalance(a, transactions), 0n);

    if (totalLiquid >= amountPaisa) {
      const remainingAfter = totalLiquid - amountPaisa;
      return {
        reply: `Yes, you currently have **${formatPkr(totalLiquid)}** in total liquid funds across your accounts.\n\n` +
          `If you spend **${formatPkr(amountPaisa)}**, your remaining liquid cash will be **${formatPkr(remainingAfter)}**.\n\n` +
          `*Note: Ensure this does not compromise your necessary daily university fare or emergency reserves!*`,
        snippet: {
          metricName: "Post-Purchase Balance",
          value: formatPkr(remainingAfter),
          breakdownExplanation: `${formatPkr(totalLiquid)} available − ${formatPkr(amountPaisa)} planned purchase.`,
        },
      };
    } else {
      const shortfall = amountPaisa - totalLiquid;
      return {
        reply: `You currently have **${formatPkr(totalLiquid)}** available in liquid funds. To afford this purchase of **${formatPkr(amountPaisa)}**, you would be short by **${formatPkr(shortfall)}**.`,
        snippet: {
          metricName: "Shortfall",
          value: formatPkr(shortfall),
          breakdownExplanation: "Insufficient liquid balance in registered accounts.",
        },
      };
    }
  }

  // Default response
  return {
    reply: `I can answer questions based directly on your verified financial ledger! Try asking:\n\n` +
      `• *"How much is left in my accounts?"*\n` +
      `• *"What did I buy yesterday?"*\n` +
      `• *"How much did I spend on food this week?"*\n` +
      `• *"How much money did I receive this Monday?"*\n` +
      `• *"How is my investment portfolio performing?"*\n` +
      `• *"Which category consumed most of my money?"*\n` +
      `• *"Can I afford Rs 2,500?"*`,
  };
}

