/* ============================================================
   MOCK DATA
   Stand-ins for what will eventually come from Supabase
   (profile, focus taxonomy) and the grant discovery service
   (grant listings). Swap these out without touching any
   screen or component code — see utils/grantService.js for
   the single seam where real APIs will plug in.
   ============================================================ */

export const FOCUS_GROUPS = [
  {
    group: "Language services",
    options: [
      "Spanish instruction",
      "ESL instruction",
      "English instruction",
      "French instruction",
      "Survival Swahili",
      "General language tutoring",
      "Medical language tutoring",
      "Business language tutoring",
      "Tutor referral for other languages",
      "Adult classes",
      "Kids classes",
      "Homeschool classes",
      "Tutoring and academic support",
      "Standardized exam prep",
      "Accent reduction",
    ],
  },
  {
    group: "Food and garden independence",
    options: ["Home gardening education", "Vegetable gardening for food independence"],
  },
  {
    group: "Special services",
    options: [
      "Wine and food pairing classes",
      "Cooking classes",
      "Local foodie tours",
      "Winery tours",
      "City tours",
      "Immersion field trips",
      "Translating",
      "Interpreting",
      "Writing and editing",
      "Travel preparation and planning",
      "Culture theme parties",
    ],
  },
];

export const ALL_FOCUS_OPTIONS = FOCUS_GROUPS.flatMap((g) => g.options);

export const SEED_PROFILE = {
  orgName: "Lengua Viva Language & Cultural Center",
  yearFounded: "2014",
  employees: "8",
  annualIncome: "310000",
  mission:
    "Lengua Viva builds language confidence and cultural connection for adult immigrants, families, and curious travelers in our region, through classes, tutoring, food-and-travel experiences, and translation support.",
  serviceArea: "Prince William County, VA and surrounding areas",
  focuses: [
    "Spanish instruction",
    "ESL instruction",
    "Adult classes",
    "Tutoring and academic support",
    "Translating",
    "Interpreting",
    "Immersion field trips",
    "Local foodie tours",
  ],
};

function makeGrant(overrides) {
  return {
    id: overrides.id,
    name: overrides.name,
    funder: overrides.funder,
    amountMin: overrides.amountMin,
    amountMax: overrides.amountMax,
    deadline: overrides.deadline,
    source: overrides.source,
    sourceUrl: overrides.sourceUrl,
    score: overrides.score,
    matchedFocuses: overrides.matchedFocuses,
    summary: overrides.summary,
    eligibility: overrides.eligibility,
    requirements: overrides.requirements,
  };
}

export const MOCK_GRANTS = [
  makeGrant({
    id: "g1",
    name: "Community Language Access Fund",
    funder: "Virginia Civic Foundation",
    amountMin: 10000,
    amountMax: 25000,
    deadline: "2026-09-15",
    source: "Grantmakers.io",
    sourceUrl: "https://grantmakers.io",
    score: 96,
    matchedFocuses: ["ESL instruction", "Adult classes", "Interpreting"],
    summary:
      "Supports nonprofits delivering English language access and interpreting services to immigrant adults in Virginia communities.",
    eligibility: "501(c)(3) or fiscally sponsored organizations operating in Virginia for 2+ years.",
    requirements: ["Program narrative (2 pages)", "Budget breakdown", "Letter of support", "W-9"],
  }),
  makeGrant({
    id: "g2",
    name: "New Neighbors Education Grant",
    funder: "Hargrove Family Foundation",
    amountMin: 5000,
    amountMax: 15000,
    deadline: "2026-08-01",
    source: "Instrumentl",
    sourceUrl: "https://www.instrumentl.com",
    score: 91,
    matchedFocuses: ["ESL instruction", "Tutoring and academic support", "Kids classes"],
    summary:
      "Funds tutoring and academic support programs serving immigrant and refugee children and families adjusting to a new school system.",
    eligibility: "Community-based organizations serving K-12 immigrant students.",
    requirements: ["Application form", "Program outcomes data", "Organizational budget"],
  }),
  makeGrant({
    id: "g3",
    name: "Food, Culture and Connection Microgrant",
    funder: "Piedmont Community Trust",
    amountMin: 2500,
    amountMax: 7500,
    deadline: "2026-07-30",
    source: "Grantmakers.io",
    sourceUrl: "https://grantmakers.io",
    score: 88,
    matchedFocuses: ["Local foodie tours", "Immersion field trips", "Culture theme parties"],
    summary:
      "Small grants for programs that connect neighbors across cultures through shared meals, tours, and hands-on cultural experiences.",
    eligibility: "Nonprofits and community groups; no minimum operating history required.",
    requirements: ["1-page proposal", "Simple budget", "Photos from past programming (optional)"],
  }),
  makeGrant({
    id: "g4",
    name: "Multilingual Workforce Readiness Award",
    funder: "Commonwealth Workforce Alliance",
    amountMin: 15000,
    amountMax: 40000,
    deadline: "2026-10-10",
    source: "Instrumentl",
    sourceUrl: "https://www.instrumentl.com",
    score: 84,
    matchedFocuses: ["Business language tutoring", "ESL instruction", "Standardized exam prep"],
    summary:
      "Supports organizations helping multilingual adults gain workplace-ready English and professional certification skills.",
    eligibility: "Organizations with documented workforce outcomes; 3+ years operating preferred.",
    requirements: ["Full proposal (4 pages)", "Logic model", "Audited financials or Form 990", "2 letters of reference"],
  }),
  makeGrant({
    id: "g5",
    name: "Grow Your Own: Food Independence Grant",
    funder: "Greenfield Sustainability Fund",
    amountMin: 3000,
    amountMax: 9000,
    deadline: "2026-09-01",
    source: "Grantmakers.io",
    sourceUrl: "https://grantmakers.io",
    score: 79,
    matchedFocuses: ["Vegetable gardening for food independence", "Home gardening education"],
    summary:
      "Funds community gardening education programs that build household food independence, especially in underserved neighborhoods.",
    eligibility: "Community organizations with an active or planned garden education program.",
    requirements: ["Project description", "Site plan or partnership letter", "Budget"],
  }),
  makeGrant({
    id: "g6",
    name: "Bridges Through Translation Fund",
    funder: "Open Door Legal Foundation",
    amountMin: 8000,
    amountMax: 20000,
    deadline: "2026-08-20",
    source: "Instrumentl",
    sourceUrl: "https://www.instrumentl.com",
    score: 76,
    matchedFocuses: ["Translating", "Interpreting", "Writing and editing"],
    summary:
      "Supports nonprofit translation and interpreting capacity for organizations serving limited-English-proficient residents.",
    eligibility: "501(c)(3) organizations providing direct translation or interpreting services.",
    requirements: ["Application form", "Staff qualifications summary", "Budget narrative"],
  }),
  makeGrant({
    id: "g7",
    name: "Small Cultural Nonprofits Capacity Grant",
    funder: "Mid-Atlantic Arts and Culture Council",
    amountMin: 5000,
    amountMax: 12000,
    deadline: "2026-11-05",
    source: "Grantmakers.io",
    sourceUrl: "https://grantmakers.io",
    score: 71,
    matchedFocuses: ["Culture theme parties", "Winery tours", "City tours"],
    summary:
      "General operating support for small organizations offering cultural enrichment and experiential learning programs.",
    eligibility: "Annual revenue under $1M; based in the Mid-Atlantic region.",
    requirements: ["Cover letter", "Budget", "Board list"],
  }),
];
