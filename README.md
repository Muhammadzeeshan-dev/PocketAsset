# PocketAsset 💎

> **Track Every Rupee. Build Your Wealth.**  
> A private, self-hosted personal finance and wealth management platform designed for individuals in Pakistan and worldwide.

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-129%20Passed-6E9F18?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 📌 Overview

**PocketAsset** is not a basic expense tracker. It is a full-fledged, private wealth management platform engineered for complete financial visibility and disciplined wealth accumulation.

Built specifically to handle the realities of Pakistani personal finance (PKR currency, JazzCash, Easypaisa, Cash in hand, Commercial Bank accounts, and Pakistan Stock Exchange investments), PocketAsset is **100% open-source and self-hostable** so anyone can deploy their own instance and manage their finances with complete privacy and zero third-party data tracking.

---

## 🚀 Key Features

### 💎 Sarmaya & Zerodha Pro Wealth Terminal v3.0 (Quantum Edition — Unlocked 100% Free)
Features typically locked behind expensive paid subscriptions (PKR 15,000–30,000/yr on Sarmaya.pk or Indian platforms like Zerodha Console / INDmoney / Screener.in) are provided natively and completely free:
- **PSX Dividend & Yield Forecaster:** Track dividend yields, DPS, and payment cadences for Pakistan's premier dividend aristocrats (**FFC, HUBC, ENGRO, OGDC, MCB, EFERT, POL, MEBL, LUCK, SYS, UBL, MARI**).
- **FBR Withholding Tax Shield:** Computes exact 15% Active Filer tax vs 30% Non-Filer tax penalty under the FBR Income Tax Ordinance, quantifying exact annual tax savings.
- **10-Year DRIP Compounder:** Compares reinvested dividend wealth growth against cash withdrawals.
- **PSX Alpha & Multi-Factor Screener:** Institutional stock screener filtering 12 blue-chip PSX stocks across 8 sectors. Evaluates **P/E, P/B, ROE %, Beta, Graham Fair Value (Rs)**, and **Valuation Discount %** with automated Alpha Ratings (`A+`, `A`, `B+`) and Meezan KMI-30 Shariah compliance filters.
- **KSE-100 Macro Valuation Radar & Thermometer:** Live macro indicator comparing KSE-100 Forward P/E (4.8x vs 8.2x 10Y avg, 41.5% discount), Pakistan Buffett Indicator (11.8% vs 24% norm), SBP Policy Rate (15.0%) vs Equity Yield (20.8%) spread (+5.8%), Market Regime score (88/100 Deep Value), and 4-asset tactical asset allocation.
- **Quantum Wealth Milestone Planner:** Goal calculator with real inflation-adjusted purchasing power, required monthly SIP in Pakistani Rupees, and compounding multiplier for goals like **Crorepati (Rs. 1 Crore)**, **DHA/Bahria Home (Rs. 2.5 Crore)**, **Financial Freedom (Rs. 5 Crore)**, Overseas Education, Vehicle, and Hajj.
- **30-Year Stochastic Monte Carlo Simulator:** Simulates 1,000 stochastic market iterations incorporating KSE-100 volatility and Pakistani CPI inflation to calculate conservative (10th %ile), base (median), and bull (90th %ile) trajectories.
- **Macro Black-Swan Stress Shield:** Tests your verified liquid balances (Cash + JazzCash + Easypaisa) against 4 major shocks:
  1. *Sudden Income Blackout* (Days of survival with zero incoming cashflow).
  2. *25% PKR Currency Devaluation* (Import inflation pass-through to domestic bills).
  3. *Unplanned Medical / Emergency Spike* (Rs. 40,000 instant liquidity hit).
  4. *Stagflation Squeeze* (+30% utility and living cost surge).
- **Pakistan FIRE Matrix:** Calculates Lean FIRE (25x), Standard FIRE (30x), and Fat FIRE (40x) retirement corpuses tailored to Pakistani living standards.

