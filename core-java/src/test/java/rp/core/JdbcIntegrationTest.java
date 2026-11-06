package rp.core;

import javax.sql.DataSource;
import java.nio.file.*;
import java.sql.*;
import java.time.Clock;
import java.util.*;

/**
 * Actual JDBC smoke/integration suite, run against an isolated CI database.
 * Requires LIFE_JDBC_URL, LIFE_JDBC_USER, LIFE_JDBC_PASSWORD and LIFE_DB_DIALECT.
 * Do not point this suite at a production DB.
 */
public final class JdbcIntegrationTest {
    static void check(boolean value, String msg) {
        if (!value) throw new AssertionError(msg);
    }
    static void denied(Runnable operation, String message) {
        try { operation.run(); } catch (SecurityException expected) { return; }
        throw new AssertionError(message);
    }
    static void migrate(DataSource source, String dialect) throws Exception {
        try (Connection c = source.getConnection(); Statement s = c.createStatement()) {
            for (int version=1; version<=3; version++) {
                String name = switch(version) {
                    case 1 -> "001_core.sql";
                    case 2 -> "002_auth_sessions.sql";
                    default -> "003_owner.sql";
                };
                String script = Files.readString(Path.of("database",dialect,name));
                StringBuilder cleaned = new StringBuilder();
                for (String line : script.split("\n")) {
                    if (!line.stripLeading().startsWith("--")) cleaned.append(line).append('\n');
                }
                for (String command : cleaned.toString().split(";")) {
                    if (!command.isBlank()) s.execute(command.strip());
                }
            }
        }
    }
    public static void main(String[] args) throws Exception {
        String dialect = Objects.requireNonNull(System.getenv("LIFE_DB_DIALECT"),"LIFE_DB_DIALECT");
        check(dialect.equals("postgresql")||dialect.equals("mariadb"),"unsupported dialect");
        DataSource ds = new DriverManagerDataSource(
            Objects.requireNonNull(System.getenv("LIFE_JDBC_URL"),"LIFE_JDBC_URL"),
            Objects.requireNonNull(System.getenv("LIFE_JDBC_USER"),"LIFE_JDBC_USER"),
            Objects.requireNonNull(System.getenv("LIFE_JDBC_PASSWORD"),"LIFE_JDBC_PASSWORD")
        );
        migrate(ds,dialect);
        AccountAuth auth = new AccountAuth(new AccountAuth.JdbcStore(ds),Clock.systemUTC());
        String unique = UUID.randomUUID().toString().substring(0,10).replace("-","");
        UUID owner = auth.register("own_"+unique, "Long-Safe-Owner-Password-2026".toCharArray());
        UUID player = auth.register("ply_"+unique, "Long-Safe-Player-Password-2026".toCharArray());
        UUID other = auth.register("oth_"+unique, "Long-Safe-Other-Password-2026".toCharArray());
        check(auth.login("own_"+unique, "wrong-password".toCharArray()).isEmpty(),"bad password accepted");
        var login=auth.login("own_"+unique, "Long-Safe-Owner-Password-2026".toCharArray()).orElseThrow();
        // New service instance demonstrates SQL persistence of session/account.
        AccountAuth freshAuth = new AccountAuth(new AccountAuth.JdbcStore(ds),Clock.systemUTC());
        check(freshAuth.authenticate(login.token()).orElseThrow().equals(owner),"session not persistent");
        freshAuth.logout(login.token());
        check(freshAuth.authenticate(login.token()).isEmpty(),"logout not persistent");

        CommunityJdbc initial = new CommunityJdbc(ds);
        UUID community = initial.createCommunity(owner,"Life RP integration "+unique);
        UUID community2 = initial.createCommunity(other,"Other RP "+unique);
        initial.addMember(community,player);
        initial.addMember(community2,player);
        check(!initial.hasStaffPermission(community,player,"WARN"),"player has unexpected staff");
        try {
            initial.grantStaff(community,player,other,"WARN");
            throw new AssertionError("non-owner granted staff");
        } catch(SecurityException expected) {}
        initial.grantStaff(community,owner,player,"WARN");
        CommunityJdbc fresh = new CommunityJdbc(ds);
        check(fresh.hasStaffPermission(community,player,"WARN"),"staff permission not persistent");
        check(!fresh.hasStaffPermission(community2,player,"WARN"),"staff role leaked to another community");
        fresh.revokeStaff(community,owner,player,"WARN");
        check(!initial.hasStaffPermission(community,player,"WARN"),"staff revocation not persistent");

        UUID benefit = initial.provisionSupporterFromTrustedWorker(
            community,player,LifeCore.AssetKind.VEHICLE,"supporter.gold.car",null);
        check(fresh.hasActiveSupporterBenefit(community,player,benefit),"owner cannot use entitlement");
        check(!fresh.hasActiveSupporterBenefit(community,other,benefit),"benefit transferred/leaked to other account");
        check(!fresh.hasActiveSupporterBenefit(community2,player,benefit),"benefit leaked to other community");
        denied(()->fresh.transferSupporterBenefit(community,benefit,player,other),"supporter transfer allowed");

        try(Connection c=ds.getConnection();
            PreparedStatement p=c.prepareStatement("UPDATE supporter_entitlements SET transferable=? WHERE id=?")){
            p.setBoolean(1,true);
            if(dialect.equals("postgresql"))p.setObject(2,benefit);
            else p.setString(2,benefit.toString());
            try {
                p.executeUpdate();
                throw new AssertionError("DB allowed supporter transfer flag");
            } catch(SQLException expected) {
                // Database-level CHECK prevents even bypassing application code.
            }
        }
        try(Connection c=ds.getConnection();
            PreparedStatement p=c.prepareStatement("SELECT count(*) FROM audit_log WHERE action='STAFF_GRANT'")){
            try(ResultSet rs=p.executeQuery()){check(rs.next()&&rs.getLong(1)>=1,"audit not persisted");}
        }
        System.out.println("JDBC integration PASS: "+dialect);
    }
}
