// app/api/proposals/route.js
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { profile, grant } = await request.json();

    if (!profile || !grant) {
      return NextResponse.json({ error: "Missing organization profile or grant target data." }, { status: 400 });
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

    console.log(prompt);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({ success: true, text: response.text }, { status: 200 });

  } catch (error) {
    console.error("Gemini Proposal Generation Engine Failure:", error);
    return NextResponse.json({ error: "Internal proposal drafting execution failed." }, { status: 500 });
  }
}