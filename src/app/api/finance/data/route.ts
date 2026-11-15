import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { isSessionRevoked, touchSessionActivity } from "@/lib/security-store";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (sessionId) {
      const revoked = await isSessionRevoked(sessionId);
      if (revoked) {
        return NextResponse.json(
          { error: "Session has been revoked or expired due to inactivity." },
          { status: 401 },
        );
      }
      await touchSessionActivity(sessionId);
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: "Supabase server client not configured",
      });
    }

    // Fetch accounts and balances using service role key
    const [balancesRes, accountsRes, txsRes] = await Promise.all([
      supabase.from("account_balances").select("*").order("created_at", { ascending: true }),
      supabase.from("accounts").select("*").order("created_at", { ascending: true }),
      supabase.from("transactions").select("*").is("deleted_at", null).order("occurred_at", { ascending: true }),
    ]);

    const accounts = (balancesRes.data && balancesRes.data.length > 0)
      ? balancesRes.data
      : (accountsRes.data ?? []);

    return NextResponse.json({
      success: true,
      accounts: accounts.map((a: any) => ({
        ...a,
        opening_balance_paisa: String(a.opening_balance_paisa || 0),
        current_balance_paisa: a.current_balance_paisa ? String(a.current_balance_paisa) : undefined,
      })),
      transactions: (txsRes.data ?? []).map((t: any) => ({
        ...t,
        amount_paisa: String(t.amount_paisa || 0),
      })),
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to load financial data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
