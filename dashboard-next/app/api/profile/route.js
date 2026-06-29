// app/api/profile/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/utils/supabaseServer";


export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("profiles")
      .select("*")
      .eq("id", 1) // Your locked down single-user ID constraint
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no row exists yet in a fresh DB, send a safe fallback object
    if (!data) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    // Map snake_case database schema values back into React camelCase keys
    const profileData = {
      id: data.id,
      orgName: data.org_name,
      yearFounded: data.year_founded || "",
      employees: data.employees || "",
      annualIncome: data.annual_income || "",
      serviceArea: data.service_area || "",
      mission: data.mission || "",
      focuses: data.focuses || [],
      customFocuses: data.custom_focuses || []
    };

    return NextResponse.json({ profile: profileData }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function POST(request) {
  try {
    const body = await request.json();

    // 1. Backend validation safety checks
    if (!body.orgName?.trim()) {
      return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
    }
    if (!body.focuses || body.focuses.length === 0) {
      return NextResponse.json({ error: "Select at least one focus area." }, { status: 400 });
    }

    // 2. Persist to Supabase Database
    // We match/upsert on 'id' or another unique column. Adjust 'id: 1' if you handle multiple accounts!
    const { data, error } = await supabaseServer
      .from("profiles")
      .upsert({
        id: 1, 
        org_name: body.orgName,
        year_founded: Number(body.yearFounded),
        employees: Number(body.employees),
        annual_income: Number(body.annualIncome),
        service_area: body.serviceArea,
        mission: body.mission,
        focuses: body.focuses,             // Saves perfectly as a text[] array or jsonb type in Supabase
        custom_focuses: body.customFocuses  // Saves perfectly as a text[] array or jsonb type in Supabase
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase Error:", error.message);
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    // 3. Map database snake_case fields back to your React frontend camelCase naming structure
    const updatedProfile = {
      id: data.id,
      orgName: data.org_name,
      yearFounded: data.year_founded,
      employees: data.employees,
      annualIncome: data.annual_income,
      serviceArea: data.service_area,
      mission: data.mission,
      focuses: data.focuses,
      customFocuses: data.custom_focuses
    };

    return NextResponse.json({ success: true, profile: updatedProfile }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}