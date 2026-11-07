package rp.core;

import java.sql.SQLException;
import java.util.Objects;
import java.util.UUID;

/**
 * Trusted backend facade, binds inventory operations to a verified LifeAccount session.
 * Do not expose directly to a game client; a future gateway needs TLS and rate limits.
 * Grants and provisioning deliberately remain absent from this interface.
 */
public final class InventorySessionService {
    private final AccountAuth accounts;
    private final InventoryJdbc inventory;

    public InventorySessionService(AccountAuth accounts, InventoryJdbc inventory) {
        this.accounts=Objects.requireNonNull(accounts);
        this.inventory=Objects.requireNonNull(inventory);
    }
    private UUID identity(String token) throws Exception {
        return accounts.authenticate(token).orElseThrow(
            ()->new SecurityException("valid account session required"));
    }
    /** Only the authenticated account's inventory is readable. */
    public InventoryJdbc.Inventory readOwn(String sessionToken, UUID community) throws Exception {
        Objects.requireNonNull(community);
        return inventory.read(community,identity(sessionToken));
    }
    /**
     * The authenticated account is ALWAYS the sender.
     * The caller cannot supply a different source account ID.
     */
    public void transferOwn(String sessionToken,UUID operationId,UUID community,
                            UUID recipient,String item,int quantity,
                            long expectedOwnRevision,long expectedRecipientRevision) throws Exception {
        Objects.requireNonNull(community);Objects.requireNonNull(recipient);
        inventory.transfer(operationId,community,identity(sessionToken),recipient,
            item,quantity,expectedOwnRevision,expectedRecipientRevision);
    }
}
