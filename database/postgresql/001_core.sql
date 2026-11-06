-- PROJECT LIFE RP — PostgreSQL 14+ core schema (not yet connected to Java/Node runtime)
BEGIN;
CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY,
  name varchar(120) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY,
  username varchar(64) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS community_members (
  community_id uuid NOT NULL REFERENCES communities(id),
  account_id uuid NOT NULL REFERENCES accounts(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, account_id)
);
CREATE TABLE IF NOT EXISTS staff_permissions (
  community_id uuid NOT NULL,
  account_id uuid NOT NULL,
  permission varchar(80) NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, account_id, permission),
  FOREIGN KEY (community_id, account_id) REFERENCES community_members(community_id, account_id)
);
CREATE TABLE IF NOT EXISTS supporter_entitlements (
  id uuid PRIMARY KEY,
  community_id uuid NOT NULL,
  account_id uuid NOT NULL,
  asset_kind varchar(32) NOT NULL,
  catalogue_id varchar(120) NOT NULL,
  transferable boolean NOT NULL DEFAULT false CHECK (transferable = false),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (community_id, account_id) REFERENCES community_members(community_id, account_id),
  UNIQUE (id, community_id, account_id)
);
CREATE INDEX IF NOT EXISTS idx_entitlement_owner ON supporter_entitlements(community_id, account_id);
CREATE TABLE IF NOT EXISTS audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  community_id uuid NOT NULL REFERENCES communities(id),
  actor_account_id uuid REFERENCES accounts(id),
  action varchar(120) NOT NULL,
  target_id varchar(120),
  result varchar(40) NOT NULL,
  happened_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
