import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: true, schedules: [] });
    }

    const { data, error } = await supabase
      .from("recurring_expense_schedules")
      .select("*")
      .order("next_due_date", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      schedules: data ?? [],
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to load recurring expense schedules";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, scheduleId, payload } = body;

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: true, data: payload });
    }

    if (action === "create") {
      const { data, error } = await supabase
        .from("recurring_expense_schedules")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "toggle" && scheduleId) {
      const { data, error } = await supabase
        .from("recurring_expense_schedules")
        .update({
          active: payload.active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scheduleId)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "confirm" && scheduleId) {
      // 1. Insert confirmed expense transaction
      if (payload.transaction) {
        const { error: txErr } = await supabase
          .from("transactions")
          .insert(payload.transaction);
        if (txErr && txErr.code !== "23505") throw txErr;
      }

      // 2. Advance the schedule
      const { data, error } = await supabase
        .from("recurring_expense_schedules")
        .update({
          next_due_date: payload.nextDueDate,
          active: payload.stillActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scheduleId)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to execute recurring expense schedule action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
