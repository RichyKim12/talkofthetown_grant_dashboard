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
    const formattedToday = today.toISOString().split('T')[0]; // e.g., "2026-07-06"

    const prompt = `
      CONTEXT: You are a hyper-factual grant tracking engine operating with zero tolerance for speculative invention or fake data.
      
      TASK: Match the following organization profile against real, verifiable public, private, or corporate grant opportunities that have historically run or are currently recurring.
      
      Organization Name: ${profile.orgName}
      Mission: ${profile.mission || "Not specified"}
      Core Focus Areas: ${profile.focuses.join(", ")}
      Service Area Geographic Region: ${profile.serviceArea || "National / Unrestricted"}
      Annual Operating Income Scale: $${profile.annualIncome || "Unspecified"}
      
      STRICT ANTI-HALLUCINATION GUARDRAILS:
      1. REAL ENTITIES ONLY: Only return known, historically verifiable grantmakers (e.g., specific corporate foundations, major family funds, state/federal agencies). Never generate fake foundation names.
      2. FUTURE DEADLINES ONLY: Today's date is strictly ${formattedToday}. Every returned opportunity MUST have an application deadline or cycle window that closes AFTER ${formattedToday}.
      3. HANDLING UNKNOWN DEADLINES: If the exact current cycle deadline has not been publicly finalized by the funder, extrapolate from their historical cadence and project a realistic upcoming future deadline (e.g., later in 2026 or early 2027) based strictly on past application windows.

      [Output Format Instructions] 

      Provide the output as a valid JSON Array containing exactly 10 objects. Each object must include all of the following fields: 

        

      - id: A unique slug string (e.g., 'foundation-youth-2026'). 

      - title: Full formal name of the grant opportunity. 

      - source: The issuing foundation or agency name. 

      - amountMin: Minimum integer dollar amount funded (e.g., 25000). Do not include dollar signs or commas. 

      - amountMax: Maximum integer dollar amount funded (e.g., 50000). Do not include dollar signs or commas. 

      - deadline: A future date string representing when the application closes. Must be chronologically after July 1, 2026 (e.g., '2026-09-15' or 'October 1, 2026'). 

      - summary: Comprehensive description explaining the relevance of this grant to the organization. 

      - matchScore: Relevancy matching score from 1 to 100 based on their profile. 

      - matchedFocuses: An array of short text strings representing the subset of the user's focus areas that align with this specific grant. 

      - requirements: An array of short text strings detailing the prerequisite criteria or documents needed to apply for the grant. 
      `;
    console.log(prompt);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        // --- DETERMINISTIC TUNING PARAMETERS ---
        temperature: 0.1,    // Forces factual, predictable token choices instead of creative ones
        topP: 0.2,           // Limits the token selection pool to only the most confident options
        maxOutputTokens: 8192,

        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: `List of 10 verified grants matching the data contract. All deadlines must be strictly after ${formattedToday}.`,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique slug string (e.g., foundation-youth-2026)." },
              title: { type: Type.STRING, description: "Full formal name of the grant opportunity." },
              source: { type: Type.STRING, description: "The issuing foundation or agency name." },
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