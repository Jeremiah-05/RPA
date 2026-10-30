// frontend/src/components/common/ViolationBadge.jsx
import React from 'react';
import { AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';

/**
 * Universal Violation Badge Component
 * Enforces the system-wide visual rule:
 * - Rejected Claims: Red badge with XCircle icon (text-rose-700 bg-rose-50 border-rose-200)
 * - Flagged Claims: Amber badge with AlertTriangle icon (text-amber-700 bg-amber-50 border-amber-200)
 * - Clean Claims: Muted slate indicator
 */
export default function ViolationBadge({ violations, status, cleanLabel = 'No violations' }) {
  if (!violations) {
    return <span className="text-slate-400 text-[11px]">{cleanLabel}</span>;
  }

  const isRejected = status === 'Rejected';

  return (
    <span
      title={violations}
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border max-w-full truncate transition-colors ${
        isRejected
          ? 'text-rose-700 bg-rose-50 border-rose-200'
          : 'text-amber-700 bg-amber-50 border-amber-200'
      }`}
    >
      {isRejected ? (
        <XCircle className="w-3 h-3 shrink-0 text-rose-600" />
      ) : (
        <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600" />
      )}
      <span className="truncate">{violations}</span>
    </span>
  );
}

