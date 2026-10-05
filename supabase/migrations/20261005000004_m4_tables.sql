-- ==============================================================================
-- Gardenia 2K26 — Milestone 4: Resilient Outbox & Idempotency Schema
-- ==============================================================================

ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS idempotency_id TEXT UNIQUE;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS idempotency_id TEXT UNIQUE;
