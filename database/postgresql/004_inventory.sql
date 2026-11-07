-- LifeInventory persistent balances, community-scoped account ownership.
CREATE TABLE IF NOT EXISTS inventory_accounts (
  community_id uuid NOT NULL,
  account_id uuid NOT NULL,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision>=0),
  PRIMARY KEY (community_id,account_id),
  FOREIGN KEY (community_id,account_id) REFERENCES community_members(community_id,account_id)
);
CREATE TABLE IF NOT EXISTS inventory_balances (
  community_id uuid NOT NULL,
  account_id uuid NOT NULL,
  item_id varchar(48) NOT NULL,
  quantity integer NOT NULL CHECK (quantity>0 AND quantity<=10000),
  PRIMARY KEY (community_id,account_id,item_id),
  FOREIGN KEY (community_id,account_id) REFERENCES inventory_accounts(community_id,account_id)
);
CREATE TABLE IF NOT EXISTS inventory_transfers (
  transfer_id uuid PRIMARY KEY,
  community_id uuid NOT NULL REFERENCES communities(id),
  from_account_id uuid NOT NULL REFERENCES accounts(id),
  to_account_id uuid NOT NULL REFERENCES accounts(id),
  item_id varchar(48) NOT NULL,
  quantity integer NOT NULL CHECK (quantity>0 AND quantity<=10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_account_id<>to_account_id)
);
