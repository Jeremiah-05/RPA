// backend/services/aiAdvisor.js
/**
 * AI Advisory Service for Expense Claims
 * Uses Groq's OpenAI-compatible chat completions API.
 * 
 * HARD PRIVACY RULES:
 * Only sends: claim code, category, amount, date, description, bot violations, policy limit.
 * Never sends: employee name, email, user ID, receipt path, or receipt content.
 * 
 * Advisory only: Never alters claim status or bot outcome.
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Builds a deterministic rule-based template summary when no API key is provided
 * or when external LLM calls fail / get rate-limited.
 */
function buildDeterministicTemplate({ claimCode, category, amount, expenseDate, description, violations, policyLimit }) {
  const violationList = (violations || '').split(';').map(v => v.trim()).filter(Boolean);
  const amtNum = parseFloat(amount) || 0;
  const limitNum = parseFloat(policyLimit) || 0;

  let riskLevel = 'Low';
  let suggestedAction = 'Approve';
  let reason = 'All policy checks passed without violations.';
  let summary = `Claim ${claimCode} for ${category || 'Uncategorized'} (₹${amtNum.toLocaleString('en-IN')}) passed standard validation.`;

  if (violationList.length > 0) {
    if (violationList.some(v => v.toLowerCase().includes('duplicate'))) {
      riskLevel = 'High';
      suggestedAction = 'Reject';
      reason = 'Duplicate claim submission detected within the current batch.';
      summary = `Claim ${claimCode} appears to be a duplicate submission for ₹${amtNum.toLocaleString('en-IN')}.`;
    } else if (violationList.some(v => v.toLowerCase().includes('invalid date'))) {
      riskLevel = 'High';
      suggestedAction = 'Reject';
      reason = 'Expense date is in the future or cannot be validated against the current calendar.';
      summary = `Claim ${claimCode} has an invalid or post-dated expense date (${expenseDate}).`;
    } else if (violationList.some(v => v.toLowerCase().includes('exceeds'))) {
      riskLevel = 'Medium';
      suggestedAction = 'Request Correction';
      reason = `Amount ₹${amtNum.toLocaleString('en-IN')} exceeds allowable policy ceiling of ₹${limitNum.toLocaleString('en-IN')}.`;
      summary = `Claim ${claimCode} for ${category} exceeds the category ceiling by ₹${(amtNum - limitNum).toLocaleString('en-IN')}.`;
    } else if (violationList.some(v => v.toLowerCase().includes('receipt missing'))) {
      riskLevel = 'Medium';
      suggestedAction = 'Request Correction';
      reason = 'Mandatory receipt documentation is missing for this category.';
      summary = `Claim ${claimCode} lacks the required receipt proof for reimbursement.`;
    } else if (violationList.some(v => v.toLowerCase().includes('category') || v.toLowerCase().includes('incomplete'))) {
      riskLevel = 'Medium';
      suggestedAction = 'Request Correction';
      reason = 'Expense category is unlisted or missing.';
      summary = `Claim ${claimCode} submitted with unrecognized category "${category || 'N/A'}".`;
    } else {
      riskLevel = 'Medium';
      suggestedAction = 'Request Correction';
      reason = `Policy violations detected: ${violationList.join(', ')}.`;
      summary = `Claim ${claimCode} triggered policy alerts requiring manager clarification.`;
    }
  }

  return {
    model: 'Deterministic Rule Engine (Offline Fallback)',
    payload: {
      summary,
      risk_level: riskLevel,
      suggested_action: suggestedAction,
      reason
    }
  };
}

/**
 * Validates and normalizes the parsed JSON output from the LLM.
 */
function validateAndNormalizePayload(jsonObj, sanitizedData) {
  if (!jsonObj || typeof jsonObj !== 'object') {
    throw new Error('LLM did not return a JSON object.');
  }

  // Normalize risk_level
  let riskLevel = 'Medium';
  const rawRisk = (jsonObj.risk_level || jsonObj.riskLevel || '').toString().trim().toLowerCase();
  if (rawRisk.includes('low')) riskLevel = 'Low';
  else if (rawRisk.includes('high')) riskLevel = 'High';
  else riskLevel = 'Medium';

  // Normalize suggested_action
  let suggestedAction = 'Request Correction';
  const rawAction = (jsonObj.suggested_action || jsonObj.suggestedAction || '').toString().trim().toLowerCase();
  if (rawAction.includes('approve')) suggestedAction = 'Approve';
  else if (rawAction.includes('reject')) suggestedAction = 'Reject';
  else suggestedAction = 'Request Correction';

  // Truncate summary to max 2 sentences
  let summary = (jsonObj.summary || '').toString().trim();
  if (!summary) {
    summary = `Claim ${sanitizedData.claimCode} reviewed for policy compliance.`;
  } else {
    const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary];
    summary = sentences.slice(0, 2).join(' ').trim();
  }

  // Truncate reason to max 1 sentence
  let reason = (jsonObj.reason || '').toString().trim();
  if (!reason) {
    reason = `Based on bot verification outcome: ${sanitizedData.violations || 'No violations'}.`;
  } else {
    const rSentences = reason.match(/[^.!?]+[.!?]+/g) || [reason];
    reason = rSentences[0].trim();
  }

  return {
    summary,
    risk_level: riskLevel,
    suggested_action: suggestedAction,
    reason
  };
}

