/**
 * Smart Auto-Categorization & Auto-Enrichment Engine for PocketAsset
 * Automatically identifies categories, classifications (essential vs discretionary),
 * and optimal payment accounts based on Pakistani & international transaction patterns.
 */

export interface EnrichedTransactionDetails {
  category: string;
  expenseClassification: "essential" | "non_essential" | "occasional" | "emergency" | "optional";
  confidenceScore: number; // 0 - 100
  matchedKeyword?: string;
  suggestedAccountType?: "cash" | "wallet" | "bank" | "savings";
}

interface PatternRule {
  keywords: string[];
  category: string;
  classification: "essential" | "non_essential" | "occasional" | "emergency" | "optional";
  suggestedAccountType?: "cash" | "wallet" | "bank" | "savings";
  confidence: number;
}

const ENRICHMENT_RULES: PatternRule[] = [
  // 1. FUEL & TRANSPORT (Essential)
  {
    keywords: ["petrol", "fuel", "diesel", "cng", "shell", "pso", "total", "parco", "attock", "hascol", "gasoline"],
    category: "Fuel",
    classification: "essential",
    suggestedAccountType: "wallet",
    confidence: 96,
  },
  {
    keywords: ["careem", "indrive", "uber", "yango", "bykea", "rickshaw", "taxi", "metro", "speedo", "toll", "m-tag", "mtag", "parking"],
    category: "Transport",
    classification: "essential",
    suggestedAccountType: "wallet",
    confidence: 92,
  },

  // 2. UTILITIES & BILLS (Essential)
  {
    keywords: ["kelectric", "k-electric", "lesco", "gepco", "fesco", "iesco", "mepco", "pesco", "electricity bill", "bijli"],
    category: "Utilities",
    classification: "essential",
    suggestedAccountType: "bank",
    confidence: 99,
  },
  {
    keywords: ["sngpl", "ssgc", "gas bill", "sui gas", "cylinder", "lpg"],
    category: "Utilities",
    classification: "essential",
    suggestedAccountType: "bank",
    confidence: 98,
  },
  {
    keywords: ["ptcl", "nayatel", "stormfiber", "transworld", "fiber", "wifi", "broadband", "internet bill"],
    category: "Mobile & Internet",
    classification: "essential",
    suggestedAccountType: "bank",
    confidence: 97,
  },
  {
    keywords: ["jazz", "telenor", "zong", "ufone", "warid", "mobile load", "easyload", "postpaid", "card recharge"],
    category: "Mobile & Internet",
    classification: "essential",
    suggestedAccountType: "wallet",
    confidence: 95,
  },

  // 3. GROCERIES & HOUSEHOLD (Essential)
  {
    keywords: ["al-fatah", "alfatah", "imtiaz", "carrefour", "metro cash", "chase up", "naheed", "hyperstar", "jalal sons", "esajee", "grocery", "groceries", "supermarket", "mart"],
    category: "Groceries",
    classification: "essential",
    suggestedAccountType: "bank",
    confidence: 94,
  },
  {
    keywords: ["doodh", "milk", "bread", "eggs", "vegetables", "sabzi", "fruit", "meat", "gosht", "chicken", "atta", "flour", "chawal", "rice", "oil", "ghee"],
    category: "Groceries",
    classification: "essential",
    suggestedAccountType: "cash",
    confidence: 91,
  },

  // 4. FOOD & DINING (Discretionary / Non-essential)
  {
    keywords: [
      "mcdonalds", "mcdonald", "kfc", "subway", "hardees", "pizza hut", "dominos", "cheezious", "burger lab",
      "howdy", "optp", "kababjees", "kolachi", "salt'n pepper", "bundu khan", "monal", "foodpanda", "dine-in",
      "restaurant", "cafe", "coffee", "gloria jeans", "second cup", "tim hortons", "tea", "chai", "shawarma",
      "biryani", "karahi", "roll paratha", "canteen"
    ],
    category: "Food & Dining",
    classification: "non_essential",
    suggestedAccountType: "wallet",
    confidence: 88,
  },

  // 5. HEALTHCARE & MEDICAL (Essential / Emergency)
  {
    keywords: ["pharmacy", "servaid", "fazal din", "dvago", "chemist", "medicine", "panadol", "augmentin", "disprin", "brufen", "prescription"],
    category: "Healthcare",
    classification: "essential",
    suggestedAccountType: "cash",
    confidence: 95,
  },
  {
    keywords: ["doctor", "hospital", "clinic", "dentist", "shifa", "agha khan", "chughtai lab", "shaukat khanum", "blood test", "x-ray", "ultrasound", "consultation fee"],
    category: "Healthcare",
    classification: "emergency",
    suggestedAccountType: "bank",
    confidence: 93,
  },

  // 6. EDUCATION & UNIVERSITY (Essential)
  {
    keywords: ["university", "college", "school", "fast nuces", "lums", "nust", "iba", "giki", "comsats", "semester fee", "tuition", "admission fee", "exam fee", "hostel fee"],
    category: "Education",
    classification: "essential",
    suggestedAccountType: "bank",
    confidence: 97,
  },
  {
    keywords: ["stationery", "books", "photocopy", "printout", "notebook", "pen", "urdu bazaar"],
    category: "Education",
    classification: "essential",
    suggestedAccountType: "cash",
    confidence: 89,
  },

  // 7. RENT & HOUSING (Essential)
  {
    keywords: ["rent", "kiraya", "maintenance", "society charges", "bahria maintenance", "dha charges", "plumber", "electrician", "house repair"],
    category: "Housing",
    classification: "essential",
    suggestedAccountType: "bank",
    confidence: 96,
  },

  // 8. SHOPPING & APPAREL (Occasional / Non-essential)
  {
    keywords: ["daraz", "clothing", "khaadi", "gul ahmed", "sapphire", "outfitters", "junaid jamshed", "j.", "shoes", "bata", "service", "borjan", "perfume", "cosmetics"],
    category: "Shopping",
    classification: "occasional",
    suggestedAccountType: "bank",
    confidence: 86,
  },

  // 9. ENTERTAINMENT & SUBSCRIPTIONS (Optional)
  {
    keywords: ["netflix", "spotify", "youtube premium", "cinema", "nueplex", "cinepax", "cue cinema", "steam", "playstation", "game", "streaming"],
    category: "Entertainment",
    classification: "optional",
    suggestedAccountType: "bank",
    confidence: 94,
  },

  // 10. CHARITY & ZAKAT (Essential)
  {
    keywords: ["zakat", "sadqah", "khairat", "edhi", "saylani", "chhipa", "shaukat khanum donation", "akhuwat", "donation", "fitrana"],
    category: "Charity & Zakat",
    classification: "essential",
    suggestedAccountType: "bank",
    confidence: 98,
  },

  // 11. INVESTMENTS & EQUITY (Capital Creation)
  {
    keywords: ["psx", "shares", "stocks", "dividend", "mutual fund", "mcb arif habib", "meezan fund", "al meezan", "kse", "brokerage", "t-bills", "sukuk", "gold tola"],
    category: "Investments",
    classification: "essential",
    suggestedAccountType: "bank",
    confidence: 95,
  },
];

