package rp.core;

import javax.sql.DataSource;
import java.sql.*;
import java.time.Instant;
import java.util.*;

/**
 * JDBC persistence for community-scoped roles & personal supporter entitlements.
 * Call from a trusted backend after AccountAuth authenticates the session.
 * NOT a public RPC interface. External script engines never receive the DataSource.
 */
public final class CommunityJdbc {
    private final DataSource source;
    public CommunityJdbc(DataSource source) { this.source = Objects.requireNonNull(source); }

    private static void uuid(PreparedStatement p,int i,UUID u) throws SQLException {
        String name=p.getConnection().getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
        if(name.contains("postgresql")) p.setObject(i,u); else p.setString(i,u.toString());
    }

    private static void audit(Connection c, UUID community, UUID actor, String action, String target, String result)
            throws SQLException {
        try(PreparedStatement p=c.prepareStatement(
                "INSERT INTO audit_log(community_id,actor_account_id,action,target_id,result) VALUES (?,?,?,?,?)")) {
            uuid(p,1,community);uuid(p,2,actor);p.setString(3,action);p.setString(4,target);p.setString(5,result);
            p.executeUpdate();
        }
    }
    private static boolean exists(Connection c,String sql,UUID a,UUID b) throws SQLException {
        try(PreparedStatement p=c.prepareStatement(sql)) {
            uuid(p,1,a);uuid(p,2,b);
            try(ResultSet rs=p.executeQuery()){return rs.next();}
        }
    }
    private static boolean owner(Connection c, UUID community, UUID actor) throws SQLException {
        return exists(c,"SELECT 1 FROM community_owners WHERE community_id=? AND account_id=?",community,actor);
    }
    private static boolean member(Connection c, UUID community, UUID account) throws SQLException {
        return exists(c,"SELECT 1 FROM community_members WHERE community_id=? AND account_id=?",community,account);
    }
    private static boolean permission(Connection c,UUID community,UUID actor,String name) throws SQLException {
        try(PreparedStatement p=c.prepareStatement(
            "SELECT 1 FROM staff_permissions WHERE community_id=? AND account_id=? AND permission=?")) {
            uuid(p,1,community);uuid(p,2,actor);p.setString(3,name);
            try(ResultSet rs=p.executeQuery()){return rs.next();}
        }
    }
    private static void checkPermission(String name) {
        if(name==null || !name.matches("[A-Z_]{2,80}"))
            throw new IllegalArgumentException("invalid permission name");
    }

    /** Atomic, one-time community provisioning. Owner comes from authenticated service identity. */
    public UUID createCommunity(UUID verifiedOwner,String name) throws SQLException {
        Objects.requireNonNull(verifiedOwner);
        if(name==null || name.isBlank() || name.length()>120) throw new IllegalArgumentException("name");
        UUID id=UUID.randomUUID();
        try(Connection c=source.getConnection()){
            c.setAutoCommit(false);
            try{
                try(PreparedStatement p=c.prepareStatement("INSERT INTO communities(id,name) VALUES (?,?)")){
                    uuid(p,1,id);p.setString(2,name.strip());p.executeUpdate();
                }
                try(PreparedStatement p=c.prepareStatement(
                        "INSERT INTO community_members(community_id,account_id) VALUES (?,?)")){
                    uuid(p,1,id);uuid(p,2,verifiedOwner);p.executeUpdate();
                }
                try(PreparedStatement p=c.prepareStatement(
                        "INSERT INTO community_owners(community_id,account_id) VALUES (?,?)")){
                    uuid(p,1,id);uuid(p,2,verifiedOwner);p.executeUpdate();
                }
                audit(c,id,verifiedOwner,"COMMUNITY_CREATE",id.toString(),"OK");
                c.commit();
            }catch(SQLException|RuntimeException error){c.rollback();throw error;}
        }
        return id;
    }

    public void addMember(UUID community,UUID account) throws SQLException {
        Objects.requireNonNull(community);Objects.requireNonNull(account);
        try(Connection c=source.getConnection();
            PreparedStatement p=c.prepareStatement(
                "INSERT INTO community_members(community_id,account_id) VALUES (?,?)")){
            uuid(p,1,community);uuid(p,2,account);p.executeUpdate();
        }
    }

    public boolean hasStaffPermission(UUID community,UUID actor,String action) throws SQLException {
        checkPermission(action);
        try(Connection c=source.getConnection()){
            return owner(c,community,actor) || permission(c,community,actor,action);
        }
    }

