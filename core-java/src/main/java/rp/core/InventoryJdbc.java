package rp.core;

import javax.sql.DataSource;
import java.sql.*;
import java.util.*;

/**
 * Trusted-only, persistent community/account inventory ledger.
 * This is not a player HTTP/RPC interface. Caller authenticates account/session externally.
 * Quantity-only alpha: no equipment, unique instance metadata, weight or bag slots.
 */
public final class InventoryJdbc {
    public record Inventory(long revision, Map<String,Integer> items) {}
    private final DataSource ds;
    public InventoryJdbc(DataSource source){this.ds=Objects.requireNonNull(source);}
    private static void uuid(PreparedStatement p,int i,UUID u,Connection c) throws SQLException {
        if(c.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT).contains("postgresql"))
            p.setObject(i,u);
        else p.setString(i,u.toString());
    }
    private static void checkItem(String item) {
        if(item==null||!item.matches("[a-z][a-z0-9_]{1,47}"))
            throw new IllegalArgumentException("invalid item");
    }
    private static void checkQuantity(int quantity){
        if(quantity<1||quantity>10000)throw new IllegalArgumentException("invalid quantity");
    }
    private static void scope(PreparedStatement p,Connection c,UUID community,UUID account)
            throws SQLException {
        uuid(p,1,community,c);uuid(p,2,account,c);
    }
    private static void member(Connection c,UUID community,UUID account)throws SQLException {
        try(PreparedStatement p=c.prepareStatement(
          "SELECT 1 FROM community_members WHERE community_id=? AND account_id=?")){
            scope(p,c,community,account);
            try(ResultSet rs=p.executeQuery()){
                if(!rs.next())throw new SecurityException("account is not a community member");
            }
        }
    }
    private static void createInventory(Connection c,UUID community,UUID account)throws SQLException {
        member(c,community,account);
        try(PreparedStatement p=c.prepareStatement(
             "INSERT INTO inventory_accounts(community_id,account_id,revision) VALUES (?,?,0)")){
            scope(p,c,community,account);
            try { p.executeUpdate(); }
            catch(SQLIntegrityConstraintViolationException e){/* already exists */ }
        }
    }
    private static long lockRevision(Connection c,UUID community,UUID account)throws SQLException {
        try(PreparedStatement p=c.prepareStatement(
           "SELECT revision FROM inventory_accounts WHERE community_id=? AND account_id=? FOR UPDATE")){
            scope(p,c,community,account);
            try(ResultSet rs=p.executeQuery()){
                if(!rs.next())throw new SecurityException("inventory not provisioned");
                return rs.getLong(1);
            }
        }
    }
    private static int count(Connection c,UUID community,UUID account,String item)throws SQLException {
        try(PreparedStatement p=c.prepareStatement(
          "SELECT quantity FROM inventory_balances WHERE community_id=? AND account_id=? AND item_id=?")){
            scope(p,c,community,account);p.setString(3,item);
            try(ResultSet rs=p.executeQuery()){return rs.next()?rs.getInt(1):0;}
        }
    }
    private static void setCount(Connection c,UUID community,UUID account,String item,int value)throws SQLException {
        try(PreparedStatement p=c.prepareStatement(
          "DELETE FROM inventory_balances WHERE community_id=? AND account_id=? AND item_id=?")){
            scope(p,c,community,account);p.setString(3,item);p.executeUpdate();
        }
        if(value>0){
            try(PreparedStatement p=c.prepareStatement(
              "INSERT INTO inventory_balances(community_id,account_id,item_id,quantity) VALUES (?,?,?,?)")){
                scope(p,c,community,account);p.setString(3,item);p.setInt(4,value);p.executeUpdate();
            }
        }
    }
    private static void increment(Connection c,UUID community,UUID account)throws SQLException {
        try(PreparedStatement p=c.prepareStatement(
          "UPDATE inventory_accounts SET revision=revision+1 WHERE community_id=? AND account_id=?")){
            scope(p,c,community,account);
            if(p.executeUpdate()!=1)throw new SQLException("inventory revision missing");
        }
    }
    /** One-time setup; the trusted service must provide actual verified member identity. */
    public void provision(UUID community,UUID account)throws SQLException {
        Objects.requireNonNull(community);Objects.requireNonNull(account);
        try(Connection c=ds.getConnection()){
            c.setAutoCommit(false);
            try {
                member(c,community,account);
                // Existence check avoids vendor-dependent UPSERT.
                try(PreparedStatement p=c.prepareStatement(
                   "SELECT 1 FROM inventory_accounts WHERE community_id=? AND account_id=?")){
                    scope(p,c,community,account);
                    try(ResultSet rs=p.executeQuery()){
                        if(!rs.next())createInventory(c,community,account);
                    }
                }
                c.commit();
            } catch(SQLException|RuntimeException e){c.rollback();throw e;}
        }
    }
    public Inventory read(UUID community,UUID account)throws SQLException {
        Objects.requireNonNull(community);Objects.requireNonNull(account);
        try(Connection c=ds.getConnection()){
            member(c,community,account);
            long revision;
            try(PreparedStatement p=c.prepareStatement(
                "SELECT revision FROM inventory_accounts WHERE community_id=? AND account_id=?")){
                scope(p,c,community,account);
                try(ResultSet rs=p.executeQuery()){
                    if(!rs.next())throw new SecurityException("inventory not provisioned");
                    revision=rs.getLong(1);
                }
            }
            Map<String,Integer> items=new TreeMap<>();
            try(PreparedStatement p=c.prepareStatement(
                "SELECT item_id,quantity FROM inventory_balances WHERE community_id=? AND account_id=?")){
                scope(p,c,community,account);
                try(ResultSet rs=p.executeQuery()){
                    while(rs.next())items.put(rs.getString(1),rs.getInt(2));
                }
            }
            return new Inventory(revision,Collections.unmodifiableMap(items));
        }
    }
    /** Trusted grant from an authoritative game service ONLY, never a client command. */
    public void grantFromTrustedServer(UUID community,UUID account,String item,int quantity,long expectedRevision)
            throws SQLException {
        checkItem(item);checkQuantity(quantity);
        try(Connection c=ds.getConnection()){
            c.setAutoCommit(false);
            try {
                member(c,community,account);
                long revision=lockRevision(c,community,account);
                if(revision!=expectedRevision)throw new IllegalStateException("inventory revision conflict");
                int previous=count(c,community,account,item);
                if((long)previous+quantity>10000)throw new IllegalStateException("item quantity cap");
                setCount(c,community,account,item,previous+quantity);
                increment(c,community,account);
                c.commit();
            }catch(SQLException|RuntimeException e){c.rollback();throw e;}
        }
    }
    /**
     * Atomic persistent transfer. Locks both account rows in canonical order.
     * Both inventories must already exist. Unique operation UUID prevents exact replay.
     */
    public void transfer(UUID operationId,UUID community,UUID sender,UUID recipient,
                         String item,int quantity,long senderRevision,long recipientRevision)
            throws SQLException {
        Objects.requireNonNull(operationId);Objects.requireNonNull(community);
        Objects.requireNonNull(sender);Objects.requireNonNull(recipient);
        if(sender.equals(recipient))throw new IllegalArgumentException("distinct owners required");
        checkItem(item);checkQuantity(quantity);
        try(Connection c=ds.getConnection()){
            c.setAutoCommit(false);
            try {
                member(c,community,sender);member(c,community,recipient);
                UUID first=sender.toString().compareTo(recipient.toString())<0?sender:recipient;
                UUID second=first.equals(sender)?recipient:sender;
                long firstRevision=lockRevision(c,community,first);
                long secondRevision=lockRevision(c,community,second);
                long actualSender=first.equals(sender)?firstRevision:secondRevision;
                long actualRecipient=first.equals(recipient)?firstRevision:secondRevision;
                if(actualSender!=senderRevision||actualRecipient!=recipientRevision)
                    throw new IllegalStateException("inventory revision conflict");
                int fromCount=count(c,community,sender,item);
                int toCount=count(c,community,recipient,item);
                if(fromCount<quantity)throw new IllegalStateException("insufficient items");
                if((long)toCount+quantity>10000)throw new IllegalStateException("destination item cap");
                // If the transfer-id already exists, the INSERT fails and the whole transaction rolls back.
                try(PreparedStatement p=c.prepareStatement(
                    "INSERT INTO inventory_transfers(transfer_id,community_id,from_account_id,to_account_id,item_id,quantity) VALUES (?,?,?,?,?,?)")){
                    uuid(p,1,operationId,c);uuid(p,2,community,c);uuid(p,3,sender,c);uuid(p,4,recipient,c);
                    p.setString(5,item);p.setInt(6,quantity);p.executeUpdate();
                }
                setCount(c,community,sender,item,fromCount-quantity);
                setCount(c,community,recipient,item,toCount+quantity);
                increment(c,community,sender);
                increment(c,community,recipient);
                c.commit();
            }catch(SQLException|RuntimeException e){c.rollback();throw e;}
        }
    }
}
