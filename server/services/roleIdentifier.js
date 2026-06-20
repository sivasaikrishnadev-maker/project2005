/**
 * roleIdentifier.js
 *
 * HOW THE SCORING WORKS (viva-ready explanation):
 * ─────────────────────────────────────────────────────────────────────────────
 * Each role profile defines two skill lists:
 *   coreSkills   — must-have skills for the role (weight = 2 per match)
 *   bonusSkills  — nice-to-have skills (weight = 1 per match)
 *
 * RAW SCORE formula:
 *   rawScore = (coreMatches × 2 + bonusMatches × 1)
 *              ─────────────────────────────────────
 *              (totalCoreSkills × 2 + totalBonusSkills × 1)
 *
 * This intentionally penalises a role where the user is missing core skills
 * more than when they are missing bonus skills.
 *
 * CATEGORY COVERAGE BONUS:
 *   Each role also defines categoryWeights (e.g. frontend=0.35, backend=0.35).
 *   We compute what fraction of each category's skills the user has, then
 *   compute a weighted average across categories.  This rewards breadth within
 *   the right categories — a "Full Stack Developer" with zero frontend skills
 *   should score lower even if they have many backend skills.
 *
 * FINAL SCORE:
 *   finalScore = (rawScore × 0.70) + (categoryScore × 0.30)
 *   Scaled 0–100, rounded to 1 decimal place.
 *
 * WHY NOT use cosine similarity over embeddings?
 *   Embeddings (e.g. text-embedding-3-small) would give better semantic
 *   matching ("React.js" ≈ "ReactJS" ≈ "React framework") but require an
 *   API call per request.  This deterministic rule-based scoring is
 *   transparent, explainable, and dependency-light.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const roleProfiles = require('../data/roleProfiles.json');

/**
 * identifyRoles
 *
 * @param  {Object} skillProfile  — output of extractSkills() from Phase 5
 *                                  { allSkills:[], languages:[], frontend:[], ... }
 * @param  {number} topN          — how many roles to return (default 5)
 * @returns {Array}  Sorted array of role matches, best first:
 *   [{
 *     id, title, description,
 *     score,           // 0–100 final score
 *     coreMatched,     // core skills the user has
 *     coreMissing,     // core skills the user lacks
 *     bonusMatched,    // bonus skills the user has
 *     readinessLevel   // "Beginner" | "Intermediate" | "Strong" | "Expert"
 *   }]
 */
const identifyRoles = (skillProfile, topN = 5) => {
  // Normalise user's skills to lowercase set for O(1) lookup
  const userSkills = new Set(
    (skillProfile.allSkills || []).map((s) => s.toLowerCase().trim())
  );

  // Also build a per-category count map for category coverage scoring
  const userCategoryCount = {
    languages: (skillProfile.languages || []).length,
    frontend:  (skillProfile.frontend  || []).length,
    backend:   (skillProfile.backend   || []).length,
    databases: (skillProfile.databases || []).length,
    cloud:     (skillProfile.cloud     || []).length,
    tools:     (skillProfile.tools     || []).length,
    aiml:      (skillProfile.aiml      || []).length,
  };

  const scored = roleProfiles.map((role) => {
    // ── Core skill matching ─────────────────────────────────────────────────
    const coreMatched = role.coreSkills.filter((s) => userSkills.has(s.toLowerCase()));
    const coreMissing = role.coreSkills.filter((s) => !userSkills.has(s.toLowerCase()));

    // ── Bonus skill matching ────────────────────────────────────────────────
    const bonusMatched = role.bonusSkills.filter((s) => userSkills.has(s.toLowerCase()));

    // ── Raw score (weighted core vs bonus) ──────────────────────────────────
    const maxRaw  = role.coreSkills.length * 2 + role.bonusSkills.length * 1;
    const earnRaw = coreMatched.length * 2 + bonusMatched.length * 1;
    const rawScore = maxRaw > 0 ? earnRaw / maxRaw : 0;

    // ── Category coverage score ─────────────────────────────────────────────
    // For each category the role cares about, compute fraction of user skills
    // vs. the total skills in that category from the taxonomy.
    // We approximate "total taxonomy skills per category" as a fixed reference.
    const CATEGORY_TOTAL_REF = {
      languages: 30, frontend: 35, backend: 30,
      databases: 20, cloud: 30, tools: 30, aiml: 30,
    };

    let catScore = 0;
    let catWeightSum = 0;

    for (const [cat, weight] of Object.entries(role.categoryWeights || {})) {
      const userCount  = userCategoryCount[cat] || 0;
      const refTotal   = CATEGORY_TOTAL_REF[cat] || 20;
      // Cap at 1.0 so having 40 frontend skills doesn't inflate the score
      const coverage   = Math.min(userCount / refTotal, 1.0);
      catScore        += coverage * weight;
      catWeightSum    += weight;
    }

    const normCatScore = catWeightSum > 0 ? catScore / catWeightSum : 0;

    // ── Final blended score ─────────────────────────────────────────────────
    const finalScore = Math.round((rawScore * 0.70 + normCatScore * 0.30) * 1000) / 10;

    return {
      id:           role.id,
      title:        role.title,
      description:  role.description,
      score:        Math.min(finalScore, 100), // cap at 100
      coreMatched,
      coreMissing,
      bonusMatched,
      readinessLevel: getReadinessLevel(finalScore),
    };
  });

  // Sort descending by score, return top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
};

/**
 * getReadinessLevel
 * Maps a 0–100 score to a human-readable label.
 */
const getReadinessLevel = (score) => {
  if (score >= 75) return 'Expert';
  if (score >= 50) return 'Strong';
  if (score >= 25) return 'Intermediate';
  return 'Beginner';
};

module.exports = { identifyRoles };
