-- Only the server's trusted provisioning process can assign an owner.
BEGIN;
CREATE TABLE IF NOT EXISTS community_owners (
  community_id uuid PRIMARY KEY REFERENCES communities(id) ON DELETE CASCADE,
  account_id uuid NOT NULL,
  FOREIGN KEY (community_id, account_id) REFERENCES community_members(community_id, account_id)
);
COMMIT;
