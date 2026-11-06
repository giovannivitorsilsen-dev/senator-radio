package rp.core;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Core domain prototype (Java 17+). No network transport or database included.
 * All mutation goes through verified operations. Never trust client-supplied owner IDs.
 */
public final class LifeCore {
    public enum Permission { TICKET_READ, WARN, KICK, BAN, SPECTATE, TELEPORT, STAFF_MANAGE, SERVER_CONFIG }
    public enum AssetKind { VEHICLE, PROPERTY, ITEM, OUTFIT, COSMETIC }
    public record AccountId(UUID value) { public AccountId { Objects.requireNonNull(value); } }
    public record CommunityId(UUID value) { public CommunityId { Objects.requireNonNull(value); } }
    public record Principal(AccountId accountId, CommunityId communityId) {
        public Principal { Objects.requireNonNull(accountId); Objects.requireNonNull(communityId); }
    }
    public record Entitlement(UUID id, Principal owner, AssetKind kind, String catalogueId,
                              boolean transferable, long expiresAtEpochSec) {
        public Entitlement {
            Objects.requireNonNull(id); Objects.requireNonNull(owner);
            Objects.requireNonNull(kind); Objects.requireNonNull(catalogueId);
            if (catalogueId.isBlank()) throw new IllegalArgumentException("catalogueId");
        }
        public boolean active(long epochSecond) {
            return expiresAtEpochSec == 0 || epochSecond < expiresAtEpochSec;
        }
    }
    public record AuditEntry(long epochSec, Principal actor, String action, String target, String result) {}

    private final Map<UUID, Entitlement> entitlements = new ConcurrentHashMap<>();
    private final Map<Principal, EnumSet<Permission>> staff = new ConcurrentHashMap<>();
    private final List<AuditEntry> audit = Collections.synchronizedList(new ArrayList<>());
    private final Set<Principal> owners = ConcurrentHashMap.newKeySet();

    /**
     * Only the deployment's trusted provisioning service should call bootstrapOwner.
     * Do not expose this method as a public game/client command.
     */
    public void bootstrapOwner(Principal verifiedOwner) {
        if (!owners.add(verifiedOwner)) throw new IllegalStateException("owner already provisioned");
        audit.add(new AuditEntry(now(), verifiedOwner, "OWNER_BOOTSTRAP", verifiedOwner.accountId().toString(), "OK"));
    }
    public synchronized void grantStaff(Principal actor, Principal subject, EnumSet<Permission> permissions) {
        sameCommunity(actor, subject);
        requireOwnerOrPermission(actor, Permission.STAFF_MANAGE);
        if (permissions.contains(Permission.STAFF_MANAGE) && !owners.contains(actor))
            throw new SecurityException("only owner can delegate staff management");
        staff.put(subject, permissions.clone());
        audit.add(new AuditEntry(now(), actor, "STAFF_GRANT", subject.accountId().toString(), "OK"));
    }
    public synchronized void revokeStaff(Principal actor, Principal subject) {
        sameCommunity(actor, subject);
        requireOwnerOrPermission(actor, Permission.STAFF_MANAGE);
        if (owners.contains(subject)) throw new SecurityException("owner role is not revocable here");
        staff.remove(subject);
        audit.add(new AuditEntry(now(), actor, "STAFF_REVOKE", subject.accountId().toString(), "OK"));
    }
    public boolean can(Principal actor, Permission permission) {
        Objects.requireNonNull(actor); Objects.requireNonNull(permission);
        EnumSet<Permission> set = staff.get(actor);
        return owners.contains(actor) || (set != null && set.contains(permission));
    }
    public synchronized Entitlement issueSupporter(Principal trustedBilling, Principal buyer,
                                                   AssetKind kind, String catalogueId, long expiresAtEpochSec) {
        sameCommunity(trustedBilling, buyer);
        requireOwnerOrPermission(trustedBilling, Permission.SERVER_CONFIG);
        // All supporter-sourced benefits are ALWAYS non-transferable, even if a script asks otherwise.
        Entitlement item = new Entitlement(UUID.randomUUID(), buyer, kind, catalogueId, false, expiresAtEpochSec);
        entitlements.put(item.id(), item);
        audit.add(new AuditEntry(now(), trustedBilling, "SUPPORTER_ISSUE", item.id().toString(), "OK"));
        return item;
    }
    public synchronized void transfer(Principal actor, UUID entitlementId, Principal recipient) {
        Objects.requireNonNull(entitlementId);
        Entitlement item = Objects.requireNonNull(entitlements.get(entitlementId), "asset not found");
        sameCommunity(item.owner(), recipient);
        if (!item.owner().equals(actor)) throw new SecurityException("not asset owner");
        // No staff override and no Lua override for supporter property.
        if (!item.transferable()) {
            audit.add(new AuditEntry(now(), actor, "TRANSFER", entitlementId.toString(), "DENIED_PERSONAL"));
            throw new SecurityException("personal supporter benefit cannot be transferred");
        }
        if (!item.active(now())) throw new SecurityException("asset expired");
        entitlements.put(item.id(), new Entitlement(item.id(), recipient, item.kind(),
            item.catalogueId(), true, item.expiresAtEpochSec()));
        audit.add(new AuditEntry(now(), actor, "TRANSFER", entitlementId.toString(), "OK"));
    }
    public Optional<Entitlement> getEntitlement(Principal subject, UUID entitlementId) {
        Entitlement e = entitlements.get(entitlementId);
        return e != null && e.owner().equals(subject) && e.active(now()) ? Optional.of(e) : Optional.empty();
    }
    public List<AuditEntry> auditSnapshot() { synchronized (audit) { return List.copyOf(audit); } }
    private static long now() { return java.time.Instant.now().getEpochSecond(); }
    private void requireOwnerOrPermission(Principal actor, Permission p) {
        if (!can(actor, p)) throw new SecurityException("missing permission " + p);
    }
    private static void sameCommunity(Principal a, Principal b) {
        if (!a.communityId().equals(b.communityId())) throw new SecurityException("cross-community operation denied");
    }
}
