-- PostgreSQL session persistence for AccountAuth.JdbcStore
BEGIN;
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash varchar(64) PRIMARY KEY CHECK (length(token_hash) = 64),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at_epoch bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON auth_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON auth_sessions(expires_at_epoch);
COMMIT;