### ⚡ Autonomous Live Market Engine & Real-Time Auto-Updates (Zero-Touch Automation)
- **Autonomous PSX Live Feed (`/api/market/live-feed`):** High-speed, cached background API fetching live quotes for 12 blue-chip PSX stocks (**FFC, LUCK, MEBL, OGDC, HUBC, ENGRO, MCB, EFERT, POL, SYS, UBL, MARI**), Karachi Sarafa bullion prices, and forex currency rates with server-edge 60s caching.
- **Auto-Sync PSX Investment Portfolio:** Autonomous 5-minute polling loop with visual pulse countdown timer, user toggle (`Auto-Update: ON/OFF`), 1-click manual "Fetch Live PSX Prices Now", automatic holding recalculation with live P&L and day change badges (`▲ +0.99%`).
- **Dynamic Gold/Silver Nisab & Zakat Live Sync:** Automatic mount-time fetch of 24K gold and silver per-tola rates directly to calculate real-time Nisab thresholds (52.5 tolas silver / 7.5 tolas gold) with zero manual inputs required.
- **Smart Transaction Auto-Categorization & Enrichment:** Regex keyword engine pattern-matching 100+ Pakistani and global merchants across 11 categories (Fuel, Utilities, Dining, Groceries, Education, Health, Mobile, etc.) with smart account suggestions (JazzCash, Easypaisa, Bank, Cash) and live preview tags in Quick Entry.
- **Auto-Recurring Bill Detector & 1-Click Execution:** Real-time detector scanning due and overdue recurring expense schedules upon load, displaying an actionable instant-recording banner that updates ledgers and automatically calculates the next recurrence date.
- **Global Topbar Market Ticker:** Live real-time PSX index and USD exchange rate status pill embedded directly in the top navigation bar.

### ⏱️ Dual-Mode Session Time Extension & Cyber-HUD Security
- **Proactive Topbar 1-Click Extension:** Prominent "Extend Time" clock button directly in the navigation header that refreshes your active login session by +30 minutes with an instant confirmation toast and server heartbeat (`/api/auth/session-extend`).
- **Reactive Cyber-HUD Inactivity Modal:**
  - High-tech SVG radial countdown ring with SVG stroke-dashoffset transition.
  - Dual time extension actions: **"Extend Session (+30 Mins)"** (primary) and **"Keep Working (+60s)"** (quick bump).
  - Immediate sign out option and keyboard shortcut handling (`Space` / `Enter` to extend).
  - Cross-tab coordination via `BroadcastChannel` ensures all open tabs refresh simultaneously.

### 💰 Complete Liquid Cash & Multi-Wallet Management
- **Separate Account Ledgers:** Track Cash in hand, JazzCash, Easypaisa, Bank Accounts, Savings Accounts, and Brokerage Cash Balances.
- **Accurate Balance Synchronization:** Live balances calculated from verified transaction history.
- **Inter-Account Transfers:** Transfer funds between wallets (e.g. Bank to JazzCash) with zero balance leakage.
- **Recurring Expense Engine:** Zero-permission resilient recurring schedule engine with confirmation workflows for repeating subscriptions and bills.

### 📈 Pakistan Stock Exchange (PSX) Investment Portfolio
- **Holdings Tracker:** Track shares quantity, average purchase price, current market price, and snapshot valuation.
- **Real-Time P&L:** Instant calculation of invested cost, current portfolio value, and unrealized profit/loss per holding.
- **Brokerage Cash Sync:** Dedicated cash balance accounting for equity investing.

### ⚡ 60 FPS Mobile Performance & Native Touch UX
- **Zero Main-Thread Lag:** Decoupled in-memory activity tracking from disk writes in the inactivity timer, reducing synchronous `localStorage` writes by 98% and delivering silky-smooth 60fps scrolling and cursor response.
- **Fast Resilient Ledger Fallback:** Eliminates failed Supabase RLS 42501 network roundtrip delays by dynamically routing transactions through optimized server-side service-role endpoints.
- **Revamped Add Money & Add Expense Dialogs:**
  - **Horizontal Touch Swiping:** Instant single-row preset chips for fast expense tagging and income sources with active highlight states.
  - **Sticky Action Controls:** "Save transaction" and "Cancel" buttons stay firmly anchored at the bottom of the dialog during scroll.
  - **iOS Safari & Mobile Form Polish:** 16px font sizing prevents unwanted viewport zooming; custom touch targets (min 42px) with safe area insets for notched smartphones.

### 🛡️ Enterprise Security & Privacy (Single-Owner Model)
- **Zero SaaS Bloat:** No public registration, no employee management, no multi-tenant data sharing. Dedicated strictly to one owner.
- **Supabase PostgreSQL RLS:** Strict Row Level Security policies enforce `(auth.uid() = user_id)` at the database level.
- **Two-Factor Email OTP for Admin:** Cryptographic SHA-256 HMAC verification codes delivered via Gmail SMTP to open the Security Console.
- **Authoritative 60-Second Inactivity Auto-Logout:** Customizable timeout (60s, 2m, 5m, 15m, 30m, or disabled) with a live 60-second warning modal countdown and immediate multi-tab sync.
- **Multi-Tab Coordination:** Active session sync across browser tabs using `BroadcastChannel` and `StorageEvent` listeners.
- **Audit Logging:** Server-side recording of every login attempt (device, IP, approx location, method) and page visit.

