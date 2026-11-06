package rp.core;

import java.util.*;

public final class LifeCoreTest {
    static void expectDenied(Runnable r) {
        try { r.run(); } catch (SecurityException expected) { return; }
        throw new AssertionError("operation should have been denied");
    }
    public static void main(String[] args) {
        var c = new LifeCore.CommunityId(UUID.randomUUID());
        var c2 = new LifeCore.CommunityId(UUID.randomUUID());
        var owner = new LifeCore.Principal(new LifeCore.AccountId(UUID.randomUUID()), c);
        var moderator = new LifeCore.Principal(new LifeCore.AccountId(UUID.randomUUID()), c);
        var player = new LifeCore.Principal(new LifeCore.AccountId(UUID.randomUUID()), c);
        var other = new LifeCore.Principal(new LifeCore.AccountId(UUID.randomUUID()), c);
        var foreign = new LifeCore.Principal(new LifeCore.AccountId(UUID.randomUUID()), c2);
        var core = new LifeCore();
        core.bootstrapOwner(owner);
        core.grantStaff(owner, moderator, EnumSet.of(LifeCore.Permission.WARN));
        assert core.can(moderator, LifeCore.Permission.WARN);
        assert !core.can(moderator, LifeCore.Permission.BAN);
        expectDenied(() -> core.grantStaff(moderator, player, EnumSet.of(LifeCore.Permission.BAN)));
        expectDenied(() -> core.grantStaff(owner, foreign, EnumSet.of(LifeCore.Permission.WARN)));
        var car = core.issueSupporter(owner, player, LifeCore.AssetKind.VEHICLE, "supporter.gold.car", 0);
        assert !car.transferable();
        assert core.getEntitlement(player, car.id()).isPresent();
        expectDenied(() -> core.transfer(player, car.id(), other));
        expectDenied(() -> core.transfer(owner, car.id(), other));
        assert core.getEntitlement(other, car.id()).isEmpty();
        core.revokeStaff(owner, moderator);
        assert !core.can(moderator, LifeCore.Permission.WARN);
        System.out.println("LifeCore tests PASS");
    }
}
