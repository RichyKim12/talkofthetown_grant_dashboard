import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { grantId } = body;

    if (!grantId) {
      return NextResponse.json({ error: "Missing grantId." }, { status: 400 });
    }

    const orgId = 1; // Keeping it consistent with your hardcoded org_id: 1

    // Upsert into a muted_grants table to persist the choice
    const { data, error } = await supabase
      .from("muted_grants")
      .upsert(
        {
          org_id: orgId,
          grant_id: String(grantId), // Force string conversion for safety
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,grant_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to mute grant in database:", error);
    return NextResponse.json({ error: "Could not save preference" }, { status: 500 });
  }
}