import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(req) {
  try {
    const orgId = 1;

    const { data, error } = await supabase
      .from("muted_grants")
      .select("grant_id")
      .eq("org_id", orgId);

    if (error) throw error;

    // Map rows down to a flat array of IDs: ["id1", "id2"]
    const mutedIds = data ? data.map((item) => item.grant_id) : [];

    return NextResponse.json({ success: true, mutedIds });
  } catch (error) {
    console.error("Failed to retrieve muted grants:", error);
    return NextResponse.json({ error: "Could not fetch muted items" }, { status: 500 });
  }
}