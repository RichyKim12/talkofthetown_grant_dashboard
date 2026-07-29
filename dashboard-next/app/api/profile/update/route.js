import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function PATCH(request) {
  try {
    const { min_match_score } = await request.json();

    if (min_match_score === undefined) {
      return NextResponse.json(
        { error: "Missing score threshold parameter configuration." }, 
        { status: 400 }
      );
    }

    const orgId = 1; // Explicitly kept unified with organization profile tracking identity context structures

    const { data, error } = await supabase
      .from("profiles")
      .update({ min_match_score: Number(min_match_score) })
      .eq("id", orgId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, profile: data }, { status: 200 });
  } catch (error) {
    console.error("Profile preference configuration sync engine failure:", error);
    return NextResponse.json(
      { error: "Could not update user threshold configuration preferences." }, 
      { status: 500 }
    );
  }
}