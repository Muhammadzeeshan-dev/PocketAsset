import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const weekStart = url.searchParams.get("weekStart") || "";
    const weekEnd = url.searchParams.get("weekEnd") || "";

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        calendarDays: [],
        closures: [],
      });
    }

    let calendarQuery = supabase.from("calendar_days").select("*");
    let closureQuery = supabase.from("day_closures").select("*");

    if (weekStart && weekEnd) {
      calendarQuery = calendarQuery.gte("date", weekStart).lte("date", weekEnd);
      closureQuery = closureQuery.gte("date", weekStart).lte("date", weekEnd);
    }

    const [calendarRes, closureRes] = await Promise.all([
      calendarQuery,
      closureQuery,
    ]);

    return NextResponse.json({
      success: true,
      calendarDays: calendarRes.data ?? [],
      closures: closureRes.data ?? [],
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to load calendar records";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type, payload } = body;

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: true, data: payload });
    }

    if (type === "closure") {
      const { data, error } = await supabase
        .from("day_closures")
        .upsert(payload, { onConflict: "user_id,date" })
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (type === "schedule") {
      const { data, error } = await supabase
        .from("calendar_days")
        .upsert(payload, { onConflict: "user_id,date" })
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: "Invalid type specified" }, { status: 400 });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to save calendar data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