/**
 * Auto-enriches transaction details from a description string
 */
export function autoEnrichTransaction(description: string): EnrichedTransactionDetails | null {
  if (!description || description.trim().length < 2) return null;

  const normalized = description.toLowerCase().trim();

  let bestMatch: PatternRule | null = null;
  let matchedKeyword = "";

  for (const rule of ENRICHMENT_RULES) {
    for (const kw of rule.keywords) {
      // Check full word or regex boundary
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      if (regex.test(normalized) || normalized.includes(kw)) {
        if (!bestMatch || rule.confidence > bestMatch.confidence) {
          bestMatch = rule;
          matchedKeyword = kw;
        }
      }
    }
  }

  if (!bestMatch) {
    return null;
  }

  return {
    category: bestMatch.category,
    expenseClassification: bestMatch.classification,
    confidenceScore: bestMatch.confidence,
    matchedKeyword,
    suggestedAccountType: bestMatch.suggestedAccountType,
  };
}

/**
 * Suggest optimal account ID from available accounts based on description clues
 */
export function suggestAccountId(
  description: string,
  accounts: { id: string; name: string; account_type: string }[]
): string | null {
  if (!description || !accounts.length) return null;

  const text = description.toLowerCase();

  // 1. Explicit account name in text
  for (const acc of accounts) {
    const accName = acc.name.toLowerCase();
    if (text.includes(accName)) return acc.id;
  }

  // 2. Specific wallet keywords
  if (text.includes("jazzcash") || text.includes("jazz cash")) {
    const jc = accounts.find((a) => a.name.toLowerCase().includes("jazzcash"));
    if (jc) return jc.id;
  }
  if (text.includes("easypaisa") || text.includes("easy paisa")) {
    const ep = accounts.find((a) => a.name.toLowerCase().includes("easypaisa"));
    if (ep) return ep.id;
  }
  if (text.includes("sadapay") || text.includes("sada pay")) {
    const sp = accounts.find((a) => a.name.toLowerCase().includes("sadapay"));
    if (sp) return sp.id;
  }
  if (text.includes("nayapay") || text.includes("naya pay")) {
    const np = accounts.find((a) => a.name.toLowerCase().includes("nayapay"));
    if (np) return np.id;
  }
  if (text.includes("cash") || text.includes("haath")) {
    const cash = accounts.find((a) => a.account_type === "cash");
    if (cash) return cash.id;
  }
  if (text.includes("bank") || text.includes("alfalah") || text.includes("meezan") || text.includes("hbl") || text.includes("mcb") || text.includes("ubl")) {
    const bank = accounts.find((a) => a.account_type === "bank");
    if (bank) return bank.id;
  }

  return null;
}
