-- MariaDB/MySQL session persistence for AccountAuth.JdbcStore
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash char(64) PRIMARY KEY,
  account_id char(36) NOT NULL,
  expires_at_epoch bigint NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_sessions_account (account_id),
  INDEX idx_sessions_expiry (expires_at_epoch)
) ENGINE=InnoDB;