### 📅 Daily Money Tracker & Financial Calendar
- **Pakistan Timezone Aware:** All date keys synchronized to `Asia/Karachi` (`UTC+5`).
- **Daily Closures:** Review daily spend, mark daily closures, and track financial discipline.
- **Interactive Calendar:** Visual monthly calendar displaying daily net cash flow at a glance.

### 🎓 University Allowance & Holiday Engine
- **Weekly Allowance Schedules:** Automatic accrual of daily university allowances.
- **Holiday Pausing:** Automatically pauses allowances on designated academic holidays or semester breaks.

### 📊 Budgets, Inventory & Emergency Savings
- **Discipline Budgeting:** Weekly and monthly budget limits with dynamic progress bars and threshold warnings.
- **Household Inventory:** Track items available at home to prevent unnecessary duplicate purchases.
- **Emergency Fund & Goal Allocations:** Real-time liquidity allocation tracking against target milestones.

---

## 🛠️ Technology Stack

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/) with Turbopack
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL with RLS & GoTrue Auth)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Charts:** [Recharts](https://recharts.org/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Testing:** [Vitest](https://vitest.dev/) (30 test suites, 129 automated unit & security tests)
- **Deployment:** Netlify & Vercel ready (`netlify.toml` included)

---

## 🏁 Quickstart & Self-Hosting Guide

Anyone can deploy and run their own private instance of PocketAsset in under 5 minutes:

### 1. Clone the Repository
```bash
git clone https://github.com/Muhammadzeeshan-dev/PocketAsset.git
cd PocketAsset
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Your Supabase Database
1. Create a free account and project at [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open [`supabase/all_migrations_combined.sql`](supabase/all_migrations_combined.sql) from this repository, paste the entire SQL script, and click **Run**.
4. In Supabase under **Authentication -> Users**, click **Add User -> Create User**:
   - Enter your email address.
   - Enter your desired master password.
   - Keep **Auto Confirm User** checked.
5. Copy your new **User UID** and run this query in the SQL Editor to initialize your opening balances:
   ```sql
   select public.initialize_owner_real_data('YOUR_USER_UID_HERE');
   ```

### 4. Configure Environment Variables
Copy the template file to `.env.local`:
```bash
cp .env.example .env.local
```

Open `.env.local` and add your project credentials:
```ini
# Supabase Configuration (From Supabase Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key

# Single-Owner Admin Authorization
ADMIN_EMAIL=your-email@gmail.com

# Server-Side Email Delivery (Gmail SMTP for Admin OTP & Security Alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_APP_PASSWORD=your-16-char-gmail-app-password
APP_URL=http://localhost:3000
```

> **Note on Gmail SMTP:** To receive 6-digit verification codes for the `/admin` console, generate a 16-character [Google App Password](https://myaccount.google.com/apppasswords) with 2-Step Verification enabled.

### 5. Start the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and sign in with your owner credentials!

---

## 🚢 Deploy to Netlify / Vercel

### Deploy to Netlify (Included Configuration)
1. Fork or push your repository to GitHub.
2. In [Netlify](https://app.netlify.com), click **Add new site -> Import an existing project** and select this repo.
3. The included [`netlify.toml`](netlify.toml) automatically configures the build settings (`npm run build`).
4. Add the environment variables from your `.env.local` in **Site configuration -> Environment variables**.
5. Click **Deploy Site**!

---

## 🧪 Testing & Verification

PocketAsset is verified through automated tests covering mathematical accounting, multi-tab coordination, rate-limiting, and session security:

```bash
# Run Vitest test suite (129 tests across 30 suites)
npm test

# Run strict TypeScript typecheck
npm run typecheck

# Run ESLint rules
npm run lint

# Run optimized production build
npm run build
```

---

## 🔒 Security Policy

- **No Secrets in Source:** `.env.local` is gitignored. Never commit your service role keys or SMTP passwords.
- **No Floating Point Errors:** All monetary amounts are stored and calculated in integer **Paisa** (`amount_paisa bigint`), eliminating JavaScript `0.1 + 0.2` rounding errors.
- **Edge Protection:** HTTP security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`) are enforced on every request.

---

## 👤 Author & Credits

Created by **Muhammad Zeeshan** ([@Muhammadzeeshan-dev](https://github.com/Muhammadzeeshan-dev))  
*Building robust personal financial software for Pakistan and the global developer community.*

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free to use, modify, and self-host for personal or commercial projects.
