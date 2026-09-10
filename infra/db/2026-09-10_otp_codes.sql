-- Email/SMS login OTP store — Aroham (lzzdfsphevmzbkkoskxb)
-- Applied 2026-09-10 via MCP. Idempotent; safe to re-run.
--
-- The backend (services/otp.js, email channel) generates a 6-digit code,
-- HMAC-hashes it, and upserts one row per identifier (phone last-10 or email).
-- verify checks expiry + attempts (max 5) and deletes the row on success.
-- Only the backend service_role touches this table (RLS on, no policies).

create table if not exists public.otp_codes (
  identifier   text primary key,
  code_hash    text not null,
  dest_email   text,
  expires_at   timestamptz not null,
  attempts     smallint not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.otp_codes enable row level security;

comment on table public.otp_codes is 'Short-lived email/SMS OTP codes. Backend service-role only.';

-- Optional housekeeping: drop stale rows. Run manually or from a cron.
--   delete from public.otp_codes where expires_at < now() - interval '1 day';
