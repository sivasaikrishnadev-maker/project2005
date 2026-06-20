/**
 * analyticsEngine.js
 *
 * Computes six analytics outputs after a session is completed:
 *
 * 1. READINESS SCORE (0-100)
 *    Weighted average of three factors:
 *    - Answer quality  (avg session score / 10) × 50%
 *    - Skill breadth   (totalSkills / 50 capped at 1) × 30%
 *    - Role coverage   (coreSkillMatchRate for selectedRole) × 20%
 *
 * 2. SKILL GAP ANALYSIS
 *    For the selected role's coreSkills: compare required level (fixed = 7)
 *    against current level (derived from avg answer score for that skill tag).
 *    Skills the user lacks entirely get currentLevel = 0.
 *
 * 3. COMPANY READINESS SCORES
 *    For each company profile: score = sum(weight × hasSkill) / sum(allWeights) × 100
 *
 * 4. IMPROVEMENT ROADMAP
 *    Ordered list: largest skill gaps first, then missing core skills for role,
 *    then high-weight company skills the user lacks.
 *
 * 5. SKILL CONFIDENCE HEATMAP
 *    Per skill: list of { sessionId, score } pairs from all Answer records
 *    where the question's skill tag matches.
 *
 * 6. PERFORMANCE TREND
 *    One { date, avgScore } data point per completed session, chronological.
 */

const roleProfiles   = require('../data/roleProfiles.json');
const companyProfiles = require('../data/companyProfiles.json');

// ─── 1. READINESS SCORE ──────────────────────────────────────────────────────
const computeReadinessScore = (avgAnswerScore, skillProfile, selectedRole) => {
  // Factor A: answer quality (0–1)
  const answerFactor = Math.min((avgAnswerScore || 0) / 10, 1);

  // Factor B: skill breadth (normalised against 50 as "well-rounded" target)
  const totalSkills  = (skillProfile.allSkills || []).length;
  const breadthFactor = Math.min(totalSkills / 50, 1);

  // Factor C: role core coverage
  const role = roleProfiles.find((r) => r.id === selectedRole);
  let coverageFactor = 0;
  if (role) {
    const userSkills = new Set((skillProfile.allSkills || []).map((s) => s.toLowerCase()));
    const matched = role.coreSkills.filter((s) => userSkills.has(s.toLowerCase())).length;
    coverageFactor = role.coreSkills.length > 0 ? matched / role.coreSkills.length : 0;
  }

  const raw = answerFactor * 0.50 + breadthFactor * 0.30 + coverageFactor * 0.20;
  return Math.round(raw * 100);
};

