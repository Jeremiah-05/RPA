// backend/utils/receiptVerifier.js
const fs = require('fs');
const path = require('path');

let PDFParse = null;
try {
  const pdfModule = require('pdf-parse');
  PDFParse = pdfModule.PDFParse || pdfModule;
} catch (e) {
  console.warn('[ReceiptVerifier] pdf-parse module could not be initialized:', e.message);
}

/**
 * Known category signatures, strong patterns, and associated keywords
 */
const CATEGORY_SIGNATURES = {
  'Travel': {
    name: 'Travel',
    strongPatterns: [
      /expense\s*category\s*[:\s]*travel/i,
      /sample\s*travel\s*expense\s*bill/i,
      /travel\s*expense\s*bill/i,
      /demo\s*travel/i,
      /travel\s*services/i,
      /boarding\s*pass/i,
      /flight\s*ticket/i,
      /railway\s*ticket/i,
      /train\s*ticket/i,
      /bus\s*ticket/i,
      /intercity\s*bus/i,
      /taxi\s*receipt/i,
      /cab\s*charges/i
    ],
    keywords: [
      'travel', 'passenger', 'transport', 'ticket', 'flight', 'airline', 
      'boarding', 'railway', 'train', 'irctc', 'cab', 'taxi', 'uber', 
      'ola', 'bus', 'trip', 'toll', 'fare', 'transfer', 'transfers'
    ]
  },
  'Meals': {
    name: 'Meals',
    strongPatterns: [
      /expense\s*category\s*[:\s]*meals?/i,
      /food\s*(?:bill|receipt|invoice)/i,
      /restaurant\s*(?:bill|receipt|invoice)/i,
      /dining\s*(?:receipt|bill)/i,
      /bistro\s*(?:receipt|bill)/i,
      /cafe\s*(?:receipt|bill)/i
    ],
    keywords: [
      'restaurant', 'cafe', 'bistro', 'dining', 'lunch', 'dinner', 
      'breakfast', 'meal', 'meals', 'food', 'beverage', 'swiggy', 
      'zomato', 'kitchen', 'snacks', 'buffet', 'table'
    ]
  },
  'Accommodation': {
    name: 'Accommodation',
    strongPatterns: [
      /expense\s*category\s*[:\s]*accommodation/i,
      /hotel\s*(?:bill|receipt|invoice|stay)/i,
      /lodging\s*(?:bill|receipt|invoice)/i,
      /room\s*tariff/i
    ],
    keywords: [
      'hotel', 'resort', 'lodging', 'accommodation', 'room night', 
      'check-in', 'check-out', 'room rent', 'guest house', 'motel', 'inn'
    ]
  },
  'Office Supplies': {
    name: 'Office Supplies',
    strongPatterns: [
      /expense\s*category\s*[:\s]*office\s*supplies/i,
      /stationery\s*(?:bill|receipt|invoice)/i
    ],
    keywords: [
      'stationery', 'printer', 'cartridge', 'keyboard', 'mouse', 
      'paper', 'stapler', 'whiteboard', 'desk', 'pen', 'supplies'
    ]
  },
  'Certifications': {
    name: 'Certifications',
    strongPatterns: [
      /expense\s*category\s*[:\s]*certifications?/i,
      /exam\s*voucher/i,
      /certification\s*fee/i,
      /aws\s*certified/i
    ],
    keywords: [
      'certification', 'credential', 'exam voucher', 'exam fee', 
      'aws certified', 'coursera', 'udemy', 'pearson vue', 'prometric'
    ]
  },
  'Client Entertainment': {
    name: 'Client Entertainment',
    strongPatterns: [
      /expense\s*category\s*[:\s]*client\s*entertainment/i,
      /client\s*entertainment/i,
      /client\s*dinner/i
    ],
    keywords: [
      'client entertainment', 'entertainment', 'client meeting', 'client dinner'
    ]
  }
};

/**
 * Resolve receipt file path across potential relative paths
 */
function resolveReceiptPath(relPath) {
  if (!relPath) return null;
  const candidates = [
    path.resolve(relPath),
    path.resolve(__dirname, '..', relPath),
    path.resolve(__dirname, '..', '..', relPath),
    path.resolve(__dirname, '..', 'backend', relPath),
    path.resolve(__dirname, '..', '..', 'backend', relPath)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        const stat = fs.statSync(c);
        if (stat.isFile()) return c;
      } catch (e) {}
    }
  }
  return null;
}

/**
 * Extract plain text from a receipt file (PDF, plain text, or basic streams)
 */
async function extractReceiptText(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    if (PDFParse) {
      try {
        const buf = fs.readFileSync(filePath);
        // Modern class-based PDFParse or function-based fallback
        if (typeof PDFParse === 'function' && PDFParse.prototype && PDFParse.prototype.getText) {
          const parser = new PDFParse({ data: buf });
          const res = await parser.getText();
          await parser.destroy();
          if (res && res.text) return res.text;
        } else if (typeof PDFParse === 'function') {
          const res = await PDFParse(buf);
          if (res && res.text) return res.text;
        }
      } catch (pdfErr) {
        // Fall back to buffer text search below
      }
    }

    // Fallback: extract ASCII strings from raw PDF bytes
    try {
      const raw = fs.readFileSync(filePath, 'latin1');
      return raw.replace(/[^a-zA-Z0-9\s.,:\-₹$]/g, ' ');
    } catch (e) {
      return '';
    }
  }

  // Text / CSV or other format
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return '';
  }
}

/**
 * Inspect a receipt file against the claimed category.
 * Returns:
 * {
 *   hasMismatch: boolean,
 *   detectedCategory: string | null,
 *   claimedCategory: string,
 *   violation: string | null
 * }
 */
async function inspectReceiptCategory(receiptPath, claimedCategory) {
  const result = {
    hasMismatch: false,
    detectedCategory: null,
    claimedCategory: claimedCategory || '',
    violation: null
  };

  if (!receiptPath || !claimedCategory) return result;

  const resolvedPath = resolveReceiptPath(receiptPath);
  if (!resolvedPath) return result;

  const text = await extractReceiptText(resolvedPath);
  if (!text || text.trim().length === 0) return result;

  const lowerText = text.toLowerCase();
  const normalizedClaim = claimedCategory.trim().toLowerCase();

  let detectedCategory = null;

  // 1. Check strong patterns first
  for (const [catKey, sig] of Object.entries(CATEGORY_SIGNATURES)) {
    for (const pat of sig.strongPatterns) {
      if (pat.test(lowerText)) {
        detectedCategory = sig.name;
        break;
      }
    }
    if (detectedCategory) break;
  }

  // 2. Fall back to keyword count scoring
  if (!detectedCategory) {
    let bestScore = 0;
    for (const [catKey, sig] of Object.entries(CATEGORY_SIGNATURES)) {
      let count = 0;
      for (const kw of sig.keywords) {
        if (lowerText.includes(kw)) count++;
      }
      if (count >= 2 && count > bestScore) {
        bestScore = count;
        detectedCategory = sig.name;
      }
    }
  }

  // 3. Compare detected category with claimed category
  if (detectedCategory) {
    result.detectedCategory = detectedCategory;
    const normDetected = detectedCategory.toLowerCase();

    // Check if detected does not match claimed
    if (normDetected !== normalizedClaim) {
      result.hasMismatch = true;
      result.violation = `Category mismatch (Receipt is for ${detectedCategory}, Claim is ${claimedCategory})`;
    }
  }

  return result;
}

module.exports = {
  inspectReceiptCategory,
  resolveReceiptPath,
  extractReceiptText
};
