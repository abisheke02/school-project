// Rule-based LD Classifier
// Runs BEFORE Claude API as a fast pre-classifier.
// Claude then validates / refines the result.
//
// Scoring rules (based on clinical LD assessment research):
//   - Each wrong answer in a category adds weighted points to the LD risk score
//   - Slow response time (>6s on difficulty-1 questions) adds an extra 5 points
//   - Correct answers on hard questions (difficulty 3) reduce risk slightly

const CATEGORY_WEIGHTS = {
  // dyslexia indicators
  letter_recognition: { dyslexia: 8, dyscalculia: 0 },
  rhyme_detection:    { dyslexia: 7, dyscalculia: 0 },
  phoneme_blending:   { dyslexia: 9, dyscalculia: 0 },
  // dyscalculia indicators
  number_sense:       { dyslexia: 0, dyscalculia: 9 },
};

const SLOW_RESPONSE_THRESHOLD_MS = 6000; // > 6 seconds on difficulty-1 = slow
const SLOW_RESPONSE_PENALTY = 5;
const CORRECT_HARD_BONUS = -3; // correct on difficulty-3 reduces risk

const classifyRuleBased = (answers) => {
  let dyslexiaScore = 0;
  let dyscalculiaScore = 0;
  let dysgraphiaScore = 0; // placeholder — dysgraphia needs STT/handwriting data from Phase 3
  let totalPossibleDyslexia = 0;
  let totalPossibleDyscalculia = 0;

  for (const ans of answers) {
    const weights = CATEGORY_WEIGHTS[ans.category];
    if (!weights) continue;

    const isWrong = !ans.is_correct;
    const isSlow = ans.difficulty === 1 && ans.response_time_ms > SLOW_RESPONSE_THRESHOLD_MS;

    // Accumulate max possible score
    totalPossibleDyslexia += weights.dyslexia;
    totalPossibleDyscalculia += weights.dyscalculia;

    if (isWrong) {
      dyslexiaScore += weights.dyslexia;
      dyscalculiaScore += weights.dyscalculia;

      // Slow on easy question = extra penalty
      if (isSlow) {
        dyslexiaScore += weights.dyslexia > 0 ? SLOW_RESPONSE_PENALTY : 0;
        dyscalculiaScore += weights.dyscalculia > 0 ? SLOW_RESPONSE_PENALTY : 0;
      }
    } else if (ans.difficulty === 3) {
      // Correct on hard question — reduce risk
      dyslexiaScore = Math.max(0, dyslexiaScore + (weights.dyslexia > 0 ? CORRECT_HARD_BONUS : 0));
      dyscalculiaScore = Math.max(0, dyscalculiaScore + (weights.dyscalculia > 0 ? CORRECT_HARD_BONUS : 0));
    }
  }

  // Normalise to 0-100
  const normalize = (score, max) => max > 0 ? Math.min(100, Math.round((score / max) * 100)) : 0;
  const dyslexiaRisk = normalize(dyslexiaScore, totalPossibleDyslexia);
  const dyscalculiaRisk = normalize(dyscalculiaScore, totalPossibleDyscalculia);

  // Determine LD type from rule-based scores
  let ldType = 'not_detected';
  const overallRisk = Math.max(dyslexiaRisk, dyscalculiaRisk);

  if (dyslexiaRisk >= 60 && dyscalculiaRisk >= 60) {
    ldType = 'mixed';
  } else if (dyslexiaRisk >= 40) {
    ldType = 'dyslexia';
  } else if (dyscalculiaRisk >= 40) {
    ldType = 'dyscalculia';
  }

  return {
    ruleBasedLdType: ldType,
    ruleBasedRiskScores: {
      dyslexia: dyslexiaRisk,
      dysgraphia: dysgraphiaScore,
      dyscalculia: dyscalculiaRisk,
    },
    overallRisk,
  };
};

// Merge rule-based and Claude results — Claude takes precedence when confident
const mergeClassifications = (ruleBased, claude) => {
  // If Claude confidence is high (>= 70), trust Claude
  if (claude.confidence >= 70) {
    return {
      ldType: claude.ld_type,
      riskScores: claude.risk_scores,
      overallRiskScore: claude.overall_risk_score,
      confidence: claude.confidence,
      primaryPatterns: claude.primary_patterns,
      reasoning: claude.reasoning,
      source: 'claude',
    };
  }

  // Otherwise average the scores
  const merged = {
    dyslexia: Math.round((ruleBased.ruleBasedRiskScores.dyslexia + (claude.risk_scores?.dyslexia ?? 0)) / 2),
    dysgraphia: 0,
    dyscalculia: Math.round((ruleBased.ruleBasedRiskScores.dyscalculia + (claude.risk_scores?.dyscalculia ?? 0)) / 2),
  };

  const overallRisk = Math.max(...Object.values(merged));
  let ldType = 'not_detected';
  if (merged.dyslexia >= 60 && merged.dyscalculia >= 60) ldType = 'mixed';
  else if (merged.dyslexia >= 40) ldType = 'dyslexia';
  else if (merged.dyscalculia >= 40) ldType = 'dyscalculia';

  return {
    ldType,
    riskScores: merged,
    overallRiskScore: overallRisk,
    confidence: claude.confidence,
    primaryPatterns: claude.primary_patterns,
    reasoning: claude.reasoning,
    source: 'merged',
  };
};

module.exports = { classifyRuleBased, mergeClassifications };
