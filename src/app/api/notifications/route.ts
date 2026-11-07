import { NextResponse } from "next/server";
import { getSecurityNotifications, markNotificationAsRead } from "@/lib/security-store";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
          return NextResponse.json({ error: "Unauthorized access to notifications" }, { status: 401 });
        }
      } else if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
    }

    const notifications = await getSecurityNotifications();
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    return NextResponse.json({ notifications, unreadCount });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to load notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
          return NextResponse.json({ error: "Unauthorized access to notifications" }, { status: 401 });
        }
      } else if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const { id } = body;
    await markNotificationAsRead(id);
    return NextResponse.json({ success: true });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to mark notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