    public void grantStaff(UUID community,UUID authenticatedActor,UUID subject,String action) throws SQLException {
        checkPermission(action);
        try(Connection c=source.getConnection()){
            c.setAutoCommit(false);
            try{
                // Only the community owner can delegate staff privileges in this iteration.
                if(!owner(c,community,authenticatedActor)) throw new SecurityException("owner required");
                if(!member(c,community,subject)) throw new SecurityException("subject not a community member");
                if(!permission(c,community,subject,action)){
                    try(PreparedStatement p=c.prepareStatement(
                       "INSERT INTO staff_permissions(community_id,account_id,permission) VALUES (?,?,?)")){
                        uuid(p,1,community);uuid(p,2,subject);p.setString(3,action);p.executeUpdate();
                    }
                }
                audit(c,community,authenticatedActor,"STAFF_GRANT",subject+":"+action,"OK");
                c.commit();
            }catch(SQLException|RuntimeException error){c.rollback();throw error;}
        }
    }

    public void revokeStaff(UUID community,UUID authenticatedActor,UUID subject,String action) throws SQLException {
        checkPermission(action);
        try(Connection c=source.getConnection()){
            c.setAutoCommit(false);
            try{
                if(!owner(c,community,authenticatedActor)) throw new SecurityException("owner required");
                try(PreparedStatement p=c.prepareStatement(
                    "DELETE FROM staff_permissions WHERE community_id=? AND account_id=? AND permission=?")){
                    uuid(p,1,community);uuid(p,2,subject);p.setString(3,action);p.executeUpdate();
                }
                audit(c,community,authenticatedActor,"STAFF_REVOKE",subject+":"+action,"OK");
                c.commit();
            }catch(SQLException|RuntimeException error){c.rollback();throw error;}
        }
    }

    /**
     * Provision a permanent or expiring personal benefit.
     * Must ONLY be invoked by a trusted payment/fulfilment worker after verifying settlement,
     * not by clients, scripts or generic moderators. No purchasable staff permissions.
     */
    public UUID provisionSupporterFromTrustedWorker(UUID community,UUID account,
                                                      LifeCore.AssetKind kind,String catalogueId,
                                                      Long expiresAtEpochSeconds) throws SQLException {
        if(catalogueId==null || !catalogueId.matches("[a-zA-Z0-9_.-]{3,120}"))
            throw new IllegalArgumentException("catalogueId");
        Objects.requireNonNull(kind);
        UUID id=UUID.randomUUID();
        try(Connection c=source.getConnection()){
            c.setAutoCommit(false);
            try{
                if(!member(c,community,account)) throw new SecurityException("not a member");
                try(PreparedStatement p=c.prepareStatement(
                     "INSERT INTO supporter_entitlements(id,community_id,account_id,asset_kind,catalogue_id,transferable,expires_at) VALUES (?,?,?,?,?,?,?)")){
                    uuid(p,1,id);uuid(p,2,community);uuid(p,3,account);
                    p.setString(4,kind.name());p.setString(5,catalogueId);p.setBoolean(6,false);
                    if(expiresAtEpochSeconds==null)p.setNull(7,Types.TIMESTAMP);
                    else p.setTimestamp(7,Timestamp.from(Instant.ofEpochSecond(expiresAtEpochSeconds)));
                    p.executeUpdate();
                }
                audit(c,community,account,"SUPPORTER_PROVISION",id.toString(),"OK");
                c.commit();
            }catch(SQLException|RuntimeException error){c.rollback();throw error;}
        }
        return id;
    }

    public boolean hasActiveSupporterBenefit(UUID community,UUID account,UUID benefitId) throws SQLException {
        try(Connection c=source.getConnection();
            PreparedStatement p=c.prepareStatement(
               "SELECT 1 FROM supporter_entitlements WHERE id=? AND community_id=? AND account_id=? AND (expires_at IS NULL OR expires_at>?) AND transferable=?")){
            uuid(p,1,benefitId);uuid(p,2,community);uuid(p,3,account);
            p.setTimestamp(4,Timestamp.from(Instant.now()));p.setBoolean(5,false);
            try(ResultSet rs=p.executeQuery()){return rs.next();}
        }
    }

    /** Any attempt to move a supporter benefit across accounts is rejected, including staff callers. */
    public void transferSupporterBenefit(UUID community,UUID benefit,UUID from,UUID to) {
        throw new SecurityException("personal supporter benefit cannot be transferred");
    }
}
