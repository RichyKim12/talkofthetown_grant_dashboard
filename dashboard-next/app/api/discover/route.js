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
    const formattedToday = today.toISOString().split('T')[0];
    const excludedIds = [...new Set([...historyIds, ...notInterestedIds])];

    const prompt = `
      CONTEXT: You are a grant tracking engine with a large database (1000+) of legitimate small business grants, operating with zero tolerance for speculative invention or fake data. 
      
      TASK: Match the following organization profile against real, verifiable public, private, or corporate grant opportunities that have historically run or are currently recurring.
      
      Organization Name: ${profile.orgName}
      Mission: ${profile.mission || "Not specified"}
      Core Focus Areas: ${profile.focuses.join(", ")}
      Service Area Geographic Region: ${profile.serviceArea || "National / Unrestricted"}
      Annual Operating Income Scale: $${profile.annualIncome || "Unspecified"}

      EXCLUSION LIST: The user has already been shown, applied to, or explicitly marked "not interested" in the grants with the following internal IDs. Do NOT return any grant matching these IDs, and do NOT return a renamed or reworded duplicate of the same underlying real-world opportunity under a different ID:
      ${excludedIds.length > 0 ? excludedIds.join(", ") : "(none — no exclusions yet)"}
      
      
      STRICT ANTI-HALLUCINATION GUARDRAILS:
      1. REAL ENTITIES ONLY: Only return known, historically verifiable grantmakers (e.g., specific corporate foundations, major family funds, state/federal agencies). Never generate fake foundation names.
      2. REAL LINKS REQUIRED: The "sourceUrl" must be a real, official link to the grant guidelines, application form, or foundation home portal. If you cannot verify a real web link for an opportunity, DO NOT include it.
      3. FUTURE DEADLINES ONLY: Today's date is strictly ${formattedToday}. Every returned opportunity MUST have an application deadline or cycle window that closes AFTER ${formattedToday}.
      4. ZERO-QUOTA & MAXIMUM CAP POLICY: There is no minimum item requirement. If no highly accurate, real-world matches with verifiable links are available for this profile, return an empty array [] exactly. If multiple matches exist, you MUST only return the TOP 6 highest-scoring opportunities max. Quality and strict factual accuracy are preferred over quantity.
      5. FOR-PROFIT ELIGIBILITY ONLY: Do not return traditional non-profit grants (like standard CACF or Virginia Humanities project grants). UNLESS they explicitly allow for-profit entities or have a dedicated small business commercial track. Focus instead on corporate small business grants (e.g., FedEx, Venmo, Barclays, Local Chambers) and local state/city economic growth grants. 
      6. APPLICATION FEE ACCURACY: Only state a specific application fee amount if you are confident it is accurate for this opportunity. If there is no fee, or you cannot confirm one, use the exact string "None" rather than guessing a number.

      [Output Format Instructions] 
      Return a valid JSON array of objects. If no matches exist, return []. Each object must contain the following fields:

      - id: A unique slug string (e.g., 'foundation-youth-2026'). 
      - title: Full formal name of the grant opportunity. 
      - source: The issuing foundation or agency name. 
      - sourceUrl: The exact official web URL or portal path where the grant guidelines are hosted.
      - amountMin: Minimum integer dollar amount funded (e.g., 25000). Do not include dollar signs or commas. 
      - amountMax: Maximum integer dollar amount funded (e.g., 50000). Do not include dollar signs or commas. 
      - deadline: A future date string representing when the application closes. Must be chronologically after ${formattedToday} (e.g., '2026-09-15'). 
      - summary: Comprehensive description explaining the relevance of this grant to the organization. 
      - matchScore: Relevancy matching score from 1 to 100 based on their profile. 
      - matchedFocuses: An array of short text strings representing the subset of the user's focus areas that align with this specific grant. 
      - requirements: An array of short text strings detailing the prerequisite criteria or documents needed to apply for the grant. 
      - applicationFee: The exact application fee if one exists, as a plain string (e.g. "$25", "$100"). If there is no fee, or you cannot confirm one exists, use the exact string "None" — do not guess a number.
    `;

    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: prompt,
      // tools: [{ type: "google_search" }],
      generation_config: {
        temperature: 1.0,
        max_output_tokens: 5000,   // <-- see note below

        thinking_level: "medium",  // matches AI Studio; note: snake_case per docs
      },
      response_format: [
        {
          type: "text",
          mime_type: "application/json",
          schema: {
            type: "array",
            description: "A JSON array of real, verified grants matching the data contract. Max 6 items. If zero verified options are confidently found, return an empty array [].",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Unique slug string (e.g., foundation-youth-2026)." },
                title: { type: "string", description: "Full formal name of the grant opportunity." },
                source: { type: "string", description: "The issuing foundation or agency name." },
                sourceUrl: { type: "string", description: "The exact official web URL or portal path where the grant guidelines are hosted." },
                amountMin: { type: "integer", description: "Minimum integer dollar amount funded (e.g. 25000)." },
                amountMax: { type: "integer", description: "Maximum integer dollar amount funded (e.g. 50000)." },
                deadline: { type: "string", description: `A future date after ${formattedToday} in YYYY-MM-DD format.` },
                summary: { type: "string", description: "Comprehensive description explaining the relevance." },
                matchScore: { type: "integer", description: "Relevancy matching score from 1 to 100." },
                matchedFocuses: { type: "array", items: { type: "string" } },
                requirements: { type: "array", items: { type: "string" } },
                applicationFee: { type: "string", description: "The application fee as a dollar string (e.g. '$25'), or the exact string 'None' if there is no fee or it cannot be confirmed." }
              },
              required: ["id","title","source","sourceUrl","amountMin","amountMax","deadline","summary","matchScore","matchedFocuses","requirements","applicationFee"]
            }
          }
        }
      ],
    });

    console.log(interaction.status);

    if (!interaction.output_text || interaction.output_text.trim() === "" || !interaction.output_text.trim().endsWith("]")) {
      console.error("Raw token payload stream arrived incomplete or corrupted from engine.");
      return NextResponse.json({ error: "The engine timed out searching data." }, { status: 504 });
    }

    const grantsData = JSON.parse(interaction.output_text);
    return NextResponse.json({ success: true, grants: grantsData }, { status: 200 });

  } catch (error) {
    console.error("Gemini Grant Discovery API Engine Failure:", error);
    return NextResponse.json({ error: "Internal discovery execution failed." }, { status: 500 });
  }
}