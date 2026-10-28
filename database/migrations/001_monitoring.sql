-- ==============================================================================
-- Migration: 001_monitoring.sql
-- Description: Adds bot_runs table for tracking UiPath and Simulator execution telemetry
-- ==============================================================================

CREATE TABLE IF NOT EXISTS bot_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_source ENUM('uipath', 'simulator') NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_ms INT NOT NULL DEFAULT 0,
    claims_processed INT NOT NULL DEFAULT 0,
    verified_count INT NOT NULL DEFAULT 0,
    flagged_count INT NOT NULL DEFAULT 0,
    rejected_count INT NOT NULL DEFAULT 0,
    status ENUM('Success', 'Failed') NOT NULL DEFAULT 'Success',
    error_message TEXT NULL,
    INDEX idx_bot_runs_source (run_source),
    INDEX idx_bot_runs_status (status),
    INDEX idx_bot_runs_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: claim_ai_notes
-- Caches Groq AI advisory summaries (advisory only, human governance)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_ai_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    model VARCHAR(100) NOT NULL,
    payload JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_notes_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    INDEX idx_ai_notes_claim (claim_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
