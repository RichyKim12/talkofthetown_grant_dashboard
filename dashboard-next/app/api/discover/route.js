import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { profile, historyIds = [], notInterestedIds = [] } = await request.json();

    if (!profile || !profile.focuses || profile.focuses.length === 0) {
      return NextResponse.json(
        { error: "Missing organization profile or focus areas for discovery tracking." },
        { status: 400 }
      );
    }

    const today = new Date();
    const formattedToday = today.toISOString().split("T")[0];
    const excludedIds = [...new Set([...historyIds, ...notInterestedIds])];

    const prompt = `
      CONTEXT: You are a grant tracking engine operating with zero tolerance for speculative invention or fake data. 
      
      TASK: Match the following organization profile against real, verifiable public, private, or corporate grant opportunities.
      
      Organization Name: ${profile.orgName}
      Mission: ${profile.mission || "Not specified"}
      Core Focus Areas: ${profile.focuses.join(", ")}
      Service Area Geographic Region: ${profile.serviceArea || "National / Unrestricted"}
      Annual Operating Income Scale: $${profile.annualIncome || "Unspecified"}

      EXCLUSION LIST: Do NOT return any grant matching these IDs:
      ${excludedIds.length > 0 ? excludedIds.join(", ") : "(none — no exclusions yet)"}
      
      STRICT GUARDRAILS:
      1. REAL ENTITIES ONLY: Only return known, verifiable grantmakers.
      2. REAL LINKS REQUIRED: The "sourceUrl" must be an official web link.
      3. FUTURE DEADLINES ONLY: Today's date is strictly ${formattedToday}. Every opportunity MUST close AFTER ${formattedToday}.
      4. MAXIMUM 6 MATCHES: Return up to 6 of the highest-scoring opportunities max.
      5. FOR-PROFIT ELIGIBILITY: Focus on small business and commercial grants.
      6. APPLICATION FEE: Use exact string "None" if there is no fee or if unconfirmed.
    `;

    // Define strict JSON schema
    const grantSchema = {
      type: "array",
      description: "Array of real verified grants.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          source: { type: "string" },
          sourceUrl: { type: "string" },
          amountMin: { type: "integer" },
          amountMax: { type: "integer" },
          deadline: { type: "string" },
          summary: { type: "string" },
          matchScore: { type: "integer" },
          matchedFocuses: { type: "array", items: { type: "string" } },
          requirements: { type: "array", items: { type: "string" } },
          applicationFee: { type: "string" }
        },
        required: [
          "id", "title", "source", "sourceUrl", "amountMin", 
          "amountMax", "deadline", "summary", "matchScore", 
          "matchedFocuses", "requirements", "applicationFee"
        ]
      }
    };

    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: prompt,
      // Top-level response_format object for structured outputs
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: grantSchema
      },
      generation_config: {
        temperature: 0.2,
        max_output_tokens: 10000,
        thinking_level: "medium"
      }
    });

    const rawText = interaction.output_text?.trim();

    if (!rawText) {
      return NextResponse.json({ error: "The engine returned an empty response." }, { status: 502 });
    }

    const grantsData = JSON.parse(rawText);
    return NextResponse.json({ success: true, grants: grantsData }, { status: 200 });

  } catch (error) {
    console.error("Gemini Grant Discovery API Engine Failure:", error);

    const errString = String(error?.message || error);
    if (errString.includes("401") || errString.includes("403") || errString.toLowerCase().includes("key")) {
      return NextResponse.json({ error: "Invalid or missing GEMINI_API_KEY credentials." }, { status: 401 });
    }

    if (errString.includes("429") || errString.toLowerCase().includes("quota")) {
      return NextResponse.json({ error: "Gemini rate limit or quota exceeded." }, { status: 429 });
    }

    return NextResponse.json({ error: "Internal discovery execution failed." }, { status: 500 });
  }
}