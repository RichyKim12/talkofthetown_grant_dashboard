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
    const formattedToday = today.toISOString().split('T')[0]; // e.g., "2026-06-29"

    const prompt = `
      You are an expert grant discovery engine. Find the top 10 current, highly relevant public, private, or corporate grant sources available for the following organization:
      
      Organization Name: ${profile.orgName}
      Mission: ${profile.mission || "Not specified"}
      Core Focus Areas: ${profile.focuses.join(", ")}
      Service Area Geographic Region: ${profile.serviceArea || "National / Unrestricted"}
      Annual Operating Income Scale: $${profile.annualIncome || "Unspecified"}
      
      CRITICAL REQUIREMENT FOR DEADLINES:
      Today's date is strictly ${formattedToday}. You MUST ONLY return active, future grant opportunities whose application deadlines fall AFTER ${formattedToday}. 
      Do not include any expired, past, or closed grants. If a specific deadline date is unknown, project a realistic upcoming future cycle deadline for later this year or early next year.
      
      For each grant, explicitly provide an array of short strings in 'requirements' detailing the application criteria.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: `List of 10 relevant grants matching the data contract. All deadlines must be strictly after ${formattedToday}.`,
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
                description: `A future date string representing when the application closes. Must be chronologically after ${formattedToday} (e.g., '2026-09-15' or 'October 1, 2026').` 
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