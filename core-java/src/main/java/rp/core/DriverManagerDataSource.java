package rp.core;

import javax.sql.DataSource;
import java.io.PrintWriter;
import java.sql.*;
import java.util.logging.Logger;

/**
 * Minimal JDBC datasource for local integration tests.
 * Use a pooled production-grade DataSource in actual deployments.
 * Drivers are provided at runtime (PostgreSQL or MariaDB JDBC driver).
 */
public final class DriverManagerDataSource implements DataSource {
    private final String url,username,password;
    public DriverManagerDataSource(String url,String username,String password) {
        this.url=url;this.username=username;this.password=password;
    }
    @Override public Connection getConnection() throws SQLException {
        return DriverManager.getConnection(url,username,password);
    }
    @Override public Connection getConnection(String user,String password) throws SQLException {
        return DriverManager.getConnection(url,user,password);
    }
    @Override public PrintWriter getLogWriter() throws SQLException {return DriverManager.getLogWriter();}
    @Override public void setLogWriter(PrintWriter writer) throws SQLException {DriverManager.setLogWriter(writer);}
    @Override public void setLoginTimeout(int seconds) throws SQLException {DriverManager.setLoginTimeout(seconds);}
    @Override public int getLoginTimeout() throws SQLException {return DriverManager.getLoginTimeout();}
    @Override public Logger getParentLogger() {return Logger.getLogger("rp.core");}
    @Override public <T>T unwrap(Class<T> iface)throws SQLException {
        if(iface.isInstance(this))return iface.cast(this);
        throw new SQLException("not a wrapper for "+iface);
    }
    @Override public boolean isWrapperFor(Class<?> iface){return iface.isInstance(this);}
}