/**
 * Calls Groq chat completion API with strict privacy sanitization and fallback.
 * @param {Object} claimData Claim attributes
 * @returns {Promise<{ model: string, payload: Object }>}
 */
async function generateAiSummary(claimData) {
  // STRICT PRIVACY ENFORCEMENT: Filter only allowed attributes
  const sanitized = {
    claimCode: claimData.claim_code || claimData.claimCode || 'CLM-UNKNOWN',
    category: claimData.category || 'Uncategorized',
    amount: parseFloat(claimData.amount) || 0,
    expenseDate: claimData.expense_date || claimData.expenseDate || 'N/A',
    description: claimData.description || 'No description provided',
    violations: claimData.violations || claimData.bot_violations || 'None',
    policyLimit: claimData.policy_limit_applied != null ? claimData.policy_limit_applied : (claimData.policyLimit || 'N/A')
  };

  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  const primaryModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const fallbackModel = process.env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant';

  // If no API key is configured or set to placeholder, use deterministic template immediately
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    console.log('[AI Advisor] No GROQ_API_KEY configured. Utilizing deterministic rule template.');
    return buildDeterministicTemplate(sanitized);
  }

  const systemPrompt = `You are an automated enterprise expense claim compliance advisor assisting a human finance manager.
You provide ADVISORY recommendations only. The human manager makes the final decision.
You must respond with ONLY a valid, parseable JSON object matching this schema:
{
  "summary": "Brief 1-2 sentence description of the claim and verification status.",
  "risk_level": "Low" | "Medium" | "High",
  "suggested_action": "Approve" | "Reject" | "Request Correction",
  "reason": "Single sentence justification for the suggested action."
}`;

  const userPrompt = `Evaluate this corporate expense claim:
- Claim Code: ${sanitized.claimCode}
- Category: ${sanitized.category}
- Claim Amount: ₹${sanitized.amount.toFixed(2)}
- Category Policy Limit: ${sanitized.policyLimit !== 'N/A' ? '₹' + parseFloat(sanitized.policyLimit).toFixed(2) : 'No specific limit'}
- Expense Date: ${sanitized.expenseDate}
- Description: "${sanitized.description}"
- Bot Detected Violations: ${sanitized.violations}

Provide your advisory assessment as strict JSON.`;

  // Internal helper to perform HTTP request to Groq
  async function callGroqChat(modelName) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    return response;
  }

  // Attempt with primary model, handling 429 retry-after and falling back
  let activeModel = primaryModel;
  let rawJsonText = null;

  try {
    let res = await callGroqChat(activeModel);

    // Handle Rate Limit (HTTP 429)
    if (res.status === 429) {
      const retryAfterSec = parseInt(res.headers.get('retry-after') || '2', 10);
      const waitTime = Math.min(Math.max(retryAfterSec, 1), 3) * 1000;
      console.warn(`[AI Advisor] HTTP 429 on ${activeModel}. Waiting ${waitTime}ms before 1 retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      res = await callGroqChat(activeModel);

      // If still 429 or error, switch to fallback model
      if (!res.ok) {
        console.warn(`[AI Advisor] Retry failed for ${activeModel} (${res.status}). Switching to fallback model: ${fallbackModel}`);
        activeModel = fallbackModel;
        res = await callGroqChat(activeModel);
      }
    } else if (!res.ok) {
      console.warn(`[AI Advisor] Primary model ${activeModel} failed with HTTP ${res.status}. Switching to fallback model: ${fallbackModel}`);
      activeModel = fallbackModel;
      res = await callGroqChat(activeModel);
    }

    if (!res.ok) {
      throw new Error(`Groq API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    rawJsonText = data.choices?.[0]?.message?.content;
  } catch (apiErr) {
    console.warn(`[AI Advisor Warning] Groq API call failed (${apiErr.message}). Falling back to deterministic rule template.`);
    return buildDeterministicTemplate(sanitized);
  }

  // Parse JSON response with 1 retry on parse failure
  let parsedPayload = null;
  try {
    parsedPayload = JSON.parse(rawJsonText);
  } catch (parseErr) {
    console.warn('[AI Advisor] JSON parse failed on initial response. Retrying once...');
    try {
      const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: fallbackModel,
          messages: [
            { role: 'system', content: 'Respond ONLY with a valid JSON object matching the requested schema.' },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.0,
          response_format: { type: 'json_object' }
        })
      });
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        parsedPayload = JSON.parse(retryData.choices?.[0]?.message?.content);
        activeModel = fallbackModel;
      }
    } catch (secondErr) {
      console.warn('[AI Advisor] Second parse attempt failed. Falling back to deterministic template.');
      return buildDeterministicTemplate(sanitized);
    }
  }

  if (!parsedPayload) {
    return buildDeterministicTemplate(sanitized);
  }

  const normalized = validateAndNormalizePayload(parsedPayload, sanitized);
  return {
    model: activeModel,
    payload: normalized
  };
}

module.exports = {
  generateAiSummary,
  buildDeterministicTemplate
};

