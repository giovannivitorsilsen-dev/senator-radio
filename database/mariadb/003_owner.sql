-- Only the server's trusted provisioning process can assign an owner.
CREATE TABLE IF NOT EXISTS community_owners (
  community_id char(36) PRIMARY KEY,
  account_id char(36) NOT NULL,
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  FOREIGN KEY (community_id, account_id) REFERENCES community_members(community_id, account_id)
) ENGINE=InnoDB;