// ─── 2. SKILL GAP ANALYSIS ───────────────────────────────────────────────────
const computeSkillGaps = (skillProfile, selectedRole, answers) => {
  const role = roleProfiles.find((r) => r.id === selectedRole);
  if (!role) return [];

  const userSkills = new Set((skillProfile.allSkills || []).map((s) => s.toLowerCase()));

  // Build a map: skill → avg score from answers where question.skill matches
  const skillScoreMap = {};
  for (const answer of answers) {
    const skill = (answer.question?.skill || '').toLowerCase();
    if (!skill) continue;
    if (!skillScoreMap[skill]) skillScoreMap[skill] = [];
    skillScoreMap[skill].push(answer.score || 0);
  }

  const avgFor = (skill) => {
    const scores = skillScoreMap[skill.toLowerCase()];
    if (!scores || scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  const gaps = [];
  const REQUIRED_LEVEL = 7; // expected proficiency on a 0-10 scale

  for (const skill of role.coreSkills) {
    const hasSkill     = userSkills.has(skill.toLowerCase());
    const answerAvg    = avgFor(skill);
    // currentLevel: use answer avg if available, else 5 if skill listed, else 0
    const currentLevel = answerAvg !== null ? answerAvg : (hasSkill ? 5 : 0);
    const gap          = Math.max(REQUIRED_LEVEL - currentLevel, 0);

    gaps.push({
      skill,
      requiredLevel: REQUIRED_LEVEL,
      currentLevel:  Math.round(currentLevel * 10) / 10,
      gap:           Math.round(gap * 10) / 10,
    });
  }

  return gaps.sort((a, b) => b.gap - a.gap); // largest gaps first
};

// ─── 3. COMPANY READINESS ────────────────────────────────────────────────────
const computeCompanyReadiness = (skillProfile) => {
  const userSkills = new Set((skillProfile.allSkills || []).map((s) => s.toLowerCase()));

  return companyProfiles.map((company) => {
    const weights  = company.skillWeights;
    let total = 0, earned = 0;
    const matched = [], missing = [];

    for (const [skill, weight] of Object.entries(weights)) {
      total += weight;
      if (userSkills.has(skill.toLowerCase())) {
        earned += weight;
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    }

    const score = total > 0 ? Math.round((earned / total) * 100) : 0;
    return { company: company.name, score, matched, missing };
  }).sort((a, b) => b.score - a.score);
};

// ─── 4. IMPROVEMENT ROADMAP ──────────────────────────────────────────────────
const computeRoadmap = (skillGaps, companyReadiness, selectedRole) => {
  const roadmap = [];
  const seen    = new Set();

  const add = (item) => { if (!seen.has(item)) { seen.add(item); roadmap.push(item); } };

  // Priority 1: biggest skill gaps for the selected role
  for (const g of skillGaps.filter((g) => g.gap >= 3)) {
    add(`Improve proficiency in "${g.skill}" (gap: ${g.gap.toFixed(1)} points)`);
  }

  // Priority 2: missing skills from top-scoring company
  const topCompany = companyReadiness[0];
  if (topCompany) {
    for (const s of topCompany.missing.slice(0, 3)) {
      add(`Learn "${s}" — required by ${topCompany.company}`);
    }
  }

  // Priority 3: remaining role core skill gaps
  for (const g of skillGaps.filter((g) => g.gap > 0 && g.gap < 3)) {
    add(`Strengthen "${g.skill}" to reach expected level`);
  }

  // Priority 4: generic recommendations
  if (roadmap.length < 3) {
    add('Practice system design and architecture questions');
    add('Contribute to open-source projects to build practical experience');
    add('Complete mock interview sessions regularly to track improvement');
  }

  return roadmap.slice(0, 10); // cap at 10 items
};

// ─── 5. HEATMAP ──────────────────────────────────────────────────────────────
const computeHeatmap = (answers) => {
  const map = {}; // skill → { sessionId → scores[] }

  for (const answer of answers) {
    const skill = (answer.question?.skill || '').toLowerCase();
    if (!skill) continue;
    if (!map[skill]) map[skill] = {};
    const sid = String(answer.session);
    if (!map[skill][sid]) map[skill][sid] = [];
    map[skill][sid].push(answer.score || 0);
  }

  return Object.entries(map).map(([skill, sessionMap]) => ({
    skill,
    sessions: Object.entries(sessionMap).map(([sessionId, scores]) => ({
      sessionId,
      score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    })),
  }));
};

// ─── 6. PERFORMANCE TREND ────────────────────────────────────────────────────
const computeTrend = (sessions, answersPerSession) => {
  return sessions
    .filter((s) => s.status === 'completed')
    .map((s) => {
      const sessionAnswers = answersPerSession[String(s._id)] || [];
      const avg = sessionAnswers.length
        ? sessionAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / sessionAnswers.length
        : 0;
      return {
        sessionId: s._id,
        date:      s.completedAt || s.updatedAt,
        avgScore:  Math.round(avg * 10) / 10,
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

// ─── MASTER COMPUTE FUNCTION ─────────────────────────────────────────────────
/**
 * computeAnalytics
 * @param {Object} skillProfile   — Phase 5 SkillProfile document
 * @param {string} selectedRole   — role ID
 * @param {Array}  answers        — populated Answer docs (with question ref)
 * @param {Array}  allSessions    — all InterviewSession docs for the user
 * @param {Object} allAnswerMap   — { sessionId: [answers] } across all sessions
 * @returns {Object}              — all analytics outputs
 */
const computeAnalytics = (skillProfile, selectedRole, answers, allSessions, allAnswerMap) => {
  const avgAnswerScore = answers.length
    ? answers.reduce((s, a) => s + (a.score || 0), 0) / answers.length
    : 0;

  const readinessScore    = computeReadinessScore(avgAnswerScore, skillProfile, selectedRole);
  const skillGaps         = computeSkillGaps(skillProfile, selectedRole, answers);
  const companyReadiness  = computeCompanyReadiness(skillProfile);
  const roadmap           = computeRoadmap(skillGaps, companyReadiness, selectedRole);
  const heatmap           = computeHeatmap(answers);
  const performanceTrend  = computeTrend(allSessions, allAnswerMap);

  return { readinessScore, skillGaps, companyReadiness, roadmap, heatmap, performanceTrend };
};

module.exports = { computeAnalytics };
