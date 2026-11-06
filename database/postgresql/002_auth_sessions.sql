-- Authentication sessions: store SHA-256 of bearer token, never the raw token.
CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash char(64) PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    expires_at_epoch bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_account ON auth_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at_epoch);
