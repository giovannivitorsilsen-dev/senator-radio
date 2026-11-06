package rp.core;

import javax.sql.DataSource;
import java.sql.*;
import java.io.PrintWriter;
import java.util.*;
import java.util.logging.Logger;

public final class CommunityJdbcTest {
    static final class NoDb implements DataSource {
        @Override public Connection getConnection() {throw new AssertionError("must not reach database");}
        @Override public Connection getConnection(String u,String p) {throw new AssertionError("must not reach database");}
        @Override public PrintWriter getLogWriter(){return null;}
        @Override public void setLogWriter(PrintWriter w){}
        @Override public void setLoginTimeout(int s){}
        @Override public int getLoginTimeout(){return 0;}
        @Override public Logger getParentLogger(){return Logger.getLogger("test");}
        @Override public <T>T unwrap(Class<T> c)throws SQLException{throw new SQLException("no wrapper");}
        @Override public boolean isWrapperFor(Class<?> c){return false;}
    }
    static void rejected(Runnable operation) {
        try {operation.run();throw new AssertionError("expected SecurityException");}
        catch(SecurityException allowed){}
    }
    public static void main(String[] args) throws Exception {
        var store = new CommunityJdbc(new NoDb());
        UUID c=UUID.randomUUID(),from=UUID.randomUUID(),to=UUID.randomUUID(),id=UUID.randomUUID();
        rejected(()->store.transferSupporterBenefit(c,id,from,to));
        rejected(()->store.transferSupporterBenefit(c,id,from,from));
        try {store.hasStaffPermission(c,from,"invalid.name"); throw new AssertionError("bad action accepted");}
        catch(IllegalArgumentException expected){}
        try {store.createCommunity(from,""); throw new AssertionError("blank name accepted");}
        catch(IllegalArgumentException expected){}
        System.out.println("CommunityJdbc policy tests PASS");
    }
}
