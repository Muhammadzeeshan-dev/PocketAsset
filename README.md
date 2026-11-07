# PocketAsset 💎

> **Track Every Rupee. Build Your Wealth.**  
> A private, self-hosted personal finance and wealth management platform designed for individuals in Pakistan and worldwide.

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-72%20Passed-6E9F18?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 📌 Overview

**PocketAsset** is not a basic expense tracker. It is a full-fledged, private wealth management platform engineered for complete financial visibility and disciplined wealth accumulation.

Built specifically to handle the realities of Pakistani personal finance (PKR currency, JazzCash, Easypaisa, Cash in hand, Commercial Bank accounts, and Pakistan Stock Exchange investments), PocketAsset is **100% open-source and self-hostable** so anyone can deploy their own instance and manage their finances with complete privacy and zero third-party data tracking.

---

## 🚀 Key Features

### 💰 Complete Liquid Cash & Multi-Wallet Management
- **Separate Account Ledgers:** Track Cash in hand, JazzCash, Easypaisa, Bank Accounts, Savings Accounts, and Brokerage Cash Balances.
- **Accurate Balance Synchronization:** Live balances calculated from verified transaction history.
- **Inter-Account Transfers:** Transfer funds between wallets (e.g. Bank to JazzCash) with zero balance leakage.

### 📈 Pakistan Stock Exchange (PSX) Investment Portfolio
- **Holdings Tracker:** Track shares quantity, average purchase price, current market price, and snapshot valuation.
- **Real-Time P&L:** Instant calculation of invested cost, current portfolio value, and unrealized profit/loss per holding.
- **Brokerage Cash Sync:** Dedicated cash balance accounting for equity investing.

### 🛡️ Enterprise Security & Privacy (Single-Owner Model)
- **Zero SaaS Bloat:** No public registration, no employee management, no multi-tenant data sharing. Dedicated strictly to one owner.
- **Supabase PostgreSQL RLS:** Strict Row Level Security policies enforce `(auth.uid() = user_id)` at the database level.
- **Two-Factor Email OTP for Admin:** Cryptographic SHA-256 HMAC verification codes delivered via Gmail SMTP to open the Security Console.
- **5-Minute Inactivity Auto-Logout:** Authoritative server-side inactivity timeout with an interactive 60-second warning modal (`"Are you still there?"`).
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
- **Testing:** [Vitest](https://vitest.dev/) (15 test suites, 72 automated unit & security tests)
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
# Run Vitest test suite (72 tests)
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
