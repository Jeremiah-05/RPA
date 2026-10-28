// backend/utils/riskScore.js
/**
 * Rule-Based Statistical Risk Scoring Engine (Deterministic, explainable 0-100 score)
 * NOTE: This is NOT machine learning; it is deterministic rule-based statistical scoring.
 * 
 * Evaluated Signals:
 * 1. Amount at 95-100% of category limit (+20)
 * 2. Same employee + amount + date + category as another claim with different claim code (+30)
 * 3. Weekend expense date (+15)
 * 4. Round-number amount (+10)
 * 5. Short or vague description (+15)
 * 6. High frequency (>3 claims from same employee in 7 days) (+20)
 */

/**
 * Computes deterministic risk score (0-100) and explanations for a claim
 * @param {Object} claim The claim being evaluated
 * @param {Object} policyLimits Map of category -> max_limit
 * @param {Array} allClaims Context list of other claims for frequency and duplicate checks
 * @returns {{ score: number, level: 'Low'|'Moderate'|'High', reasons: string[] }}
 */
function calculateClaimRiskScore(claim, policyLimits = {}, allClaims = []) {
  let score = 0;
  const reasons = [];

  const amount = parseFloat(claim.amount) || 0;
  const category = (claim.category || '').trim();
  const desc = (claim.description || '').trim();
  const claimCode = claim.claim_code || '';
  const userId = claim.user_id;

  // Signal 1: Amount at 95-100% of category policy ceiling (+20 pts)
  const categoryLimit = policyLimits[category] ? parseFloat(policyLimits[category]) : null;
  if (categoryLimit && categoryLimit > 0) {
    if (amount >= (categoryLimit * 0.95) && amount <= categoryLimit) {
      score += 20;
      reasons.push(`Amount ₹${amount.toLocaleString('en-IN')} is at ${Math.round((amount / categoryLimit) * 100)}% of the category ceiling (₹${categoryLimit.toLocaleString('en-IN')})`);
    } else if (amount > categoryLimit) {
      score += 25;
      reasons.push(`Amount ₹${amount.toLocaleString('en-IN')} exceeds category ceiling of ₹${categoryLimit.toLocaleString('en-IN')}`);
    }
  }

  // Parse expense date
  let expenseDate = null;
  if (claim.expense_date) {
    const parsed = new Date(claim.expense_date);
    if (!isNaN(parsed.getTime())) {
      expenseDate = parsed;
    }
  }

  // Signal 2: Same employee + amount + date + category as another claim with different claim code (+30 pts)
  if (allClaims && allClaims.length > 0 && expenseDate) {
    const claimDateStr = expenseDate.toISOString().slice(0, 10);
    const similarClaim = allClaims.find(other => {
      if (other.id === claim.id || other.claim_code === claimCode) return false;
      const otherDateStr = other.expense_date ? new Date(other.expense_date).toISOString().slice(0, 10) : '';
      return (
        other.user_id === userId &&
        parseFloat(other.amount) === amount &&
        (other.category || '').trim().toLowerCase() === category.toLowerCase() &&
        otherDateStr === claimDateStr
      );
    });

    if (similarClaim) {
      score += 30;
      reasons.push(`Matches exact amount, date, and category of claim ${similarClaim.claim_code} by the same employee`);
    }
  }

  // Signal 3: Weekend expense date (+15 pts)
  if (expenseDate) {
    const dayOfWeek = expenseDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      score += 15;
      const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
      reasons.push(`Expense incurred on a weekend (${dayName})`);
    }
  }

  // Signal 4: Round-number amount (+10 pts)
  // Amounts that are exact multiples of 100 and >= 500 (e.g. 1000, 2400, 3500)
  if (amount >= 500 && amount % 100 === 0) {
    score += 10;
    reasons.push(`Round-number expense amount (exact multiple of ₹100)`);
  }

  // Signal 5: Short or vague description (+15 pts)
  const genericWords = ['misc', 'miscellaneous', 'food', 'cab', 'lunch', 'dinner', 'bill', 'expense', 'hotel', 'travel'];
  const descLower = desc.toLowerCase();
  const isVagueWord = genericWords.includes(descLower);
  if (desc.length < 15 || isVagueWord) {
    score += 15;
    reasons.push(`Vague or brief description ("${desc}") without full business justification`);
  }

  // Signal 6: Velocity / high frequency (+20 pts)
  // More than 3 claims from the same employee within 7 days of this expense date
  if (allClaims && allClaims.length > 0 && expenseDate) {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const nearbyClaims = allClaims.filter(other => {
      if (other.id === claim.id || other.claim_code === claimCode) return false;
      if (other.user_id !== userId) return false;
      if (!other.expense_date) return false;
      const otherDate = new Date(other.expense_date);
      if (isNaN(otherDate.getTime())) return false;
      return Math.abs(otherDate.getTime() - expenseDate.getTime()) <= sevenDaysMs;
    });

    if (nearbyClaims.length >= 3) {
      score += 20;
      reasons.push(`Employee submitted ${nearbyClaims.length + 1} claims within a 7-day period (high velocity)`);
    }
  }

  // Clamp score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, score));

  let level = 'Low';
  if (finalScore >= 60) level = 'High';
  else if (finalScore >= 30) level = 'Moderate';

  if (reasons.length === 0) {
    reasons.push('Standard claim characteristics within normal operational parameters');
  }

  return {
    score: finalScore,
    level,
    reasons
  };
}

module.exports = {
  calculateClaimRiskScore
};

