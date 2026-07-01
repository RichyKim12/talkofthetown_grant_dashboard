// app/api/proposals/route.js
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// 1. RETRIEVAL — loads saved drafts for the workspace on mount
export async function GET(req) {
  try {
    const orgId = 1;

    const { data, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("org_id", orgId);

    if (error) throw error;

    return NextResponse.json({ success: true, proposals: data || [] });
  } catch (error) {
    console.error("Failed to retrieve cloud drafts:", error);
    return NextResponse.json({ error: "Could not fetch documents" }, { status: 500 });
  }
}

// 2. GENERATE + PERSIST — calls Gemini, then saves the result to Supabase
export async function POST(request) {
  try {
    const { profile, grant } = await request.json();

    if (!profile || !grant) {
      return NextResponse.json(
        { error: "Missing organization profile or grant target data." },
        { status: 400 }
      );
    }

    const prompt = `
      You are an expert executive grant writer. Write a comprehensive, persuasive, and highly professional first-draft grant proposal for ${profile.orgName} applying for the "${grant.title || grant.name}" issued by ${grant.source || grant.funder}.

      --- ORGANIZATION CONTEXT ---
      Mission & Values: ${profile.mission || "Not specified"}
      Core Competencies/Focuses: ${profile.focuses?.join(", ") || "General community service"}
      Geographic Region Served: ${profile.serviceArea || "General / Unrestricted"}

      --- GRANT DETAILS ---
      Funding Bracket Target: $${grant.amountMin?.toLocaleString()} - $${grant.amountMax?.toLocaleString()}
      Identified Matching Overlaps: ${grant.matchedFocuses?.join(", ") || "General Alignment"}
      Prerequisite Requirements: ${grant.requirements?.join(", ") || "Standard compliance"}

      --- PROPOSAL FORMATTING STRUCTURE ---
      Please format the response text cleanly using professional markdown sections:
      # Grant Proposal Draft: ${grant.title || grant.name}

      ## 1. Executive Summary
      [Provide a compelling 2-3 sentence overview of why this partnership creates systemic impact.]

      ## 2. Statement of Need & Alignment
      [Detail how the organization's focus areas directly solve the core mission of the grant issuer.]

      ## 3. Project Narrative & Execution Plan
      [A structured strategy on how the funding allocation will be maximized.]

      ## 4. Organizational Qualifications
      [Highlight history, values, and reliability to successfully manage compliance constraints.]
    `;

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const proposalText = geminiResponse.text;

    if (!proposalText || !proposalText.trim()) {
      return NextResponse.json(
        { error: "Gemini returned an empty draft." },
        { status: 502 }
      );
    }

    const orgId = 1;
    const grantId = grant.id || grant.grant_id;

    const { data, error } = await supabase
      .from("proposals")
      .upsert(
        {
          org_id: orgId,
          grant_id: grantId,
          grant_title: grant.title || grant.name,
          grant_funder: grant.source || grant.funder || "Unknown Funder",
          proposal_text: proposalText,
          status: "draft",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,grant_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Gemini Proposal Generation Engine Failure:", error);
    return NextResponse.json(
      { error: "Internal proposal drafting execution failed." },
      { status: 500 }
    );
  }
}

// Add to app/api/proposals/route.js — plain save, no Gemini call
export async function PATCH(request) {
  try {
    const { grantId, grantTitle, grantFunder, proposalText, status } = await request.json();

    if (!grantId) {
      return NextResponse.json({ error: "Missing grantId." }, { status: 400 });
    }

    const orgId = 1;

    const { data, error } = await supabase
      .from("proposals")
      .upsert(
        {
          org_id: orgId,
          grant_id: grantId,
          grant_title: grantTitle,
          grant_funder: grantFunder,
          proposal_text: proposalText,
          status: status || "draft",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,grant_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Plain save failure:", error);
    return NextResponse.json({ error: error.message || "Save failed" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const grantId = searchParams.get("grantId");
 
    if (!grantId) {
      return NextResponse.json({ error: "Missing grantId." }, { status: 400 });
    }
 
    const orgId = 1;
 
    const { error } = await supabase
      .from("proposals")
      .delete()
      .eq("org_id", orgId)
      .eq("grant_id", grantId);
 
    if (error) throw error;
 
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete failure:", error);
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
  }
}
