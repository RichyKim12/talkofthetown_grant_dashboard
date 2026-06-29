/* ============================================================
   PROPOSAL SERVICE — mock implementation

   Like grantService.js, this is the seam where the real Gemini
   proposal-writing call will plug in. The screen calls
   generateProposal(profile, grant) and awaits a draft string.
   ============================================================ */

/**
 * @param {object} profile - organization profile
 * @param {object} grant - the selected grant to write a proposal for
 * @returns {Promise<string>} draft proposal text
 */
export async function generateProposal(profile, grant) {
  await wait(2200 + Math.random() * 800);
  return buildMockProposal(profile, grant);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMockProposal(profile, grant) {
  const yearsActive = new Date().getFullYear() - Number(profile.yearFounded || new Date().getFullYear());

  return `Grant Proposal

${profile.orgName}
Application for: ${grant.name}
Funder: ${grant.funder}
Requested amount: $${grant.amountMin.toLocaleString()} – $${grant.amountMax.toLocaleString()}


1. Organization overview

${profile.orgName} has served ${profile.serviceArea || "our community"} since ${profile.yearFounded}, building language confidence and cultural connection for the families and adults we work with. With a team of ${profile.employees} staff and an annual operating budget of $${Number(profile.annualIncome || 0).toLocaleString()}, we have built a track record of practical, community-rooted programming.

${profile.mission}

2. Statement of need

${grant.summary}

Our programs in ${grant.matchedFocuses.join(", ")} directly align with this fund's priorities. Demand for these services continues to outpace our current capacity, particularly among adult learners and families balancing work, school, and language access barriers.

3. Project description

With support from ${grant.funder}, ${profile.orgName} will expand our ${grant.matchedFocuses[0] || "core"} programming over the coming grant period. This includes increased class capacity, expanded tutor referral support, and dedicated staff time for participant follow-up and outcome tracking.

4. Goals and anticipated outcomes

- Increase enrollment in ${grant.matchedFocuses[0] || "our core program"} by a meaningful margin within the grant period
- Track participant progress through regular assessment and feedback
- Strengthen partnerships with local community organizations and referral sources

5. Budget summary

We respectfully request $${grant.amountMax.toLocaleString()} to support staffing, instructional materials, and participant support costs associated with this work. A detailed line-item budget is available upon request.

6. Organizational capacity

${profile.orgName} has operated for ${yearsActive} years and is well positioned to deliver on this proposal, with established curricula, experienced staff, and active community relationships.

Thank you for considering our request. We welcome the opportunity to discuss this proposal further.
`;
}
