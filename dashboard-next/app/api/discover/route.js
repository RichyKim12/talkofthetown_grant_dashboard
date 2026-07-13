// app/api/discover/route.js
import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {


  try {
    const { profile } = await request.json();

    if (!profile || !profile.focuses || profile.focuses.length === 0) {
      return NextResponse.json(
        { error: "Missing organization profile or focus areas for discovery tracking." },
        { status: 400 }
      );
    }

    // Capture the absolute current system date
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0]; // e.g., "2026-07-08"

    const prompt = `
      CONTEXT: You are a hyper-factual grant tracking engine operating with zero tolerance for speculative invention, fake data, or broken links.
      
      TASK: Match the following organization profile against real, verifiable public, private, or corporate grant opportunities that have historically run or are currently recurring.
      
      Organization Name: ${profile.orgName}
      Mission: ${profile.mission || "Not specified"}
      Core Focus Areas: ${profile.focuses.join(", ")}
      Service Area Geographic Region: ${profile.serviceArea || "National / Unrestricted"}
      Annual Operating Income Scale: $${profile.annualIncome || "Unspecified"}
      
      STRICT ANTI-HALLUCINATION GUARDRAILS:
      1. REAL ENTITIES ONLY: Only return known, historically verifiable grantmakers (e.g., specific corporate foundations, major family funds, state/federal agencies). Never generate fake foundation names.
      2. REAL LINKS REQUIRED: The "sourceUrl" must be a real, official link to the grant guidelines, application form, or foundation home portal. If you cannot verify a real web link for an opportunity, DO NOT include it.
      3. FUTURE DEADLINES ONLY: Today's date is strictly ${formattedToday}. Every returned opportunity MUST have an application deadline or cycle window that closes AFTER ${formattedToday}.
      4. ZERO-QUOTA & MAXIMUM CAP POLICY: There is no minimum item requirement. If no highly accurate, real-world matches with verifiable links are available for this profile, return an empty array [] exactly. If multiple matches exist, you MUST only return the TOP 6 highest-scoring opportunities max. Quality and strict factual accuracy are preferred over quantity.
      5. FOR-PROFIT ELIGIBILITY ONLY: Do not return traditional non-profit grants (like standard CACF or Virginia Humanities project grants). UNLESS they explicitly allow for-profit entities or have a dedicated small business commercial track. Focus instead on corporate small business grants (e.g., FedEx, Venmo, Barclays, Local Chambers) and local state/city economic growth grants. 

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
    `;

    // console.log(prompt);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,    // Kept low for high predictability and factuality
        topP: 0.2,
        maxOutputTokens: 8192,
        thinkingConfig: {
          thinkingBudget: 1024, // cap reasoning tokens so output isn't starved
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          // Explicitly capping schema contract target at 6 items max to guarantee runtime safety
          description: `A JSON array of real, verified grants matching the data contract. Max 6 items. If zero verified options are confidently found, return an empty array [].`,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique slug string (e.g., foundation-youth-2026)." },
              title: { type: Type.STRING, description: "Full formal name of the grant opportunity." },
              source: { type: Type.STRING, description: "The issuing foundation or agency name." },
              sourceUrl: { type: Type.STRING, description: "The exact official web URL or portal path where the grant guidelines are hosted." },
              amountMin: { type: Type.INTEGER, description: "Minimum integer dollar amount funded (e.g. 25000)." },
              amountMax: { type: Type.INTEGER, description: "Maximum integer dollar amount funded (e.g. 50000)." },
              deadline: {
                type: Type.STRING,
                description: `A future date string representing when the application closes. Must be chronologically after ${formattedToday} in YYYY-MM-DD format.`
              },
              summary: { type: Type.STRING, description: "Comprehensive description explaining the relevance." },
              matchScore: { type: Type.INTEGER, description: "Relevancy matching score from 1 to 100." },
              matchedFocuses: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Subset of the user's focus areas that align with this specific grant resource."
              },
              requirements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of prerequisite criteria or documents needed to apply for the grant."
              }
            },
            required: [
              "id",
              "title",
              "source",
              "sourceUrl",
              "amountMin",
              "amountMax",
              "deadline",
              "summary",
              "matchScore",
              "matchedFocuses",
              "requirements"
            ],
          },
        },
      },
    });
    console.log(response.candidates?.[0]?.finishReason);
    console.log(response.usageMetadata);
    // Check if response stream cut off abruptly before array layout finalized
    if (!response.text || response.text.trim() === "" || !response.text.endsWith("]")) {
      console.error("Raw token payload stream arrived incomplete or corrupted from engine.");
      return NextResponse.json({ error: "The engine timed out searching data. Try focusing your search area criteria tags." }, { status: 504 });
    }

    const grantsData = JSON.parse(response.text);
    return NextResponse.json({ success: true, grants: grantsData }, { status: 200 });

  } catch (error) {
    console.error("Gemini Grant Discovery API Engine Failure:", error);
    return NextResponse.json(
      { error: "Internal discovery execution failed." },
      { status: 500 }
    );
  }
}