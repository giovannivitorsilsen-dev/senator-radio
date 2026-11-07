-- LifeInventory persistent balances, community-scoped account ownership.
CREATE TABLE IF NOT EXISTS inventory_accounts (
  community_id char(36) NOT NULL,
  account_id char(36) NOT NULL,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision>=0),
  PRIMARY KEY (community_id,account_id),
  FOREIGN KEY (community_id,account_id) REFERENCES community_members(community_id,account_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS inventory_balances (
  community_id char(36) NOT NULL,
  account_id char(36) NOT NULL,
  item_id varchar(48) NOT NULL,
  quantity integer NOT NULL CHECK (quantity>0 AND quantity<=10000),
  PRIMARY KEY (community_id,account_id,item_id),
  FOREIGN KEY (community_id,account_id) REFERENCES inventory_accounts(community_id,account_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS inventory_transfers (
  transfer_id char(36) PRIMARY KEY,
  community_id char(36) NOT NULL,
  from_account_id char(36) NOT NULL,
  to_account_id char(36) NOT NULL,
  item_id varchar(48) NOT NULL,
  quantity integer NOT NULL CHECK (quantity>0 AND quantity<=10000),
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (from_account_id<>to_account_id),
  FOREIGN KEY (community_id) REFERENCES communities(id),
  FOREIGN KEY (from_account_id) REFERENCES accounts(id),
  FOREIGN KEY (to_account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;
