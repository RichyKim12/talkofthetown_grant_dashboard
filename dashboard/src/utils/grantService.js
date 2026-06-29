/* ============================================================
   GRANT DISCOVERY SERVICE — mock implementation

   This file is the ONLY place that should change when the real
   backend is wired up. The screen calls discoverGrants(profile)
   and awaits a ranked array of grant objects. It does not know
   or care whether, under the hood, that means:

     (a) Gemini doing a live web search itself, or
     (b) a dedicated grant API/scraper (e.g. Instrumentl) fetching
         listings first, then Gemini ranking them against the
         profile

   Both approaches return the same shape, so the decision can be
   made later without touching any screen or component code.

   Expected grant shape (see data/mockData.js for full examples):
   {
     id, name, funder, amountMin, amountMax, deadline,
     source, sourceUrl, score, matchedFocuses,
     summary, eligibility, requirements
   }
   ============================================================ */

import { MOCK_GRANTS } from "../data/mockData";

/**
 * Simulates the full discovery + ranking pipeline with staged
 * progress updates, so the UI can show meaningful status text
 * instead of a generic spinner.
 *
 * @param {object} profile - the organization profile (focuses, mission, etc.)
 * @param {(message: string) => void} onProgress - called with human-readable status updates
 * @returns {Promise<object[]>} ranked grants, highest score first, capped at 10
 */
export async function discoverGrants(profile, onProgress = () => {}) {
  if (!profile.focuses || profile.focuses.length === 0) {
    throw new Error("NO_FOCUS_AREAS");
  }

  onProgress("Searching Grantmakers.io and Instrumentl for open grants…");
  await wait(1500);

  onProgress("Comparing grant requirements to your organization profile…");
  await wait(1200);

  onProgress("Ranking matches by relevance to your stated values…");
  await wait(1300);

  const ranked = [...MOCK_GRANTS].sort((a, b) => b.score - a.score).slice(0, 10);
  return ranked;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
