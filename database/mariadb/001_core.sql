-- PROJECT LIFE RP — MariaDB 10.11+ / MySQL 8+ core schema (not yet connected to runtime)
CREATE TABLE IF NOT EXISTS communities (
  id char(36) PRIMARY KEY,
  name varchar(120) NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS accounts (
  id char(36) PRIMARY KEY,
  username varchar(64) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS community_members (
  community_id char(36) NOT NULL,
  account_id char(36) NOT NULL,
  joined_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (community_id, account_id),
  FOREIGN KEY (community_id) REFERENCES communities(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS staff_permissions (
  community_id char(36) NOT NULL,
  account_id char(36) NOT NULL,
  permission varchar(80) NOT NULL,
  granted_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (community_id, account_id, permission),
  FOREIGN KEY (community_id, account_id) REFERENCES community_members(community_id, account_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS supporter_entitlements (
  id char(36) PRIMARY KEY,
  community_id char(36) NOT NULL,
  account_id char(36) NOT NULL,
  asset_kind varchar(32) NOT NULL,
  catalogue_id varchar(120) NOT NULL,
  transferable boolean NOT NULL DEFAULT 0,
  expires_at datetime NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_personal_entitlement CHECK (transferable = 0),
  FOREIGN KEY (community_id, account_id) REFERENCES community_members(community_id, account_id),
  INDEX idx_entitlement_owner (community_id, account_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS audit_log (
  id bigint AUTO_INCREMENT PRIMARY KEY,
  community_id char(36) NOT NULL,
  actor_account_id char(36) NULL,
  action varchar(120) NOT NULL,
  target_id varchar(120),
  result varchar(40) NOT NULL,
  happened_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (community_id) REFERENCES communities(id),
  FOREIGN KEY (actor_account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;
